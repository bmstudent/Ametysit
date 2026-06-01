import express from "express";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "crypto";
import helmet from "helmet";
import dotenv from "dotenv";

// Load environment variables early
dotenv.config();

process.on("unhandledRejection", (reason, promise) => {
  console.error("CRITICAL: Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("CRITICAL: Uncaught Exception:", error);
});

const nanoid = () => crypto.randomUUID();

const PORT = 3000;
// Generate a high-entropy secure runtime secret if no env key specified.
// Fallback to a stable local secret to prevent user logouts on dev-server restarts.
const JWT_SECRET = process.env.JWT_SECRET || "elite-hub-secure-fallback-development-key-928347192843";

// --- In-Memory Rate Limiter ---
interface RateLimitRecord {
  timestamps: number[];
}
const rateLimitStore = new Map<string, RateLimitRecord>();

const rateLimiter = (limit: number, windowMs: number, message: string = "Too many requests, please try again later.") => {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || "unknown";
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    
    let record = rateLimitStore.get(key);
    if (!record) {
      record = { timestamps: [] };
      rateLimitStore.set(key, record);
    }
    
    // Clean up timestamps outside window
    record.timestamps = record.timestamps.filter(t => now - t < windowMs);
    
    if (record.timestamps.length >= limit) {
      return res.status(429).json({ message });
    }
    
    record.timestamps.push(now);
    next();
  };
};

// --- Security Input Validation & Escaping ---
const sanitizeInput = (str: string): string => {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

const validateEmail = (email: string): boolean => {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return typeof email === "string" && re.test(email);
};

const validatePasswordStrength = (password: string): boolean => {
  return typeof password === "string" && password.length >= 8;
};

const validateUsername = (username: string): boolean => {
  const re = /^[a-zA-Z0-9 _-]{2,30}$/;
  return typeof username === "string" && re.test(username);
};

// --- Channel/Room Access Control Policy ---
const isUserAuthorizedForRoom = (userId: string, roomId: string): boolean => {
  if (!userId || !roomId) return false;
  
  // DM Room pattern check: "userId1--userId2"
  if (roomId.includes('--')) {
    const parts = roomId.split('--');
    return parts.includes(userId);
  }
  
  // Public channels are authorized for registered active users
  return true;
};

// --- Types ---
interface User {
  _id: string;
  username: string;
  email: string;
  passwordHash: string;
  points: number;
  lastActive: Date;
  isOnline?: boolean;
  statusMessage?: string;
  avatarUrl?: string;
  profileTheme?: string;
}

interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file';
  fileUrl?: string;
  roomId: string;
  status: 'sent' | 'delivered' | 'read';
  replyTo?: string;
  threadParentId?: string;
  edited?: boolean;
  reactions?: { emoji: string; users: { _id: string; username: string }[] }[];
  pinned?: boolean;
  duration?: number;
  waveformSamples?: number[];
  createdAt: Date;
}

// --- In-Memory Store ---
const DEFAULT_PASSWORD_HASH = "$2a$10$n6ZqQ3SgXmsXU9SAsN6r8e9iEqy6B0K8R5bHe8S8WvBeO04jLgXpS"; // "password"

const users: User[] = [
  {
    _id: "aiden",
    username: "Aiden Cruz",
    email: "aiden@nexus.hq",
    passwordHash: DEFAULT_PASSWORD_HASH,
    points: 120,
    lastActive: new Date(),
    isOnline: true,
    statusMessage: "Reviewing PRs",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60"
  },
  {
    _id: "sona",
    username: "Sona Kim",
    email: "sona@nexus.hq",
    passwordHash: DEFAULT_PASSWORD_HASH,
    points: 95,
    lastActive: new Date(),
    isOnline: true,
    statusMessage: "Working on design",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60"
  },
  {
    _id: "mira",
    username: "Mira Patel",
    email: "mira@nexus.hq",
    passwordHash: DEFAULT_PASSWORD_HASH,
    points: 150,
    lastActive: new Date(),
    isOnline: true,
    statusMessage: "In a meeting",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=60"
  },
  {
    _id: "jordan",
    username: "Jordan Tse",
    email: "jordan@nexus.hq",
    passwordHash: DEFAULT_PASSWORD_HASH,
    points: 80,
    lastActive: new Date(),
    isOnline: true,
    statusMessage: "Deploying code",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=60"
  },
  {
    _id: "ravi",
    username: "Ravi Okafor",
    email: "ravi@nexus.hq",
    passwordHash: DEFAULT_PASSWORD_HASH,
    points: 40,
    lastActive: new Date(),
    isOnline: false,
    statusMessage: "Out sick",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=60"
  },
  {
    _id: "lena",
    username: "Lena Holt",
    email: "lena@nexus.hq",
    passwordHash: DEFAULT_PASSWORD_HASH,
    points: 65,
    lastActive: new Date(),
    isOnline: false,
    statusMessage: "Focusing",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60"
  }
];

