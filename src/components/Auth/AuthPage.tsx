import React, { useState } from 'react';
import { User } from '../../lib/types';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Info, Terminal, Sparkles } from 'lucide-react';

interface AuthPageProps {
  onAuth: (user: User) => void;
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const body = isLogin ? { email, password } : { email, username, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      if (isLogin) {
        localStorage.setItem('token', data.token);
        // Initialize socket before calling onAuth
        import('../../lib/socket').then(({ socket }) => {
          socket.auth = { token: data.token };
          socket.connect();
          onAuth({
            id: data.user.id,
            username: data.user.username,
            points: data.user.points,
            avatarUrl: data.user.avatarUrl
          });
        });
      } else {
        setIsLogin(true);
        setError('Account created! Please log in.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-[#0A0B10]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[900px] h-[600px] flex bg-[#1A1E2A] rounded-[40px] shadow-2xl shadow-black/40 border border-white/5 overflow-hidden"
      >
        {/* Brand Side */}
        <div className="hidden md:flex flex-1 bg-[#0F111A] p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[100px]" />
          
          <div className="relative z-10">
            <div className="w-14 h-14 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl shadow-purple-500/20">
               <Sparkles size={28} fill="white" />
            </div>
            <h1 className="text-5xl font-bold text-white tracking-tight leading-tight">
               Elite<br />Messaging.
            </h1>
          </div>

          <div className="relative z-10">
             <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
                Aka Elite Hub
             </p>
          </div>
        </div>

        {/* Form Side */}
        <div className="flex-1 flex flex-col p-12">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
               {isLogin ? 'Sign In' : 'Join Elite'}
            </h2>
            <p className="text-slate-500 text-sm font-medium">
               {isLogin ? 'Welcome back to the elite circle.' : 'Experience messaging without limits.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 flex-1">
            {!isLogin && (
              <div className="space-y-2">
                <input
                  required
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0F111A] border border-white/5 focus:border-purple-500/30 rounded-[18px] px-5 py-4 text-white placeholder-slate-600 outline-none transition-all font-medium"
                  placeholder="Username"
                />
              </div>
            )}
            <div className="space-y-2">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0F111A] border border-white/5 focus:border-purple-500/30 rounded-[18px] px-5 py-4 text-white placeholder-slate-600 outline-none transition-all font-medium"
                placeholder="Email address"
              />
            </div>
            <div className="space-y-2">
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0F111A] border border-white/5 focus:border-purple-500/30 rounded-[18px] px-5 py-4 text-white placeholder-slate-600 outline-none transition-all font-medium"
                placeholder="Password"
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs font-bold px-1">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white font-bold py-4 rounded-[18px] shadow-xl shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 mt-4 h-14"
            >
              {loading ? 'Entering...' : (isLogin ? 'Access Hub' : 'Register')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-slate-500">
              {isLogin ? "No account?" : "Member?"}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-purple-400 font-bold hover:underline"
              >
                {isLogin ? 'Get started' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
