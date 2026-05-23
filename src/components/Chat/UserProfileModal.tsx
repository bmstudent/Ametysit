import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trophy, 
  Mail, 
  User as UserIcon, 
  Check, 
  Activity, 
  Pencil, 
  Sparkles,
  Award,
  Camera,
  Upload,
  Link,
  Image as ImageIcon,
  CheckCircle2,
  Palette
} from 'lucide-react';
import { User } from '../../lib/types';

const PRESET_AVATARS = [
  { name: 'Dreamy Amethyst', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60' },
  { name: 'Cyberpunk Neon', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=150&auto=format&fit=crop&q=60' },
  { name: 'Ethereal Wave', url: 'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?w=150&auto=format&fit=crop&q=60' },
  { name: 'Lunar Plasma', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150&auto=format&fit=crop&q=60' },
  { name: 'Crimson Aurora', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150&auto=format&fit=crop&q=60' },
  { name: 'Sunset Bloom', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&auto=format&fit=crop&q=60' },
];

export const PROFILE_THEMES = [
  { id: 'amethyst', name: 'Dreamy Amethyst', banner: 'from-indigo-600 via-purple-650 to-orange-500', text: 'text-purple-400', accent: '#a78bfa', accentText: 'text-purple-300', bgGlow: 'bg-purple-500/10' },
  { id: 'emerald', name: 'Emerald Oasis', banner: 'from-emerald-600 via-teal-650 to-cyan-500', text: 'text-emerald-400', accent: '#34d399', accentText: 'text-emerald-300', bgGlow: 'bg-emerald-500/10' },
  { id: 'crimson', name: 'Sunset Crimson', banner: 'from-rose-600 via-red-650 to-orange-400', text: 'text-rose-400', accent: '#f43f5e', accentText: 'text-rose-300', bgGlow: 'bg-rose-500/10' },
  { id: 'rose', name: 'Rose Delight', banner: 'from-pink-500 via-fuchsia-600 to-indigo-505', text: 'text-pink-400', accent: '#f472b6', accentText: 'text-pink-300', bgGlow: 'bg-pink-500/10' },
  { id: 'ocean', name: 'Galactic Ocean', banner: 'from-blue-600 via-cyan-650 to-indigo-600', text: 'text-cyan-400', accent: '#22d3ee', accentText: 'text-cyan-300', bgGlow: 'bg-cyan-500/10' },
];

interface UserProfileModalProps {
  userId: string;
  currentUserId: string;
  onClose: () => void;
  onUpdateCurrentUser?: (updatedUser: Partial<User>) => void;
}

export function UserProfileModal({ userId, currentUserId, onClose, onUpdateCurrentUser }: UserProfileModalProps) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Custom status text input
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState('');
  const [updating, setUpdating] = useState(false);

  // Avatar Settings
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = userId === currentUserId;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/users/profile/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setStatusInput(data.statusMessage || '');
        } else {
          setError("Failed to load user profile");
        }
      } catch (err) {
        console.error("Profile load err:", err);
        setError("Network error loading profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleUpdateStatus = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ statusMessage: statusInput.trim() })
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(prev => prev ? { ...prev, statusMessage: updated.statusMessage } : null);
        setIsEditingStatus(false);
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser({ statusMessage: updated.statusMessage });
        }
      }
    } catch (err) {
      console.error("Failed to update status message:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateAvatar = async (avatarUrlToSave: string) => {
    setUploadingAvatar(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ avatarUrl: avatarUrlToSave })
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(prev => prev ? { ...prev, avatarUrl: updated.avatarUrl } : null);
        setAvatarUrlInput('');
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser({ avatarUrl: updated.avatarUrl });
        }
      }
    } catch (err) {
      console.error("Failed to update avatarUrl:", err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateTheme = async (themeId: string) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ profileTheme: themeId })
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(prev => prev ? { ...prev, profileTheme: updated.profileTheme } : null);
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser({ profileTheme: updated.profileTheme });
        }
      }
    } catch (err) {
      console.error("Failed to update profileTheme:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert("Image too large. Please select an image under 1.5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        await handleUpdateAvatar(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Determine current active theme
  const activeTheme = PROFILE_THEMES.find(t => t.id === (profile?.profileTheme || 'amethyst')) || PROFILE_THEMES[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#07080D]/80 backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="relative w-full max-w-[420px] bg-[#11131E]/95 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl shadow-indigo-500/10 z-10"
      >
        {/* Top Accent Glow from Selected Theme */}
        <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none ${activeTheme.bgGlow}`} />

        {/* Dynamic Theme-colored Gradient Banner */}
        <div className={`h-28 bg-gradient-to-br ${activeTheme.banner} relative transition-all duration-500`}>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-black/35 hover:bg-black/50 border border-white/10 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-all backdrop-blur-sm shadow-md"
          >
            <X size={16} />
          </button>
          
          <div className="absolute top-4 left-4 flex gap-1 items-center bg-black/25 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-sm select-none">
             <Sparkles size={11} className="text-yellow-400 animate-pulse" />
             <span className="text-[9px] text-white/70 font-bold uppercase tracking-widest font-mono">Profile Card</span>
          </div>
        </div>

        {/* Profile Avatar / Overhanging Header */}
        <div className="px-6 pb-8 relative">
          <div className="flex justify-between items-end -mt-12 mb-6">
            <div className="relative group/avatar">
              <div className="w-24 h-24 rounded-3xl bg-[#1A1E2A] border-4 border-[#11131E] flex items-center justify-center text-3xl font-extrabold text-white shadow-xl shadow-black/40 relative overflow-hidden select-none">
                {profile ? (
                  profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 to-indigo-600/10 flex items-center justify-center">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                  )
                ) : (
                  <UserIcon className="text-slate-500 animate-pulse" size={32} />
                )}

                {/* Own profile hover camera editor button */}
                {isOwnProfile && profile && (
                  <button
                    type="button"
                    onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 cursor-pointer text-[10px] uppercase font-bold tracking-wider gap-1 select-none border-none"
                  >
                    <Camera size={18} className="text-purple-300" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              
              {profile && (
                <div className={`absolute bottom-1 right-1 w-4.5 h-4.5 rounded-full border-[3px] border-[#11131E] ${
                  profile.isOnline ? 'bg-green-500' : 'bg-slate-500'
                }`} />
              )}
            </div>

            {profile && (
              <div className="flex gap-1">
                {/* Gamified Points Badge */}
                <div className="bg-gradient-to-br from-[#FF5500]/10 to-orange-500/5 border border-orange-500/20 px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-md">
                  <Trophy size={14} className="text-[#FF5555] animate-bounce" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[14px] font-black text-white">{profile.points}</span>
                    <span className="text-[8px] font-extrabold text-orange-400 font-mono tracking-tighter uppercase mt-0.5">Points</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-medium font-mono uppercase tracking-wider">Loading user profile...</p>
            </div>
          ) : error || !profile ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-semibold">{error || "User not found"}</p>
            </div>
          ) : (
            <>
              {/* Custom Avatar Customizer Drawer */}
              <AnimatePresence>
                {isEditingAvatar && isOwnProfile && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-[#171A26] border border-white/5 rounded-2xl p-4.5 mb-4 flex flex-col gap-4 shadow-inner"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 select-none">
                        Customize Avatar
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingAvatar(false)}
                        className="text-[10px] text-slate-400 hover:text-white font-bold cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                    {/* Predefined Presets Grid */}
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2 select-none">
                        Aesthetic Designs
                      </span>
                      <div className="grid grid-cols-6 gap-2">
                        {PRESET_AVATARS.map((preset) => {
                          const isSelected = profile.avatarUrl === preset.url;
                          return (
                            <button
                              key={preset.url}
                              type="button"
                              onClick={() => handleUpdateAvatar(preset.url)}
                              className={`relative w-11 h-11 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                                isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/25 scale-102' : 'border-white/10 hover:border-white/25'
                              }`}
                              title={preset.name}
                            >
                              <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                              {isSelected && (
                                <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center text-white">
                                  <CheckCircle2 size={14} className="drop-shadow-md" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Upload File & Link Options */}
                    <div className="flex flex-col gap-3 pt-1.5 border-t border-white/5">
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2 select-none">
                          Insert Image Link
                        </span>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                              <Link size={12} />
                            </span>
                            <input
                              type="text"
                              value={avatarUrlInput}
                              onChange={(e) => setAvatarUrlInput(e.target.value)}
                              placeholder="https://example.com/avatar.png"
                              className="w-full bg-[#0F1118] text-white rounded-xl pl-8.5 pr-3.5 py-2 border border-white/10 outline-none text-xs leading-relaxed focus:border-indigo-400 font-medium"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (avatarUrlInput.trim()) {
                                handleUpdateAvatar(avatarUrlInput.trim());
                              }
                            }}
                            disabled={uploadingAvatar || !avatarUrlInput.trim()}
                            className="px-3.5 bg-white hover:bg-slate-100 disabled:bg-white/10 disabled:text-slate-500 text-slate-900 border-none rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                          >
                            {uploadingAvatar ? (
                              <div className="w-3.5 h-3.5 border-2 border-indigo-600/20 border-t-indigo-500 rounded-full animate-spin" />
                            ) : (
                              'Apply'
                            )}
                          </button>
                        </div>
                      </div>

                      {/* File Upload Section */}
                      <div className="flex justify-between items-center bg-[#0F1118] border border-white/5 rounded-xl p-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-400">
                            <Upload size={14} />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold text-slate-300">Upload Image File</span>
                            <span className="text-[8px] font-medium text-slate-500">PNG, JPG up to 1.5MB</span>
                          </div>
                        </div>

                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleAvatarUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase rounded-lg border border-purple-500/10 transition-all cursor-pointer font-mono"
                        >
                          Choose
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-5">
                {/* Identity Header */}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">{profile.username}</h2>
                    {isOwnProfile && (
                      <span className="bg-white/10 border border-white/20 px-2 py-0.5 rounded-md text-[9px] font-bold text-white uppercase tracking-widest font-mono select-none">You</span>
                    )}
                  </div>
                  
                  {profile.email && isOwnProfile && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-slate-400">
                      <Mail size={13} className="text-slate-500" />
                      <span className="text-xs font-medium font-mono select-all text-slate-400">{profile.email}</span>
                    </div>
                  )}
                </div>

                {/* Profile Theme Customizer options (Visible for Own Profile) */}
                {isOwnProfile && (
                  <div className="bg-[#171A26] border border-white/5 rounded-2xl p-4 relative shadow-inner">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Palette size={13} className={activeTheme.text} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 select-none">
                        Personal Appearance Theme
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {PROFILE_THEMES.map((themeOption) => {
                        const isSelected = (profile.profileTheme || 'amethyst') === themeOption.id;
                        return (
                          <button
                            key={themeOption.id}
                            type="button"
                            onClick={() => handleUpdateTheme(themeOption.id)}
                            className={`h-9 rounded-xl relative overflow-hidden flex flex-col items-center justify-center border-2 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                              isSelected ? 'border-white scale-102 ring-2 ring-white/10' : 'border-white/5 hover:border-white/10'
                            }`}
                            title={themeOption.name}
                          >
                            <div className={`absolute inset-0 bg-gradient-to-br ${themeOption.banner} opacity-90`} />
                            {isSelected && (
                              <div className="z-10 drop-shadow flex items-center justify-center text-white">
                                <Check size={14} className="stroke-[3.5]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Status Message Quote card styled with accent theme text representation */}
                <div className="bg-[#171A26] border border-white/5 rounded-2xl p-4.5 relative group shadow-inner">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className={`text-[10px] font-black uppercase tracking-wider select-none ${activeTheme.text}`}>
                      Custom Motto/Status
                    </span>
                    {isOwnProfile && !isEditingStatus && (
                      <button 
                        onClick={() => setIsEditingStatus(true)}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 font-bold select-none group/btn transition-all cursor-pointer border-none bg-transparent"
                      >
                        <Pencil size={11} className="group-hover/btn:scale-110 transition-transform" />
                        Change
                      </button>
                    )}
                  </div>

                  {isEditingStatus ? (
                    <div className="flex flex-col gap-2.5">
                      <textarea
                        value={statusInput}
                        onChange={(e) => setStatusInput(e.target.value)}
                        placeholder="What is on your mind? Tell everyone..."
                        className="w-full bg-[#0F1118] text-white rounded-xl px-3.5 py-2.5 border border-white/10 outline-none text-xs leading-relaxed focus:border-indigo-400 transition-all font-medium resize-none h-16"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setIsEditingStatus(false);
                            setStatusInput(profile.statusMessage || '');
                          }}
                          className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent"
                          disabled={updating}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdateStatus}
                          className="px-3.5 py-1 bg-white hover:bg-slate-100 text-[#0F1118] text-[10px] font-bold uppercase rounded-lg transition-all shadow-md active:scale-95 disabled:scale-100 flex items-center gap-1 cursor-pointer border-none"
                          disabled={updating}
                        >
                          {updating ? (
                            <div className="w-3 h-3 border-2 border-indigo-600/20 border-t-indigo-500 rounded-full animate-spin" />
                          ) : (
                            <Check size={11} />
                          )}
                          {updating ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-slate-300 italic leading-relaxed select-text">
                      {profile.statusMessage ? `"${profile.statusMessage}"` : `"No custom status set. Happy chatting!"`}
                    </p>
                  )}
                </div>

                {/* Status / Activity info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#171A26]/50 border border-white/5 rounded-xl p-3 flex gap-2.5 items-center">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Activity size={15} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight select-none">Status</span>
                      <span className={`text-[11px] font-extrabold ${profile.isOnline ? 'text-green-400 animate-pulse' : 'text-slate-400'}`}>
                        {profile.isOnline ? 'Active Now' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#171A26]/50 border border-white/5 rounded-xl p-3 flex gap-2.5 items-center">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Award size={15} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight select-none">Rank</span>
                      <span className="text-[11px] font-extrabold text-amber-300">
                        {profile.points >= 200 ? 'Gold Elite' : profile.points >= 50 ? 'Silver Knight' : 'Bronzy Cadet'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
