import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User as UserIcon, 
  Bell, 
  Monitor, 
  Shield, 
  LogOut, 
  Camera, 
  Upload, 
  Link, 
  Check, 
  Sparkles,
  Volume2
} from 'lucide-react';
import { User } from '../../lib/types';

interface SettingsModalProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  onUpdateCurrentUser?: (newData: Partial<User>) => void;
}

const PRESET_AVATARS = [
  { name: 'Dreamy Amethyst', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60' },
  { name: 'Cyberpunk Neon', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=150&auto=format&fit=crop&q=60' },
  { name: 'Ethereal Wave', url: 'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?w=150&auto=format&fit=crop&q=60' },
  { name: 'Lunar Plasma', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150&auto=format&fit=crop&q=60' },
  { name: 'Crimson Aurora', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150&auto=format&fit=crop&q=60' },
  { name: 'Sunset Bloom', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&auto=format&fit=crop&q=60' },
];

export function SettingsModal({ user, onClose, onLogout, onUpdateCurrentUser }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'privacy'>('profile');
  
  // --- Profile States ---
  const [name, setName] = useState(user.username);
  const [status, setStatus] = useState(user.statusMessage || 'Active');
  const [bio, setBio] = useState('Product Engineer • Nexus HQ');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [avatarInput, setAvatarInput] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Notifications Toggles ---
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [notifyReplies, setNotifyReplies] = useState(true);
  const [notifySounds, setNotifySounds] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(() => {
    return 'Notification' in window && Notification.permission === 'granted';
  });

  const handleToggleDesktopNotifications = async () => {
    if (!('Notification' in window)) {
      showToast("Web Notifications not supported");
      return;
    }

    if (Notification.permission === 'granted') {
      showToast("To opt out completely, please revoke permission in browser settings.");
      setDesktopNotifications(false);
    } else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setDesktopNotifications(true);
        showToast("System notifications activated!");
        try {
          new Notification("Notifications Enabled", {
            body: "You will now receive desktop notifications for new messages!",
            icon: user.avatarUrl || '/favicon.ico'
          });
        } catch (e) {
          console.error(e);
        }
      } else {
        setDesktopNotifications(false);
        showToast("Notification permission denied.");
      }
    }
  };

  // --- Appearance Selectors ---
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  // --- Privacy Toggles ---
  const [readReceipts, setReadReceipts] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [typingIndicator, setTypingIndicator] = useState(true);

  // Status Alerts
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- Save Profile Changes ---
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          statusMessage: status, 
          avatarUrl: avatarUrl
        })
      });
      if (res.ok) {
        showToast("Profile settings saved successfully");
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser({ statusMessage: status, avatarUrl: avatarUrl });
        }
      } else {
        showToast("Could not sync changes with server");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error saving profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAvatarUrl(base64);
        setShowAvatarPicker(false);
        showToast("Custom avatar loaded!");
      };
      reader.readAsDataURL(file);
    }
  };

  const menuItems = [
    { id: 'profile' as const, label: 'Profile', icon: UserIcon },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'appearance' as const, label: 'Appearance', icon: Monitor },
    { id: 'privacy' as const, label: 'Privacy', icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#07080D]/85 backdrop-blur-xl"
      />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="relative w-full max-w-4xl h-[560px] bg-[#111322] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl shadow-indigo-505/10 z-10 flex text-slate-200"
      >
        {/* Left Options sidebar */}
        <div className="w-60 h-full bg-[#0B0D18] border-r border-white/5 p-6 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase select-none block mb-6 px-3">
              Settings
            </span>
            <div className="space-y-1">
              {menuItems.map((item) => {
                const IconComp = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-bold transition-all relative cursor-pointer ${
                      isActive 
                        ? 'bg-gradient-to-r from-purple-550/15 to-indigo-650/5 border border-purple-550/20 text-white shadow-xl shadow-purple-500/5' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeSettingsTabLine"
                        className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-purple-400 to-indigo-550 rounded-full"
                      />
                    )}
                    <IconComp size={16} className={isActive ? 'text-purple-400' : 'text-slate-500'} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all rounded-2xl text-sm font-black border border-transparent cursor-pointer"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>

        {/* Right Active pane */}
        <div className="flex-1 h-full p-8 flex flex-col justify-between relative bg-[#111322]/50">
          
          {/* Header row */}
          <div className="flex justify-between items-center pb-4 border-b border-white/5">
            <h3 className="text-xl font-bold text-white capitalize leading-none">{activeTab} settings</h3>
            <button 
              onClick={onClose}
              className="w-9 h-9 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full flex items-center justify-center transition-all cursor-pointer border border-white/5"
            >
              <X size={16} />
            </button>
          </div>

          {/* Core Content Area */}
          <div className="flex-1 overflow-y-auto pt-6 pb-4 pr-1 scroll-smooth custom-scrollbar text-left">
            <AnimatePresence mode="wait">
              
              {/* Profile Config */}
              {activeTab === 'profile' && (
                <motion.div
                  key="tab_profile"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  {/* Photo avatar select */}
                  <div className="flex items-center gap-5">
                    <div className="relative group/change shadow-lg">
                      <div className="w-20 h-20 bg-slate-800 rounded-3xl border border-white/10 flex items-center justify-center text-3xl font-extrabold text-white overflow-hidden select-none">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <button 
                        onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                        className="absolute inset-0 bg-black/55 rounded-3xl flex items-center justify-center text-white opacity-0 group-hover/change:opacity-100 transition-opacity cursor-pointer border-none"
                      >
                        <Camera size={16} />
                      </button>
                    </div>

                    <div>
                      <button 
                        onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                        className="text-sm font-bold text-purple-400 hover:text-purple-300 text-left cursor-pointer hover:underline border-none bg-transparent"
                      >
                        Change avatar
                      </button>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">Select an artwork or upload your image file.</p>
                    </div>
                  </div>

                  {/* Preset Avatar Picker drawer inside setting modal */}
                  <AnimatePresence>
                    {showAvatarPicker && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-[#0B0D18] rounded-2xl border border-white/5 p-4 space-y-4 overflow-hidden"
                      >
                        <div className="grid grid-cols-6 gap-2">
                          {PRESET_AVATARS.map((pct) => (
                            <button
                              key={pct.url}
                              onClick={() => {
                                setAvatarUrl(pct.url);
                                setShowAvatarPicker(false);
                              }}
                              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 cursor-pointer ${
                                avatarUrl === pct.url ? 'border-purple-550' : 'border-transparent'
                              }`}
                            >
                              <img src={pct.url} alt={pct.name} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>

                        <div className="border-t border-white/5 pt-3.5 flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase text-purple-400 tracking-wider">
                            Or link / upload
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="file"
                              ref={fileInputRef}
                              onChange={handleAvatarFileUpload}
                              className="hidden"
                              accept="image/*"
                            />
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-lg border border-white/5 cursor-pointer text-[#FF5500]"
                            >
                              File upload
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Settings fields */}
                  <div className="space-y-4 max-w-lg">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono">
                        Name
                      </label>
                      <input 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#0B0D18] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-550/40 font-medium font-sans placeholder:text-slate-600 transition-all shadow-inner"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono">
                        Status
                      </label>
                      <input 
                        type="text"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-[#0B0D18] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-550/40 font-medium font-sans placeholder:text-slate-600 transition-all shadow-inner"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono">
                        Bio
                      </label>
                      <input 
                        type="text"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full bg-[#0B0D18] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-550/40 font-medium font-sans placeholder:text-slate-600 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Notification Toggles */}
              {activeTab === 'notifications' && (
                <motion.div
                  key="tab_notifications"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-5"
                >
                  <p className="text-xs text-slate-500 font-medium mb-3">Adjust how and when you receive workspace events.</p>

                  <div className="divide-y divide-white/5 bg-[#0B0D18]/40 border border-white/5 rounded-[24px] overflow-hidden shadow-inner">
                    
                    {/* Toggle mentions */}
                    <div className="flex justify-between items-center p-5">
                      <div>
                        <h4 className="text-sm font-bold text-white">Notify on @mentions</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Receive alert when someone mentions you in text.</p>
                      </div>
                      <button 
                        onClick={() => setNotifyMentions(!notifyMentions)}
                        className={`w-11 h-6 rounded-full transition-colors relative duration-300 flex items-center cursor-pointer border-none outline-none ${
                          notifyMentions ? 'bg-purple-550' : 'bg-slate-800'
                        }`}
                      >
                        <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform absolute ${
                          notifyMentions ? 'left-5.5' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Toggle replies */}
                    <div className="flex justify-between items-center p-5">
                      <div>
                        <h4 className="text-sm font-bold text-white">Notify on replies</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Receive notifications when someone replies directly to your message threads.</p>
                      </div>
                      <button 
                        onClick={() => setNotifyReplies(!notifyReplies)}
                        className={`w-11 h-6 rounded-full transition-colors relative duration-300 flex items-center cursor-pointer border-none outline-none ${
                          notifyReplies ? 'bg-purple-550' : 'bg-slate-800'
                        }`}
                      >
                        <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform absolute ${
                          notifyReplies ? 'left-5.5' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Toggle sounds */}
                    <div className="flex justify-between items-center p-5">
                      <div>
                        <h4 className="text-sm font-bold text-white">Play notification sounds</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Sound feedback on incoming chat notifications.</p>
                      </div>
                      <button 
                        onClick={() => setNotifySounds(!notifySounds)}
                        className={`w-11 h-6 rounded-full transition-colors relative duration-300 flex items-center cursor-pointer border-none outline-none ${
                          notifySounds ? 'bg-purple-550' : 'bg-slate-800'
                        }`}
                      >
                        <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform absolute ${
                          notifySounds ? 'left-5.5' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Desktop notify */}
                    <div className="flex justify-between items-center p-5">
                      <div>
                        <h4 className="text-sm font-bold text-white">Desktop notifications</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Pushes popups via system tray when idle.</p>
                      </div>
                      <button 
                        onClick={handleToggleDesktopNotifications}
                        className={`w-11 h-6 rounded-full transition-colors relative duration-300 flex items-center cursor-pointer border-none outline-none ${
                          desktopNotifications ? 'bg-purple-550' : 'bg-slate-800'
                        }`}
                      >
                        <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform absolute ${
                          desktopNotifications ? 'left-5.5' : 'left-1'
                        }`} />
                      </button>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* Appearance tab */}
              {activeTab === 'appearance' && (
                <motion.div
                  key="tab_appearance"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  {/* MESSAGE DENSITY */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#8B5CF6]/85 font-mono select-none block">
                      Message Density
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDensity('comfortable')}
                        className={`flex-1 p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                          density === 'comfortable' 
                            ? 'bg-purple-550/10 border-purple-550 text-white shadow-lg' 
                            : 'bg-[#0B0D18] border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <h5 className="text-sm font-bold">Comfortable</h5>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">Spacious rendering with classic avatar bubbles aligned alongside texts.</p>
                      </button>

                      <button
                        onClick={() => setDensity('compact')}
                        className={`flex-1 p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                          density === 'compact' 
                            ? 'bg-purple-550/10 border-purple-550 text-white shadow-lg' 
                            : 'bg-[#0B0D18] border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <h5 className="text-sm font-bold">Compact</h5>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">Tense inline layouts maximizing vertical history on small monitors.</p>
                      </button>
                    </div>
                  </div>

                  {/* FONT SIZES */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#8B5CF6]/85 font-mono select-none block">
                      Font Size
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['small', 'medium', 'large'] as const).map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setFontSize(sz)}
                          className={`py-3 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${
                            fontSize === sz 
                              ? 'bg-purple-550/15 border-purple-550 text-white shadow-md' 
                              : 'bg-[#0B0D18] border-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Privacy settings config */}
              {activeTab === 'privacy' && (
                <motion.div
                  key="tab_privacy"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-5"
                >
                  <p className="text-xs text-slate-500 font-medium mb-3">Adjust data and activity exposures inside Nexus channels.</p>

                  <div className="divide-y divide-white/5 bg-[#0B0D18]/40 border border-white/5 rounded-[24px] overflow-hidden shadow-inner">
                    
                    {/* Read receipts */}
                    <div className="flex justify-between items-center p-5">
                      <div>
                        <h4 className="text-sm font-bold text-white">Show read receipts</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Let others know when you have read their direct messages.</p>
                      </div>
                      <button 
                        onClick={() => setReadReceipts(!readReceipts)}
                        className={`w-11 h-6 rounded-full transition-colors relative duration-300 flex items-center cursor-pointer border-none outline-none ${
                          readReceipts ? 'bg-purple-550' : 'bg-slate-800'
                        }`}
                      >
                        <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform absolute ${
                          readReceipts ? 'left-5.5' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Online indicator exposure */}
                    <div className="flex justify-between items-center p-5">
                      <div>
                        <h4 className="text-sm font-bold text-white">Show online status</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Publishes glowing green bullet indicator to channels when active.</p>
                      </div>
                      <button 
                        onClick={() => setOnlineStatus(!onlineStatus)}
                        className={`w-11 h-6 rounded-full transition-colors relative duration-300 flex items-center cursor-pointer border-none outline-none ${
                          onlineStatus ? 'bg-purple-550' : 'bg-slate-800'
                        }`}
                      >
                        <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform absolute ${
                          onlineStatus ? 'left-5.5' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Typing state exposure */}
                    <div className="flex justify-between items-center p-5">
                      <div>
                        <h4 className="text-sm font-bold text-white">Show typing indicator</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Let rooms watch animated dots when you compose messages.</p>
                      </div>
                      <button 
                        onClick={() => setTypingIndicator(!typingIndicator)}
                        className={`w-11 h-6 rounded-full transition-colors relative duration-300 flex items-center cursor-pointer border-none outline-none ${
                          typingIndicator ? 'bg-purple-550' : 'bg-slate-800'
                        }`}
                      >
                        <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform absolute ${
                          typingIndicator ? 'left-5.5' : 'left-1'
                        }`} />
                      </button>
                    </div>

                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Bottom Action bar */}
          <div className="w-full border-t border-white/5 pt-5 flex items-center justify-between">
            <div>
              {toast && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="text-xs font-bold text-purple-400 font-mono"
                >
                  {toast}
                </motion.div>
              )}
            </div>
            {activeTab === 'profile' ? (
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="px-6 py-3 bg-[#7C3AED] hover:bg-[#6D38D3] disabled:opacity-40 text-sm font-bold text-white rounded-2xl transition-all shadow-lg shadow-purple-500/20 active:scale-95 flex items-center gap-2 cursor-pointer border-none"
              >
                {isSavingProfile ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Save changes
              </button>
            ) : (
              <button
                onClick={() => {
                  showToast("Settings preserved locally!");
                  setTimeout(onClose, 400);
                }}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-sm font-bold text-white rounded-2xl transition-all border border-white/5 cursor-pointer"
              >
                Done
              </button>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}
