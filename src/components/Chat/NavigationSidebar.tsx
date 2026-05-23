import React from 'react';
import { 
  Mail, 
  MessageSquare, 
  Bell, 
  Trash2, 
  Sparkles,
  Settings,
  Archive,
  Gamepad2
} from 'lucide-react';

import { User } from '../../lib/types';

interface NavigationSidebarProps {
  onGameZoneOpen: () => void;
  user: User;
  onViewProfile: (userId: string) => void;
}

export function NavigationSidebar({ onGameZoneOpen, user, onViewProfile }: NavigationSidebarProps) {
  return (
    <div className="w-[84px] h-full bg-[#0F111A] flex flex-col items-center py-10 gap-12 border-r border-white/5">
      <div className="w-12 h-12 bg-gradient-to-br from-[#FF6A1F] to-[#FF4500] rounded-[20px] flex items-center justify-center text-white shadow-2xl shadow-orange-500/40 cursor-pointer hover:rotate-12 transition-transform">
        <Sparkles size={24} fill="white" />
      </div>

      <div className="flex-1 flex flex-col gap-9 items-center w-full">
        <button className="p-4 text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-2xl">
          <Mail size={24} />
        </button>
        <button className="p-4 text-[#FF5500] bg-[#FF5500]/10 rounded-2xl transition-all shadow-[inset_0_0_12px_rgba(255,85,0,0.05)]">
          <MessageSquare size={24} />
        </button>
        <button 
          onClick={onGameZoneOpen}
          className="p-4 text-slate-500 hover:text-indigo-400 transition-all hover:bg-white/5 rounded-2xl group"
        >
          <Gamepad2 size={24} className="group-hover:scale-110 transition-transform" />
        </button>
        <button className="p-4 text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-2xl relative">
          <Bell size={24} />
          <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-orange-500 rounded-full border-[3px] border-[#0F111A]" />
        </button>
      </div>

      <div className="flex flex-col gap-6 items-center pb-2">
        <button className="p-3 text-slate-500 hover:text-white transition-colors">
          <Settings size={24} />
        </button>
        <button 
          onClick={() => onViewProfile(user.id)}
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600/30 to-indigo-600/20 text-purple-300 font-extrabold flex items-center justify-center text-xs uppercase border border-purple-500/30 hover:border-purple-500 hover:scale-105 active:scale-95 shadow-md shadow-purple-500/5 transition-all outline-none overflow-hidden select-none"
          title="View profile"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            user.username.charAt(0)
          )}
        </button>
      </div>
    </div>
  );
}
