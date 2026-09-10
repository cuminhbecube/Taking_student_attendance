import React, { useState } from 'react';
import { 
  AppPermissions, RolePermissions, Student, DojoClass, UserRole, UserAccount, Dojo 
} from '../types';
import { 
  Shield, GraduationCap, Dumbbell, Check, X, 
  Search, Plus, Trash2, Edit3, Calendar, DollarSign, 
  Lock, KeyRound, Download, Upload, RotateCcw, AlertTriangle, 
  School, CheckCircle2, UserPlus, Sliders, ChevronRight, Building2, Users,
  LayoutGrid, Table as TableIcon, Phone
} from 'lucide-react';
import { AccountManagementTab } from './AccountManagementTab';
import { HoldClassCard } from './HoldClassCard';
import { matchStudentSearch } from '../utils/vietnameseSearch';

interface AdminDashboardProps {
  currentUser: UserAccount;
  dojos: Dojo[];
  activeDojo?: Dojo;
  accounts: UserAccount[];
  permissions: AppPermissions;
  onUpdatePermissions: (newPermissions: AppPermissions) => void;
  onResetPermissions: () => void;
  students: Student[];
  onAddStudent: () => void;
  onEditStudentSchedule: (student: Student) => void;
  onEditStudentInfo: (student: Student) => void;
  onDeleteStudent: (studentId: string, studentName: string) => void;
  classes: DojoClass[];
  activeClassId: string;
  onOpenAddClass: () => void;
  onBackToAttendance: () => void;
  onAddDojo: (name: string, code: string, address: string, phone: string, adminUsername: string, initialPassword?: string) => void;
  onUpdateDojo: (dojoId: string, name: string, address: string, phone: string) => void;
  onDeleteDojo: (dojoId: string) => void;
  onAddStaffAccount: (dojoId: string, fullName: string, username: string, role: 'TEACHER' | 'COACH', phone: string, initialPassword?: string) => { success: boolean; message?: string };
  onUpdateStaffAccount: (userId: string, fullName: string, role: 'TEACHER' | 'COACH', phone: string) => void;
  onToggleAccountStatus: (userId: string) => void;
  onDeleteAccount: (userId: string) => void;
  onResetPasswordToDefault: (userId: string) => { success: boolean; defaultPassword: string };
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => void;
  onResetAllData: () => void;
  onRequestDeleteClass?: (classItem: DojoClass) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardProps> = ({
  currentUser, dojos, activeDojo, accounts,
  permissions, onUpdatePermissions, onResetPermissions,
  students, onAddStudent, onEditStudentSchedule, onEditStudentInfo, onDeleteStudent,
  classes, activeClassId, onOpenAddClass, onBackToAttendance,
  onAddDojo, onUpdateDojo, onDeleteDojo,
  onAddStaffAccount, onUpdateStaffAccount, onToggleAccountStatus, onDeleteAccount,
  onResetPasswordToDefault,
  onExportBackup, onImportBackup, onResetAllData,
  onRequestDeleteClass
}) => {
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'PERMISSIONS' | 'STUDENTS' | 'CLASSES' | 'BACKUP'>('ACCOUNTS');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentBeltFilter, setStudentBeltFilter] = useState('ALL');
  const [studentViewLayout, setStudentViewLayout] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Toggle specific permission
  const handleTogglePermission = (role: 'COACH' | 'TEACHER', key: keyof RolePermissions) => {
    const updated: AppPermissions = {
      ...permissions,
      [role]: {
        ...permissions[role],
        [key]: !permissions[role][key]
      }
    };
    onUpdatePermissions(updated);
  };

