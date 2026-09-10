import React, { useState } from 'react';
import { UserAccount, Dojo } from '../types';
import { X, User, Lock, Phone, Mail, Shield, GraduationCap, Dumbbell, Building2, LogOut, Check, AlertCircle } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  currentDojo?: Dojo;
  onUpdateProfile: (userId: string, fullName: string, phone: string, email?: string) => void;
  onChangePassword: (userId: string, oldPass: string, newPass: string) => { success: boolean; message?: string };
  onLogout: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen, onClose, currentUser, currentDojo, onUpdateProfile, onChangePassword, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'INFO' | 'PASSWORD'>('INFO');

  // Profile info state
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [phone, setPhone] = useState(currentUser.phone);
  const [email, setEmail] = useState(currentUser.email || '');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    onUpdateProfile(currentUser.id, fullName.trim(), phone.trim(), email.trim());
    setInfoMessage('Đã cập nhật thông tin cá nhân thành công!');
    setTimeout(() => setInfoMessage(null), 3000);
  };

  const handleChangePass = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp với mật khẩu mới!');
      return;
    }

    const res = onChangePassword(currentUser.id, oldPassword, newPassword);
    if (!res.success) {
      setPasswordError(res.message || 'Mật khẩu cũ không chính xác!');
    } else {
      setPasswordSuccess('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    }
  };

  const getRoleLabel = () => {
    switch (currentUser.role) {
      case 'SUPER_ADMIN': return 'Admin Tổng Toàn Hệ Thống';
      case 'DOJO_ADMIN': return 'Quản Trị Võ Đường';
      case 'TEACHER': return 'Giáo Viên Chủ Nhiệm (GVCN)';
      case 'COACH': return 'Huấn Luyện Viên (HLV)';
      default: return currentUser.role;
    }
  };

  const getRoleIcon = () => {
    switch (currentUser.role) {
      case 'SUPER_ADMIN': return <Shield className="w-4 h-4 text-purple-600" />;
      case 'DOJO_ADMIN': return <Building2 className="w-4 h-4 text-amber-600" />;
      case 'TEACHER': return <GraduationCap className="w-4 h-4 text-blue-600" />;
      case 'COACH': return <Dumbbell className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">Tài Khoản & Hồ Sơ Cá Nhân</h3>
              <p className="text-[10px] text-slate-400">@{currentUser.username}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Identity Card */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center">
                {getRoleIcon()}
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-900 leading-tight">
                  {currentUser.fullName}
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                  <span>{getRoleLabel()}</span>
                </div>
              </div>
            </div>

            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Hoạt động
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Cơ sở: <strong>{currentDojo?.name || 'Tất cả võ đường'}</strong></span>
            </span>
            <span className="text-slate-400 font-mono text-[10px]">ID: {currentUser.id}</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('INFO')}
            className={`flex-1 pb-2.5 text-xs font-extrabold text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'INFO'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Thông Tin Cá Nhân
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PASSWORD')}
            className={`flex-1 pb-2.5 text-xs font-extrabold text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'PASSWORD'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Đổi Mật Khẩu
          </button>
        </div>

        {/* TAB 1: THÔNG TIN CÁ NHÂN */}
        {activeTab === 'INFO' && (
          <form onSubmit={handleSaveInfo} className="space-y-3.5 text-xs">
            {infoMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tên đăng nhập (Username):</label>
              <input
                type="text"
                disabled
                value={currentUser.username}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-mono text-xs cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Tên đăng nhập cố định do quản trị viên cấp.</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Họ và tên hiển thị:</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Cô Nguyễn Thị Lan"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Số điện thoại liên hệ (SĐT):</label>
              <div className="relative flex items-center">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ví dụ: 0988 123 456"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Email / Ghi chú:</label>
              <div className="relative flex items-center">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ví dụ: giaovien@trungphung.vn"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Thay Đổi Thông Tin</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ĐỔI MẬT KHẨU */}
        {activeTab === 'PASSWORD' && (
          <form onSubmit={handleChangePass} className="space-y-3 text-xs">
            {passwordError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1">Mật khẩu hiện tại:</label>
              <div className="relative flex items-center">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Mật khẩu mới (tối thiểu 6 ký tự):</label>
              <div className="relative flex items-center">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Xác nhận mật khẩu mới:</label>
              <div className="relative flex items-center">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-xs shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cập Nhật Mật Khẩu Mới</span>
              </button>
            </div>
          </form>
        )}

        {/* Logout Footer Button */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center">
          <span className="text-[11px] text-slate-400">Đăng nhập với @{currentUser.username}</span>
          <button
            type="button"
            onClick={() => {
              if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
                onClose();
                onLogout();
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng Xuất</span>
          </button>
        </div>

      </div>
    </div>
  );
};
