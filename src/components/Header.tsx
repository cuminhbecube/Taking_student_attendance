import React, { useState } from 'react';
import { UserRole, DojoClass, RolePermissions, UserAccount, Dojo } from '../types';
import { 
  Menu, X, Shield, GraduationCap, Dumbbell, Smartphone, 
  Table as TableIcon, School, Calendar, Sliders,
  Plus, Download, RefreshCw, Check, ChevronRight,
  Building2, LogOut, User as UserIcon, Camera
} from 'lucide-react';

import { HoldClassItem } from './HoldClassItem';

interface HeaderProps {
  currentUser: UserAccount;
  currentDojo?: Dojo;
  allDojos?: Dojo[];
  onSelectDojo?: (dojoId: string) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  viewMode: 'MOBILE' | 'SHEET' | 'ADMIN_DASHBOARD';
  setViewMode: (v: 'MOBILE' | 'SHEET' | 'ADMIN_DASHBOARD') => void;
  studentCount: number;
  classes: DojoClass[];
  activeClassId: string;
  setActiveClassId: (id: string) => void;
  activeMonth: string;
  setActiveMonth: (m: string) => void;
  availableMonths: string[];
  onOpenAddStudent?: () => void;
  onOpenAddDate?: () => void;
  onOpenAddClass?: () => void;
  onOpenRollover?: () => void;
  onExportCSV?: () => void;
  permissions: RolePermissions;
  onOpenShareZalo?: () => void;
  onRequestDeleteClass?: (classItem: DojoClass) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser, currentDojo, allDojos = [], onSelectDojo, onOpenProfile, onLogout,
  viewMode, setViewMode, studentCount, classes, activeClassId, setActiveClassId,
  activeMonth, setActiveMonth, availableMonths,
  onOpenAddClass, onOpenRollover, onOpenAddStudent, onOpenAddDate, onExportCSV,
  permissions, onOpenShareZalo, onRequestDeleteClass
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const currentClass = classes.find(c => c.id === activeClassId) || classes[0];
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isDojoAdmin = currentUser.role === 'DOJO_ADMIN';
  const canAccessDashboard = isSuperAdmin || isDojoAdmin;

  const getRoleBadge = () => {
    switch (currentUser.role) {
      case 'SUPER_ADMIN':
        return { label: 'Admin', icon: <Shield className="w-3.5 h-3.5 text-purple-300" />, bg: 'bg-purple-900/90 border-purple-500 text-purple-200' };
      case 'DOJO_ADMIN':
        return { label: currentDojo?.code || 'Chủ Nhiệm', icon: <Building2 className="w-3.5 h-3.5 text-amber-300" />, bg: 'bg-amber-900/90 border-amber-500 text-amber-200' };
      case 'TEACHER':
        return { label: 'GVCN', icon: <GraduationCap className="w-3.5 h-3.5 text-blue-300" />, bg: 'bg-blue-900/90 border-blue-500 text-blue-200' };
      case 'COACH':
        return { label: 'HLV', icon: <Dumbbell className="w-3.5 h-3.5 text-emerald-300" />, bg: 'bg-emerald-900/90 border-emerald-500 text-emerald-200' };
      default:
        return { label: 'User', icon: <UserIcon className="w-3.5 h-3.5 text-slate-300" />, bg: 'bg-slate-800 border-slate-600 text-slate-200' };
    }
  };

  const roleInfo = getRoleBadge();

