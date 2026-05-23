import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, MessageSquare, Flame, UserPlus, Heart, Check } from 'lucide-react';

interface NotificationsPanelProps {
  onClose: () => void;
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const [items, setItems] = useState([
    {
      id: 'n1',
      sender: 'Mira Patel',
      type: 'reply',
      detail: 'replied to you in #product-roadmap',
      quote: '"Can you double-check the Q3 milestones?"',
      time: '2m ago',
      read: false,
    },
    {
      id: 'n2',
      sender: 'Aiden Cruz',
      type: 'dm',
      detail: 'replied to your message in Aiden Cruz',
      quote: '"I will push the hotfix branch now."',
      time: '15m ago',
      read: false,
    },
    {
      id: 'n3',
      sender: 'Jordan Tse',
      type: 'reaction',
      detail: 'reacted 🔥 to your message in #engineering',
      quote: '',
      time: '1h ago',
      read: true,
    },
    {
      id: 'n4',
      sender: 'Sona Kim',
      type: 'joined',
      detail: 'joined #design-system',
      quote: 'Wave hello! 👋',
      time: '2h ago',
      read: true,
    }
  ]);

  const unreadCount = items.filter(i => !i.read).length;

  const handleMarkAllRead = () => {
    setItems(prev => prev.map(item => ({ ...item, read: true })));
  };

  const handleToggleRead = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, read: !item.read } : item));
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <motion.div
      initial={{ x: 280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 280, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 350 }}
      className="absolute md:relative inset-y-0 right-0 w-full sm:w-[320px] md:w-[280px] h-full bg-[#0F111A] border-l border-white/5 flex flex-col z-30 shrink-0 text-left shadow-2xl"
    >
      {/* Header Container */}
      <div className="p-5 pb-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-purple-600/20 text-purple-400 font-bold border border-purple-500/10 rounded-full px-2 py-0.5 text-[9px] font-mono">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={handleMarkAllRead}
            className="text-[10px] text-purple-400 hover:text-purple-300 font-bold tracking-tight cursor-pointer border-none bg-transparent"
          >
            Mark all read
          </button>
          <button 
            onClick={onClose}
            className="p-1 px-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Notifications Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar select-none">
        {items.length === 0 ? (
          <div className="py-20 text-center space-y-3 opacity-25">
            <Flame className="text-slate-400 mx-auto animate-pulse" size={24} />
            <p className="text-[10px] font-black uppercase tracking-wider">All caught up!</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => handleToggleRead(item.id)}
              className={`p-3 rounded-2xl relative transition-all border group cursor-pointer text-left ${
                item.read 
                  ? 'bg-black/10 border-transparent text-slate-400' 
                  : 'bg-gradient-to-br from-[#121421] to-[#0A0C16] border-purple-550/10 text-white'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-1 shrink-0">
                  {item.type === 'reply' && <MessageSquare className="text-purple-400" size={13} />}
                  {item.type === 'dm' && <MessageSquare className="text-[#FF5500]" size={13} />}
                  {item.type === 'reaction' && <Flame className="text-amber-500" size={13} />}
                  {item.type === 'joined' && <UserPlus className="text-green-400" size={13} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="text-[11px] font-black truncate max-w-[110px] block leading-none">{item.sender}</span>
                    <span className="text-[8px] font-bold text-slate-500 font-mono shrink-0">{item.time}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-normal">
                    {item.detail}
                  </p>
                  {item.quote && (
                    <p className={`text-[10px] italic leading-normal mt-1 border-l-2 pl-1.5 truncate border-white/5 ${
                      item.read ? 'text-slate-500' : 'text-slate-300 font-semibold'
                    }`}>
                      {item.quote}
                    </p>
                  )}
                </div>
              </div>

              {/* Individual notification dismissal cross */}
              <button
                onClick={(e) => handleRemove(item.id, e)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-white rounded transition-opacity cursor-pointer border-none bg-transparent"
              >
                <X size={10} />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
