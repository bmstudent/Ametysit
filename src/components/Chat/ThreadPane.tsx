import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Send, CornerDownRight, MessageSquare, Check } from 'lucide-react';
import { socket } from '../../lib/socket';
import { format } from 'date-fns';
import { User, Message } from '../../lib/types';

interface ThreadPaneProps {
  parentMessage: Message;
  user: User;
  activeRoom: string;
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
}

export function ThreadPane({ parentMessage, user, activeRoom, onClose, onViewProfile }: ThreadPaneProps) {
  const [replies, setReplies] = useState<Message[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const repliesEndRef = useRef<HTMLDivElement>(null);

  // Fetch thread replies from server
  useEffect(() => {
    const fetchReplies = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/messages/thread/${parentMessage._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setReplies(data);
          } else {
            console.warn("Expected JSON response but received non-JSON payload from thread replies endpoint");
            setReplies([]);
          }
        } else {
          console.error(`Thread replies endpoint returned status ${res.status}`);
          setReplies([]);
        }
      } catch (err) {
        console.error("Failed to load thread replies", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReplies();
  }, [parentMessage._id]);

  // Listen for new replies in real time
  useEffect(() => {
    const handleNewMessage = (msg: Message) => {
      if (msg.threadParentId === parentMessage._id) {
        setReplies(prev => {
          if (prev.some(r => r._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      setReplies(prev => prev.filter(r => r._id !== data.messageId));
    };

    const handleMessageUpdated = (data: { messageId: string; content: string; edited: boolean }) => {
      setReplies(prev => prev.map(r => r._id === data.messageId ? { ...r, content: data.content, edited: data.edited } : r));
    };

    socket.on('receive-message', handleNewMessage);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('message-updated', handleMessageUpdated);

    return () => {
      socket.off('receive-message', handleNewMessage);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('message-updated', handleMessageUpdated);
    };
  }, [parentMessage._id]);

  // Handle scrolling
  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const handleSendReply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyInput.trim()) return;

    const content = replyInput.trim();
    setReplyInput('');

    // Emit message reply to server
    socket.emit('send-message', {
      roomId: activeRoom,
      content,
      type: 'text',
      threadParentId: parentMessage._id
    });
  };

  const isParentMe = parentMessage.sender?._id === user.id;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      className="absolute md:relative inset-y-0 right-0 w-full md:w-[380px] lg:w-[420px] h-full border-l border-white/5 bg-[#0D0F18] flex flex-col shrink-0 z-30 shadow-2xl"
    >
      {/* Header */}
      <div className="h-20 border-b border-white/5 flex items-center justify-between px-6 bg-[#0E101A]/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/15">
            <MessageSquare size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">Thread</h3>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all outline-none border-none cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body: Parent Message + Replies list */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 min-h-0">
        
        {/* Parent Message Section */}
        <div className="bg-[#121422]/60 rounded-2xl p-4 border border-white/5 shadow-xl relative mt-2">
          <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/25 rounded-md text-[9px] font-black uppercase text-indigo-300 tracking-wider">
            Original Message
          </div>
          <div className="flex items-start gap-2.5 mt-1.5">
            <button 
              onClick={() => onViewProfile && onViewProfile(parentMessage.sender?._id)}
              className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-tr from-purple-600/30 to-indigo-600/20 text-purple-300 font-extrabold flex items-center justify-center text-[10px] uppercase border border-purple-500/20"
            >
              {parentMessage.sender?.avatarUrl ? (
                <img src={parentMessage.sender.avatarUrl} alt={parentMessage.sender.username} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
              ) : (
                parentMessage.sender?.username?.charAt(0)
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-300">
                  {parentMessage.sender?.username}
                </span>
                <span className="text-[9px] text-slate-500 font-bold uppercase">
                  {format(new Date(parentMessage.createdAt), 'h:mm a')}
                </span>
              </div>
              <p className="text-[13px] text-slate-200 mt-1.5 font-medium leading-relaxed break-words whitespace-pre-wrap">
                {parentMessage.content}
              </p>
              {parentMessage.fileUrl && (
                <div className="mt-2 rounded-xl overflow-hidden border border-white/10 max-h-[140px] bg-black/30">
                  <img src={parentMessage.fileUrl} alt="attachment" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 py-1 px-1">
          <CornerDownRight size={13} className="text-indigo-400 select-none" />
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">Replies List</span>
          <div className="flex-1 h-px bg-white/5"></div>
        </div>

        {/* Loading replies */}
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* No replies placeholder */}
        {!isLoading && replies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-indigo-500/5 flex items-center justify-center text-indigo-400/80 mb-2.5">
              <MessageSquare size={18} />
            </div>
            <p className="text-xs font-bold text-slate-400">No replies yet</p>
            <p className="text-[10px] text-slate-500 max-w-[200px] mt-1 pr-1">Be the first to leave a comment in this thread.</p>
          </div>
        )}

        {/* Replies message bubbles */}
        <div className="space-y-3 px-1">
          {replies.map((reply) => {
            const isMe = reply.sender?._id === user.id;
            return (
              <motion.div
                key={reply._id}
                initial={{ opacity: 0, scale: 0.96, y: 8, x: isMe ? 16 : -16 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <button 
                  onClick={() => onViewProfile && onViewProfile(reply.sender?._id)}
                  className="w-6.5 h-6.5 shrink-0 rounded-lg bg-[#1B1D2C] text-slate-300 font-extrabold flex items-center justify-center text-[9px] uppercase border border-white/5"
                >
                  {reply.sender?.avatarUrl ? (
                    <img src={reply.sender.avatarUrl} alt={reply.sender.username} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                  ) : (
                    reply.sender?.username?.charAt(0)
                  )}
                </button>
                <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-black text-slate-300">
                      {reply.sender?.username}
                    </span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase">
                      {format(new Date(reply.createdAt), 'h:mm a')}
                    </span>
                  </div>
                  <div
                    className={`rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs font-medium leading-relaxed break-words whitespace-pre-wrap inline-block ${
                      isMe 
                        ? 'bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white rounded-br-none rounded-tl-2xl' 
                        : 'bg-[#161826] text-slate-100 border border-white/5 rounded-bl-none'
                    }`}
                  >
                    {reply.content}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={repliesEndRef} />
        </div>

      </div>

      {/* Input */}
      <form 
        onSubmit={handleSendReply}
        className="p-4 border-t border-white/5 bg-[#0E1019] shrink-0"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Reply in thread..."
            value={replyInput}
            onChange={(e) => setReplyInput(e.target.value)}
            className="w-full bg-[#07080F] border border-white/5 focus:border-indigo-500/40 focus:outline-none rounded-xl pl-4 pr-11 py-2.5 text-xs text-white placeholder-slate-500 font-medium transition-all"
          />
          <button
            type="submit"
            disabled={!replyInput.trim()}
            className="absolute right-1 w-8 h-8 rounded-lg bg-indigo-600 disabled:opacity-30 disabled:hover:scale-100 hover:bg-indigo-500 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border-none"
          >
            <Send size={12} />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
