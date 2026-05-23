import React, { useState, useRef, useEffect } from "react";
import { User, Message } from "../../lib/types";
import { EmojiReactionPicker } from "./EmojiReactionPicker";
import { VoiceWaveformPlayer } from "./VoiceWaveformPlayer";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  ChevronDown,
  Check,
  Mic,
  Search,
  Image as ImageIcon,
  Play,
  Pause,
  X,
  Pencil,
  Video,
  RotateCcw,
  CornerUpLeft,
  Trash2,
  Pin,
  MessageSquare,
  ArrowLeft,
  FileText,
} from "lucide-react";

import { socket } from "../../lib/socket";

interface ChatWindowProps {
  user: User;
  activeRoom: string;
  messages: Message[];
  onSendMessage: (
    content: string,
    type?: "text" | "image" | "audio" | "video" | "file",
    fileUrl?: string,
    replyTo?: string,
    duration?: number,
    waveformSamples?: number[],
  ) => void;
  typingUsers?: Record<string, boolean>;
  onViewProfile: (userId: string) => void;
  onStartCall?: (toUserId: string, toUsername: string) => void;
  onReactMessage?: (messageId: string, emoji: string) => void;
  onOpenThread?: (message: Message) => void;
  onBackToSidebar?: () => void;
  className?: string;
}

