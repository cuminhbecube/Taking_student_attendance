import React, { useState } from 'react';
import { DojoClass, UserAccount } from '../types';
import { AlertTriangle, Lock, Eye, EyeOff, Trash2, X, ShieldAlert } from 'lucide-react';

interface DeleteClassPasswordModalProps {
  isOpen: boolean;
  classItem: DojoClass | null;
  currentUser: UserAccount;
  studentCount?: number;
  onConfirm: (classId: string, password: string) => { success: boolean; message?: string };
  onClose: () => void;
}

export const DeleteClassPasswordModal: React.FC<DeleteClassPasswordModalProps> = ({
  isOpen,
  classItem,
  currentUser,
  studentCount = 0,
  onConfirm,
  onClose,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !classItem) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu tài khoản để xác nhận!');
      return;
    }

    setIsSubmitting(true);
    const result = onConfirm(classItem.id, password);

    if (!result.success) {
      setErrorMessage(result.message || 'Mật khẩu tài khoản không chính xác! Vui lòng thử lại.');
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      setPassword('');
      onClose();
    }
  };

  const handleClose = () => {
    setPassword('');
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-red-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Red Danger Gradient */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg leading-tight">Xác Nhận Xóa Lớp Học</h3>
              <p className="text-red-100 text-xs mt-0.5">Yêu cầu bảo mật cấp Quản Trị</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Warning Banner */}
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 leading-relaxed">
              <p className="font-bold">Hành động này KHÔNG THỂ HOÀN TÁC!</p>
              <p className="mt-0.5 text-red-700">
                Toàn bộ dữ liệu của lớp, bao gồm thông tin học sinh và toàn bộ lịch sử điểm danh của lớp này sẽ bị xóa vĩnh viễn khỏi hệ thống.
              </p>
            </div>
          </div>

          {/* Class Target Details Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lớp cần xóa:</span>
              <span className="text-[10px] font-mono font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md">
                {classItem.id}
              </span>
            </div>
            <div className="font-extrabold text-slate-900 text-base">{classItem.name}</div>
            <div className="text-xs text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span>📅 {classItem.schedule}</span>
              {studentCount > 0 && (
                <span className="font-bold text-red-600">{studentCount} học sinh</span>
              )}
            </div>
            {classItem.venue && (
              <div className="text-[11px] text-slate-500">📍 {classItem.venue}</div>
            )}
          </div>

          {/* Form Password */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-red-600" />
                <span>Nhập mật khẩu tài khoản ({currentUser.username}) để xác nhận:</span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Mật khẩu của bạn..."
                  autoFocus
                  className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMessage && (
                <div className="text-red-600 text-xs font-semibold mt-1.5 flex items-center gap-1">
                  <span>⚠️ {errorMessage}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Hủy Bỏ
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !password.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-md shadow-red-500/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang xác thực...' : 'Xác Nhận Xóa Lớp'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
