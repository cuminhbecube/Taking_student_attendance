import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { 
  QrCode, FileText, Shield, GraduationCap, 
  Dumbbell, ChevronDown, CheckCircle2, Clock
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, switchRole, setIsQrModalOpen, setIsLeaveModalOpen, leaveRequests } = useApp();
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const pendingLeaves = leaveRequests.filter(r => r.status === 'PENDING').length;

  const getRoleBadge = (role: UserRole) => {
    switch(role) {
      case 'ADMIN':
        return { label: 'Quản Trị Viên (Admin)', bg: 'bg-purple-100 text-purple-800 border-purple-200', icon: Shield };
      case 'TEACHER':
        return { label: 'Giáo Viên (Teacher)', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: GraduationCap };
      case 'COACH':
        return { label: 'Huấn Luyện Viên (Coach)', bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: Dumbbell };
    }
  };

  const badge = getRoleBadge(currentUser.role);
  const BadgeIcon = badge.icon;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 font-bold text-lg tracking-wider">
              EA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">EduAttend<span className="text-indigo-600">Pro</span></span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">v2.4</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Hệ thống điểm danh học đường & câu lạc bộ</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            <span className="capitalize">{dateStr}</span>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-slate-800 font-mono">{timeStr}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-300 transition-all cursor-pointer"
              title="Mở máy quét mã QR / Thẻ từ"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Quét Thẻ / QR</span>
            </button>

            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all cursor-pointer border border-slate-200"
              title="Nộp đơn xin nghỉ phép"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Nộp Đơn Phép</span>
              {pendingLeaves > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingLeaves}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${badge.bg}`}
              >
                <BadgeIcon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{badge.label}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {isRoleMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chọn vai trò trải nghiệm (RBAC)</p>
                  </div>
                  
                  <button
                    onClick={() => { switchRole('ADMIN'); setIsRoleMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${currentUser.role === 'ADMIN' ? 'bg-purple-50 text-purple-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold flex items-center justify-between">
                        ThS. Trần Quốc Tuấn
                        {currentUser.role === 'ADMIN' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500">Quản Trị Viên (Toàn quyền trường học)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { switchRole('TEACHER'); setIsRoleMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${currentUser.role === 'TEACHER' ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold flex items-center justify-between">
                        Thầy Nguyễn Văn An
                        {currentUser.role === 'TEACHER' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500">Giáo Viên (Điểm danh 10A1, duyệt phép)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { switchRole('COACH'); setIsRoleMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${currentUser.role === 'COACH' ? 'bg-amber-50 text-amber-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Dumbbell className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold flex items-center justify-between">
                        HLV. Phạm Huỳnh Long
                        {currentUser.role === 'COACH' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500">Huấn Luyện Viên (Tuyển U15 & Thể lực)</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
              />
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{currentUser.title}</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