export function ChatWindow({
  user,
  activeRoom,
  messages,
  onSendMessage,
  typingUsers = {},
  onViewProfile,
  onStartCall,
  onReactMessage,
  onOpenThread,
  onBackToSidebar,
  className = "",
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [activePickerId, setActivePickerId] = useState<string | null>(null);
  const [hoveredReactionKey, setHoveredReactionKey] = useState<string | null>(
    null,
  );
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [confirmDeleteMessage, setConfirmDeleteMessage] =
    useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Search keyword state ---
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);

  // --- Pin message state ---
  const [isPinnedPaneOpen, setIsPinnedPaneOpen] = useState(false);

  // --- Confirmation of edits state ---
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);

  // --- Right-click Context Menu ---
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    msg: Message;
  } | null>(null);

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);
    window.addEventListener("click", closeContextMenu);
    return () => window.removeEventListener("click", closeContextMenu);
  }, []);

  useEffect(() => {
    const handleScrollEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ messageId: string }>;
      if (customEvent.detail?.messageId) {
        scrollToMessage(customEvent.detail.messageId);
      }
    };
    window.addEventListener("scroll-to-message", handleScrollEvent);
    return () =>
      window.removeEventListener("scroll-to-message", handleScrollEvent);
  }, [messages]);

  // --- Reply to Message State ---
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);

  const scrollToMessage = (targetId: string) => {
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(targetId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    }
  };

  // --- Video Note Recording State Engine ---
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [videoTime, setVideoTime] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isSimulatedVideo, setIsSimulatedVideo] = useState(false);

  const videoStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const liveVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const videoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoSimulationIntervalRef = useRef<number | null>(null);
  const isRecordingPausedRef = useRef(false);

  // Helper: Create simulated round camera feed when physical hardware is absent/blocked
  const createSimulatedVideoStream = (): MediaStream => {
    setIsSimulatedVideo(true);

    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");

    let angle = 0;
    const interval = window.setInterval(() => {
      if (!ctx) return;

      // Luxurious clean background matching system aesthetics
      ctx.fillStyle = "#111322";
      ctx.fillRect(0, 0, 480, 480);

      // Amethyst circular core gradient
      const grad = ctx.createRadialGradient(240, 240, 15, 240, 240, 220);
      grad.addColorStop(0, "#6366f1"); // Indigo glow
      grad.addColorStop(0.5, "#4f46e5");
      grad.addColorStop(1, "#0e111a");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(240, 240, 240, 0, Math.PI * 2);
      ctx.fill();

      // Signal waves simulating video capturing active scanning
      ctx.strokeStyle = "rgba(168, 85, 247, 0.45)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const offset1 = Math.sin(angle) * 15;
      ctx.arc(240, 240, 140 + offset1, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const offset2 = Math.cos(angle * 1.4) * 25;
      ctx.arc(240, 240, 175 + offset2, 0, Math.PI * 2);
      ctx.stroke();

      // Shiny core
      const coreLight = ctx.createRadialGradient(240, 240, 3, 240, 240, 50);
      coreLight.addColorStop(0, "#ffffff");
      coreLight.addColorStop(0.3, "rgba(139, 92, 246, 0.75)");
      coreLight.addColorStop(1, "rgba(139, 92, 246, 0)");
      ctx.fillStyle = coreLight;
      ctx.beginPath();
      ctx.arc(240, 240, 50, 0, Math.PI * 2);
      ctx.fill();

      // Interactive satellite orbiting particles
      for (let i = 0; i < 3; i++) {
        const pAngle = angle + (i * Math.PI * 2) / 3;
        const px = 240 + Math.cos(pAngle) * 100;
        const py = 240 + Math.sin(pAngle) * 100;
        ctx.fillStyle = "#a78bfa";
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.font = "bold 15px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("AMETHYST VIRTUAL FEED", 240, 120);

      ctx.font = "10px monospace";
      ctx.fillStyle = "#c084fc";
      ctx.fillText("[ SANDBOX CAMERA SIMULATION ]", 240, 350);

      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillText(`Sender ID: @${user.username}`, 240, 375);

      angle += 0.05;
    }, 33);

    videoSimulationIntervalRef.current = interval;
    const canvasStream = (canvas as any).captureStream(30) as MediaStream;

    // Generate lightweight oscillator sound track for WebM container format compatibility
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const dest = audioCtx.createMediaStreamDestination();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.value = 440;
      gain.gain.value = 0.0; // Silent to protect audio channels

      osc.connect(gain);
      gain.connect(dest);
      osc.start();

      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }
    } catch (e) {
      console.warn("Could not synth audio track payload:", e);
    }

    return canvasStream;
  };

  // Auto clean tracks on change/exit
  useEffect(() => {
    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (videoTimerRef.current) {
        clearInterval(videoTimerRef.current);
      }
      if (videoSimulationIntervalRef.current) {
        window.clearInterval(videoSimulationIntervalRef.current);
      }
    };
  }, []);

  const generateVideoThumbnail = (url: string) => {
    const video = document.createElement("video");
    video.src = url;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    const extractFrame = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 120;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg");
          setVideoThumbnail(dataUrl);
        }
      } catch (err) {
        console.error("Error drawing video frame to canvas:", err);
      }
    };

    video.onseeked = () => {
      extractFrame();
    };

    video.onloadeddata = () => {
      try {
        if (video.duration > 0) {
          video.currentTime = Math.min(0.2, video.duration / 2);
        } else {
          video.currentTime = 0.1;
        }
      } catch (e) {
        extractFrame();
      }
    };

    video.onerror = () => {
      console.warn("Could not capture thumbnail from video object URL fallback");
    };

    video.load();
  };

  const startVideoMode = async () => {
    setVideoError(null);
    setVideoUrl(null);
    setVideoThumbnail(null);
    setIsVideoMode(true);
    setVideoTime(0);
    setIsSimulatedVideo(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: "user" },
        audio: true,
      });
      videoStreamRef.current = stream;
      if (liveVideoElementRef.current) {
        liveVideoElementRef.current.srcObject = stream;
      }
    } catch (err: any) {
      // Use console.warn to indicate the device fallback gracefully without throwing fatal camera errors in red logs
      console.warn(
        "Physical camera hardware access skipped or unavailable:",
        err.message || err,
      );

      try {
        const stream = createSimulatedVideoStream();
        videoStreamRef.current = stream;
        if (liveVideoElementRef.current) {
          liveVideoElementRef.current.srcObject = stream;
        }
        // Let the user know we handles lack of webcam elegantly
        setVideoError(
          "Camera input device not found. Initialized a beautiful virtual workspace camera for mock testing.",
        );
      } catch (simulateErr) {
        console.error("Critical simulator fallback issue:", simulateErr);
        setVideoError(
          "Camera hardware unavailable and mock stream engine failed to start.",
        );
      }
    }
  };

  const closeVideoMode = () => {
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    if (videoSimulationIntervalRef.current) {
      window.clearInterval(videoSimulationIntervalRef.current);
      videoSimulationIntervalRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setIsVideoMode(false);
    setIsRecordingVideo(false);
    setIsRecordingPaused(false);
    isRecordingPausedRef.current = false;
    setVideoUrl(null);
    setVideoThumbnail(null);
    setVideoTime(0);
    setVideoError(null);
    setIsSimulatedVideo(false);
    videoChunksRef.current = [];
  };

  const startRecordingVideo = () => {
    if (!videoStreamRef.current) return;
    videoChunksRef.current = [];
    setVideoTime(0);
    setVideoThumbnail(null);
    setIsRecordingVideo(true);
    setIsRecordingPaused(false);
    isRecordingPausedRef.current = false;

    try {
      const options = { mimeType: "video/webm;codecs=vp8,opus" };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(videoStreamRef.current, options);
      } catch (e) {
        recorder = new MediaRecorder(videoStreamRef.current);
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, {
          type: "video/webm",
        });
        const url = URL.createObjectURL(videoBlob);
        setVideoUrl(url);
        generateVideoThumbnail(url);
      };

      recorder.start();

      videoTimerRef.current = setInterval(() => {
        if (isRecordingPausedRef.current) return;
        setVideoTime((prev) => {
          if (prev >= 60) {
            stopRecordingVideo();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Recording error:", err);
      setVideoError("Could not start recording context. Please try again.");
    }
  };

  const pauseRecordingVideo = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      try {
        mediaRecorderRef.current.pause();
        setIsRecordingPaused(true);
        isRecordingPausedRef.current = true;
      } catch (e) {
        console.error("Pause recording error:", e);
      }
    }
  };

  const resumeRecordingVideo = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      try {
        mediaRecorderRef.current.resume();
        setIsRecordingPaused(false);
        isRecordingPausedRef.current = false;
      } catch (e) {
        console.error("Resume recording error:", e);
      }
    }
  };

  const stopRecordingVideo = () => {
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      (mediaRecorderRef.current.state === "recording" ||
        mediaRecorderRef.current.state === "paused")
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVideo(false);
    setIsRecordingPaused(false);
    isRecordingPausedRef.current = false;
  };

  const sendRecordedVideo = async () => {
    if (videoChunksRef.current.length === 0) return;

    try {
      const videoBlob = new Blob(videoChunksRef.current, {
        type: "video/webm",
      });
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onSendMessage(
          "Sent a video message",
          "video",
          base64,
          replyToMessage?._id || undefined,
        );
        setReplyToMessage(null);
        closeVideoMode();
      };
      reader.readAsDataURL(videoBlob);
    } catch (err) {
      console.error("Failed to read video blob", err);
      setVideoError("Could not compile video data.");
    }
  };

  const activeTyping = Object.entries(typingUsers)
    .filter(([name, isTyping]) => isTyping && name !== user.username)
    .map(([name]) => name);

  const getAvatarForTypingUser = (username: string) => {
    const msgWithAvatar = messages.find(
      (m) => m.sender?.username === username && m.sender?.avatarUrl,
    );
    return msgWithAvatar?.sender?.avatarUrl || null;
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    if (onReactMessage) {
      onReactMessage(messageId, emoji);
    } else {
      socket.emit("react-message", { messageId, emoji });
    }
    setActivePickerId(null);
  };

  const matchedMessages = searchQuery.trim()
    ? messages.filter(
        (m) =>
          m.type === "text" &&
          m.content.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const handleNextSearch = () => {
    if (matchedMessages.length === 0) return;
    const nextIdx = (searchIndex + 1) % matchedMessages.length;
    setSearchIndex(nextIdx);
    scrollToMessage(matchedMessages[nextIdx]._id);
  };

  const handlePrevSearch = () => {
    if (matchedMessages.length === 0) return;
    const prevIdx =
      (searchIndex - 1 + matchedMessages.length) % matchedMessages.length;
    setSearchIndex(prevIdx);
    scrollToMessage(matchedMessages[prevIdx]._id);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const regex = new RegExp(
      `(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className="bg-yellow-400 text-slate-800 rounded-sm px-0.5 font-bold"
            >
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </span>
    );
  };

  const handleSaveEdit = (messageId: string) => {
    if (!editValue.trim()) return;
    setPendingEditId(messageId);
  };

  const confirmSaveEdit = () => {
    if (pendingEditId && editValue.trim()) {
      socket.emit("edit-message", {
        messageId: pendingEditId,
        content: editValue.trim(),
      });
      setEditingMessageId(null);
      setPendingEditId(null);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    socket.emit("delete-message", { messageId });
    setConfirmDeleteMessage(null);
  };

  // Helper function to handle auto-scrolling to the first unread message
  const handleAutoScrollToUnread = () => {
    const storedCountStr = sessionStorage.getItem(`unread_scroll_count_${activeRoom}`);
    if (storedCountStr && messages && messages.length > 0) {
      const count = parseInt(storedCountStr, 10);
      sessionStorage.removeItem(`unread_scroll_count_${activeRoom}`);
      if (count > 0) {
        const firstUnreadMsgIndex = Math.max(0, messages.length - count);
        const targetMessage = messages[firstUnreadMsgIndex];
        if (targetMessage) {
          const scrollAttempt = () => {
            const el = document.getElementById(`msg-${targetMessage._id}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              setHighlightedMessageId(targetMessage._id);
              setTimeout(() => {
                setHighlightedMessageId(null);
              }, 2000);
            } else {
              setTimeout(() => {
                const elRetry = document.getElementById(`msg-${targetMessage._id}`);
                if (elRetry) {
                  elRetry.scrollIntoView({ behavior: "smooth", block: "center" });
                  setHighlightedMessageId(targetMessage._id);
                  setTimeout(() => {
                    setHighlightedMessageId(null);
                  }, 2000);
                }
              }, 60);
            }
          };
          scrollAttempt();
          return true;
        }
      }
    }
    return false;
  };

  useEffect(() => {
    if (scrollRef.current) {
      const scrolledToUnread = handleAutoScrollToUnread();
      if (!scrolledToUnread) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages, activeTyping.length]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    socket.emit("typing", {
      roomId: activeRoom,
      isTyping: e.target.value.length > 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isRecording) return;
    onSendMessage(input, "text", undefined, replyToMessage?._id || undefined);
    setInput("");
    setReplyToMessage(null);
    socket.emit("typing", { roomId: activeRoom, isTyping: false });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File too large (max 2MB)");
        return;
      }
      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (isImage) {
          onSendMessage(
            "Sent an image",
            "image",
            base64,
            replyToMessage?._id || undefined,
          );
        } else {
          onSendMessage(
            file.name,
            "file",
            base64,
            replyToMessage?._id || undefined,
          );
        }
        setReplyToMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const recordingStartRef = useRef<number | null>(null);

  const toggleRecording = () => {
    if (isRecording) {
      const startTime = recordingStartRef.current || Date.now();
      const rawDuration = (Date.now() - startTime) / 1000;
      const duration = Math.max(2, Math.round(rawDuration));
      
      const samplesCount = Math.min(45, Math.max(20, Math.round(duration * 2.5)));
      const waveformSamples = Array.from({ length: samplesCount }, () => 
        Math.floor(Math.random() * 22) + 6
      );

      setTimeout(() => {
        onSendMessage(
          "Voice Message",
          "audio",
          "",
          replyToMessage?._id || undefined,
          duration,
          waveformSamples,
        );
        setReplyToMessage(null);
      }, 500);
      recordingStartRef.current = null;
    } else {
      recordingStartRef.current = Date.now();
    }
    setIsRecording(!isRecording);
  };

  const isDM = activeRoom.includes("--");
  let displayRoomName = activeRoom.replace("-", " ");
  if (isDM) {
    const otherMsg = messages.find((m) => m.sender?._id !== user.id);
    displayRoomName = otherMsg ? otherMsg.sender?.username : "Secure Chat";
  }

  return (
    <div className={`flex-1 flex flex-col relative h-full bg-[#0F111A] overflow-hidden ${className}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
      </div>

      {/* Header */}
      <div className="h-20 border-b border-white/5 flex items-center justify-between px-6 md:px-8 bg-[#0F111A]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-3 md:gap-4">
          {onBackToSidebar && (
            <button
              onClick={onBackToSidebar}
              className="md:hidden w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all outline-none border-none cursor-pointer"
              title="Back to channels"
              type="button"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="w-12 h-12 relative">
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold overflow-hidden shadow-lg shadow-purple-500/20">
              {displayRoomName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[#0F111A] rounded-full" />
          </div>
          <div>
            <h2 className="font-bold text-white tracking-tight text-base leading-tight capitalize">
              {displayRoomName}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5 h-3">
              {activeTyping.length > 0 ? (
                <>
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 h-1 bg-[#A78BFA] rounded-full"
                        animate={{
                          y: [0, -3.5, 0],
                          scale: [0.8, 1.2, 0.8],
                          opacity: [0.35, 1, 0.35],
                        }}
                        transition={{
                          duration: 0.9,
                          repeat: Infinity,
                          ease: [0.4, 0, 0.2, 1],
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider select-none animate-pulse duration-1000">
                    {activeTyping[0]} typing...
                  </p>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Online
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDM && onStartCall && (
            <button
              onClick={() => {
                const parts = activeRoom.split("--");
                const peerId = parts[0] === user.id ? parts[1] : parts[0];
                onStartCall(peerId, displayRoomName);
              }}
              className="p-2 py-1.5 md:p-2.5 text-purple-400 hover:text-white hover:bg-white/5 border border-purple-500/10 hover:border-purple-500/20 bg-purple-500/5 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs uppercase duration-200 shadow-md shadow-purple-500/5 cursor-pointer outline-none select-none"
              title="Start Video Call"
            >
              <Video size={16} className="text-[#FF5500] animate-pulse" />
              <span className="hidden sm:inline">Video Call</span>
            </button>
          )}
          <button
            onClick={() => {
              setShowSearchBar((p) => !p);
              setSearchQuery("");
              setSearchIndex(0);
            }}
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${showSearchBar ? "text-indigo-400 bg-white/5" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
            title="Search message history"
          >
            <Search size={20} />
          </button>
          <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Search Input Panel */}
      <AnimatePresence>
        {showSearchBar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#121422] border-b border-indigo-500/10 px-8 py-3.5 flex flex-col sm:flex-row gap-3.5 items-center justify-between sticky top-20 z-20 shadow-md"
          >
            <div className="relative flex-1 w-full">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                size={15}
              />
              <input
                type="text"
                placeholder="Search messages by keyword..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchIndex(0);
                }}
                className="w-full bg-black/25 text-white pl-10 pr-12 py-2 rounded-xl outline-none border border-white/5 focus:border-indigo-500/25 text-sm font-medium font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchIndex(0);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold border-none bg-transparent cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {searchQuery.trim() && (
              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
                <span className="text-xs font-bold font-mono text-slate-500 uppercase">
                  {matchedMessages.length > 0
                    ? `${searchIndex + 1} of ${matchedMessages.length}`
                    : "No matches"}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={handlePrevSearch}
                    disabled={matchedMessages.length === 0}
                    className="p-1 px-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 border border-white/5 text-slate-300 rounded-lg text-xs font-black uppercase transition-all cursor-pointer"
                  >
                    Prev
                  </button>
                  <button
                    onClick={handleNextSearch}
                    disabled={matchedMessages.length === 0}
                    className="p-1 px-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 border border-white/5 text-slate-300 rounded-lg text-xs font-black uppercase transition-all cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned Messages Header Alert */}
      {messages.filter((m) => m.pinned).length > 0 && (
        <div className="bg-[#121420]/90 border-b border-indigo-500/10 px-8 py-2.5 flex items-center justify-between select-none z-15">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
            <span className="text-[11px] font-extrabold font-mono text-indigo-400 uppercase tracking-wider">
              Pinned Messages ({messages.filter((m) => m.pinned).length})
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPinnedPaneOpen(!isPinnedPaneOpen)}
              className="px-2.5 py-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase rounded-lg hover:bg-indigo-500/25 transition-all text-center cursor-pointer"
            >
              {isPinnedPaneOpen ? "Hide List" : "View List"}
            </button>
          </div>
        </div>
      )}

      {/* Pinned Messages Pane */}
      <AnimatePresence>
        {isPinnedPaneOpen && messages.filter((m) => m.pinned).length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#171A28] border-b border-white/5 overflow-hidden max-h-56 overflow-y-auto px-8 py-3.5 space-y-2 text-left z-10"
          >
            {messages
              .filter((m) => m.pinned)
              .map((msg) => (
                <div
                  key={msg._id}
                  onClick={() => scrollToMessage(msg._id)}
                  className="bg-black/20 border border-white/5 rounded-xl p-2.5 hover:bg-black/30 transition-all cursor-pointer flex justify-between items-center group/pin"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-black text-indigo-400">
                        {msg.sender.username}
                      </span>
                      <span className="text-[9px] text-slate-500 font-semibold font-mono">
                        {format(new Date(msg.createdAt), "HH:mm")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 truncate">
                      {msg.content || "[Media Message]"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      socket.emit("pin-message", {
                        messageId: msg._id,
                        isPinned: false,
                      });
                    }}
                    className="opacity-0 group-hover/pin:opacity-100 px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[9px] font-bold uppercase rounded transition-all cursor-pointer border-none"
                  >
                    Unpin
                  </button>
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scroll-smooth custom-scrollbar relative z-10"
      >
        <div className="flex justify-center mb-6">
          <span className="px-4 py-1 bg-white/5 text-white/40 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm border border-white/5">
            History Cloud Synced
          </span>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.sender?._id === user.id;
            const originalMsg = msg.replyTo
              ? messages.find((m) => m._id === msg.replyTo)
              : null;
            return (
              <motion.div
                key={msg._id}
                id={`msg-${msg._id}`}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  backgroundColor:
                    highlightedMessageId === msg._id
                      ? "rgba(139, 92, 246, 0.15)"
                      : "rgba(0,0,0,0)",
                }}
                transition={{
                  backgroundColor: { duration: 0.5 },
                  type: "spring",
                  damping: 25,
                  stiffness: 220,
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    msg,
                  });
                }}
                className={`flex ${isMe ? "justify-end" : "justify-start"} w-full items-end gap-2.5 p-1 rounded-2xl transition-all duration-300 ${highlightedMessageId === msg._id ? "ring-2 ring-purple-500/50 ring-offset-2 ring-offset-[#0F111A] shadow-lg shadow-purple-500/10" : ""}`}
              >
                {!isMe && (
                  <button
                    onClick={() => onViewProfile(msg.sender?._id)}
                    type="button"
                    className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600/30 to-indigo-600/20 text-purple-300 font-extrabold flex items-center justify-center text-[10px] uppercase mb-1 border border-purple-500/20 hover:border-purple-500 hover:scale-105 active:scale-95 shadow-md shadow-purple-500/5 transition-all outline-none select-none cursor-pointer focus:ring-1 focus:ring-purple-400 overflow-hidden"
                    title={`View ${msg.sender?.username}'s profile`}
                  >
                    {msg.sender?.avatarUrl ? (
                      <img
                        src={msg.sender.avatarUrl}
                        alt={msg.sender.username}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      msg.sender?.username?.charAt(0)
                    )}
                  </button>
                )}
                <div
                  className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"} relative group/msg`}
                >
                  {!isMe && msg.sender && (
                    <button
                      onClick={() => onViewProfile(msg.sender?._id)}
                      type="button"
                      className="text-[11px] font-black text-slate-400 hover:text-indigo-400 select-none pb-1 transition-all flex items-center gap-1 outline-none self-start hover:underline cursor-pointer"
                      title={`View ${msg.sender.username}'s profile`}
                    >
                      {msg.sender.username}
                    </button>
                  )}

                  {msg.pinned && (
                    <div
                      className={`flex items-center gap-1.5 text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg mb-1 select-none ${isMe ? "self-end" : "self-start"}`}
                      title="This message is pinned"
                    >
                      <span>📌</span>
                      <span>Pinned Message</span>
                    </div>
                  )}

                  <div
                    className={`flex items-center gap-2 w-full ${isMe ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div className="relative max-w-full">
                      {msg.type === "image" ? (
                        <div
                          className={`p-1.5 rounded-[22px] bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl ${isMe ? "rounded-br-none" : "rounded-bl-none"} max-w-[280px] sm:max-w-[320px] ${msg.pinned ? "ring-2 ring-amber-500/40 shadow-amber-500/10" : ""}`}
                        >
                          {originalMsg && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                scrollToMessage(msg.replyTo!);
                              }}
                              className="mb-2 p-2.5 bg-black/40 hover:bg-black/60 border-l-4 border-indigo-500 rounded-xl text-left text-xs cursor-pointer select-none transition-all flex flex-col gap-0.5"
                              title="Click to locate original message"
                            >
                              <span className="font-extrabold text-indigo-400 truncate text-[10px] uppercase tracking-wide">
                                Reply to @
                                {originalMsg.sender?.username || "User"}
                              </span>
                              <span className="text-slate-300 truncate text-[11px]">
                                {originalMsg.type === "text" &&
                                  originalMsg.content}
                                {originalMsg.type === "image" &&
                                  "📸 Image attachment"}
                                {originalMsg.type === "audio" &&
                                  "🎵 Voice Note"}
                                {originalMsg.type === "video" &&
                                  "🎥 Video Clip"}
                                {originalMsg.type === "file" &&
                                  "📁 Shared File"}
                              </span>
                            </div>
                          )}
                          <img
                            src={msg.fileUrl}
                            alt="chat"
                            className="max-w-full rounded-[16px] object-contain max-h-[400px]"
                          />
                          <div
                            className={`flex items-center justify-end gap-1.5 mt-1.5 px-2`}
                          >
                            <span className="text-[9px] text-white/40 font-bold uppercase">
                              {format(new Date(msg.createdAt), "h:mm a")}
                            </span>
                            {isMe && (
                              <Check
                                size={12}
                                className={
                                  msg.status === "read"
                                    ? "text-indigo-400"
                                    : "text-slate-500"
                                }
                              />
                            )}
                          </div>
                        </div>
                      ) : msg.type === "audio" ? (
                        <div
                          className={`p-4 rounded-[24px] flex flex-col min-w-[260px] ${
                            isMe
                              ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-none shadow-xl shadow-purple-500/20"
                              : "bg-[#1A1E2A] text-white rounded-bl-none border border-white/5 backdrop-blur-md shadow-lg shadow-black/20"
                          } ${msg.pinned ? "ring-2 ring-amber-500/40 shadow-amber-500/10" : ""}`}
                        >
                          {originalMsg && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                scrollToMessage(msg.replyTo!);
                              }}
                              className="mb-2.5 p-2 bg-black/45 hover:bg-black/60 border-l-4 border-indigo-500 rounded-xl text-left text-xs cursor-pointer select-none transition-all flex flex-col gap-0.5"
                              title="Click to locate original message"
                            >
                              <span className="font-extrabold text-indigo-400 truncate text-[10px] uppercase tracking-wide">
                                Reply to @
                                {originalMsg.sender?.username || "User"}
                              </span>
                              <span className="text-slate-300 truncate text-[11px] max-w-[200px]">
                                {originalMsg.type === "text" &&
                                  originalMsg.content}
                                {originalMsg.type === "image" &&
                                  "📸 Image attachment"}
                                {originalMsg.type === "audio" &&
                                  "🎵 Voice Note"}
                                {originalMsg.type === "video" &&
                                  "🎥 Video Clip"}
                                {originalMsg.type === "file" &&
                                  "📁 Shared File"}
                              </span>
                            </div>
                          )}
                          <VoiceWaveformPlayer message={msg} isMe={isMe} />
                          <div className="flex items-center justify-end gap-1.5 mt-2 px-1">
                            <span className={`text-[9px] font-bold uppercase ${isMe ? "text-white/40" : "text-slate-400"}`}>
                              {format(new Date(msg.createdAt), "h:mm a")}
                            </span>
                            {isMe && (
                              <Check
                                size={12}
                                className={
                                  msg.status === "read"
                                    ? "text-indigo-400"
                                    : "text-slate-300"
                                }
                              />
                            )}
                          </div>
                        </div>
                      ) : msg.type === "video" ? (
                        <div
                          id={`video-msg-container-${msg._id}`}
                          className={`p-1.5 rounded-[22px] bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl ${isMe ? "rounded-br-none" : "rounded-bl-none"} w-[280px] sm:w-[320px] overflow-hidden ${msg.pinned ? "ring-2 ring-amber-500/40 shadow-amber-500/10" : ""}`}
                        >
                          {originalMsg && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                scrollToMessage(msg.replyTo!);
                              }}
                              className="mb-2 p-2.5 bg-black/40 hover:bg-black/60 border-l-4 border-indigo-500 rounded-xl text-left text-xs cursor-pointer select-none transition-all flex flex-col gap-0.5"
                              title="Click to locate original message"
                            >
                              <span className="font-extrabold text-indigo-400 truncate text-[10px] uppercase tracking-wide">
                                Reply to @
                                {originalMsg.sender?.username || "User"}
                              </span>
                              <span className="text-slate-300 truncate text-[11px] max-w-[200px]">
                                {originalMsg.type === "text" &&
                                  originalMsg.content}
                                {originalMsg.type === "image" &&
                                  "📸 Image attachment"}
                                {originalMsg.type === "audio" &&
                                  "🎵 Voice Note"}
                                {originalMsg.type === "video" &&
                                  "🎥 Video Clip"}
                                {originalMsg.type === "file" &&
                                  "📁 Shared File"}
                              </span>
                            </div>
                          )}
                          <video
                            id={`video-player-${msg._id}`}
                            src={msg.fileUrl}
                            controls
                            playsInline
                            className="w-full rounded-[16px] object-cover max-h-[240px] bg-black/50"
                          />
                          <div
                            className={`flex items-center justify-end gap-1.5 mt-1.5 px-2`}
                          >
                            <span className="text-[9px] text-white/40 font-bold uppercase font-mono">
                              {format(new Date(msg.createdAt), "h:mm a")}
                            </span>
                            {isMe && (
                              <div className="flex">
                                <Check
                                  size={11}
                                  className={
                                    msg.status === "read"
                                      ? "text-indigo-400"
                                      : "text-slate-400"
                                  }
                                />
                                {msg.status === "read" && (
                                  <Check
                                    size={11}
                                    className="text-indigo-400 -ml-1.5"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : msg.type === "file" ? (
                        (() => {
                          const isImg =
                            msg.content &&
                            (msg.content.toLowerCase().endsWith(".png") ||
                              msg.content.toLowerCase().endsWith(".jpg") ||
                              msg.content.toLowerCase().endsWith(".jpeg") ||
                              msg.content.toLowerCase().endsWith(".gif") ||
                              msg.content.toLowerCase().endsWith(".webp") ||
                              msg.content.toLowerCase().endsWith(".svg") ||
                              (msg.fileUrl &&
                                msg.fileUrl.startsWith("data:image/")));

                          const extension = msg.content
                            ? msg.content.substring(msg.content.lastIndexOf(".")).toLowerCase()
                            : "";

                          const isPdf =
                            extension === ".pdf" ||
                            (msg.fileUrl && msg.fileUrl.startsWith("data:application/pdf"));

                          const isText =
                            [
                              ".txt", ".json", ".js", ".ts", ".jsx", ".tsx",
                              ".md", ".css", ".html", ".xml", ".yaml", ".yml",
                              ".csv", ".ini", ".log"
                            ].includes(extension) ||
                            (msg.fileUrl && (
                              msg.fileUrl.startsWith("data:text/") ||
                              msg.fileUrl.startsWith("data:application/json") ||
                              msg.fileUrl.startsWith("data:application/javascript")
                            ));

                          const decodeBase64Utf8 = (base64: string): string => {
                            try {
                              return decodeURIComponent(escape(atob(base64)));
                            } catch (e) {
                              try {
                                return atob(base64);
                              } catch (err) {
                                return "";
                              }
                            }
                          };

                          let textContent = "";
                          if (isText && msg.fileUrl) {
                            try {
                              if (msg.fileUrl.startsWith("data:")) {
                                const parts = msg.fileUrl.split(",");
                                if (parts.length > 1) {
                                  const isBase64 = parts[0].includes("base64");
                                  const payload = parts[1];
                                  if (isBase64) {
                                    textContent = decodeBase64Utf8(payload);
                                  } else {
                                    textContent = decodeURIComponent(payload);
                                  }
                                }
                              }
                            } catch (e) {
                              console.error("Error parsing text file preview:", e);
                            }
                          }

                          return (
                            <div
                              className={`p-4 rounded-[22px] border shadow-xl flex flex-col gap-3.5 min-w-[260px] max-w-[320px] ${
                                isMe
                                  ? "bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-500/20 text-white rounded-br-none shadow-purple-500/10"
                                  : "bg-[#1A1E2A] border-white/5 text-slate-100 rounded-bl-none shadow-black/20"
                              } ${msg.pinned ? "ring-2 ring-amber-500/40 shadow-amber-500/10" : ""}`}
                            >
                              {originalMsg && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    scrollToMessage(msg.replyTo!);
                                  }}
                                  className="mb-2 p-2 bg-black/45 hover:bg-black/60 border-l-4 border-indigo-400 rounded-xl text-left text-xs cursor-pointer select-none transition-all flex flex-col gap-0.5"
                                  title="Click to locate original message"
                                >
                                  <span className="font-extrabold text-indigo-300 truncate text-[10px] uppercase tracking-wide">
                                    Reply to @
                                    {originalMsg.sender?.username || "User"}
                                  </span>
                                  <span className="text-slate-300 truncate text-[11px] max-w-[200px]">
                                    {originalMsg.type === "text" &&
                                      originalMsg.content}
                                    {originalMsg.type === "image" &&
                                      "📸 Image attachment"}
                                    {originalMsg.type === "audio" &&
                                      "🎵 Voice Note"}
                                    {originalMsg.type === "video" &&
                                      "🎥 Video Clip"}
                                    {originalMsg.type === "file" &&
                                      "📁 Shared File"}
                                  </span>
                                </div>
                              )}

                              {isImg ? (
                                <div className="space-y-3">
                                  <div className="relative group/img-preview rounded-[16px] overflow-hidden bg-black/30 border border-white/10 max-h-[220px]">
                                    <img
                                      src={msg.fileUrl}
                                      alt={msg.content}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-auto max-h-[220px] object-contain hover:scale-[1.02] transition-transform duration-300 pointer-events-auto cursor-pointer"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img-preview:opacity-100 transition-opacity flex flex-col justify-end p-2 px-3 pointer-events-none text-left">
                                      <span className="text-[10px] text-white font-bold truncate w-full">
                                        {msg.content}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between border-t border-white/5 pt-2 select-none">
                                    <a
                                      href={msg.fileUrl}
                                      download={msg.content}
                                      className={`text-[11px] font-black uppercase tracking-wide hover:underline cursor-pointer flex items-center gap-1.5 ${isMe ? "text-white" : "text-indigo-400 hover:text-indigo-300"}`}
                                    >
                                      Save Image
                                    </a>
                                    <div className="flex items-center gap-1">
                                      <span
                                        className={`text-[9px] font-bold uppercase ${isMe ? "text-white/40" : "text-slate-500"}`}
                                      >
                                        {format(
                                          new Date(msg.createdAt),
                                          "h:mm a",
                                        )}
                                      </span>
                                      {isMe && (
                                        <div className="flex">
                                          <Check
                                            size={11}
                                            className={
                                              msg.status === "read"
                                                ? "text-indigo-400"
                                                : "text-slate-400"
                                            }
                                          />
                                          {msg.status === "read" && (
                                            <Check
                                              size={11}
                                              className="text-indigo-400 -ml-1.5"
                                            />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : isPdf ? (
                                <div className="space-y-3">
                                  <div className="relative group/pdf-preview h-[154px] w-full rounded-[16px] overflow-hidden bg-gradient-to-br from-[#121420] to-[#1E1B29] border border-white/10 flex flex-col justify-between p-3.5 select-none hover:border-red-500/35 transition-all duration-300">
                                    <div className="absolute inset-0 opacity-[0.04] p-4 flex flex-col gap-2.5 pointer-events-none">
                                      <div className="h-3 w-1/2 bg-white rounded-full" />
                                      <div className="h-2 w-full bg-white rounded-full" />
                                      <div className="h-2 w-5/6 bg-white rounded-full" />
                                      <div className="h-2 w-full bg-white rounded-full" />
                                      <div className="h-2 w-2/3 bg-white rounded-full" />
                                    </div>
                                    
                                    <div className="flex items-center justify-between z-10">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-red-650 flex items-center justify-center text-white font-extrabold text-[10px] tracking-wider shadow-md shadow-red-500/20 uppercase">
                                          PDF
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 tracking-wider">PREVIEW</span>
                                      </div>
                                      <FileText className="text-rose-500/60 group-hover/pdf-preview:text-rose-450 group-hover/pdf-preview:scale-110 transition-all duration-300" size={18} />
                                    </div>

                                    <div className="z-10 flex-1 flex flex-col justify-center py-2">
                                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1 pr-2 uppercase select-all" title={msg.content}>
                                        {msg.content}
                                      </h4>
                                      <p className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">
                                        Portable Document Format
                                      </p>
                                    </div>

                                    <div className="z-10 bg-white/5 rounded-lg py-1 px-2.5 flex items-center justify-between text-[9px] font-bold text-slate-400 border border-white/5">
                                      <span>SECURE DOCUMENT</span>
                                      <span className="text-red-400">PAGE 1</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between border-t border-white/5 pt-2 select-none">
                                    <a
                                      href={msg.fileUrl}
                                      download={msg.content}
                                      className={`text-[11px] font-black uppercase tracking-wide hover:underline cursor-pointer flex items-center gap-1.5 ${isMe ? "text-white" : "text-indigo-400 hover:text-indigo-300"}`}
                                    >
                                      Download PDF
                                    </a>
                                    <div className="flex items-center gap-1">
                                      <span
                                        className={`text-[9px] font-bold uppercase ${isMe ? "text-white/40" : "text-slate-500"}`}
                                      >
                                        {format(
                                          new Date(msg.createdAt),
                                          "h:mm a",
                                        )}
                                      </span>
                                      {isMe && (
                                        <div className="flex">
                                          <Check
                                            size={11}
                                            className={
                                              msg.status === "read"
                                                ? "text-indigo-400"
                                                : "text-slate-400"
                                            }
                                          />
                                          {msg.status === "read" && (
                                            <Check
                                              size={11}
                                              className="text-indigo-400 -ml-1.5"
                                            />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : isText ? (
                                <div className="space-y-3">
                                  <div className="relative group/text-preview h-[154px] w-full rounded-[16px] overflow-hidden bg-[#0A0C14] border border-white/10 flex flex-col justify-between pb-1 select-none hover:border-emerald-500/35 transition-all duration-300">
                                    <div className="h-7 border-b border-white/[0.04] bg-white/[0.02] flex items-center justify-between px-3">
                                      <div className="flex gap-1.5 items-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                                      </div>
                                      <span className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-widest">
                                        {extension.slice(1) || "TXT"}
                                      </span>
                                    </div>

                                    <div className="flex-1 p-3.5 font-mono text-[10px] text-slate-300 flex overflow-hidden relative">
                                      <div className="flex flex-col text-slate-600 select-none text-right pr-2.5 border-r border-white/5 shrink-0 select-none">
                                        <span>1</span>
                                        <span>2</span>
                                        <span>3</span>
                                        <span>4</span>
                                        <span>5</span>
                                      </div>
                                      
                                      <div className="flex-1 pl-2.5 overflow-hidden text-left relative">
                                        <pre className="whitespace-pre overflow-hidden leading-relaxed text-slate-300 select-all" style={{ fontFamily: 'Fira Code, JetBrains Mono, monospace' }}>
                                          {textContent ? (
                                            textContent.split('\n').slice(0, 5).join('\n')
                                          ) : (
                                            `// Preview not available\n// Click Download to view content\n// Type: ${msg.content.split('.').pop()?.toUpperCase() || 'Text'}`
                                          )}
                                        </pre>
                                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0A0C14] to-transparent pointer-events-none" />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between border-t border-white/5 pt-2 select-none">
                                    <a
                                      href={msg.fileUrl}
                                      download={msg.content}
                                      className={`text-[11px] font-black uppercase tracking-wide hover:underline cursor-pointer flex items-center gap-1.5 ${isMe ? "text-white" : "text-indigo-400 hover:text-indigo-300"}`}
                                    >
                                      Download File
                                    </a>
                                    <div className="flex items-center gap-1">
                                      <span
                                        className={`text-[9px] font-bold uppercase ${isMe ? "text-white/40" : "text-slate-500"}`}
                                      >
                                        {format(
                                          new Date(msg.createdAt),
                                          "h:mm a",
                                        )}
                                      </span>
                                      {isMe && (
                                        <div className="flex">
                                          <Check
                                            size={11}
                                            className={
                                              msg.status === "read"
                                                ? "text-indigo-400"
                                                : "text-slate-400"
                                            }
                                          />
                                          {msg.status === "read" && (
                                            <Check
                                              size={11}
                                              className="text-indigo-400 -ml-1.5"
                                            />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isMe ? "bg-white/10 text-white" : "bg-indigo-500/10 text-indigo-400"}`}
                                    >
                                      <Paperclip
                                        size={20}
                                        className="rotate-45"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4
                                        className="text-sm font-bold truncate pr-1"
                                        title={msg.content}
                                      >
                                        {msg.content}
                                      </h4>
                                      <p
                                        className={`text-[10px] mt-0.5 uppercase tracking-wider font-semibold ${isMe ? "text-white/60" : "text-slate-500"}`}
                                      >
                                        {msg.content
                                          .split(".")
                                          .pop()
                                          ?.toUpperCase() || "FILE"}{" "}
                                        File
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1 select-none">
                                    <a
                                      href={msg.fileUrl}
                                      download={msg.content}
                                      className={`text-xs font-bold uppercase tracking-wide hover:underline cursor-pointer flex items-center gap-1.5 ${isMe ? "text-white" : "text-indigo-400 hover:text-indigo-300"}`}
                                    >
                                      Download File
                                    </a>
                                    <div className="flex items-center gap-1">
                                      <span
                                        className={`text-[9px] font-bold uppercase ${isMe ? "text-white/40" : "text-slate-500"}`}
                                      >
                                        {format(
                                          new Date(msg.createdAt),
                                          "h:mm a",
                                        )}
                                      </span>
                                      {isMe && (
                                        <div className="flex">
                                          <Check
                                            size={11}
                                            className={
                                              msg.status === "read"
                                                ? "text-indigo-400"
                                                : "text-slate-400"
                                            }
                                          />
                                          {msg.status === "read" && (
                                            <Check
                                              size={11}
                                              className="text-indigo-400 -ml-1.5"
                                            />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div
                          className={`group relative ${isMe ? "items-end" : "items-start"} flex flex-col max-w-full`}
                        >
                          <div
                            className={`relative px-5 py-3.5 rounded-[22px] text-[15px] font-medium leading-relaxed shadow-lg ${
                              isMe
                                ? "bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white rounded-br-none shadow-purple-500/20"
                                : "bg-[#1A1E2A] text-slate-100 rounded-bl-none border border-white/5 shadow-black/20 px-6 py-4"
                            } ${msg.pinned ? "ring-2 ring-amber-500/40 shadow-amber-500/10" : ""}`}
                          >
                            {originalMsg && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  scrollToMessage(msg.replyTo!);
                                }}
                                className="mb-2 p-2 bg-black/45 hover:bg-black/60 border-l-4 border-indigo-400 rounded-lg text-left text-xs cursor-pointer select-none transition-all flex flex-col gap-0.5"
                                title="Click to locate original message"
                              >
                                <span className="font-extrabold text-indigo-300 truncate text-[10px] uppercase tracking-wide font-sans">
                                  Reply to @
                                  {originalMsg.sender?.username || "User"}
                                </span>
                                <span className="text-slate-200 truncate text-[11px] font-medium">
                                  {originalMsg.type === "text" &&
                                    originalMsg.content}
                                  {originalMsg.type === "image" &&
                                    "📸 Image attachment"}
                                  {originalMsg.type === "audio" &&
                                    "🎵 Voice Note"}
                                  {originalMsg.type === "video" &&
                                    "🎥 Video Clip"}
                                  {originalMsg.type === "file" &&
                                    "📁 Shared File"}
                                </span>
                              </div>
                            )}
                            {editingMessageId === msg._id ? (
                              <div className="flex flex-col gap-2 min-w-[220px]">
                                <textarea
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-full bg-black/30 text-white rounded-xl px-3 py-1.5 border border-white/15 outline-none text-[15px] resize-none font-medium leading-relaxed focus:border-indigo-400 transition-all font-sans"
                                  rows={Math.max(
                                    1,
                                    editValue.split("\n").length,
                                  )}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveEdit(msg._id);
                                    } else if (e.key === "Escape") {
                                      setEditingMessageId(null);
                                    }
                                  }}
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingMessageId(null);
                                    }}
                                    className="px-2 py-0.5 text-[10px] font-bold uppercase text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-all"
                                    type="button"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSaveEdit(msg._id);
                                    }}
                                    className="px-2 py-0.5 text-[10px] font-bold uppercase bg-white text-indigo-600 hover:bg-indigo-50 rounded-md transition-all shadow-md active:scale-95"
                                    type="button"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span
                                  className={
                                    isMe
                                      ? "cursor-pointer hover:opacity-90 select-text"
                                      : "select-text"
                                  }
                                  onClick={() => {
                                    if (isMe) {
                                      setEditingMessageId(msg._id);
                                      setEditValue(msg.content);
                                    }
                                  }}
                                  title={isMe ? "Click to edit" : undefined}
                                >
                                  {highlightText(msg.content, searchQuery)}
                                </span>
                                <div
                                  className={`flex items-center justify-end gap-1 mt-1 -mb-1 opacity-0 group-hover:opacity-100 transition-opacity`}
                                >
                                  <span className="text-[9px] text-white/40 font-bold uppercase">
                                    {format(new Date(msg.createdAt), "h:mm a")}
                                    {msg.edited ? " • EDITED" : ""}
                                  </span>
                                  {isMe && (
                                    <div className="flex ml-0.5">
                                      <Check
                                        size={11}
                                        className={
                                          msg.status === "read"
                                            ? "text-purple-200"
                                            : "text-white/40"
                                        }
                                      />
                                      {msg.status === "read" && (
                                        <Check
                                          size={11}
                                          className="text-purple-200 -ml-1.5"
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          <div
                            className={`flex items-center gap-1.5 mt-1.5 px-2 group-hover:hidden transition-all duration-300`}
                          >
                            <span className="text-[9px] text-white/20 font-bold uppercase font-mono">
                              {format(new Date(msg.createdAt), "HH:mm")}
                              {msg.edited ? " (edited)" : ""}
                            </span>
                            {isMe && (
                              <div className="flex">
                                <Check
                                  size={10}
                                  className={
                                    msg.status === "read"
                                      ? "text-purple-500"
                                      : "text-white/10"
                                  }
                                />
                                {msg.status === "read" && (
                                  <Check
                                    size={10}
                                    className="text-purple-500 -ml-1"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Floating Custom Reaction Popover */}
                      <AnimatePresence>
                        {activePickerId === msg._id && (
                          <EmojiReactionPicker
                            isMe={isMe}
                            onSelectEmoji={(emoji) =>
                              toggleReaction(msg._id, emoji)
                            }
                            onClose={() => setActivePickerId(null)}
                          />
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Reaction / Actions Trigger Button (only visible on hover/msg) */}
                    <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200 flex items-center gap-1 shrink-0 animate-in fade-in zoom-in-75 duration-150">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyToMessage(msg);
                        }}
                        className="p-1 px-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg border border-white/5 bg-[#121420] shadow-md transition-all active:scale-90"
                        title="Reply to message"
                      >
                        <CornerUpLeft size={13} />
                      </button>
                      {onOpenThread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenThread(msg);
                          }}
                          className="p-1 px-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg border border-white/5 bg-[#121420] shadow-md transition-all active:scale-90"
                          title="Reply in thread"
                        >
                          <MessageSquare size={12} />
                        </button>
                      )}
                      {isMe && msg.type === "text" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMessageId(msg._id);
                            setEditValue(msg.content);
                          }}
                          className="p-1 px-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg border border-white/5 bg-[#121420] shadow-md transition-all active:scale-90"
                          title="Edit message"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                      {isMe && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteMessage(msg);
                          }}
                          className="p-1 px-1.5 text-red-400 hover:text-red-200 hover:bg-red-500/10 active:bg-red-500/20 rounded-lg border border-red-500/10 hover:border-red-500/30 bg-[#121420] shadow-md transition-all active:scale-90"
                          title="Delete message"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          socket.emit("pin-message", {
                            messageId: msg._id,
                            isPinned: !msg.pinned,
                          });
                        }}
                        className={`p-1 px-1.5 rounded-lg border shadow-md transition-all active:scale-90 ${
                          msg.pinned
                            ? "text-[#F59E0B] border-amber-500/20 bg-amber-500/15 hover:text-amber-300"
                            : "text-slate-400 hover:text-white hover:bg-white/10 border-white/5 bg-[#121420]"
                        }`}
                        title={msg.pinned ? "Unpin message" : "Pin message"}
                      >
                        <Pin
                          size={12}
                          className={msg.pinned ? "fill-amber-500" : ""}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePickerId(
                            activePickerId === msg._id ? null : msg._id,
                          );
                        }}
                        className="p-1 px-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg border border-white/5 bg-[#121420] shadow-md transition-all active:scale-90"
                        title="React with emoji"
                      >
                        <Smile size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Custom Reactions list displayed directly underneath */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5 z-10 max-w-full">
                      {msg.reactions.map((react) => {
                        const hasReacted = react.users.some(
                          (u) => u._id === user.id,
                        );
                        const reactionKey = `${msg._id}-${react.emoji}`;
                        return (
                          <div
                            key={react.emoji}
                            className="relative"
                            onMouseEnter={() =>
                              setHoveredReactionKey(reactionKey)
                            }
                            onMouseLeave={() => setHoveredReactionKey(null)}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleReaction(msg._id, react.emoji);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none transition-all duration-200 border cursor-pointer ${
                                hasReacted
                                  ? "bg-purple-600/20 border-purple-500/40 text-purple-200 shadow-md shadow-purple-500/5"
                                  : "bg-white/5 border-white/5 text-slate-400 hover:border-white/10 hover:text-white"
                              }`}
                              type="button"
                            >
                              <span className="text-sm leading-none flex items-center justify-center">
                                {react.emoji.startsWith("http://") ||
                                react.emoji.startsWith("https://") ||
                                react.emoji.startsWith("data:") ? (
                                  <img
                                    src={react.emoji}
                                    alt="custom reaction"
                                    className="w-4 h-4 object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  react.emoji
                                )}
                              </span>
                              <span className="text-[10px] font-bold font-mono">
                                {react.users.length}
                              </span>
                            </button>

                            <AnimatePresence>
                              {hoveredReactionKey === reactionKey && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: -8 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: -8 }}
                                  transition={{
                                    type: "spring",
                                    damping: 15,
                                    stiffness: 400,
                                  }}
                                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#121422] border border-white/10 px-3 py-2 rounded-2xl shadow-2xl z-50 pointer-events-none min-w-[140px] text-left select-none backdrop-blur-md"
                                >
                                  {/* Arrow indicator */}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[5px] w-2 h-2 bg-[#121422] border-r border-b border-white/10 rotate-45" />
                                  <div className="flex flex-col gap-1.5 max-w-[200px]">
                                    <div className="flex items-center gap-1.5 pb-1 border-b border-white/5">
                                      <span className="text-sm leading-none flex items-center justify-center">
                                        {react.emoji.startsWith("http://") ||
                                        react.emoji.startsWith("https://") ||
                                        react.emoji.startsWith("data:") ? (
                                          <img
                                            src={react.emoji}
                                            alt="custom reaction"
                                            className="w-4 h-4 object-contain"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          react.emoji
                                        )}
                                      </span>
                                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                                        Reactions
                                      </span>
                                    </div>
                                    <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                                      {react.users.map((u) => (
                                        <div
                                          key={u._id}
                                          className="text-[11px] font-bold text-indigo-300 flex items-center gap-1"
                                        >
                                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                          <span className="truncate">
                                            {u.username}
                                          </span>
                                          {u._id === user.id && (
                                            <span className="text-[9px] text-white/40 font-bold uppercase">
                                              (You)
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {msg.threadCount !== undefined && msg.threadCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenThread && onOpenThread(msg);
                      }}
                      className="mt-2 text-[#818CF8] bg-indigo-500/10 border border-indigo-500/15 hover:bg-indigo-500/20 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider flex items-center gap-1.5 shadow shadow-black/10 cursor-pointer w-fit select-none"
                    >
                      <MessageSquare size={10} className="fill-indigo-400" />
                      <span>
                        {msg.threadCount}{" "}
                        {msg.threadCount === 1 ? "reply" : "replies"}
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}

          {activeTyping.map((typingUsername) => (
            <motion.div
              key={`typing-${typingUsername}`}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="flex justify-start w-full items-end gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600/30 to-indigo-600/20 text-purple-300 font-extrabold flex items-center justify-center text-[10px] uppercase mb-1 border border-purple-500/20 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30 select-none overflow-hidden">
                {(() => {
                  const avatarUrl = getAvatarForTypingUser(typingUsername);
                  return avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={typingUsername}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    typingUsername.charAt(0)
                  );
                })()}
              </div>
              <div className="max-w-[75%] flex flex-col items-start relative">
                <div className="relative px-5 py-3 rounded-[22px] rounded-bl-none bg-gradient-to-r from-purple-500/5 via-[#1A1E2A] to-indigo-500/5 text-slate-400 border border-purple-500/20 shadow-xl shadow-purple-950/20 flex items-center gap-3 h-10 transition-all duration-300 hover:border-purple-500/40">
                  <span className="text-[13px] font-medium text-purple-300/90 select-none animate-pulse duration-1000">
                    {typingUsername} is typing
                  </span>
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full"
                        animate={{
                          y: [0, -6, 0],
                          scale: [0.8, 1.2, 0.8],
                          opacity: [0.35, 1, 0.35],
                        }}
                        transition={{
                          duration: 0.9,
                          repeat: Infinity,
                          ease: [0.4, 0, 0.2, 1],
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Zone */}
      <div className="px-6 pb-8 pt-4 bg-[#0F111A]/80 backdrop-blur-2xl relative z-20 border-t border-white/5">
        {/* Expandable Video Record Panel */}
        <AnimatePresence>
          {isVideoMode && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, height: "auto", scale: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#121422]/95 border border-white/10 rounded-[24px] p-4 sm:p-5 mb-4 shadow-2xl relative overflow-hidden backdrop-blur-xl grid grid-cols-2 gap-4 sm:gap-6 md:gap-10 lg:gap-16 items-center"
              id="video-recording-panel"
            >
              {/* Camera view / Playback container */}
              <div className="flex flex-col items-center justify-center w-full min-w-0">
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-inner flex items-center justify-center">
                  {videoError ? (
                    <div className="p-4 text-center text-xs text-red-400 font-medium">
                      {videoError}
                    </div>
                  ) : !videoUrl ? (
                    <>
                      <video
                        id="webcam-live-preview"
                        ref={(el) => {
                          liveVideoElementRef.current = el;
                          if (el && videoStreamRef.current && !el.srcObject) {
                            el.srcObject = videoStreamRef.current;
                          }
                        }}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover scale-x-[-1]"
                      />

                      {isRecordingVideo && (
                        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg text-white font-mono text-[10px] sm:text-xs font-bold uppercase transition-all duration-300 ${isRecordingPaused ? "bg-amber-600/90 text-amber-100" : "bg-red-600/90 animate-pulse"}`}>
                          {!isRecordingPaused ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-white block animate-ping" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-300 block" />
                          )}
                          <span>
                            {isRecordingPaused ? "PAUSED" : "REC"} • 00:{videoTime < 10 ? "0" : ""}
                            {videoTime}
                          </span>
                        </div>
                      )}

                      {!isRecordingVideo && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-widest font-mono text-center px-2">
                            Camera Viewfinder
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <video
                      id="recorded-playback"
                      src={videoUrl}
                      autoPlay
                      loop
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>

              {/* Control panel buttons */}
              <div className="flex flex-col items-center justify-center text-center gap-2.5 w-full select-none min-w-0" id="video-recording-control-col">
                <div className="text-center flex flex-col items-center justify-center w-full">
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight">
                    Video Message
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 leading-snug max-w-[150px] sm:max-w-xs">
                    Capture and share a live moment
                  </p>
                </div>

                {videoThumbnail && (
                  <div className="flex flex-col items-center gap-1.5 p-1.5 bg-white/5 border border-white/5 rounded-xl duration-300 w-full select-none transition-all" id="video-thumbnail-preview">
                    <span className="text-[9px] text-[#A78BFA] font-bold tracking-wider uppercase font-mono">
                      First Frame Preview
                    </span>
                    <div className="relative aspect-video w-24 sm:w-28 rounded-lg overflow-hidden border border-white/15 shadow-md">
                      <img
                        src={videoThumbnail}
                        alt="First Frame Thumbnail Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 w-full max-w-[160px] sm:max-w-[200px] mx-auto mt-1.5 items-center justify-center">
                  {!videoUrl ? (
                    <>
                      {!isRecordingVideo ? (
                        <button
                          type="button"
                          id="btn-start-record-video"
                          onClick={startRecordingVideo}
                          disabled={!!videoError}
                          className="w-full py-2 sm:py-2.5 px-3 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:hover:bg-red-500 rounded-xl text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-95 transition-all duration-150 cursor-pointer outline-none border-none select-none"
                        >
                          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full" />
                          Start Record
                        </button>
                      ) : (
                        <>
                          {isRecordingPaused ? (
                            <button
                              type="button"
                              id="btn-resume-record-video"
                              onClick={resumeRecordingVideo}
                              className="w-full py-2 sm:py-2.5 px-3 bg-green-500 hover:bg-green-600 text-white font-extrabold text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-green-500/20 active:scale-95 transition-all duration-150 cursor-pointer outline-none border-none select-none animate-pulse"
                            >
                              <Play size={11} className="sm:w-3 sm:h-3" fill="currentColor" />
                              Resume
                            </button>
                          ) : (
                            <button
                              type="button"
                              id="btn-pause-record-video"
                              onClick={pauseRecordingVideo}
                              className="w-full py-2 sm:py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all duration-150 cursor-pointer outline-none border-none select-none"
                            >
                              <Pause size={11} className="sm:w-3 sm:h-3" fill="currentColor" />
                              Pause
                            </button>
                          )}
                          <button
                            type="button"
                            id="btn-stop-record-video"
                            onClick={stopRecordingVideo}
                            className="w-full py-2 sm:py-2.5 px-3 bg-yellow-500 hover:bg-yellow-600 rounded-xl text-black font-extrabold text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 active:scale-95 transition-all duration-150 cursor-pointer outline-none border-none select-none"
                          >
                            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-black rounded-sm" />
                            Stop & Review
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        id="btn-send-record-video"
                        onClick={sendRecordedVideo}
                        className="w-full py-2 sm:py-2.5 px-3 bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-[1.02] rounded-xl text-white font-black text-[10px] sm:text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-purple-500/30 active:scale-95 transition-all duration-150 cursor-pointer outline-none border-none"
                      >
                        <Send size={11} fill="white" className="sm:w-3 sm:h-3" />
                        Send Clip
                      </button>

                      <button
                        type="button"
                        id="btn-retake-record-video"
                        onClick={startVideoMode}
                        className="w-full py-2 sm:py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all duration-150 cursor-pointer outline-none"
                      >
                        <RotateCcw size={11} className="sm:w-3 sm:h-3" />
                        Retake
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    id="btn-close-record-video"
                    onClick={closeVideoMode}
                    className="w-full py-1.5 sm:py-2 px-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-bold text-[9px] sm:text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer outline-none border-none"
                  >
                    <X size={11} className="sm:w-3 sm:h-3" />
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply Preview Card */}
        <AnimatePresence>
          {replyToMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: 10 }}
              className="bg-[#121422]/90 border border-white/10 rounded-[20px] p-4.5 mb-4 shadow-xl backdrop-blur-xl flex items-center justify-between gap-4 overflow-hidden"
              id="reply-preview-active-card"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-1.5 h-10 bg-indigo-500 rounded-full shrink-0" />
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-xs font-black text-indigo-400">
                    Replying to @{replyToMessage.sender?.username}
                  </span>
                  <span className="text-slate-300 text-xs font-medium truncate max-w-[300px] sm:max-w-[480px]">
                    {replyToMessage.type === "text" && replyToMessage.content}
                    {replyToMessage.type === "image" && "📸 Image attachment"}
                    {replyToMessage.type === "audio" && "🎵 Voice Note"}
                    {replyToMessage.type === "video" && "🎥 Video Clip"}
                    {replyToMessage.type === "file" && "📁 Shared File"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReplyToMessage(null)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all shrink-0 cursor-pointer outline-none border-none select-none"
                title="Cancel reply"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={handleSubmit}
          className="bg-white/5 border border-white/10 rounded-[28px] p-2 flex items-center gap-1 shadow-2xl shadow-black/20 backdrop-blur-xl group focus-within:border-indigo-500/30 transition-all"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,application/pdf,text/plain,application/zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.txt,.zip,.json,.csv,.md"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-[22px]"
          >
            <Paperclip size={22} className="rotate-45" />
          </button>

          <input
            type="text"
            value={input}
            onChange={handleTyping}
            placeholder={
              isRecording
                ? "Listening..."
                : isVideoMode
                  ? "Camera mode active..."
                  : "Message Aka Hub..."
            }
            disabled={isRecording || isVideoMode}
            className={`flex-1 bg-transparent py-4 px-3 text-white placeholder-slate-600 focus:outline-none font-medium text-[16px] ${isRecording || isVideoMode ? "opacity-50 animate-pulse" : ""}`}
          />

          <button
            type="button"
            className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-[22px]"
          >
            <Smile size={22} />
          </button>

          <button
            type="button"
            onClick={isVideoMode ? closeVideoMode : startVideoMode}
            disabled={isRecording}
            className={`w-12 h-12 flex items-center justify-center transition-all rounded-[22px] ${isVideoMode ? "text-purple-500 bg-purple-500/10 scale-110 shadow-lg shadow-purple-500/20" : "text-slate-500 hover:text-white hover:bg-white/5 hover:disabled:opacity-40 disabled:opacity-35"}`}
            title="Record Video Message"
            id="btn-trigger-video-note"
          >
            <Video size={22} fill={isVideoMode ? "currentColor" : "none"} />
          </button>

          <button
            type="button"
            onClick={toggleRecording}
            disabled={isVideoMode}
            className={`w-12 h-12 flex items-center justify-center transition-all rounded-[22px] ${isRecording ? "text-red-500 bg-red-500/10 scale-110 shadow-lg shadow-red-500/20" : "text-slate-500 hover:text-white hover:bg-white/5 hover:disabled:opacity-40 disabled:opacity-35"}`}
            title="Record Voice Message"
          >
            <Mic size={22} fill={isRecording ? "currentColor" : "none"} />
          </button>

          <button
            type="submit"
            disabled={!input.trim() || isRecording || isVideoMode}
            className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-[1.03] active:scale-95 rounded-[22px] text-white shadow-xl shadow-purple-500/30 transition-all flex items-center justify-center disabled:opacity-30 disabled:grayscale transition-all"
          >
            <Send size={18} fill="white" className="ml-0.5" />
          </button>
        </form>
      </div>

      {/* Sleek Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDeleteMessage(null)}
              className="absolute inset-0 bg-black/65 backdrop-blur-md"
            />
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative w-full max-w-md bg-[#121422] border border-white/10 rounded-[28px] p-6 shadow-2xl z-10 overflow-hidden flex flex-col gap-5 text-left"
            >
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Delete Message?
                  </h3>
                  <p className="text-xs text-slate-400 font-medium select-none">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Message preview snippet */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 block mb-1 select-none">
                  Message Preview
                </span>
                <p className="text-slate-300 text-sm leading-relaxed font-medium break-words">
                  {confirmDeleteMessage.type === "text" &&
                    confirmDeleteMessage.content}
                  {confirmDeleteMessage.type === "image" &&
                    "📸 Image attachment"}
                  {confirmDeleteMessage.type === "audio" && "🎵 Voice Note"}
                  {confirmDeleteMessage.type === "video" && "🎥 Video Clip"}
                  {confirmDeleteMessage.type === "file" && "📁 Shared File"}
                </p>
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteMessage(null)}
                  className="px-5 py-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all select-none outline-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteMessage(confirmDeleteMessage._id)}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:opacity-90 hover:scale-[1.02] active:scale-95 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-500/20 outline-none cursor-pointer border-none"
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Custom Right-Click Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            style={{
              top: `${Math.min(window.innerHeight - 180, contextMenu.y)}px`,
              left: `${Math.min(window.innerWidth - 180, contextMenu.x)}px`,
            }}
            className="fixed z-[120] bg-[#11131E]/95 border border-white/10 rounded-2xl p-2 min-w-[170px] shadow-2xl backdrop-blur-md flex flex-col gap-0.5 font-sans"
          >
            <button
              onClick={() => {
                socket.emit("pin-message", {
                  messageId: contextMenu.msg._id,
                  isPinned: !contextMenu.msg.pinned,
                });
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-white/5 rounded-xl text-xs font-bold text-slate-200 transition-all cursor-pointer flex items-center gap-2 border-none bg-transparent"
            >
              <span>📌</span>
              {contextMenu.msg.pinned ? "Unpin Message" : "Pin Message"}
            </button>

            {contextMenu.msg.sender._id === user.id && (
              <>
                {contextMenu.msg.type === "text" && (
                  <button
                    onClick={() => {
                      setEditingMessageId(contextMenu.msg._id);
                      setEditValue(contextMenu.msg.content);
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-white/5 rounded-xl text-xs font-bold text-slate-200 transition-all cursor-pointer flex items-center gap-2 border-none bg-transparent"
                  >
                    <span>✏️</span>
                    Edit Message
                  </button>
                )}
                <button
                  onClick={() => {
                    setConfirmDeleteMessage(contextMenu.msg);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-red-500/10 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 transition-all cursor-pointer flex items-center gap-2 border-none bg-transparent"
                >
                  <span>🗑️</span>
                  Delete Message
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Message Confirmation Modal */}
      <AnimatePresence>
        {pendingEditId && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#07080D]/80 backdrop-blur-md"
              onClick={() => setPendingEditId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-[#11131E]/95 border border-white/10 p-6 rounded-[28px] shadow-2xl z-10 space-y-4 text-slate-200"
            >
              <div className="flex gap-4 items-center">
                <div className="w-11 h-11 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0 select-none">
                  ✏️
                </div>
                <div className="text-left">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Edit Message?
                  </h3>
                  <p className="text-xs text-slate-400 font-medium select-none mt-0.5">
                    Are you sure you want to edit this message?
                  </p>
                </div>
              </div>

              {/* Message preview snippet */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 max-h-[140px] overflow-y-auto custom-scrollbar">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block mb-1.5 select-none">
                  New Content Preview
                </span>
                <p className="text-slate-350 text-sm leading-relaxed font-semibold break-words italic">
                  "{editValue}"
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setPendingEditId(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all select-none outline-none cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmSaveEdit}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/25 outline-none cursor-pointer border-none"
                >
                  Confirm Edit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
