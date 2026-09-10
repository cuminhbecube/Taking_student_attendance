import React, { useState } from 'react';
import { UserAccount } from '../types';
import { Lock, User, Eye, EyeOff, Shield, GraduationCap, Dumbbell, ArrowRight, AlertCircle, Building2 } from 'lucide-react';

interface LoginViewProps {
  accounts: UserAccount[];
  onLogin: (user: UserAccount) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ accounts, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim().toLowerCase();
    const targetAccount = accounts.find(
      a => a.username.toLowerCase() === cleanUser
    );

    if (!targetAccount) {
      setError('Tên đăng nhập không tồn tại trong hệ thống!');
      return;
    }

    if (targetAccount.status === 'LOCKED') {
      setError('Tài khoản này đã bị khóa bởi quản trị viên. Vui lòng liên hệ cấp trên!');
      return;
    }

    if (targetAccount.password !== password) {
      setError('Mật khẩu không chính xác! Vui lòng thử lại.');
      return;
    }

    // Login successful
    onLogin(targetAccount);
  };

  const quickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Card Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-black text-xl shadow-xl shadow-orange-950/50 border border-amber-400/40 mb-3">
            HNK
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Võ Đường Hà Nội Kid
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Hệ thống điểm danh & quản lý võ đường đa cơ sở
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl">
          
          <div className="mb-5 pb-3 border-b border-slate-700/80 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-white">Đăng Nhập Tài Khoản</h2>
              <p className="text-[11px] text-slate-400">Nhập tên tài khoản và mật khẩu được cấp</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-700/70 flex items-center justify-center text-amber-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Username Input */}
            <div>
              <label className="font-bold text-slate-300 block mb-1.5 text-xs">
                Tên đăng nhập (Username):
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: admin, dojo_tp, gv_lan..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-300 text-xs">
                  Mật khẩu (Password):
                </label>
                <span className="text-[10px] text-slate-400">Mặc định ban đầu: 123456</span>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 text-slate-400 hover:text-white cursor-pointer transition-colors"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-98 text-white font-black text-xs tracking-wider uppercase transition-all shadow-lg shadow-indigo-950/60 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>Vào Hệ Thống</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switcher (Tài khoản mẫu thử nghiệm) */}
          <div className="mt-6 pt-4 border-t border-slate-700/80">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>Tài khoản mẫu thử nghiệm (Click để điền):</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Super Admin */}
              <button
                type="button"
                onClick={() => quickFill('admin', 'admin123')}
                className="p-2.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-700/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1 text-purple-300 font-bold text-[11px]">
                  <Shield className="w-3 h-3" />
                  <span>Admin Tổng</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 group-hover:text-purple-200">
                  admin / admin123
                </div>
              </button>

              {/* Võ Đường Hà Nội Kid */}
              <button
                type="button"
                onClick={() => quickFill('hanoikid', '123456')}
                className="p-2.5 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1 text-amber-300 font-bold text-[11px]">
                  <Building2 className="w-3 h-3" />
                  <span>Võ Đường HNK</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 group-hover:text-amber-200">
                  hanoikid / 123456
                </div>
              </button>

              {/* GVCN Trung Phụng */}
              <button
                type="button"
                onClick={() => quickFill('gv_lan', '123456')}
                className="p-2.5 rounded-xl bg-blue-950/50 hover:bg-blue-900/60 border border-blue-700/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1 text-blue-300 font-bold text-[11px]">
                  <GraduationCap className="w-3 h-3" />
                  <span>GVCN (Cô Lan)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 group-hover:text-blue-200">
                  gv_lan / 123456
                </div>
              </button>

              {/* HLV Trung Phụng */}
              <button
                type="button"
                onClick={() => quickFill('hlv_tuan', '123456')}
                className="p-2.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1 text-emerald-300 font-bold text-[11px]">
                  <Dumbbell className="w-3 h-3" />
                  <span>HLV (Thầy Tuấn)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 group-hover:text-emerald-200">
                  hlv_tuan / 123456
                </div>
              </button>
            </div>

            {/* CLB Cầu Giấy (Another Dojo to test multi-tenant) */}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => quickFill('dojo_cg', 'dojo123')}
                className="w-full py-2 px-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-left transition-all cursor-pointer flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Building2 className="w-3 h-3 text-cyan-400" />
                  <span>Võ Đường Khác: CLB Cầu Giấy</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">dojo_cg / dojo123</span>
              </button>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-500 mt-5">
          Võ Đường Hà Nội Kid • Hệ thống phân quyền 4 cấp độc lập
        </div>

      </div>

    </div>
  );
};
