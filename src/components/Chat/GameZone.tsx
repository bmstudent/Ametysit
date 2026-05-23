import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Activity, Cloud, Sparkles, X } from 'lucide-react';
import { LeaderboardUser } from '../../lib/types';

interface GameZoneProps {
  onClose: () => void;
  userPoints: number;
}

export function GameZone({ onClose, userPoints }: GameZoneProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0F111A]/80 backdrop-blur-xl"
    >
      <div className="w-full max-w-4xl bg-[#1A1E2A] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl flex relative h-[700px]">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-3 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-2xl z-20"
        >
          <X size={20} />
        </button>

        {/* Left Side: Stats */}
        <div className="w-80 bg-[#0F111A] p-10 flex flex-col items-center">
          <div className="w-24 h-24 bg-[#FF5500] rounded-[32px] flex items-center justify-center text-white shadow-2xl shadow-orange-500/30 mb-8 mt-10">
            <Sparkles size={40} fill="currentColor" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">GameZone</h2>
          <p className="text-slate-500 text-sm font-medium mb-12 text-center">Your global gaming ecosystem and activity hub.</p>
          
          <div className="w-full space-y-4">
             <div className="bg-[#1A1E2A] p-5 rounded-3xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Your Points</span>
                <span className="text-3xl font-black text-white">{userPoints}</span>
             </div>
             <div className="bg-[#1A1E2A] p-5 rounded-3xl border border-white/5 flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
                  <Cloud size={20} />
                </div>
                <div>
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Cloud Sync</span>
                   <span className="text-xs font-bold text-green-500">Connected</span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Side: Leaderboard */}
        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Trophy className="text-orange-500" />
              Global Leaderboard
            </h3>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">Updated Live</span>
          </div>

          <div className="space-y-3">
             {loading ? (
               <div className="flex flex-col items-center justify-center h-64 opacity-20 animate-pulse">
                  <Activity size={32} className="mb-4" />
                  <span className="font-bold uppercase tracking-widest text-xs">Fetching Rankings...</span>
               </div>
             ) : (
               leaderboard.map((u, i) => (
                 <motion.div 
                   key={u.username}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.05 }}
                   className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${
                     i === 0 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-[#0F111A]/40 border-white/5 hover:bg-white/5'
                   }`}
                 >
                   <div className="flex items-center gap-5">
                      <span className={`w-8 text-lg font-black ${i < 3 ? 'text-orange-500' : 'text-slate-600'}`}>
                        {i + 1 < 10 ? `0${i + 1}` : i + 1}
                      </span>
                      <div className="w-11 h-11 bg-slate-800 rounded-2xl flex items-center justify-center font-bold text-slate-300">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-white text-base capitalize">{u.username}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-bold text-orange-500">{u.points}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Pts</span>
                   </div>
                 </motion.div>
               ))
             )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
