import React, { useState } from 'react';
import { User } from '../../lib/types';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Info, Terminal, Sparkles, Eye, EyeOff, ShieldCheck, ShieldAlert } from 'lucide-react';

interface AuthPageProps {
  onAuth: (user: User) => void;
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password strength checker helper
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "None", color: "bg-slate-750" };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score, label: "Weak ⚠️", color: "bg-red-500" };
    if (score <= 3) return { score, label: "Medium 🛡️", color: "bg-amber-500" };
    return { score, label: "Strong 🔥", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(password);

  const validateClientSide = (): string | null => {
    if (!email.trim() || !password) {
      return "All input fields are required.";
    }
    const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRe.test(email.trim())) {
      return "Please input a valid email structure.";
    }
    if (!isLogin) {
      if (!username.trim()) {
        return "Username is required for registration.";
      }
      const usernameRe = /^[a-zA-Z0-9 _-]{2,30}$/;
      if (!usernameRe.test(username.trim())) {
        return "Username must be 2 to 30 characters and only contain letters, numbers, spaces, or hyphens.";
      }
      if (password.length < 8) {
        return "For adequate security, your password must be at least 8 characters long.";
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Perform robust client-side pre-validation
    const validationError = validateClientSide();
    if (validationError) {
      setError(validationError);
      return;
    }

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
        setError('Account created securely! Please log in below.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-[#0C0D12] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[950px] min-h-[580px] md:h-[620px] flex flex-col md:flex-row bg-[#151722] rounded-[32px] shadow-2xl shadow-black/65 border border-white/5 overflow-hidden"
      >
        {/* Brand Side */}
        <div className="hidden md:flex flex-1 bg-[#090A0E] p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-600/15 rounded-full blur-[110px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[110px]" />
          
          <div className="relative z-10">
            <div className="w-14 h-14 bg-gradient-to-br from-[#6366F1] to-[#4F46E5] rounded-2xl flex items-center justify-center text-white mb-8 shadow-2xl shadow-indigo-500/30">
               <Sparkles size={28} className="text-white" />
            </div>
            <h1 className="text-5.55xl font-extrabold text-white tracking-tight leading-none mb-3">
               Elite<br />Hub.
            </h1>
            <p className="text-slate-400 text-sm max-w-[260px] font-medium leading-relaxed mt-4">
              A military-grade secure workspace engineered for dynamic collaboration and high performance.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2">
             <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                Aka Node Active
             </p>
          </div>
        </div>

        {/* Form Side */}
        <div className="flex-1 flex flex-col p-8 sm:p-12 justify-center bg-[#13141C]">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
               {isLogin ? 'Sign In' : 'Join Elite'}
            </h2>
            <p className="text-slate-400 text-sm font-medium">
               {isLogin ? 'Enter authorization credentials below.' : 'Designated registration environment.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <input
                  required
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#090A0E] border border-white/5 focus:border-indigo-500/40 rounded-[14px] px-5 py-3.5 text-white placeholder-slate-600 outline-none transition-all font-medium text-[14px]"
                  placeholder="Username (letters & numbers)"
                />
              </div>
            )}
            <div className="space-y-1">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#090A0E] border border-white/5 focus:border-indigo-500/40 rounded-[14px] px-5 py-3.5 text-white placeholder-slate-600 outline-none transition-all font-medium text-[14px]"
                placeholder="Email address"
              />
            </div>
            <div className="space-y-1 relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#090A0E] border border-white/5 focus:border-indigo-500/40 rounded-[14px] pl-5 pr-12 py-3.5 text-white placeholder-slate-600 outline-none transition-all font-medium text-[14px]"
                placeholder="Secure password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors pointer-events-auto"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password strength visualization block */}
            {!isLogin && password.length > 0 && (
              <div className="space-y-1.5 px-1 pt-1">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-slate-500">Security Index:</span>
                  <span className={strength.score <= 1 ? "text-red-400" : strength.score <= 3 ? "text-amber-400" : "text-emerald-400"}>
                    {strength.label}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex gap-0.5">
                  <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: `${(strength.score / 5) * 100}%` }} />
                </div>
              </div>
            )}

            {error && (
              <div className={`text-xs font-bold p-3.5 rounded-xl flex items-center gap-2.5 ${
                error.includes("successfully") || error.includes("created insecurely") || error.includes("created securely")
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" 
                  : "bg-red-500/10 text-red-400 border border-red-500/10"
              }`}>
                {error.includes("securely") ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                <span className="flex-1 text-[12px] leading-tight">{error}</span>
              </div>
            )}

            <button
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:opacity-95 text-white font-extrabold text-[13px] uppercase tracking-wider py-3.5 rounded-[14px] shadow-lg shadow-indigo-500/15 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 h-12 flex items-center justify-center cursor-pointer select-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                isLogin ? 'Access Elite Hub' : 'Establish Credential'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs font-semibold text-slate-500">
              {isLogin ? "No authorized security token?" : "Registered elite operator?"}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="ml-1.5 text-indigo-400 font-bold hover:underline"
              >
                {isLogin ? 'Register account' : 'Access key terminal'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