  return (
    <>
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-2">
          
          {/* Main Top Bar: Guaranteed ZERO Horizontal Overflow on Any Screen Size */}
          <div className="flex items-center justify-between gap-2">
            
            {/* LEFT: Prominent Hamburger Menu Icon Button & Class Context */}
            <div className="flex items-center gap-2.5 min-w-0">
              
              {/* PRIMARY MENU BUTTON: Bold Hamburger Icon in amber-orange gradient */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-orange-950/40 cursor-pointer shrink-0 border border-amber-300/50 transition-transform"
                title="Bấm để mở Menu điều hướng & chọn lớp"
                aria-label="Mở menu chính"
              >
                <Menu className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Class & Month Context (Clickable to open menu as well) */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="text-left cursor-pointer group min-w-0 flex flex-col justify-center"
                title="Bấm để đổi lớp hoặc đổi tháng"
              >
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                  <span className="truncate max-w-[125px] xs:max-w-[160px] sm:max-w-[240px]">
                    {currentClass?.name || currentDojo?.name || 'Võ Đường'}
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold px-1.5 py-0.2 rounded-full shrink-0">
                    {studentCount} em
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-300 font-medium truncate group-hover:text-white transition-colors flex items-center gap-1">
                  <span className="text-amber-400 font-semibold">{activeMonth}</span>
                  <span>•</span>
                  <span className="truncate">{currentClass?.schedule || currentDojo?.code}</span>
                </div>
              </button>

            </div>

            {/* RIGHT: Compact, High-Visibility Controls (View Toggle, Dashboard, Account) */}
            <div className="flex items-center gap-1.5 shrink-0">
              
              {/* Quick Admin Dashboard Link (For Super Admin or Dojo Admin) */}
              {canAccessDashboard && (
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'ADMIN_DASHBOARD' ? 'MOBILE' : 'ADMIN_DASHBOARD')}
                  className={`flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                    viewMode === 'ADMIN_DASHBOARD'
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                      : 'bg-purple-950/90 hover:bg-purple-900 text-purple-200 border border-purple-500/60'
                  }`}
                  title="Mở Bảng Quản Trị Hệ Thống"
                >
                  <Sliders className="w-3.5 h-3.5 text-purple-300" />
                  <span className="hidden md:inline">Quản Trị</span>
                </button>
              )}

              {/* View Mode Switcher (Di Động / Sheet) */}
              <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('MOBILE')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'MOBILE' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Giao diện dạng thẻ di động"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Thẻ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('SHEET')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'SHEET' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Giao diện bảng tính Sheet"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sheet</span>
                </button>
              </div>