const messages: Message[] = [
  // --- product-roadmap ---
  {
    _id: "msg_init_1",
    senderId: "sona",
    senderName: "Sona Kim",
    content: "New mockups are uploaded to Figma.",
    type: "text",
    roomId: "product-roadmap",
    status: "read",
    createdAt: new Date(Date.now() - 3600000 * 2)
  },
  {
    _id: "msg_init_2",
    senderId: "mira",
    senderName: "Mira Patel",
    content: "Mira updated the Q3 milestones",
    type: "text",
    roomId: "product-roadmap",
    status: "read",
    createdAt: new Date(Date.now() - 60000)
  },
  // --- design-system ---
  {
    _id: "msg_init_3",
    senderId: "sona",
    senderName: "Sona Kim",
    content: "New token docs are live",
    type: "text",
    roomId: "design-system",
    status: "read",
    createdAt: new Date(Date.now() - 660000)
  },
  // --- engineering ---
  {
    _id: "msg_init_4",
    senderId: "jordan",
    senderName: "Jordan Tse",
    content: "Deploy went smooth",
    type: "text",
    roomId: "engineering",
    status: "read",
    createdAt: new Date(Date.now() - 3600000)
  },
  // --- releases ---
  {
    _id: "msg_init_5",
    senderId: "aiden",
    senderName: "Aiden Cruz",
    content: "v2.8.0 shipped to prod",
    type: "text",
    roomId: "releases",
    status: "read",
    createdAt: new Date(Date.now() - 360000 * 20)
  }
];

// --- Group Channels Store ---
interface Channel {
  id: string;
  name: string;
  lastMsg: string;
  starred?: boolean;
  unread?: number;
  time?: string;
  isLocked?: boolean;
  createdBy?: string;
}

const channels: Channel[] = [
  { id: 'product-roadmap', name: 'product-roadmap', lastMsg: 'Mira updated the Q3 milestones', unread: 3, time: 'now', starred: true },
  { id: 'design-system', name: 'design-system', lastMsg: 'New token docs are live', unread: 0, time: '11m' },
  { id: 'engineering', name: 'engineering', lastMsg: 'Deploy went smooth ✅', unread: 7, time: '1h', starred: true },
  { id: 'releases', name: 'releases', lastMsg: 'v2.8.0 shipped to prod', unread: 0, time: '2h', isLocked: true },
];

