import { useState, useEffect, useRef } from 'react';
import { User, Message } from '../../lib/types';
import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { GameZone } from './GameZone';
import { UserProfileModal } from './UserProfileModal';
import { VideoCallOverlay } from './VideoCallOverlay';
import { SettingsModal } from './SettingsModal';
import { NotificationsPanel } from './NotificationsPanel';
import { MembersListPanel } from './MembersListPanel';
import { ThreadPane } from './ThreadPane';
import { socket } from '../../lib/socket';
import { motion, AnimatePresence } from 'motion/react';

interface ChatContainerProps {
  user: User;
  onLogout: () => void;
  onUpdateUser?: (updated: Partial<User>) => void;
}

export function ChatContainer({ user, onLogout, onUpdateUser }: ChatContainerProps) {
  const [activeRoom, setActiveRoom] = useState('product-roadmap');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGameZoneOpen, setIsGameZoneOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<{ id: string; senderName: string; message: string; avatarUrl?: string; roomId: string; }[]>([]);
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
  const originalTitleRef = useRef(document.title);

  useEffect(() => {
    if (document.title && !document.title.includes('New message')) {
      originalTitleRef.current = document.title;
    }
  }, []);

  // Request browser Notification permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  // Right side drawers & setting modal state flags
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [activeThreadMessage, setActiveThreadMessage] = useState<Message | null>(null);

  const [activeCall, setActiveCall] = useState<{
    role: 'caller' | 'recipient';
    peerId: string;
    peerUsername: string;
    initialOffer?: any;
  } | null>(null);

  useEffect(() => {
    const handleIncomingCall = (data: { fromUser: { _id: string; username: string }; offer: any }) => {
      console.log("Socket: Incoming call from", data.fromUser);
      setActiveCall({
        role: 'recipient',
        peerId: data.fromUser._id,
        peerUsername: data.fromUser.username,
        initialOffer: data.offer
      });
    };

    socket.on('incoming-call', handleIncomingCall);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
    };
  }, []);

  const startCall = (toUserId: string, toUsername: string) => {
    setActiveCall({
      role: 'caller',
      peerId: toUserId,
      peerUsername: toUsername
    });
  };

  useEffect(() => {
    if (!activeRoom) return;

    // Join room
    setTypingUsers({});
    socket.emit('join-room', activeRoom);

    // Fetch history
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/messages/${activeRoom}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error("History error:", err);
      }
    };

    fetchHistory();

    const handleNewMessage = (msg: Message) => {
      if (msg.threadParentId) return; // Skip thread replies in main list
      if (msg.roomId === activeRoom) {
        setMessages(prev => {
          const existingReal = prev.find(m => m._id === msg._id);
          if (existingReal) return prev;

          if (msg.sender._id === user.id) {
            const optimisticIndex = prev.findIndex(m => m._id.startsWith('temp-') && m.content === msg.content);
            if (optimisticIndex !== -1) {
              const newMessages = [...prev];
              newMessages[optimisticIndex] = msg;
              return newMessages;
            }
          }

          return [...prev, msg];
        });
      }
    };

    const handleTyping = (data: { roomId: string; username: string; isTyping: boolean }) => {
      if (data.roomId === activeRoom) {
        setTypingUsers(prev => ({ ...prev, [data.username]: data.isTyping }));
      }
    };

    const handleMessagesRead = (data: { roomId: string; readerId: string }) => {
      if (data.roomId === activeRoom) {
        setMessages(prev => prev.map(m => m.sender._id !== data.readerId ? { ...m, status: 'read' } : m));
      }
    };

    const handleReactionUpdated = (data: { messageId: string; reactions: any[]; roomId: string }) => {
      if (data.roomId === activeRoom) {
        setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, reactions: data.reactions } : m));
      }
    };

    const handleMessageUpdated = (data: { messageId: string; content: string; edited: boolean }) => {
      setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, content: data.content, edited: data.edited } : m));
    };

    const handleMessageDeleted = (data: { messageId: string; roomId: string }) => {
      if (data.roomId === activeRoom) {
        setMessages(prev => prev.filter(m => m._id !== data.messageId));
      }
    };

    const handleMessagePinned = (data: { messageId: string; roomId: string; isPinned: boolean }) => {
      if (data.roomId === activeRoom) {
        setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, pinned: data.isPinned } : m));
      }
    };

    const handleThreadUpdated = (data: { messageId: string; threadCount: number }) => {
      setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, threadCount: data.threadCount } : m));
      setActiveThreadMessage(curr => {
        if (curr && curr._id === data.messageId) {
          return { ...curr, threadCount: data.threadCount };
        }
        return curr;
      });
    };

    socket.on('receive-message', handleNewMessage);
    socket.on('user-typing', handleTyping);
    socket.on('messages-read', handleMessagesRead);
    socket.on('message-reaction-updated', handleReactionUpdated);
    socket.on('message-updated', handleMessageUpdated);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('message-pinned', handleMessagePinned);
    socket.on('thread-updated', handleThreadUpdated);

    return () => {
      socket.off('receive-message', handleNewMessage);
      socket.off('user-typing', handleTyping);
      socket.off('messages-read', handleMessagesRead);
      socket.off('message-reaction-updated', handleReactionUpdated);
      socket.off('message-updated', handleMessageUpdated);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('message-pinned', handleMessagePinned);
      socket.off('thread-updated', handleThreadUpdated);
      socket.emit('leave-room', activeRoom);
    };
  }, [activeRoom]);

  const sendMessage = (
    content: string,
    type: 'text' | 'image' | 'audio' | 'video' | 'file' = 'text',
    fileUrl?: string,
    replyTo?: string,
    duration?: number,
    waveformSamples?: number[]
  ) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      _id: tempId,
      sender: { _id: user.id, username: user.username },
      content,
      type,
      fileUrl,
      replyTo,
      roomId: activeRoom,
      status: 'sent',
      duration,
      waveformSamples,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);

    socket.emit('send-message', {
      roomId: activeRoom,
      content,
      type,
      fileUrl,
      replyTo,
      duration,
      waveformSamples
    });
  };

  const reactMessage = (messageId: string, emoji: string) => {
    socket.emit('react-message', { messageId, emoji });

    setMessages(prev => prev.map(m => {
      if (m._id !== messageId) return m;

      const reactions = m.reactions ? [...m.reactions] : [];
      const existingReactionIndex = reactions.findIndex(r => r.emoji === emoji);

      if (existingReactionIndex !== -1) {
        const existingReaction = { ...reactions[existingReactionIndex] };
        const userIndex = existingReaction.users.findIndex(u => u._id === user.id);

        if (userIndex !== -1) {
          const updatedUsers = [...existingReaction.users];
          updatedUsers.splice(userIndex, 1);

          if (updatedUsers.length === 0) {
            reactions.splice(existingReactionIndex, 1);
          } else {
            existingReaction.users = updatedUsers;
            reactions[existingReactionIndex] = existingReaction;
          }
        } else {
          existingReaction.users = [...existingReaction.users, { _id: user.id, username: user.username, avatarUrl: user.avatarUrl }];
          reactions[existingReactionIndex] = existingReaction;
        }
      } else {
        reactions.push({
          emoji,
          users: [{ _id: user.id, username: user.username, avatarUrl: user.avatarUrl }]
        });
      }

      return { ...m, reactions };
    }));
  };

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/users/search?q=', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDbUsers(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUsers();
  }, [refreshTrigger, activeRoom, user.id]);

  useEffect(() => {
    if (activeRoom) {
      setUnreadCounts(prev => ({
        ...prev,
        [activeRoom]: 0
      }));
    }
  }, [activeRoom]);

  useEffect(() => {
    const playNotificationSound = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        // Elegant high soft chime: start at 587.33 Hz (D5) and slide up to 880 Hz (A5)
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        
        // Very subtle volume (0.05) and smooth fade-out over 0.25 seconds
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } catch (err) {
        console.warn("Subtle notification sound failed to play:", err);
      }
    };

    const handleDMNotification = (msg: Message) => {
      // Refresh sidebar when any message arrives
      setRefreshTrigger(prev => prev + 1);

      if (msg.sender._id !== user.id) {
        const isTabHidden = document.hidden || document.visibilityState === 'hidden';
        const isDifferentRoom = msg.roomId !== activeRoom;

        // Play gentle audio notification if the user is in a different room OR the tab is hidden
        if (isDifferentRoom || isTabHidden) {
          playNotificationSound();
        }

        // HTML5 system-level notification (triggers if tab is in background, or we are in a different room)
        if (isDifferentRoom || isTabHidden) {
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              let bodyText = msg.content;
              if (msg.type === 'image') {
                bodyText = '📷 Sent an image';
              } else if (msg.type === 'file') {
                bodyText = '📁 Shared a file';
              } else if (msg.type === 'audio') {
                bodyText = '🎵 Sent an audio note';
              } else if (msg.type === 'video') {
                bodyText = '🎥 Sent a video note';
              }

              const title = `New message from ${msg.sender.username}`;
              const notification = new Notification(title, {
                body: bodyText,
                icon: msg.sender.avatarUrl || '/favicon.ico',
                tag: msg.roomId, // Replace/overwrite notification from the same room to prevent clutter
                requireInteraction: false
              });

              notification.onclick = () => {
                window.focus();
                setActiveRoom(msg.roomId);
                setMobileView('chat');
                notification.close();
              };
            } catch (err) {
              console.warn("HTML5 notification display failed:", err);
            }
          }
        }

        // Inside-app toaster notification (only if the user is in a totally different room inside the active session)
        if (isDifferentRoom) {
          setUnreadCounts(prev => ({
            ...prev,
            [msg.roomId]: (prev[msg.roomId] || 0) + 1
          }));

          // Create elegant background message toast
          const toastId = Math.random().toString(36).substring(2, 9);
          const newToast = {
            id: toastId,
            senderName: msg.sender.username,
            message: msg.content,
            avatarUrl: msg.sender.avatarUrl,
            roomId: msg.roomId
          };
          setToasts(prev => [...prev, newToast]);

          // Auto-remove toast after 4 seconds
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toastId));
          }, 4000);
        }
      }
    };

    const handleUserStatus = (data: { userId: string, isOnline: boolean }) => {
      // Refresh sidebar when anyone comes online/offline
      setRefreshTrigger(prev => prev + 1);
    };

    socket.on('receive-message', handleDMNotification);
    socket.on('user-status', handleUserStatus);
    return () => {
      socket.off('receive-message', handleDMNotification);
      socket.off('user-status', handleUserStatus);
    };
  }, [activeRoom, user.id]);

  useEffect(() => {
    const total = Object.keys(unreadCounts).reduce((acc, key) => acc + (unreadCounts[key] || 0), 0);
    if (total === 0) {
      document.title = originalTitleRef.current || "Chat App";
      return;
    }

    let isDefault = true;
    const interval = setInterval(() => {
      document.title = isDefault 
        ? `💬 (${total}) New message!` 
        : (originalTitleRef.current || "Chat App");
      isDefault = !isDefault;
    }, 1500);

    return () => {
      clearInterval(interval);
      document.title = originalTitleRef.current || "Chat App";
    };
  }, [unreadCounts]);

  return (
    <div className="h-full flex overflow-hidden bg-[#0A0B10]">
      <AnimatePresence>
        {isGameZoneOpen && (
          <GameZone 
            onClose={() => setIsGameZoneOpen(false)} 
            userPoints={user.points} 
          />
        )}
        {profileUserId && (
          <UserProfileModal
            userId={profileUserId}
            currentUserId={user.id}
            onClose={() => setProfileUserId(null)}
            onUpdateCurrentUser={onUpdateUser}
          />
        )}
        {isSettingsOpen && (
          <SettingsModal
            user={user}
            onClose={() => setIsSettingsOpen(false)}
            onLogout={onLogout}
            onUpdateCurrentUser={onUpdateUser}
          />
        )}
        {activeCall && (
          <VideoCallOverlay
            role={activeCall.role}
            peerId={activeCall.peerId}
            peerUsername={activeCall.peerUsername}
            initialOffer={activeCall.initialOffer}
            onClose={() => setActiveCall(null)}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar 
          user={user} 
          activeRoom={activeRoom} 
          onRoomSelect={(roomId) => {
            setActiveRoom(roomId);
            setMobileView('chat');
          }} 
          onLogout={onLogout}
          refreshTrigger={refreshTrigger}
          onViewProfile={setProfileUserId}
          unreadCounts={unreadCounts}
          onNotificationsToggle={() => {
            setIsNotificationsOpen(prev => !prev);
            setIsMembersOpen(false);
            setActiveThreadMessage(null);
          }}
          onMembersToggle={() => {
            setIsMembersOpen(prev => !prev);
            setIsNotificationsOpen(false);
            setActiveThreadMessage(null);
          }}
          onSettingsToggle={() => setIsSettingsOpen(true)}
          isNotificationsOpen={isNotificationsOpen}
          isMembersOpen={isMembersOpen}
          roomMessages={messages}
          className={`${mobileView === 'sidebar' ? 'flex' : 'hidden'} md:flex`}
        />
        <ChatWindow 
          user={user}
          activeRoom={activeRoom}
          messages={messages} 
          onSendMessage={sendMessage}
          typingUsers={typingUsers}
          onViewProfile={setProfileUserId}
          onStartCall={startCall}
          onReactMessage={reactMessage}
          onOpenThread={(msg) => {
            setIsNotificationsOpen(false);
            setIsMembersOpen(false);
            setActiveThreadMessage(msg);
          }}
          onBackToSidebar={() => setMobileView('sidebar')}
          className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex`}
        />
        <AnimatePresence mode="wait">
          {isNotificationsOpen && (
            <NotificationsPanel onClose={() => setIsNotificationsOpen(false)} />
          )}
          {isMembersOpen && (
            <MembersListPanel 
              onClose={() => setIsMembersOpen(false)} 
              user={user}
              dbUsers={dbUsers}
            />
          )}
          {activeThreadMessage && (
            <ThreadPane
              parentMessage={activeThreadMessage}
              user={user}
              activeRoom={activeRoom}
              onClose={() => setActiveThreadMessage(null)}
              onViewProfile={setProfileUserId}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              onClick={() => {
                setActiveRoom(toast.roomId);
                setMobileView('chat');
                setToasts(prev => prev.filter(t => t.id !== toast.id));
              }}
              className="pointer-events-auto cursor-pointer p-4 bg-[#11131E]/95 border border-indigo-500/30 rounded-2xl shadow-2xl flex items-start gap-3 backdrop-blur-xl hover:border-indigo-500/60 transition-all active:scale-95 group"
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-indigo-500/10 text-indigo-400 font-extrabold flex items-center justify-center shrink-0 border border-indigo-500/15 select-none">
                {toast.avatarUrl ? (
                  <img src={toast.avatarUrl} alt={toast.senderName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  toast.senderName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center justify-between gap-2 select-none">
                  <span className="text-[11px] font-black uppercase text-indigo-400 tracking-wider">
                    {toast.senderName}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase font-mono bg-white/5 px-1.5 py-0.5 rounded">
                    New Message
                  </span>
                </div>
                <p className="text-slate-200 text-xs font-semibold leading-relaxed truncate mt-1">
                  {toast.message}
                </p>
                <div className="text-[9px] text-indigo-400 font-bold uppercase mt-1 px-2 py-0.5 bg-indigo-500/10 rounded-lg border border-indigo-500/10 w-fit select-none">
                  Click to reply
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
