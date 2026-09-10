import React, { useState } from 'react';
import { UserAccount, Dojo, UserRole } from '../types';
import { 
  Building2, Plus, Shield, GraduationCap, Dumbbell, KeyRound, 
  Trash2, Edit3, Lock, Unlock, Check, AlertCircle, X, Search, Phone, User
} from 'lucide-react';

interface AccountManagementTabProps {
  currentUser: UserAccount;
  dojos: Dojo[];
  activeDojo?: Dojo;
  accounts: UserAccount[];
  onAddDojo: (name: string, code: string, address: string, phone: string, adminUsername: string, initialPassword?: string) => void;
  onUpdateDojo: (dojoId: string, name: string, address: string, phone: string) => void;
  onDeleteDojo: (dojoId: string) => void;
  onAddStaffAccount: (dojoId: string, fullName: string, username: string, role: 'TEACHER' | 'COACH', phone: string, initialPassword?: string) => { success: boolean; message?: string };
  onUpdateStaffAccount: (userId: string, fullName: string, role: 'TEACHER' | 'COACH', phone: string) => void;
  onToggleAccountStatus: (userId: string) => void;
  onDeleteAccount: (userId: string) => void;
  onResetPasswordToDefault: (userId: string) => { success: boolean; defaultPassword: string };
}

