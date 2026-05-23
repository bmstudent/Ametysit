import { useState, useEffect } from 'react';
import { User, Message, LeaderboardUser } from './lib/types';
import { socket } from './lib/socket';
import { AuthPage } from './components/Auth/AuthPage';
import { ChatContainer } from './components/Chat/ChatContainer';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const userData = await res.json();
            setUser({
              id: userData._id,
              username: userData.username,
              points: userData.points,
              email: userData.email,
              avatarUrl: userData.avatarUrl,
              statusMessage: userData.statusMessage
            });
            socket.auth = { token };
            socket.connect();
          } else {
            localStorage.removeItem('token');
          }
        } catch (err) {
          console.error("Auth check failed", err);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0A0B10]">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-12 h-12 border-2 border-purple-500/20 border-t-purple-500 rounded-2xl shadow-2xl shadow-purple-500/20"
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0A0B10] text-slate-100 font-sans selection:bg-purple-500/30">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full"
          >
            <AuthPage onAuth={(u) => setUser(u)} />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="h-full w-full"
          >
            <ChatContainer 
              user={user} 
              onLogout={() => setUser(null)} 
              onUpdateUser={(updated) => setUser(prev => prev ? { ...prev, ...updated } : null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
