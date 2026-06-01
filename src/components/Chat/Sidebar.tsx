import { useState, useEffect } from 'react';
import { User, Message } from '../../lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MessageSquare, 
  Users, 
  Settings, 
  LogOut,
  Hash,
  User as UserIcon,
  Circle,
  Plus,
  Bell,
  Star,
  ChevronDown,
  Pencil,
  Lock,
  Volume2,
  Paperclip,
  Check,
  X
} from 'lucide-react';
import { socket } from '../../lib/socket';

const getInitialColor = (username: string) => {
  const name = username.toLowerCase();
  if (name.includes("eva") || name.includes("summer")) return "bg-amber-500 text-slate-900";
  if (name.includes("alexandra") || name.includes("smith")) return "bg-red-500 text-white";
  if (name.includes("mike") || name.includes("apple")) return "bg-pink-500 text-white";
  if (name.includes("club") || name.includes("evening")) return "bg-orange-500 text-white";
  if (name.includes("pirate") || name.includes("old")) return "bg-emerald-600 text-white";
  if (name.includes("max") || name.includes("bright")) return "bg-emerald-400 text-slate-900";
  if (name.includes("natalie") || name.includes("parker")) return "bg-cyan-500 text-slate-900";
  if (name.includes("davy") || name.includes("jones")) return "bg-fuchsia-500 text-white";
  if (name.includes("aiden")) return "bg-blue-500 text-white";
  if (name.includes("sona")) return "bg-indigo-505 text-white";
  
  const colors = [
    "bg-red-500 text-white", "bg-orange-500 text-white", "bg-amber-500 text-slate-900",
    "bg-emerald-500 text-white", "bg-teal-500 text-white", "bg-cyan-500 text-slate-900",
    "bg-blue-500 text-white", "bg-indigo-500 text-white", "bg-violet-500 text-white",
    "bg-purple-500 text-white", "bg-pink-500 text-white", "bg-rose-500 text-white"
  ];
  let sum = 0;
  for (let i = 0; i < username.length; i++) {
    sum += username.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

const getInitials = (username: string) => {
  const parts = username.split(" ");
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return username.substring(0, 2).toUpperCase();
};

interface SidebarProps {
  user: User;
  activeRoom: string;
  onRoomSelect: (roomId: string) => void;
  onLogout: () => void;
  refreshTrigger?: number;
  onViewProfile: (userId: string) => void;
  unreadCounts?: Record<string, number>;
  onNotificationsToggle: () => void;
  onMembersToggle: () => void;
  onSettingsToggle: () => void;
  isNotificationsOpen: boolean;
  isMembersOpen: boolean;
  roomMessages?: Message[];
  className?: string;
}

export function Sidebar({ 
  user, 
  activeRoom, 
  onRoomSelect, 
  onLogout, 
  refreshTrigger, 
  onViewProfile, 
  unreadCounts = {},
  onNotificationsToggle,
  onMembersToggle,
  onSettingsToggle,
  isNotificationsOpen,
  isMembersOpen,
  roomMessages = [],
  className = ''
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  
  // Custom workspace title drop-down state
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("Nexus HQ");
  const [isRenamingWorkspace, setIsRenamingWorkspace] = useState(false);
  const [workspaceRenameInput, setWorkspaceRenameInput] = useState("Nexus HQ");

  // New Conversation Popup Modal
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [newChatTab, setNewChatTab] = useState<'dm' | 'channel'>('dm');
  const [newChannelName, setNewChannelName] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Server-side backed group channels list
  const [dbChannels, setDbChannels] = useState<{ id: string; name: string; lastMsg: string; unread?: number; time?: string; starred?: boolean; isLocked?: boolean }[]>([]);

  // Toggle star mode filter
  const [starFilterActive, setStarFilterActive] = useState(false);

  // Drafts state for displaying [Draft] badge in sidebar list
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleDraftsUpdate = () => {
      const nextDrafts: Record<string, string> = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("chat_draft_")) {
            const roomId = key.replace("chat_draft_", "");
            const value = localStorage.getItem(key);
            if (value) {
              nextDrafts[roomId] = value;
            }
          }
        }
      } catch (e) {
        console.error("Draft parsing failed:", e);
      }
      setDrafts(nextDrafts);
    };

    handleDraftsUpdate();

    window.addEventListener("chat_drafts_updated", handleDraftsUpdate);
    return () => {
      window.removeEventListener("chat_drafts_updated", handleDraftsUpdate);
    };
  }, []);

  // Helper function to auto-scroll to the first unread message when Clicking/Routing rooms
  const handleRoomSelectWithNotifications = (roomId: string, count: number) => {
    if (count > 0) {
      sessionStorage.setItem(`unread_scroll_count_${roomId}`, String(count));
    }
    onRoomSelect(roomId);
  };

  // Load all system users on startup to populate search / start conversaion modal
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
        console.error("Failed to load users for seeding", e);
      }
    };
    fetchUsers();
  }, [refreshTrigger, activeRoom]);

  // Load all channels dynamically from the backend
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/channels', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDbChannels(data);
        }
      } catch (e) {
        console.error("Failed to load channels", e);
      }
    };
    fetchChannels();
  }, [refreshTrigger, activeRoom]);

  // Handle WebSocket updates for channels creation and changes
  useEffect(() => {
    const handleChannelCreated = (newChan: any) => {
      setDbChannels(prev => {
        if (prev.some(c => c.id === newChan.id)) return prev;
        return [...prev, newChan];
      });
    };

    const handleChannelUpdated = (updatedChan: any) => {
      setDbChannels(prev => prev.map(c => c.id === updatedChan.id ? { ...c, ...updatedChan } : c));
    };

    socket.on('channel-created', handleChannelCreated);
    socket.on('channel-updated', handleChannelUpdated);

    return () => {
      socket.off('channel-created', handleChannelCreated);
      socket.off('channel-updated', handleChannelUpdated);
    };
  }, []);

  // Debounced user search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (search.trim()) {
        const matching = dbUsers.filter(u => 
          u.username.toLowerCase().includes(search.toLowerCase()) && u.id !== user.id
        );
        setSearchResults(matching);
      } else {
        setSearchResults([]);
      }
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [search, dbUsers]);

  // Handle Workspace Rename
  const handleRenameWorkspace = () => {
    if (workspaceRenameInput.trim()) {
      setWorkspaceName(workspaceRenameInput.trim());
      setIsRenamingWorkspace(false);
      setWorkspaceMenuOpen(false);
    }
  };

  // Handle Dynamic Channel Creation
  const handleCreateChannel = async () => {
    if (newChannelName.trim()) {
      setModalError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/channels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name: newChannelName.trim() })
        });
        if (res.ok) {
          const newChan = await res.json();
          setNewChannelName('');
          setNewChatModalOpen(false);
          onRoomSelect(newChan.id);
        } else {
          const errData = await res.json();
          setModalError(errData.message || "Failed to create channel");
        }
      } catch (e) {
        console.error("Failed to create channel", e);
        setModalError("Server connection error. Please try again.");
      }
    }
  };

  const defaultChannels = [
    { id: 'product-roadmap', name: 'product-roadmap', lastMsg: 'Mira updated the Q3 milestones', unread: 3, time: 'now', starred: true },
    { id: 'design-system', name: 'design-system', lastMsg: 'New token docs are live', unread: 0, time: '11m' },
    { id: 'engineering', name: 'engineering', lastMsg: 'Deploy went smooth ✅', unread: 7, time: '1h', starred: true },
    { id: 'releases', name: 'releases', lastMsg: 'v2.8.0 shipped to prod', unread: 0, time: '2h', isLocked: true },
  ];

  const allChannels = dbChannels.length > 0 ? dbChannels : defaultChannels;

  // Base DM items representing users from the screen
  const usersList = [
    { id: 'eva', username: 'Eva Summer', lastMsg: 'Reminds me of a Chinese proverb: the best...', phrase: 'Chinese proverb', unread: 0, time: '11:00 AM', isOnline: true, isPinned: true },
    { id: 'alexandra', username: 'Alexandra Smith', lastMsg: 'This is amazing!', phrase: 'amazing', unread: 2, time: '10:00 AM', isOnline: false },
    { id: 'mike', username: 'Mike Apple', lastMsg: '😄 Sticker', phrase: 'sticker', unread: 2, time: '9:00 AM', isOnline: false },
    { id: 'evening', username: 'Evening Club', lastMsg: 'Eva: Photo', phrase: 'photo', unread: 0, time: '8:00 AM', isOnline: false },
    { id: 'oldpirates', username: 'Old Pirates', lastMsg: 'Max: Yo-ho-ho!', phrase: 'Yo-ho-ho', unread: 0, time: '7:00 AM', isOnline: false },
    { id: 'max', username: 'Max Bright', lastMsg: 'How about some coffee?', phrase: 'coffee', unread: 0, time: '6:00 AM', isOnline: true },
    { id: 'natalie', username: 'Natalie Parker', lastMsg: 'OK, great)', phrase: 'great', unread: 0, time: '5:00 AM', isOnline: true },
    { id: 'davy', username: 'Davy Jones', lastMsg: 'Keynote.pdf', phrase: 'keynote', unread: 0, time: '4:00 AM', isOnline: false },
  ];

  return (
    <div className={`w-full md:w-[300px] h-full border-r border-white/5 flex flex-col bg-[#0F111A] shrink-0 select-none ${className}`}>
      
      {/* Workspace Selector top header */}
      <div className="px-6 pt-8 pb-4 relative z-40">
        <div className="flex items-center justify-between">
          <div 
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-all select-none group/title"
          >
            <h1 className="text-[17px] font-black text-white tracking-tight flex items-center gap-1">
              {workspaceName}
            </h1>
            <ChevronDown size={14} className="text-slate-500 group-hover/title:text-white transition-colors" />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setNewChatTab('channel');
                setNewChatModalOpen(true);
              }}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/5"
              title="Add Channel"
            >
              <Pencil size={13} />
            </button>
            <button 
              onClick={onNotificationsToggle}
              className={`w-8 h-8 rounded-lg text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border ${
                isNotificationsOpen ? 'bg-indigo-550/15 border-indigo-550/20 text-indigo-400' : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <Bell size={13} />
            </button>
          </div>
        </div>

        {/* Workspace Dropdown */}
        <AnimatePresence>
          {workspaceMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setWorkspaceMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute left-6 right-6 mt-2 bg-[#121422] border border-white/10 rounded-2xl p-2.5 z-50 shadow-2xl shadow-black/60 text-left cursor-default"
              >
                {isRenamingWorkspace ? (
                  <div className="p-1 space-y-2">
                    <input 
                      type="text" 
                      value={workspaceRenameInput}
                      onChange={(e) => setWorkspaceRenameInput(e.target.value)}
                      className="w-full bg-[#0B0D18] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <button 
                        onClick={() => setIsRenamingWorkspace(false)}
                        className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-500 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleRenameWorkspace}
                        className="px-3 py-1 text-[10px] uppercase font-bold bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D38D3] transition-all"
                      >
                        Rename
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <button 
                      onClick={() => setIsRenamingWorkspace(true)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-left transition-all flex items-center gap-2"
                    >
                      <Pencil size={12} />
                      Rename workspace
                    </button>
                    <button 
                      onClick={() => {
                        setNewChatTab('dm');
                        setNewChatModalOpen(true);
                        setWorkspaceMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-left transition-all flex items-center gap-2"
                    >
                      <Users size={12} />
                      Invite people
                    </button>
                    <button 
                      onClick={() => {
                        onSettingsToggle();
                        setWorkspaceMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-left transition-all flex items-center gap-2"
                    >
                      <Settings size={12} />
                      Workspace settings
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Search and Navigation Icon Bar */}
      <div className="px-6 pb-4 space-y-3.5">
        
        {/* Rounded Input Field */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-purple-400" size={14} />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-[#131522] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-550/20 transition-all placeholder:text-slate-600 font-medium font-sans shadow-inner"
          />
        </div>

        {/* Flat Buttons Row */}
        <div className="grid grid-cols-4 gap-2">
          <button 
            onClick={onNotificationsToggle}
            className={`py-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              isNotificationsOpen 
                ? 'bg-purple-550/15 border-purple-550/25 text-purple-400 shadow-lg shadow-purple-500/5' 
                : 'bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white border-transparent'
            }`}
            title="Notifications"
          >
            <Bell size={14} />
          </button>

          <button 
            onClick={() => setStarFilterActive(!starFilterActive)}
            className={`py-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              starFilterActive 
                ? 'bg-amber-500/15 border-amber-500/25 text-amber-400 shadow-lg' 
                : 'bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white border-transparent'
            }`}
            title="Toggle Star Filter"
          >
            <Star size={14} />
          </button>

          <button 
            onClick={onMembersToggle}
            className={`py-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              isMembersOpen 
                ? 'bg-purple-550/15 border-purple-550/25 text-purple-400 shadow-lg shadow-purple-500/5' 
                : 'bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white border-transparent'
            }`}
            title="Members roster"
          >
            <Users size={14} />
          </button>

          <button 
            onClick={onSettingsToggle}
            className="py-2 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white border border-transparent rounded-xl flex items-center justify-center transition-all cursor-pointer"
            title="Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Lists Body */}
      <div className="flex-1 overflow-y-auto px-3 space-y-6 custom-scrollbar pb-10">
        
        {/* Dynamic Search Results list */}
        {searchResults.length > 0 && (
          <div className="px-3">
            <h3 className="mb-3.5 text-[9px] font-black uppercase tracking-widest text-purple-400 font-mono">Found users</h3>
            <div className="space-y-1">
              {searchResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    const roomID = [user.id, u.id].sort().join('--');
                    onRoomSelect(roomID);
                    setSearch('');
                  }}
                  className="w-full flex items-center gap-3 px-2.5 py-3 rounded-xl hover:bg-white/5 transition-all text-left outline-none"
                >
                  <div className="w-9 h-9 bg-purple-550/20 rounded-xl flex items-center justify-center text-xs font-black text-purple-300">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                    ) : (
                      u.username.charAt(0)
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-black text-slate-200 truncate">{u.username}</span>
                    <span className="text-[10px] text-slate-500 font-medium truncate">Click to message</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PINNED SECTION */}
        {(!search || search.trim() === '') && (
          <div className="px-3">
            <h3 className="mb-3.5 text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono flex items-center justify-between">
              PINNED
            </h3>
            <div className="space-y-1">
              {usersList.filter(item => item.isPinned && (!starFilterActive || item.isPinned)).map(item => {
                const roomID = [user.id, item.id].sort().join('--');
                const isItemActive = activeRoom === roomID;
                const activeUserObj = dbUsers.find(u => u.id === item.id) || dbUsers.find(u => u._id === item.id);
                const isOnline = activeUserObj?.isOnline || item.isOnline;
                const statusMessage = activeUserObj?.statusMessage || item.lastMsg;
                const imageSrc = activeUserObj?.avatarUrl || '';
                const dmUnread = unreadCounts[roomID] !== undefined ? unreadCounts[roomID] : (item.unread || 0);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleRoomSelectWithNotifications(roomID, dmUnread)}
                    className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl relative transition-all group border cursor-default select-none text-left ${
                      isItemActive 
                        ? 'bg-gradient-to-r from-purple-550/15 to-indigo-650/5 border-purple-550/20 shadow-xl shadow-purple-500/5' 
                        : 'hover:bg-[#131522]/50 border-transparent hover:border-white/5'
                    }`}
                  >
                    {isItemActive && (
                      <motion.div 
                        layoutId="activeIndicatorPinned"
                        className="absolute left-1.5 top-3.5 bottom-3.5 w-1 bg-gradient-to-b from-purple-400 to-indigo-550 rounded-full"
                      />
                    )}

                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-inner overflow-hidden uppercase transition-all duration-300 ${getInitialColor(item.username)}`}>
                        {imageSrc ? (
                          <img src={imageSrc} alt={item.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          getInitials(item.username)
                        )}
                      </div>
                      {isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0F111A] rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className={`text-[12px] font-bold truncate ${isItemActive ? 'text-white' : 'text-slate-300'}`}>{item.username}</span>
                        <span className="text-[9px] text-slate-500 font-bold font-mono">{item.time}</span>
                      </div>
                      {drafts[roomID] ? (
                        <p className="text-[11px] truncate font-medium flex items-center gap-1.5">
                          <span className="text-red-400 font-extrabold uppercase text-[8px] font-mono tracking-wider bg-red-500/10 px-1.5 py-0.5 rounded-md shrink-0">Draft</span>
                          <span className="text-slate-300 italic truncate">{drafts[roomID]}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 truncate font-medium">{statusMessage}</p>
                      )}
                    </div>

                    {!isItemActive && dmUnread > 0 && (
                      <div className="w-5 h-5 rounded-full bg-purple-550 flex items-center justify-center text-[9px] font-black text-white shrink-0 font-mono select-none">
                        {dmUnread}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ALL CONVERSATIONS SECTION */}
        {(!search || search.trim() === '') && (
          <div className="px-3">
            <div className="flex justify-between items-center mb-3.5">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono">
                ALL CONVERSATIONS
              </h3>
              <button 
                onClick={() => {
                  setNewChatTab('dm');
                  setNewChatModalOpen(true);
                }}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                title="Create Group or DM"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-1">
              
              {/* Channels List */}
              {allChannels.filter(channel => !starFilterActive || channel.starred).map(channel => {
                const isChannelActive = activeRoom === channel.id;
                const chUnread = unreadCounts[channel.id] || channel.unread || 0;
                return (
                  <button
                    key={channel.id}
                    onClick={() => handleRoomSelectWithNotifications(channel.id, chUnread)}
                    className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl relative transition-all group border cursor-default select-none text-left ${
                      isChannelActive 
                        ? 'bg-gradient-to-r from-purple-550/15 to-indigo-650/5 border-purple-550/20 shadow-xl shadow-purple-500/5' 
                        : 'hover:bg-[#131522]/50 border-transparent hover:border-white/5'
                    }`}
                  >
                    {isChannelActive && (
                      <motion.div 
                        layoutId="activeIndicatorChannelsAll"
                        className="absolute left-1.5 top-3.5 bottom-3.5 w-1 bg-gradient-to-b from-purple-400 to-indigo-550 rounded-full"
                      />
                    )}
                    
                    <div className="w-10 h-10 shrink-0 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center text-slate-400 font-black shadow-inner">
                      {channel.isLocked ? <Lock size={14} className="text-slate-500" /> : <Hash size={15} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className={`text-[12px] font-bold truncate ${isChannelActive ? 'text-white' : 'text-slate-300'}`}>
                          {channel.name}
                        </span>
                        {channel.time && (
                          <span className="text-[9px] text-slate-500 font-bold font-mono">{channel.time}</span>
                        )}
                      </div>
                      {drafts[channel.id] ? (
                        <p className="text-[11px] truncate font-medium flex items-center gap-1.5">
                          <span className="text-red-400 font-extrabold uppercase text-[8px] font-mono tracking-wider bg-red-500/10 px-1.5 py-0.5 rounded-md shrink-0">Draft</span>
                          <span className="text-slate-300 italic truncate">{drafts[channel.id]}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 truncate font-medium">{channel.lastMsg}</p>
                      )}
                    </div>

                    {!isChannelActive && chUnread > 0 && (
                      <div className="w-5 h-5 rounded-full bg-purple-550 flex items-center justify-center text-[9px] font-black text-white shrink-0 font-mono select-none">
                        {chUnread}
                      </div>
                    )}
                  </button>
                );
              })}

              {/* General DMs List */}
              {usersList.filter(item => {
                if (item.isPinned) return false;
                if (starFilterActive) {
                  const roomID = [user.id, item.id].sort().join('--');
                  const dmUnread = unreadCounts[roomID] !== undefined ? unreadCounts[roomID] : (item.unread || 0);
                  return dmUnread > 0;
                }
                return true;
              }).map(item => {
                const roomID = [user.id, item.id].sort().join('--');
                const isItemActive = activeRoom === roomID;
                const activeUserObj = dbUsers.find(u => u.id === item.id) || dbUsers.find(u => u._id === item.id);
                const isOnline = activeUserObj?.isOnline || item.isOnline;
                const statusMessage = activeUserObj?.statusMessage || item.lastMsg;
                const imageSrc = activeUserObj?.avatarUrl || '';
                const dmUnread = unreadCounts[roomID] !== undefined ? unreadCounts[roomID] : (item.unread || 0);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleRoomSelectWithNotifications(roomID, dmUnread)}
                    className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl relative transition-all group border cursor-default select-none text-left ${
                      isItemActive 
                        ? 'bg-gradient-to-r from-purple-550/15 to-indigo-650/5 border-purple-550/20 shadow-xl shadow-purple-500/5' 
                        : 'hover:bg-[#131522]/50 border-transparent hover:border-white/5'
                    }`}
                  >
                    {isItemActive && (
                      <motion.div 
                        layoutId="activeIndicatorDMsAll"
                        className="absolute left-1.5 top-3.5 bottom-3.5 w-1 bg-gradient-to-b from-purple-400 to-indigo-550 rounded-full"
                      />
                    )}

                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-inner overflow-hidden uppercase transition-all duration-300 ${getInitialColor(item.username)}`}>
                        {imageSrc ? (
                          <img src={imageSrc} alt={item.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          getInitials(item.username)
                        )}
                      </div>
                      {isOnline ? (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0F111A] rounded-full" />
                      ) : (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-slate-600 border-2 border-[#0F111A] rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className={`text-[12px] font-bold truncate ${isItemActive ? 'text-white' : 'text-slate-300'}`}>{item.username}</span>
                        <span className="text-[9px] text-slate-500 font-bold font-mono">{item.time}</span>
                      </div>
                      {drafts[roomID] ? (
                        <p className="text-[11px] truncate font-medium flex items-center gap-1.5">
                          <span className="text-red-400 font-extrabold uppercase text-[8px] font-mono tracking-wider bg-red-500/10 px-1.5 py-0.5 rounded-md shrink-0">Draft</span>
                          <span className="text-slate-300 italic truncate">{drafts[roomID]}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 truncate font-medium flex items-center gap-1">
                          {item.id === 'sona' && <Paperclip size={10} className="text-slate-400" />}
                          {statusMessage}
                        </p>
                      )}
                    </div>

                    {!isItemActive && dmUnread > 0 && (
                      <div className="w-5 h-5 rounded-full bg-purple-550 flex items-center justify-center text-[9px] font-black text-white shrink-0 font-mono select-none">
                        {dmUnread}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ROOM PINNED MESSAGES SECTION */}
        {(!search || search.trim() === '') && roomMessages.filter(m => m.pinned).length > 0 && (
          <div className="px-3 border-t border-white/5 pt-5">
            <h3 className="mb-3.5 text-[9px] font-black uppercase tracking-widest text-[#F59E0B] font-mono flex items-center justify-between">
              <span className="flex items-center gap-1">📌 PINNED IN THIS ROOM</span>
              <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-bold">
                {roomMessages.filter(m => m.pinned).length}
              </span>
            </h3>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 select-none custom-scrollbar">
              {roomMessages.filter(m => m.pinned).map((msg) => (
                <div
                  key={msg._id}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('scroll-to-message', { detail: { messageId: msg._id } }));
                  }}
                  className="p-3 bg-[#131522] hover:bg-[#1A1E2E] border border-amber-500/10 rounded-2xl cursor-pointer transition-all flex flex-col gap-1.5 group/pin-item text-left shadow-md shadow-black/10"
                  title="Click to jump to message"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-indigo-300 truncate max-w-[120px]">
                      @{msg.sender?.username || 'User'}
                    </span>
                    <span className="text-[8px] text-slate-500 font-bold font-mono shrink-0">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  
                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed break-words font-medium">
                    {msg.type === 'text' && msg.content}
                    {msg.type === 'image' && '📸 Image attachment'}
                    {msg.type === 'audio' && '🎵 Voice Note'}
                    {msg.type === 'video' && '🎥 Video Clip'}
                    {msg.type === 'file' && (() => {
                      const isImg = msg.content && (
                        msg.content.toLowerCase().endsWith('.png') ||
                        msg.content.toLowerCase().endsWith('.jpg') ||
                        msg.content.toLowerCase().endsWith('.jpeg') ||
                        msg.content.toLowerCase().endsWith('.gif') ||
                        msg.content.toLowerCase().endsWith('.webp') ||
                        msg.content.toLowerCase().endsWith('.svg')
                      );
                      return isImg ? `📸 Image: ${msg.content}` : `📁 File: ${msg.content}`;
                    })()}
                  </p>
                  
                  <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-0.5 opacity-0 group-hover/pin-item:opacity-100 transition-opacity">
                    <span className="text-[8px] font-black uppercase text-amber-500 tracking-wide font-sans">Jump to message</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        socket.emit('pin-message', { messageId: msg._id, isPinned: false });
                      }}
                      className="text-[8px] font-black uppercase text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer"
                    >
                      Unpin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Profile Footer Panel */}
      <div className="p-4 bg-[#0a0c14]/40 border-t border-white/5 flex items-center justify-between select-none shrink-0 z-30">
        <div 
          onClick={onSettingsToggle}
          className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5500]/20 to-[#A78BFA]/20 border border-purple-550/25 flex items-center justify-center text-xs text-purple-300 font-extrabold overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                user.username.charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0A0B10] rounded-full animate-pulse" />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-xs font-black text-white max-w-[120px] truncate">{user.username}</span>
            <span className="text-[10px] text-slate-500 font-semibold">{user.statusMessage || 'Active'}</span>
          </div>
        </div>

        <button 
          onClick={onSettingsToggle}
          className="w-9 h-9 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl flex items-center justify-center border border-white/5 transition-all cursor-pointer"
          title="Open settings"
        >
          <Settings size={15} />
        </button>
      </div>

      {/* NEW CONVERSATION POPUP DIALOG */}
      <AnimatePresence>
        {newChatModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNewChatModalOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-[420px] bg-[#111322] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl z-10 p-6 flex flex-col text-slate-200"
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5">
                <h4 className="text-base font-bold text-white">New conversation</h4>
                <button 
                  onClick={() => setNewChatModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center border border-white/5 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Dialog switcher tabs */}
              <div className="grid grid-cols-2 gap-2 bg-[#0B0D18] p-1 rounded-xl mb-5">
                <button
                  onClick={() => {
                    setNewChatTab('dm');
                    setModalError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    newChatTab === 'dm' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Direct message
                </button>
                <button
                  onClick={() => {
                    setNewChatTab('channel');
                    setModalError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    newChatTab === 'channel' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Channel
                </button>
              </div>

              {modalError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold leading-tight flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span className="flex-1 text-[11px]">{modalError}</span>
                </div>
              )}

              {/* Direct Message contacts select list */}
              {newChatTab === 'dm' ? (
                <div className="space-y-4">
                  <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-400" size={13} />
                    <input 
                      type="text"
                      placeholder="Search people..."
                      value={peopleSearch}
                      onChange={(e) => setPeopleSearch(e.target.value)}
                      className="w-full bg-[#0B0D18] border border-white/5 rounded-xl pl-9.5 pr-4 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 max-h-[180px] overflow-y-auto custom-scrollbar pr-1 text-left">
                    {dbUsers
                      .filter(u => u.id !== user.id && u.username.toLowerCase().includes(peopleSearch.toLowerCase()))
                      .map(u => (
                        <button
                          key={u.id}
                          onClick={() => {
                            const roomID = [user.id, u.id].sort().join('--');
                            onRoomSelect(roomID);
                            setNewChatModalOpen(false);
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all text-left block"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-400 text-xs overflow-hidden">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              u.username.charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block leading-tight">{u.username}</span>
                            <span className="text-[10px] text-slate-500">{u.statusMessage || 'Active'}</span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5 text-left flex flex-col max-h-[420px] overflow-hidden">
                  
                  {/* BROWSE CHANNELS LIST */}
                  <div className="flex flex-col min-h-0">
                    <span className="text-[10px] font-black uppercase text-slate-500 font-mono block mb-2 px-1">
                      Join or Discover Channels ({dbChannels.length})
                    </span>
                    
                    <div className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1 max-h-[160px]">
                      {dbChannels.map(chan => {
                        const isActive = activeRoom === chan.id;
                        return (
                          <div 
                            key={chan.id}
                            onClick={() => {
                              onRoomSelect(chan.id);
                              setNewChatModalOpen(false);
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isActive 
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold' 
                                : 'bg-[#0B0D18]/40 hover:bg-[#0B0D18]/80 border-white/5 text-slate-300 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="shrink-0 text-slate-500 font-mono">#</span>
                              <span className="text-xs font-bold truncate">{chan.name}</span>
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wide bg-white/5 px-2 py-0.5 rounded-md text-indigo-300 shrink-0">
                              {isActive ? 'Current' : 'Join chat'}
                            </span>
                          </div>
                        );
                      })}
                      {dbChannels.length === 0 && (
                        <p className="text-xs text-slate-500 italic py-2 px-1">No other channels found.</p>
                      )}
                    </div>
                  </div>

                  {/* CREATE CHANNEL FORM */}
                  <div className="border-t border-white/5 pt-4 space-y-3 shrink-0">
                    <span className="text-[10px] font-black uppercase text-amber-500 font-mono block px-1">
                      Create a new group channel
                    </span>
                    <div className="space-y-1.5">
                      <input 
                        type="text"
                        placeholder="e.g. general, marketing, random..."
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        className="w-full bg-[#0B0D18] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-550/30 transition-all font-medium"
                      />
                    </div>
                    <button
                      onClick={handleCreateChannel}
                      disabled={!newChannelName.trim()}
                      className="w-full py-2.5 bg-gradient-to-r from-[#7C3AED] to-indigo-600 hover:from-[#6D38D3] hover:to-indigo-700 disabled:opacity-40 text-[11px] font-black uppercase rounded-xl text-white transition-all shadow-lg active:scale-95 cursor-pointer"
                    >
                      Create Channel
                    </button>
                  </div>

                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