export const AccountManagementTab: React.FC<AccountManagementTabProps> = ({
  currentUser, dojos, activeDojo, accounts,
  onAddDojo, onUpdateDojo, onDeleteDojo,
  onAddStaffAccount, onUpdateStaffAccount, onToggleAccountStatus, onDeleteAccount,
  onResetPasswordToDefault
}) => {
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  // Sub-tab for Super Admin
  const [adminSubTab, setAdminSubTab] = useState<'DOJOS' | 'STAFF'>('DOJOS');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Modal States: Add Dojo
  const [isAddDojoOpen, setIsAddDojoOpen] = useState(false);
  const [newDojoName, setNewDojoName] = useState('');
  const [newDojoCode, setNewDojoCode] = useState('');
  const [newDojoAddress, setNewDojoAddress] = useState('');
  const [newDojoPhone, setNewDojoPhone] = useState('');
  const [newDojoAdminUser, setNewDojoAdminUser] = useState('');
  const [newDojoAdminPass, setNewDojoAdminPass] = useState('dojo123');

  // Modal States: Add Staff Account
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffFullName, setNewStaffFullName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'TEACHER' | 'COACH'>('TEACHER');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('123456');
  const [staffFormError, setStaffFormError] = useState<string | null>(null);

  // Modal States: Edit Staff Account
  const [editingStaff, setEditingStaff] = useState<UserAccount | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered staff accounts based on multi-tenant rules
  const visibleAccounts = accounts.filter(acc => {
    // Multi-tenant: If not Super Admin, strictly filter to user's Dojo!
    if (!isSuperAdmin && acc.dojoId !== currentUser.dojoId) {
      return false;
    }
    // Filter by role
    if (roleFilter !== 'ALL' && acc.role !== roleFilter) {
      return false;
    }
    // Search by name or username
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return acc.fullName.toLowerCase().includes(q) || acc.username.toLowerCase().includes(q);
    }
    return true;
  });

  // Submit Add Dojo
  const handleCreateDojo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDojoName.trim() || !newDojoCode.trim() || !newDojoAdminUser.trim()) return;

    onAddDojo(
      newDojoName.trim(),
      newDojoCode.trim().toUpperCase(),
      newDojoAddress.trim(),
      newDojoPhone.trim(),
      newDojoAdminUser.trim().toLowerCase(),
      newDojoAdminPass.trim() || 'dojo123'
    );

    setIsAddDojoOpen(false);
    setNewDojoName('');
    setNewDojoCode('');
    setNewDojoAddress('');
    setNewDojoPhone('');
    setNewDojoAdminUser('');
    setNewDojoAdminPass('dojo123');
    showToast(`Đã tạo võ đường mới "${newDojoName}" và tài khoản quản trị thành công!`);
  };

  // Submit Add Staff
  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffFormError(null);

    const targetDojoId = isSuperAdmin ? (activeDojo?.id || 'DOJO-TP') : currentUser.dojoId;
    const res = onAddStaffAccount(
      targetDojoId,
      newStaffFullName.trim(),
      newStaffUsername.trim().toLowerCase(),
      newStaffRole,
      newStaffPhone.trim(),
      newStaffPass.trim() || '123456'
    );

    if (!res.success) {
      setStaffFormError(res.message || 'Lỗi khi tạo tài khoản!');
      return;
    }

    setIsAddStaffOpen(false);
    setNewStaffFullName('');
    setNewStaffUsername('');
    setNewStaffPhone('');
    setNewStaffPass('123456');
    showToast(`Đã tạo tài khoản cho "${newStaffFullName}" với mật khẩu mặc định 123456!`);
  };

  // Submit Edit Staff
  const handleSaveEditStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    onUpdateStaffAccount(editingStaff.id, editingStaff.fullName, editingStaff.role as 'TEACHER' | 'COACH', editingStaff.phone);
    setEditingStaff(null);
    showToast('Đã cập nhật thông tin tài khoản thành công!');
  };

  // Trigger Reset Password
  const handleResetPassword = (acc: UserAccount) => {
    if (confirm(`Bạn có chắc muốn ĐẶT LẠI MẬT KHẨU của "${acc.fullName}" (@${acc.username}) về mật khẩu mặc định "123456"?`)) {
      const res = onResetPasswordToDefault(acc.id);
      if (res.success) {
        showToast(`Đã đặt lại mật khẩu của @${acc.username} về mặc định "${res.defaultPassword}"!`);
      }
    }
  };

  return (
    <div className="space-y-4 text-xs text-slate-800">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-900 text-emerald-100 shadow-2xl border border-emerald-700 flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold text-xs">{toastMessage}</span>
        </div>
      )}

      {/* SUPER ADMIN: Switch between Dojos and Staff */}
      {isSuperAdmin && (
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
          <button
            type="button"
            onClick={() => setAdminSubTab('DOJOS')}
            className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              adminSubTab === 'DOJOS'
                ? 'bg-white text-purple-900 shadow-xs border border-purple-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>Quản Lý Danh Sách Võ Đường ({dojos.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setAdminSubTab('STAFF')}
            className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              adminSubTab === 'STAFF'
                ? 'bg-white text-purple-900 shadow-xs border border-purple-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 text-indigo-600" />
            <span>Tài Khoản Nhân Sự Toàn Hệ Thống ({accounts.length})</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          VIEW 1: SUPER ADMIN MANAGE DOJOS
          ========================================================================= */}
      {isSuperAdmin && adminSubTab === 'DOJOS' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Danh Sách Võ Đường Trực Thuộc Hệ Thống</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Mỗi võ đường là một hệ thống độc lập hoàn toàn về võ sinh, lớp học và nhân sự.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddDojoOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm Võ Đường Mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dojos.map(d => {
              const adminAcc = accounts.find(a => a.username.toLowerCase() === d.adminUsername.toLowerCase());
              return (
                <div key={d.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-black text-sm">
                        {d.code}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{d.name}</h4>
                        <div className="text-[11px] text-slate-500 font-mono">Mã: {d.code} • ID: {d.id}</div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      d.status === 'ACTIVE' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {d.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-600 mt-2.5 pt-2 border-t border-slate-100">
                    <p>📍 <strong>Địa chỉ:</strong> {d.address || 'Chưa cập nhật'}</p>
                    <p>📞 <strong>Hotline:</strong> {d.phone || 'Chưa cập nhật'}</p>
                    <p>👤 <strong>Tài khoản Admin:</strong> <span className="font-mono font-bold text-purple-700">@{d.adminUsername}</span></p>
                  </div>

                  {/* Actions for Dojo Admin */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    {adminAcc ? (
                      <button
                        type="button"
                        onClick={() => handleResetPassword(adminAcc)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                        title="Đặt lại mật khẩu admin võ đường về '123456'"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        <span>Reset Mật Khẩu Admin</span>
                      </button>
                    ) : <span className="text-[10px] text-slate-400">Chưa gắn tài khoản</span>}

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn XÓA võ đường "${d.name}"? Hành động này sẽ xóa toàn bộ dữ liệu lớp học và võ sinh của võ đường!`)) {
                          onDeleteDojo(d.id);
                          showToast(`Đã xóa võ đường "${d.name}"!`);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                      title="Xóa võ đường"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: DOJO ADMIN (HOẶC SUPER ADMIN TAB STAFF) MANAGE STAFF (GVCN & HLV)
          ========================================================================= */}
      {(!isSuperAdmin || adminSubTab === 'STAFF') && (
        <div className="space-y-3">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-black text-xs uppercase tracking-wider">
                  {isSuperAdmin ? 'Toàn Hệ Thống' : (activeDojo?.name || 'Võ Đường')}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-300">Quản Lý Nhân Sự & Tài Khoản</span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                Danh Sách Giáo Viên Chủ Nhiệm & Huấn Luyện Viên
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Tạo tài khoản mới, phân công vai trò và đặt lại mật khẩu về mặc định (123456) khi nhân sự quên.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddStaffOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-950/40 cursor-pointer transition-all self-start sm:self-auto shrink-0 border border-amber-300/40"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Thêm Tài Khoản Nhân Sự</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo họ tên hoặc tên đăng nhập (@username)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full sm:w-48 px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-xs cursor-pointer shadow-2xs"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="TEACHER">Giáo Viên Chủ Nhiệm (GVCN)</option>
              <option value="COACH">Huấn Luyện Viên (HLV)</option>
              {isSuperAdmin && <option value="DOJO_ADMIN">Quản Trị Võ Đường</option>}
            </select>
          </div>

          {/* Staff Accounts List */}
          <div className="space-y-2.5">
            {visibleAccounts.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-bold text-xs">Không tìm thấy tài khoản nào phù hợp!</p>
              </div>
            ) : (
              visibleAccounts.map(acc => {
                const isDojoLead = acc.role === 'DOJO_ADMIN';
                const isTeacher = acc.role === 'TEACHER';
                const isCoach = acc.role === 'COACH';
                const dojoObj = dojos.find(d => d.id === acc.dojoId);

                return (
                  <div 
                    key={acc.id}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                        isDojoLead ? 'bg-amber-100 text-amber-800' :
                        isTeacher ? 'bg-blue-100 text-blue-800' :
                        isCoach ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {isDojoLead ? <Building2 className="w-5 h-5" /> :
                         isTeacher ? <GraduationCap className="w-5 h-5" /> :
                         isCoach ? <Dumbbell className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-xs text-slate-900 truncate">
                            {acc.fullName}
                          </h4>

                          {/* Role Badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isDojoLead ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            isTeacher ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            isCoach ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            'bg-purple-50 text-purple-800 border-purple-200'
                          }`}>
                            {isDojoLead ? 'Admin Võ Đường' : isTeacher ? 'GVCN' : isCoach ? 'HLV' : 'Admin'}
                          </span>

                          {/* Status */}
                          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            acc.status === 'ACTIVE' 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {acc.status === 'ACTIVE' ? 'Hoạt động' : 'Đang khóa'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-700">@{acc.username}</span>
                          {acc.phone && (
                            <>
                              <span>•</span>
                              <span>SĐT: <strong className="font-mono text-slate-700">{acc.phone}</strong></span>
                            </>
                          )}
                          {isSuperAdmin && dojoObj && (
                            <>
                              <span>•</span>
                              <span className="text-purple-700 font-semibold">{dojoObj.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end flex-wrap">
                      
                      {/* RESET PASSWORD BUTTON */}
                      {(isSuperAdmin || acc.role === 'TEACHER' || acc.role === 'COACH') && (
                        <button
                          type="button"
                          onClick={() => handleResetPassword(acc)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Đặt lại mật khẩu về mặc định '123456'"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reset MK (123456)</span>
                        </button>
                      )}

                      {/* Edit Button */}
                      {(isSuperAdmin || acc.role === 'TEACHER' || acc.role === 'COACH') && (
                        <button
                          type="button"
                          onClick={() => setEditingStaff(acc)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                          title="Sửa thông tin tài khoản"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Lock / Unlock Button */}
                      {(isSuperAdmin || acc.role === 'TEACHER' || acc.role === 'COACH') && (
                        <button
                          type="button"
                          onClick={() => onToggleAccountStatus(acc.id)}
                          className={`p-1.5 rounded-xl border cursor-pointer transition-colors ${
                            acc.status === 'ACTIVE' 
                              ? 'text-slate-500 hover:text-rose-600 border-slate-200 hover:bg-rose-50' 
                              : 'text-emerald-700 bg-emerald-50 border-emerald-300'
                          }`}
                          title={acc.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        >
                          {acc.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      {/* Delete Button (Not allowed to delete yourself or higher roles) */}
                      {acc.id !== currentUser.id && (isSuperAdmin || acc.role === 'TEACHER' || acc.role === 'COACH') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${acc.fullName}" (@${acc.username}) khỏi hệ thống?`)) {
                              onDeleteAccount(acc.id);
                              showToast(`Đã xóa tài khoản @${acc.username}!`);
                            }
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 cursor-pointer transition-colors"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* =========================================================================
          MODAL: THÊM VÕ ĐƯỜNG MỚI (CHO SUPER ADMIN)
          ========================================================================= */}
      {isAddDojoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <span>Tạo Võ Đường Mới Độc Lập</span>
              </h3>
              <button onClick={() => setIsAddDojoOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDojo} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên võ đường / cơ sở:</label>
                <input
                  type="text"
                  required
                  value={newDojoName}
                  onChange={(e) => setNewDojoName(e.target.value)}
                  placeholder="Ví dụ: CLB Võ Thuật Cầu Giấy"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mã viết tắt (Code):</label>
                  <input
                    type="text"
                    required
                    value={newDojoCode}
                    onChange={(e) => setNewDojoCode(e.target.value)}
                    placeholder="Ví dụ: CG, TP, HD..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold uppercase text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hotline / SĐT:</label>
                  <input
                    type="tel"
                    value={newDojoPhone}
                    onChange={(e) => setNewDojoPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Địa chỉ võ đường:</label>
                <input
                  type="text"
                  value={newDojoAddress}
                  onChange={(e) => setNewDojoAddress(e.target.value)}
                  placeholder="Ví dụ: Nhà Thi Đấu Cầu Giấy, 35 Trần Quý Kiên"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="font-extrabold text-[11px] text-purple-700 uppercase tracking-wider mb-2">
                  Tài khoản Quản trị Võ Đường (Dojo Admin):
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tên đăng nhập:</label>
                    <input
                      type="text"
                      required
                      value={newDojoAdminUser}
                      onChange={(e) => setNewDojoAdminUser(e.target.value)}
                      placeholder="dojo_cg"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mật khẩu khởi tạo:</label>
                    <input
                      type="text"
                      value={newDojoAdminPass}
                      onChange={(e) => setNewDojoAdminPass(e.target.value)}
                      placeholder="dojo123"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDojoOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Tạo Võ Đường
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: THÊM TÀI KHOẢN NHÂN SỰ MỚI (GVCN / HLV)
          ========================================================================= */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                <span>Thêm Tài Khoản Nhân Sự Mới</span>
              </h3>
              <button onClick={() => setIsAddStaffOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {staffFormError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{staffFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Vai trò nhân sự:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStaffRole('TEACHER')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      newStaffRole === 'TEACHER'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    <span>Giáo Viên (GVCN)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStaffRole('COACH')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      newStaffRole === 'COACH'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <Dumbbell className="w-4 h-4 text-emerald-600" />
                    <span>Huấn Luyện Viên (HLV)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Họ và tên nhân sự:</label>
                <input
                  type="text"
                  required
                  value={newStaffFullName}
                  onChange={(e) => {
                    setNewStaffFullName(e.target.value);
                    if (!newStaffUsername) {
                      // auto suggest username from name
                      const slug = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                      if (slug) setNewStaffUsername(newStaffRole === 'TEACHER' ? `gv_${slug}` : `hlv_${slug}`);
                    }
                  }}
                  placeholder="Ví dụ: Cô Nguyễn Thị Lan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tên đăng nhập (@username):</label>
                  <input
                    type="text"
                    required
                    value={newStaffUsername}
                    onChange={(e) => setNewStaffUsername(e.target.value.toLowerCase())}
                    placeholder="gv_lan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số điện thoại:</label>
                  <input
                    type="tel"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="0973 111 222"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mật khẩu ban đầu:</label>
                <input
                  type="text"
                  value={newStaffPass}
                  onChange={(e) => setNewStaffPass(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Mặc định là <strong>123456</strong>. Nhân sự có thể tự đổi mật khẩu sau khi đăng nhập.
                </span>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SỬA THÔNG TIN NHÂN SỰ
          ========================================================================= */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-base text-slate-900">
                Sửa Thông Tin Tài Khoản: @{editingStaff.username}
              </h3>
              <button onClick={() => setEditingStaff(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStaff} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Họ và tên:</label>
                <input
                  type="text"
                  required
                  value={editingStaff.fullName}
                  onChange={(e) => setEditingStaff({ ...editingStaff, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Vai trò:</label>
                <select
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white cursor-pointer"
                >
                  <option value="TEACHER">Giáo Viên Chủ Nhiệm (GVCN)</option>
                  <option value="COACH">Huấn Luyện Viên (HLV)</option>
                  {isSuperAdmin && <option value="DOJO_ADMIN">Quản Trị Võ Đường</option>}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Số điện thoại:</label>
                <input
                  type="tel"
                  value={editingStaff.phone}
                  onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