              {/* User Profile Chip (Click opens Profile & Password Modal) */}
              <button
                type="button"
                onClick={onOpenProfile}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${roleInfo.bg}`}
                title="Bấm để xem hồ sơ cá nhân hoặc đổi mật khẩu"
              >
                {roleInfo.icon}
                <span className="font-extrabold text-[11px] sm:text-xs truncate max-w-[80px] sm:max-w-[120px]">
                  {roleInfo.label}
                </span>
              </button>

            </div>

          </div>

        </div>
      </header>

      {/* =========================================================================
          SLIDE-OUT NAVIGATION DRAWER (MENU ĐIỀU HƯỚNG TỔNG HỢP TOÀN DIỆN)
          ========================================================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          
          {/* Backdrop Blur Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Sidebar */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-black text-sm text-white shadow-md">
                  TP
                </div>
                <div>
                  <h2 className="font-extrabold text-sm tracking-tight text-white leading-tight">
                    {currentDojo?.name || 'Võ Thuật Trung Phụng'}
                  </h2>
                  <p className="text-[10px] text-amber-300 font-medium mt-0.5">
                    Hệ thống điểm danh & quản lý lớp
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                title="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 overflow-y-auto space-y-5 flex-1 text-xs text-slate-700">
              
              {/* SECTION 1: LOGGED IN USER PROFILE CARD */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      {roleInfo.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-900 truncate">
                        {currentUser.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">@{currentUser.username}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenProfile();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 cursor-pointer transition-colors shrink-0"
                  >
                    Hồ sơ
                  </button>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    Vai trò: <strong className="text-slate-800">
                      {currentUser.role === 'SUPER_ADMIN' ? 'Admin Tổng' :
                       currentUser.role === 'DOJO_ADMIN' ? 'Chủ Nhiệm Võ Đường' :
                       currentUser.role === 'TEACHER' ? 'Giáo Viên (GVCN)' : 'Huấn Luyện Viên (HLV)'}
                    </strong>
                  </span>

                  <button
                    onClick={() => {
                      if (confirm('Bạn có chắc muốn đăng xuất khỏi hệ thống?')) {
                        setIsDrawerOpen(false);
                        onLogout();
                      }
                    }}
                    className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-0.5 cursor-pointer text-[10px]"
                  >
                    <LogOut className="w-3 h-3" /> Đăng xuất
                  </button>
                </div>
              </div>

              {/* SUPER ADMIN: DOJO SWITCHER (Multi-Tenant Selector) */}
              {isSuperAdmin && allDojos.length > 0 && onSelectDojo && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-[11px] text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Đang Xem Võ Đường:</span>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {allDojos.map(d => {
                      const isSelected = currentDojo?.id === d.id;
                      return (
                        <button
                          key={d.id}
                          onClick={() => {
                            onSelectDojo(d.id);
                            setIsDrawerOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer text-xs ${
                            isSelected 
                              ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold shadow-2xs' 
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{d.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Mã: {d.code}</div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: CHỌN CƠ SỞ / LỚP HỌC */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Lớp Học ({currentDojo?.name || 'Võ Đường'})</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{classes.length} lớp</span>
                </div>

                <div className="space-y-1.5">
                  {classes.map(c => (
                    <HoldClassItem
                      key={c.id}
                      classItem={c}
                      isSelected={activeClassId === c.id}
                      canDelete={Boolean(canAccessDashboard && onRequestDeleteClass)}
                      onSelect={(cls) => {
                        setActiveClassId(cls.id);
                        setIsDrawerOpen(false);
                      }}
                      onHoldDeleteComplete={(cls) => {
                        setIsDrawerOpen(false);
                        onRequestDeleteClass?.(cls);
                      }}
                    />
                  ))}

                  {canAccessDashboard && (
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        onOpenAddClass();
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Lớp Mới</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 3: CHỌN THÁNG TẬP */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tháng Điểm Danh</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {availableMonths.map(m => {
                    const isSelected = activeMonth === m;
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          setActiveMonth(m);
                          setIsDrawerOpen(false);
                        }}
                        className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{m}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>

                {canAccessDashboard && (
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenRollover();
                    }}
                    className="w-full mt-2 py-2 px-3 rounded-xl border border-dashed border-purple-300 text-purple-700 hover:bg-purple-50 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tạo Bảng Tháng Mới (Nhân bản)</span>
                  </button>
                )}
              </div>

              {/* SECTION 4: CHẾ ĐỘ XEM */}
              <div>
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Giao Diện Điểm Danh</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('MOBILE');
                      setIsDrawerOpen(false);
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs flex items-center justify-center gap-1.5 ${
                      viewMode === 'MOBILE'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Thẻ Di Động</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('SHEET');
                      setIsDrawerOpen(false);
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs flex items-center justify-center gap-1.5 ${
                      viewMode === 'SHEET'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Bảng Sheet</span>
                  </button>
                </div>
              </div>

              {/* SECTION 5: THAO TÁC HỆ THỐNG */}
              <div>
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Công Cụ & Thao Tác
                </div>

                <div className="space-y-1.5">
                  {/* Share Zalo */}
                  {onOpenShareZalo && (
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        onOpenShareZalo();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0068FF] border border-blue-200 font-extrabold text-xs cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-[#0068FF]" />
                        <span>Chụp & Gửi Zalo (Ảnh Báo Cáo)</span>
                      </div>
                      <span className="text-[10px] bg-[#0068FF] text-white px-1.5 py-0.5 rounded-md font-bold">Mới</span>
                    </button>
                  )}

                  {/* Admin Dashboard */}
                  {canAccessDashboard && (
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        setViewMode('ADMIN_DASHBOARD');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-purple-700" />
                        <span>Trang Quản Trị Hệ Thống</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-purple-400" />
                    </button>
                  )}

                  {/* Add Student */}
                  {permissions.canAddStudent && onOpenAddStudent && (
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        onOpenAddStudent();
                      }}
                      className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4 text-purple-600" />
                      <span>Thêm Võ Sinh Mới</span>
                    </button>
                  )}

                  {/* Add Date */}
                  {permissions.canAddDateSession && onOpenAddDate && (
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        onOpenAddDate();
                      }}
                      className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs cursor-pointer transition-colors"
                    >
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>Thêm Cột Ngày Tập</span>
                    </button>
                  )}

                  {/* Export Excel */}
                  {permissions.canExportData && onExportCSV && (
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        onExportCSV();
                      }}
                      className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs cursor-pointer transition-colors"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                      <span>Xuất File Excel (.CSV)</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400 text-center">
              Võ Thuật Trung Phụng • Phiên bản 3.0 Multi-Tenant
            </div>

          </div>

        </div>
      )}

    </>
  );
};