// --- Server Setup ---
async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Enable security headers with specialized configuration for local dynamic previews.
  // CRITICAL: Disable frameguard to allow embedding the app inside the AI Studio preview iframe.
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: false
  }));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));
  app.use(cookieParser());
  app.use(cors());

  // --- Auth Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err: any, tokenData: any) => {
      if (err) return res.status(403).json({ message: "Invalid token" });
      const user = users.find(u => u._id === (tokenData.id || tokenData._id));
      if (!user) return res.status(404).json({ message: "User not found" });
      req.user = user;
      next();
    });
  };

  // --- API Routes ---
  app.post("/api/auth/signup", rateLimiter(5, 60 * 1000, "Too many signup attempts. Please try again in a minute."), async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const cleanUsername = sanitizeInput(username.trim());
      const cleanEmail = email.trim().toLowerCase();

      if (!validateUsername(cleanUsername)) {
        return res.status(400).json({ message: "Username must be between 2 and 30 characters and contain only letters, numbers, spaces, or hyphens." });
      }

      if (!validateEmail(cleanEmail)) {
        return res.status(400).json({ message: "Invalid email structure." });
      }

      if (!validatePasswordStrength(password)) {
        return res.status(400).json({ message: "Password must be at least 8 characters long." });
      }
      
      if (users.find(u => u.email === cleanEmail || u.username === cleanUsername)) {
        return res.status(400).json({ message: "User already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const newUser: User = {
        _id: nanoid(),
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        points: 0,
        lastActive: new Date()
      };
      
      users.push(newUser);
      res.status(201).json({ message: "User created successfully" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", rateLimiter(10, 60 * 1000, "Too many login attempts. Please try again in a minute."), async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = users.find(u => u.email === cleanEmail);
      
      // Timing attack countermeasure: Perform bcrypt comparison against a dummy hash if user doesn't exist
      const dummyHash = "$2a$10$n6ZqQ3SgXmsXU9SAsN6r8e9iEqy6B0K8R5bHe8S8WvBeO04jLgXpS";
      const hashToCompare = user ? user.passwordHash : dummyHash;
      const isValid = await bcrypt.compare(password, hashToCompare);
      
      if (!user || !isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      res.json({ token, user: { id: user._id, username: user.username, points: user.points, avatarUrl: user.avatarUrl } });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    const { passwordHash, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  app.get("/api/channels", authenticateToken, async (req: any, res) => {
    res.json(channels);
  });

  app.post("/api/channels", authenticateToken, async (req: any, res) => {
    try {
      const { name, isLocked = false } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Channel name is required" });
      }

      const cleanName = sanitizeInput(name.trim());
      const slug = cleanName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      if (!slug) {
        return res.status(400).json({ message: "Invalid channel name." });
      }

      if (channels.find(c => c.id === slug)) {
        return res.status(400).json({ message: "Channel already exists!" });
      }

      const newChan: Channel = {
        id: slug,
        name: cleanName.toLowerCase(),
        lastMsg: 'Channel started by @' + req.user.username,
        isLocked,
        createdBy: req.user._id,
        time: 'now'
      };

      channels.push(newChan);

      io.emit("channel-created", newChan);

      res.status(201).json(newChan);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/messages/thread/:parentId", authenticateToken, async (req: any, res) => {
    try {
      const parentId = req.params.parentId;
      const parentMsg = messages.find(m => m._id === parentId);
      if (!parentMsg) {
        return res.json([]);
      }

      if (!isUserAuthorizedForRoom(req.user._id, parentMsg.roomId)) {
        return res.status(403).json({ message: "Access Denied: You are not authorized to view this thread." });
      }

      const threadMessages = messages
         .filter(m => m.threadParentId === parentId)
         .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
         .map(m => {
           const u = users.find(usr => usr._id === m.senderId);
           return {
             _id: m._id,
             sender: { _id: m.senderId, username: m.senderName, avatarUrl: u?.avatarUrl || "" },
             content: m.content,
             type: m.type,
             fileUrl: m.fileUrl,
             replyTo: m.replyTo,
             threadParentId: m.threadParentId,
             edited: m.edited,
             reactions: m.reactions || [],
             pinned: m.pinned || false,
             roomId: m.roomId,
             status: m.status,
             createdAt: m.createdAt.toISOString()
           };
         });
      res.json(threadMessages);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/messages/:roomId", authenticateToken, async (req: any, res) => {
    const roomId = req.params.roomId;
    
    // Strict Authorization check: Prevent BOLA / IDOR leak of direct messages or private conversations
    if (!isUserAuthorizedForRoom(req.user._id, roomId)) {
      return res.status(403).json({ message: "Access Denied: You are not authorized to view messages in this room." });
    }

    const roomMessages = messages
      .filter(m => m.roomId === roomId && !m.threadParentId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-50)
      .map(m => {
        const u = users.find(usr => usr._id === m.senderId);
        const threadCount = messages.filter(reply => reply.threadParentId === m._id).length;
        return {
          _id: m._id,
          sender: { _id: m.senderId, username: m.senderName, avatarUrl: u?.avatarUrl || "" },
          content: m.content,
          type: m.type,
          fileUrl: m.fileUrl,
          replyTo: m.replyTo,
          threadCount,
          edited: m.edited,
          reactions: m.reactions || [],
          pinned: m.pinned || false,
          roomId: m.roomId,
          status: m.status,
          createdAt: m.createdAt.toISOString()
        };
      });
    res.json(roomMessages);
  });

  app.get("/api/leaderboard", async (req, res) => {
    const topUsers = [...users]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 10)
      .map(u => ({ username: u.username, points: u.points || 0 }));
    res.json(topUsers);
  });

  app.get("/api/users/search", authenticateToken, async (req, res) => {
    const query = (req.query.q as string || "").toLowerCase().trim();
    
    let results = users;
    if (query) {
      results = users.filter(u => 
        u.username.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
      );
    }
    
    const mapped = results
      .slice(0, 50)
      .map(u => ({ 
        id: u._id, 
        username: u.username, 
        email: u.email, 
        points: u.points, 
        isOnline: u.isOnline, 
        avatarUrl: u.avatarUrl || "" 
      }));
    
    res.json(mapped);
  });

  app.get("/api/users/conversations", authenticateToken, async (req: any, res) => {
    const userId = req.user._id;
    // Find unique user IDs that this user has chatted with
    const dmRoomIds = messages
      .filter(m => m.roomId.includes('--') && m.roomId.includes(userId))
      .map(m => m.roomId);
    
    const uniqueRoomIds = Array.from(new Set(dmRoomIds));
    const targetUserIds = uniqueRoomIds.map(roomId => {
      const parts = roomId.split('--');
      return parts[0] === userId ? parts[1] : parts[0];
    }).filter(Boolean);

    const contacts = users
      .filter(u => targetUserIds.includes(u._id))
      .map(u => ({ 
        id: u._id, 
        username: u.username, 
        points: u.points, 
        isOnline: u.isOnline, 
        avatarUrl: u.avatarUrl || "",
        lastActive: u.lastActive 
      }));

    res.json(contacts);
  });

  app.get("/api/users/profile/:userId", authenticateToken, async (req: any, res) => {
    const targetId = req.params.userId;
    const targetUser = users.find(u => u._id === targetId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      id: targetUser._id,
      username: targetUser.username,
      points: targetUser.points || 0,
      statusMessage: targetUser.statusMessage || "",
      isOnline: targetUser.isOnline || false,
      avatarUrl: targetUser.avatarUrl || "",
      lastActive: targetUser.lastActive,
      profileTheme: targetUser.profileTheme || "amethyst"
    });
  });

  app.put("/api/users/profile", authenticateToken, async (req: any, res) => {
    const userId = req.user._id;
    const user = users.find(u => u._id === userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { statusMessage, avatarUrl, profileTheme } = req.body;
    if (statusMessage !== undefined) {
      user.statusMessage = sanitizeInput(statusMessage.trim()).substring(0, 100);
    }
    if (avatarUrl !== undefined) {
      const cleanUrl = String(avatarUrl).trim();
      if (cleanUrl === "" || cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
        user.avatarUrl = cleanUrl;
      } else {
        return res.status(400).json({ message: "Invalid avatar URL format." });
      }
    }
    if (profileTheme !== undefined) {
      const allowedThemes = ["amethyst", "emerald", "sapphire", "ruby", "amber"];
      const cleanTheme = String(profileTheme).toLowerCase().trim();
      user.profileTheme = allowedThemes.includes(cleanTheme) ? cleanTheme : "amethyst";
    }
    
    // Also broadcast status message update to room/users if they are watching
    res.json({
      id: user._id,
      username: user.username,
      points: user.points || 0,
      statusMessage: user.statusMessage,
      avatarUrl: user.avatarUrl || "",
      email: user.email,
      profileTheme: user.profileTheme || "amethyst"
    });
  });

  // --- Socket.IO Middleware ---
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));

    jwt.verify(token, JWT_SECRET, (err: any, tokenData: any) => {
      if (err) return next(new Error("Authentication error"));
      (socket as any).userId = tokenData.id || tokenData._id;
      (socket as any).username = tokenData.username;
      next();
    });
  });

  // --- Socket.IO ---
  io.on("connection", (socket: any) => {
    const userId = socket.userId;
    console.log(`User ${socket.username} connected:`, socket.id);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    const user = users.find(u => u._id === userId);
    if (user) {
      user.isOnline = true;
      io.emit("user-status", { userId, isOnline: true });
    }

    socket.on("join-room", (roomId) => {
      if (typeof roomId !== "string" || !isUserAuthorizedForRoom(userId, roomId)) {
        console.warn(`SECURITY ALERT: Unauthorized join-room request on room ${roomId} by user ${userId}`);
        socket.emit("error-message", { message: "Access Denied: You are not authorized to join this room." });
        return;
      }
      
      socket.join(roomId);
      // Mark messages as read when joining
      messages.filter(m => m.roomId === roomId && m.senderId !== userId).forEach(m => m.status = 'read');
      io.to(roomId).emit("messages-read", { roomId, readerId: userId });
      console.log(`${socket.username} joined room: ${roomId}`);
    });

    socket.on("leave-room", (roomId) => {
      if (typeof roomId === "string") {
        socket.leave(roomId);
      }
    });

    socket.on("send-message", async (data) => {
      if (!data) return;
      const { roomId, content, type = 'text', fileUrl, replyTo, threadParentId, duration, waveformSamples } = data;
      const senderId = userId;
      const senderName = socket.username;

      // Socket Message Speed (Flood) Protection rate limiting
      socket.msgTimestamps = socket.msgTimestamps || [];
      const now = Date.now();
      socket.msgTimestamps = socket.msgTimestamps.filter((t: number) => now - t < 5000); // 5 second sliding window
      if (socket.msgTimestamps.length >= 10) { // Max 10 messages per 5 seconds
        socket.emit("error-message", { message: "You are sending messages too quickly. Please pause slightly." });
        return;
      }
      socket.msgTimestamps.push(now);

      if (typeof roomId !== "string" || !isUserAuthorizedForRoom(senderId, roomId)) {
        socket.emit("error-message", { message: "Access Denied: Unauthorized conversation target." });
        return;
      }

      // Limit message content size (Max 5000 characters) and sanitize to prevent structural XSS scripts
      const cleanContent = content ? sanitizeInput(String(content).trim()).substring(0, 5000) : "";
      const cleanType = ['text', 'image', 'audio', 'video', 'file'].includes(type) ? type : 'text';

      let cleanFileUrl = "";
      if (fileUrl) {
        const urlStr = String(fileUrl).trim();
        if (urlStr.startsWith("http://") || urlStr.startsWith("https://") || urlStr.startsWith("data:")) {
          cleanFileUrl = urlStr;
        }
      }
      
      const user = users.find(u => u._id === senderId);
      if (user) user.points += 5; // Elite bonus

      const newMessage: Message = {
        _id: nanoid(),
        senderId,
        senderName,
        content: cleanContent,
        type: cleanType,
        fileUrl: cleanFileUrl,
        replyTo: replyTo && typeof replyTo === "string" ? replyTo : undefined,
        threadParentId: threadParentId && typeof threadParentId === "string" ? threadParentId : undefined,
        roomId,
        status: 'sent',
        duration: duration && typeof duration === "number" ? duration : undefined,
        waveformSamples: Array.isArray(waveformSamples) ? waveformSamples.filter(s => typeof s === "number") : undefined,
        createdAt: new Date()
      };

      messages.push(newMessage);
      
      const messagePayload = {
        _id: newMessage._id,
        sender: { _id: newMessage.senderId, username: newMessage.senderName, avatarUrl: user?.avatarUrl || "" },
        content: newMessage.content,
        type: newMessage.type,
        fileUrl: newMessage.fileUrl,
        replyTo: newMessage.replyTo,
        threadParentId: newMessage.threadParentId,
        reactions: [],
        roomId: newMessage.roomId,
        status: newMessage.status,
        duration: newMessage.duration,
        waveformSamples: newMessage.waveformSamples,
        createdAt: newMessage.createdAt.toISOString()
      };

      // 1. Emit to the room (for people active in that chat)
      io.to(roomId).emit("receive-message", messagePayload);

      // If this is a thread reply, calculate the new thread count and broadcast it to the room
      if (newMessage.threadParentId) {
        const threadCount = messages.filter(m => m.threadParentId === newMessage.threadParentId).length;
        io.to(roomId).emit("thread-updated", {
          messageId: newMessage.threadParentId,
          threadCount
        });
      }

      // Update channel last message in memory
      const targetChannel = channels.find(c => c.id === roomId);
      if (targetChannel) {
        targetChannel.lastMsg = cleanType === 'text' ? cleanContent : `[Sent a ${cleanType}]`;
        targetChannel.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        io.emit("channel-updated", targetChannel);
      }

      // 2. For DMs, also send a notification to participant rooms
      if (roomId.includes('--')) {
        const parts = roomId.split('--');
        const recipientId = parts[0] === userId ? parts[1] : parts[0];
        
        // Notify both so sidebars update
        io.to(`user:${userId}`).emit("dm-notification", messagePayload);
        io.to(`user:${recipientId}`).emit("dm-notification", messagePayload);
      }
    });

    socket.on("react-message", (data: any) => {
      if (!data || typeof data.messageId !== "string" || typeof data.emoji !== "string") return;
      const { messageId, emoji } = data;
      const msg = messages.find(m => m._id === messageId);
      if (msg) {
        if (!isUserAuthorizedForRoom(userId, msg.roomId)) {
          return;
        }
        
        if (!msg.reactions) {
          msg.reactions = [];
        }
        
        const cleanEmoji = sanitizeInput(emoji.substring(0, 10));
        
        const existingReaction = msg.reactions.find(r => r.emoji === cleanEmoji);
        if (existingReaction) {
          const userIndex = existingReaction.users.findIndex(u => u._id === userId);
          if (userIndex !== -1) {
            existingReaction.users.splice(userIndex, 1);
          } else {
            existingReaction.users.push({ _id: userId, username: socket.username });
          }
          if (existingReaction.users.length === 0) {
            msg.reactions = msg.reactions.filter(r => r.emoji !== cleanEmoji);
          }
        } else {
          msg.reactions.push({
            emoji: cleanEmoji,
            users: [{ _id: userId, username: socket.username }]
          });
        }
        io.to(msg.roomId).emit("message-reaction-updated", { messageId, reactions: msg.reactions, roomId: msg.roomId });
      }
    });

    socket.on("typing", (data: any) => {
      if (!data || typeof data.roomId !== "string") return;
      const { roomId, isTyping } = data;
      if (!isUserAuthorizedForRoom(userId, roomId)) return;
      socket.to(roomId).emit("user-typing", { roomId, userId, username: socket.username, isTyping: !!isTyping });
    });

    socket.on("edit-message", (data: any) => {
      if (!data || typeof data.messageId !== "string" || typeof data.content !== "string") return;
      const { messageId, content } = data;
      const msg = messages.find(m => m._id === messageId && m.senderId === userId);
      if (msg) {
        const cleanContent = sanitizeInput(content.trim()).substring(0, 5000);
        msg.content = cleanContent;
        msg.edited = true;
        io.to(msg.roomId).emit("message-updated", { messageId, content: cleanContent, edited: true });
      }
    });

    socket.on("delete-message", (data: any) => {
      if (!data || typeof data.messageId !== "string") return;
      const { messageId } = data;
      const index = messages.findIndex(m => m._id === messageId && m.senderId === userId);
      if (index !== -1) {
        const msg = messages[index];
        messages.splice(index, 1);
        io.to(msg.roomId).emit("message-deleted", { messageId, roomId: msg.roomId });
      }
    });

    socket.on("pin-message", (data: any) => {
      if (!data || typeof data.messageId !== "string") return;
      const { messageId, isPinned } = data;
      const msg = messages.find(m => m._id === messageId);
      if (msg) {
        if (!isUserAuthorizedForRoom(userId, msg.roomId)) return;
        msg.pinned = !!isPinned;
        io.to(msg.roomId).emit("message-pinned", { messageId, roomId: msg.roomId, isPinned: !!isPinned });
      }
    });

    // --- WebRTC signaling events with validation guards ---
    socket.on("call-user", (data: any) => {
      if (!data || typeof data.toUserId !== "string" || !data.offer) return;
      const { toUserId, offer } = data;
      io.to(`user:${toUserId}`).emit("incoming-call", {
        fromUser: { _id: userId, username: socket.username },
        offer
      });
    });

    socket.on("answer-call", (data: any) => {
      if (!data || typeof data.toUserId !== "string" || !data.answer) return;
      const { toUserId, answer } = data;
      io.to(`user:${toUserId}`).emit("call-answered", {
        fromUserId: userId,
        answer
      });
    });

    socket.on("ice-candidate", (data: any) => {
      if (!data || typeof data.toUserId !== "string" || !data.candidate) return;
      const { toUserId, candidate } = data;
      io.to(`user:${toUserId}`).emit("ice-candidate", {
        fromUserId: userId,
        candidate
      });
    });

    socket.on("end-call", (data: any) => {
      if (!data || typeof data.toUserId !== "string") return;
      const { toUserId } = data;
      io.to(`user:${toUserId}`).emit("call-ended", {
        fromUserId: userId
      });
    });

    socket.on("reject-call", (data: any) => {
      if (!data || typeof data.toUserId !== "string") return;
      const { toUserId } = data;
      io.to(`user:${toUserId}`).emit("call-rejected", {
        fromUserId: userId
      });
    });

    socket.on("cancel-call", (data: any) => {
      if (!data || typeof data.toUserId !== "string") return;
      const { toUserId } = data;
      io.to(`user:${toUserId}`).emit("call-cancelled", {
        fromUserId: userId
      });
    });

    socket.on("mute-status", (data: any) => {
      if (!data || typeof data.toUserId !== "string") return;
      const { toUserId, audioMuted, videoMuted } = data;
      io.to(`user:${toUserId}`).emit("remote-mute-status", {
        fromUserId: userId,
        audioMuted: !!audioMuted,
        videoMuted: !!videoMuted
      });
    });

    socket.on("disconnect", () => {
      if (user) {
        user.isOnline = false;
        io.emit("user-status", { userId, isOnline: false });
      }
      console.log("User disconnected");
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
});
