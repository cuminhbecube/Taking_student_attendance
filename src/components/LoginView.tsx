import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, Shield, GraduationCap, Dumbbell, ArrowRight, AlertCircle, Building2, Loader2 } from 'lucide-react';
import type { UserAccount } from '../types';
import { apiFetch, ApiError, setAccessToken } from '../services/api';

interface LoginViewProps {
  accounts?: UserAccount[];
  onLogin: (user: UserAccount) => void;
}

type LoginResponse = {
  token?: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: UserAccount['role'];
    dojoId: string | null;
    phone?: string | null;
    email?: string | null;
  };
};

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim().toLowerCase(), password })
      });

      // Remove any legacy browser-readable token. The server has already set the
      // HttpOnly ea_session cookie, which JavaScript cannot access.
      setAccessToken(null);
      const user: UserAccount = {
        id: response.user.id,
        username: response.user.username,
        password: '',
        fullName: response.user.fullName,
        role: response.user.role,
        dojoId: response.user.dojoId ?? 'ALL',
        phone: response.user.phone ?? '',
        email: response.user.email ?? undefined,
        status: 'ACTIVE',
        createdAt: new Date().toLocaleDateString('vi-VN')
      };
      onLogin(user);
    } catch (err) {
      setAccessToken(null);
      if (err instanceof ApiError) {
        if (err.status === 401) setError('Tên đăng nhập hoặc mật khẩu không đúng.');
        else if (err.status === 403) setError('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
        else setError(err.payload?.message || 'Không thể đăng nhập. Vui lòng kiểm tra máy chủ.');
      } else {
        setError('Không kết nối được máy chủ API. Kiểm tra backend và VITE_API_BASE_URL.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  const demos = [
    { label: 'Admin Tổng', user: 'admin', pass: 'admin123', icon: Shield },
    { label: 'Võ Đường HNK', user: 'hanoikid', pass: '123456', icon: Building2 },
    { label: 'GVCN Cô Lan', user: 'gv_lan', pass: '123456', icon: GraduationCap },
    { label: 'HLV Thầy Tuấn', user: 'hlv_tuan', pass: '123456', icon: Dumbbell }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-black text-xl shadow-xl mb-3">HNK</div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Võ Đường Hà Nội Kid</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">Hệ thống điểm danh & quản lý võ đường đa cơ sở</p>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl">
          <div className="mb-5 pb-3 border-b border-slate-700/80 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-white">Đăng Nhập Tài Khoản</h2>
              <p className="text-[11px] text-slate-400">Xác thực an toàn qua máy chủ</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-700/70 flex items-center justify-center text-amber-400"><Lock className="w-4 h-4" /></div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1.5 text-xs">Tên đăng nhập</label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input type="text" required autoFocus autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin, hanoikid, gv_lan..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1.5 text-xs">Mật khẩu</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu..." className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 p-1 text-slate-400 hover:text-white" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 disabled:opacity-60 text-white font-black text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>{isSubmitting ? 'Đang xác thực...' : 'Vào Hệ Thống'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-700/80">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">Tài khoản test backend</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {demos.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.user} type="button" onClick={() => quickFill(item.user, item.pass)} className="p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-700 text-left transition-all">
                    <div className="flex items-center gap-1 text-slate-200 font-bold text-[11px]"><Icon className="w-3 h-3" />{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.user} / {item.pass}</div>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => quickFill('dojo_cg', 'dojo123')} className="mt-2 w-full py-2 px-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-left flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-300 font-bold"><Building2 className="w-3 h-3 text-cyan-400" />CLB Cầu Giấy</span>
              <span className="font-mono text-[10px] text-slate-400">dojo_cg / dojo123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