  // Set preset permissions
  const handleSetPreset = (preset: 'DEFAULT' | 'STRICT' | 'PERMISSIVE') => {
    if (preset === 'DEFAULT') {
      onResetPermissions();
    } else if (preset === 'STRICT') {
      onUpdatePermissions({
        COACH: {
          canViewTuition: false,
          canEditTuition: false,
          canEditSchedule: false,
          canTakeAttendance: true,
          canAddStudent: false,
          canEditStudentInfo: false,
          canDeleteStudent: false,
          canAddDateSession: false,
          canExportData: false
        },
        TEACHER: {
          canViewTuition: false,
          canEditTuition: false,
          canEditSchedule: false,
          canTakeAttendance: true,
          canAddStudent: false,
          canEditStudentInfo: false,
          canDeleteStudent: false,
          canAddDateSession: false,
          canExportData: false
        }
      });
    } else if (preset === 'PERMISSIVE') {
      onUpdatePermissions({
        COACH: {
          canViewTuition: true,
          canEditTuition: false,
          canEditSchedule: true,
          canTakeAttendance: true,
          canAddStudent: true,
          canEditStudentInfo: true,
          canDeleteStudent: false,
          canAddDateSession: true,
          canExportData: true
        },
        TEACHER: {
          canViewTuition: true,
          canEditTuition: true,
          canEditSchedule: true,
          canTakeAttendance: true,
          canAddStudent: true,
          canEditStudentInfo: true,
          canDeleteStudent: true,
          canAddDateSession: true,
          canExportData: true
        }
      });
    }
  };

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchSearch = !studentSearch.trim() || 
                        matchStudentSearch(s, studentSearch).matched ||
                        s.registrationClass.toLowerCase().includes(studentSearch.toLowerCase());
    const matchBelt = studentBeltFilter === 'ALL' || s.belt === studentBeltFilter;
    return matchSearch && matchBelt;
  });

  const permissionList: { key: keyof RolePermissions; label: string; desc: string }[] = [
    {
      key: 'canViewTuition',
      label: 'Xem trạng thái học phí',
      desc: 'Hiển thị huy hiệu đã nộp/chưa nộp, nợ học phí và ghi chú đóng phí.'
    },
    {
      key: 'canEditTuition',
      label: 'Cập nhật / Thu học phí',
      desc: 'Cho phép bấm trực tiếp để đổi trạng thái học phí của võ sinh.'
    },
    {
      key: 'canEditSchedule',
      label: 'Xếp lịch tập học sinh (Checkbox)',
      desc: 'Bấm vào thẻ ca học để tích chọn các thứ học sinh đăng ký trong tuần.'
    },
    {
      key: 'canTakeAttendance',
      label: 'Điểm danh buổi tập',
      desc: 'Tích chọn có mặt hoặc vắng mặt cho học sinh trong các buổi tập.'
    },
    {
      key: 'canAddStudent',
      label: 'Thêm võ sinh mới',
      desc: 'Hiển thị nút và form thêm học sinh mới vào danh sách lớp.'
    },
    {
      key: 'canEditStudentInfo',
      label: 'Sửa thông tin võ sinh',
      desc: 'Thay đổi Họ tên, Cấp đai, Ngày sinh, SĐT phụ huynh.'
    },
    {
      key: 'canDeleteStudent',
      label: 'Xóa võ sinh khỏi lớp',
      desc: 'Xóa hoàn toàn học sinh khỏi bảng điểm danh và cơ sở dữ liệu.'
    },
    {
      key: 'canAddDateSession',
      label: 'Thêm cột ngày tập mới',
      desc: 'Tạo thêm các buổi tập mới phát sinh trong tháng.'
    },
    {
      key: 'canExportData',
      label: 'Xuất file Excel (.CSV)',
      desc: 'Tải toàn bộ bảng điểm danh và chuyên cần về máy tính.'
    }
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-150 pb-10">
      
      {/* Top Banner with Navigation (No Horizontal Scrolling on Mobile) */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-4 sm:p-6 text-white shadow-xl border border-purple-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-200 shrink-0 shadow-inner">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black tracking-tight">
                  {currentUser.role === 'SUPER_ADMIN'
                    ? 'Bảng Điều Khiển Quản Trị Hệ Thống'
                    : `Quản Trị Võ Đường • ${activeDojo?.name || 'Hà Nội Kid'}`}
                </h2>
                <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/30 font-bold px-2 py-0.5 rounded-full">
                  {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Quản Trị Võ Đường'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-purple-200/80 mt-0.5">
                {currentUser.role === 'SUPER_ADMIN'
                  ? 'Thiết lập phân quyền nhân sự, quản lý võ đường và kiểm soát toàn bộ cơ sở dữ liệu hệ thống.'
                  : `Quản lý nhân sự GVCN & HLV, thiết lập phân quyền vai trò và quản lý các lớp học của ${activeDojo?.name || 'võ đường'}.`}
              </p>
            </div>
          </div>

          <button
            onClick={onBackToAttendance}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-purple-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <span>← Quay Lại Bảng Điểm Danh</span>
          </button>
        </div>

        {/* Tab Navigation: Grid on Mobile (ZERO Horizontal Scroll), Flex on Desktop */}
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-purple-800/60 grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-1.5 sm:gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ACCOUNTS')}
            className={`px-3 py-2.5 sm:py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs ${
              activeTab === 'ACCOUNTS'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-purple-950/40 text-purple-200 hover:bg-purple-900/60'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">1. {currentUser.role === 'SUPER_ADMIN' ? 'Võ Đường & TK' : 'Nhân Sự & TK'}</span>
          </button>

          <button
            onClick={() => setActiveTab('PERMISSIONS')}
            className={`px-3 py-2.5 sm:py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs ${
              activeTab === 'PERMISSIONS'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-purple-950/40 text-purple-200 hover:bg-purple-900/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">2. Phân Quyền</span>
          </button>

          <button
            onClick={() => setActiveTab('STUDENTS')}
            className={`px-3 py-2.5 sm:py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs ${
              activeTab === 'STUDENTS'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-purple-950/40 text-purple-200 hover:bg-purple-900/60'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">3. Võ Sinh ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CLASSES')}
            className={`px-3 py-2.5 sm:py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs ${
              activeTab === 'CLASSES'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-purple-950/40 text-purple-200 hover:bg-purple-900/60'
            }`}
          >
            <School className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">4. Lớp Học ({classes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('BACKUP')}
            className={`col-span-2 sm:col-span-1 px-3 py-2.5 sm:py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs ${
              activeTab === 'BACKUP'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-purple-950/40 text-purple-200 hover:bg-purple-900/60'
            }`}
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">5. Sao Lưu Dữ Liệu</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: QUẢN LÝ VÕ ĐƯỜNG & TÀI KHOẢN NHÂN SỰ
          ========================================================================= */}
      {activeTab === 'ACCOUNTS' && (
        <AccountManagementTab
          currentUser={currentUser}
          dojos={dojos}
          activeDojo={activeDojo}
          accounts={accounts}
          onAddDojo={onAddDojo}
          onUpdateDojo={onUpdateDojo}
          onDeleteDojo={onDeleteDojo}
          onAddStaffAccount={onAddStaffAccount}
          onUpdateStaffAccount={onUpdateStaffAccount}
          onToggleAccountStatus={onToggleAccountStatus}
          onDeleteAccount={onDeleteAccount}
          onResetPasswordToDefault={onResetPasswordToDefault}
        />
      )}

      {/* =========================================================================
          TAB 2: TRUNG TÂM PHÂN QUYỀN (RBAC PERMISSIONS MATRIX)
          ========================================================================= */}
      {activeTab === 'PERMISSIONS' && (
        <div className="space-y-4">
          
          {/* Preset Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-extrabold text-slate-800 text-sm block">
                {currentUser.role === 'SUPER_ADMIN' 
                  ? 'Cài Đặt Nhanh Phân Quyền Hệ Thống:' 
                  : `Phân Quyền Nhân Sự (${activeDojo?.name || 'Võ Đường'}):`}
              </span>
              <span className="text-slate-500 text-[11px]">
                {currentUser.role === 'SUPER_ADMIN'
                  ? 'Super Admin có toàn quyền thiết lập ma trận phân quyền áp dụng cho các vai trò nhân sự.'
                  : 'Quản Trị Võ Đường có toàn quyền bật/tắt chức năng cho Giáo Viên Chủ Nhiệm (GVCN) và Huấn Luyện Viên (HLV).'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleSetPreset('DEFAULT')}
                className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Mặc Định An Toàn</span>
              </button>

              <button
                onClick={() => handleSetPreset('STRICT')}
                className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold transition-all cursor-pointer"
              >
                Chỉ Điểm Danh (Nghiêm Ngặt)
              </button>

              <button
                onClick={() => handleSetPreset('PERMISSIVE')}
                className="px-3 py-1.5 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold transition-all cursor-pointer"
              >
                Mở Rộng Toàn Quyền
              </button>
            </div>
          </div>

          {/* 2 Permission Columns: Coach vs Teacher */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* COLUMN 1: HUẤN LUYỆN VIÊN (COACH) */}
            <div className="bg-white rounded-3xl p-5 border-2 border-amber-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Huấn Luyện Viên (HLV)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      HLV Trưởng & Trợ Giảng phụ trách chuyên môn
                    </p>
                  </div>
                </div>
                <span className="text-[11px] bg-amber-50 text-amber-900 font-bold px-2 py-0.5 rounded-md border border-amber-200">
                  Vai Trò HLV
                </span>
              </div>

              {/* Permission Switches for Coach */}
              <div className="divide-y divide-slate-100">
                {permissionList.map((item) => {
                  const isEnabled = permissions.COACH[item.key];
                  return (
                    <div key={item.key} className="py-3 flex items-center justify-between gap-3">
                      <div className="pr-2">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {isEnabled ? (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                              Được làm
                            </span>
                          ) : (
                            <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.2 rounded">
                              Bị cấm
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {item.desc}
                        </p>
                      </div>

                      {/* iOS Style Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleTogglePermission('COACH', item.key)}
                        className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                          isEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                        }`}
                        title={`Bấm để ${isEnabled ? 'cấm' : 'cho phép'} HLV thực hiện`}
                      >
                        <div className="bg-white w-4.5 h-4.5 rounded-full shadow-md transition-transform" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 2: GIÁO VIÊN CHỦ NHIỆM (TEACHER) */}
            <div className="bg-white rounded-3xl p-5 border-2 border-blue-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Giáo Viên Chủ Nhiệm (GVCN)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Giáo viên phụ trách sĩ số và quản lý lớp
                    </p>
                  </div>
                </div>
                <span className="text-[11px] bg-blue-50 text-blue-900 font-bold px-2 py-0.5 rounded-md border border-blue-200">
                  Vai Trò GVCN
                </span>
              </div>

              {/* Permission Switches for Teacher */}
              <div className="divide-y divide-slate-100">
                {permissionList.map((item) => {
                  const isEnabled = permissions.TEACHER[item.key];
                  return (
                    <div key={item.key} className="py-3 flex items-center justify-between gap-3">
                      <div className="pr-2">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {isEnabled ? (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                              Được làm
                            </span>
                          ) : (
                            <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.2 rounded">
                              Bị cấm
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {item.desc}
                        </p>
                      </div>

                      {/* iOS Style Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleTogglePermission('TEACHER', item.key)}
                        className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                          isEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                        }`}
                        title={`Bấm để ${isEnabled ? 'cấm' : 'cho phép'} Giáo viên thực hiện`}
                      >
                        <div className="bg-white w-4.5 h-4.5 rounded-full shadow-md transition-transform" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 2: QUẢN LÝ VÕ SINH
          ========================================================================= */}
      {activeTab === 'STUDENTS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            
            {/* Top Bar with Add Button & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Quản Lý Danh Sách Võ Sinh ({students.length} em)
                </h3>
                <p className="text-xs text-slate-500">
                  {currentUser.role === 'SUPER_ADMIN' ? 'Admin' : 'Quản Trị Võ Đường'} có toàn quyền chỉnh sửa thông tin, đổi lịch tập hoặc xóa võ sinh.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* View Layout Toggle: Cards vs Table */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setStudentViewLayout('CARDS')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      studentViewLayout === 'CARDS'
                        ? 'bg-white text-purple-900 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Dạng Thẻ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentViewLayout('TABLE')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      studentViewLayout === 'TABLE'
                        ? 'bg-white text-purple-900 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Dạng Bảng</span>
                  </button>
                </div>

                <button
                  onClick={onAddStudent}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4" /> Thêm Võ Sinh
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Tìm kiếm theo tên, số điện thoại, ca đăng ký..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-2xs"
                />
              </div>

              <select
                value={studentBeltFilter}
                onChange={(e) => setStudentBeltFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white cursor-pointer shadow-2xs"
              >
                <option value="ALL">Tất cả cấp đai</option>
                <option value="Trắng kyu 10">Trắng kyu 10</option>
                <option value="Cam kyu 8">Cam kyu 8</option>
                <option value="Vàng kyu 9">Vàng kyu 9</option>
                <option value="Xanh kyu 7">Xanh kyu 7</option>
              </select>
            </div>

            {/* Empty State */}
            {filteredStudents.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                <p className="font-bold text-xs">Không tìm thấy võ sinh nào phù hợp bộ lọc!</p>
              </div>
            )}

            {/* VIEW MODE 1: SMART RESPONSIVE CARDS (No Horizontal Scrolling Ever!) */}
            {studentViewLayout === 'CARDS' && filteredStudents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {filteredStudents.map((s, idx) => (
                  <div 
                    key={s.id} 
                    className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-purple-300 shadow-xs transition-all space-y-3"
                  >
                    {/* Top Row: Name & Tuition */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">{s.name}</h4>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {s.dob ? `Sinh: ${s.dob}` : 'Chưa có ngày sinh'}
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        s.tuitionStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                        s.tuitionStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                        'bg-rose-50 text-rose-700 border-rose-300'
                      }`}>
                        {s.tuitionStatus === 'PAID' ? 'Đã nộp' :
                         s.tuitionStatus === 'PARTIAL' ? 'Nợ 50%' : 'Chưa nộp'}
                      </span>
                    </div>

                    {/* Middle Row: Belt, Class & Parent Phone */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs pt-2 border-t border-slate-100">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        s.belt.includes('Cam') ? 'bg-amber-500 text-white border-amber-600' :
                        s.belt.includes('Vàng') ? 'bg-yellow-400 text-slate-900 border-yellow-500' :
                        'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {s.belt}
                      </span>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {s.registrationClass}
                      </span>

                      {s.parentPhone && (
                        <a 
                          href={`tel:${s.parentPhone}`}
                          className="text-[11px] font-mono text-slate-600 hover:text-indigo-600 flex items-center gap-1 ml-auto font-bold"
                          title="Bấm để gọi phụ huynh"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{s.parentPhone}</span>
                        </a>
                      )}
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEditStudentSchedule(s)}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Đổi lịch tập (Checkbox)"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Xếp Lịch</span>
                      </button>
                      <button
                        onClick={() => onEditStudentInfo(s)}
                        className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                        title="Sửa thông tin võ sinh"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteStudent(s.id, s.name)}
                        className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-colors"
                        title="Xóa võ sinh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VIEW MODE 2: COMPACT TABLE (For wide desktops) */}
            {studentViewLayout === 'TABLE' && filteredStudents.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">STT</th>
                      <th className="py-2.5 px-3">Võ Sinh</th>
                      <th className="py-2.5 px-2">Cấp đai</th>
                      <th className="py-2.5 px-2">Ngày sinh</th>
                      <th className="py-2.5 px-3">SĐT Phụ huynh</th>
                      <th className="py-2.5 px-2">Ca đăng ký</th>
                      <th className="py-2.5 px-2">Học phí</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {filteredStudents.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-purple-50/40 transition-colors">
                        <td className="py-2 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-extrabold text-slate-900">
                          {s.name}
                        </td>
                        <td className="py-2 px-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            s.belt.includes('Cam') ? 'bg-amber-500 text-white border-amber-600' :
                            s.belt.includes('Vàng') ? 'bg-yellow-400 text-slate-900 border-yellow-500' :
                            'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            {s.belt}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-slate-600 font-mono">
                          {s.dob || '-'}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                          {s.parentPhone || '-'}
                        </td>
                        <td className="py-2 px-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {s.registrationClass}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            s.tuitionStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                            s.tuitionStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                            'bg-rose-50 text-rose-700 border-rose-300'
                          }`}>
                            {s.tuitionStatus === 'PAID' ? 'Đã nộp' :
                             s.tuitionStatus === 'PARTIAL' ? 'Nợ 50%' : 'Chưa nộp'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onEditStudentSchedule(s)}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer"
                              title="Đổi lịch tập (Checkbox)"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onEditStudentInfo(s)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                              title="Sửa thông tin võ sinh"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteStudent(s.id, s.name)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                              title="Xóa võ sinh"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: QUẢN LÝ CƠ SỞ & LỚP HỌC
          ========================================================================= */}
      {activeTab === 'CLASSES' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Danh Sách Cơ Sở / Lớp Học Võ Thuật
                </h3>
                <p className="text-xs text-slate-500">
                  Quản lý các địa điểm tập, thời khóa biểu và huấn luyện viên phụ trách.
                </p>
              </div>

              <button
                onClick={onOpenAddClass}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> Thêm Cơ Sở / Lớp Mới
              </button>
            </div>

            {/* Class Cards Grid (Hold card for 10s to delete) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {classes.map(c => (
                <HoldClassCard
                  key={c.id}
                  classItem={c}
                  isActive={c.id === activeClassId}
                  canDelete={Boolean(onRequestDeleteClass)}
                  onHoldDeleteComplete={(cls) => onRequestDeleteClass?.(cls)}
                />
              ))}
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
      {/* =========================================================================
          TAB 5: SAO LƯU & PHỤC HỒI DỮ LIỆU
          ========================================================================= */}
      {activeTab === 'BACKUP' && (
        <div className="max-w-xl mx-auto">
          
          {/* Backup & Data Reset */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Download className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-base text-slate-900">
                Sao Lưu & Phục Hồi Dữ Liệu Hệ Thống
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Xuất toàn bộ cơ sở dữ liệu (tài khoản, võ đường, võ sinh, điểm danh, lịch tập, quyền hạn) thành file sao lưu JSON an toàn hoặc nhập lại dữ liệu khi đổi thiết bị.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={onExportBackup}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Tải File Sao Lưu Dữ Liệu (.JSON)</span>
              </button>

              <label className="w-full py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Nạp Dữ Liệu Từ File (.JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const content = evt.target?.result as string;
                        if (content) onImportBackup(content);
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <span className="font-bold text-xs text-rose-800 block mb-1">
                Khu vực khẩn cấp:
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm('CẢNH BÁO: Thao tác này sẽ xóa toàn bộ các thay đổi và đặt lại dữ liệu mẫu ban đầu từ ảnh điểm danh lớp Trung Phụng. Bạn có chắc chắn không?')) {
                    onResetAllData();
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Khôi Phục Dữ Liệu Gốc Ban Đầu (Factory Reset)</span>
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
