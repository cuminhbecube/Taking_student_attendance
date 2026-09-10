import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Plus, RefreshCw, Shield, UserRound } from 'lucide-react';
import { apiFetch, ApiError } from '../services/api';
import type { AdminUser, AuditLog, PermissionSet } from './types';

type RoleName = 'TEACHER' | 'COACH';
type PermissionRow = PermissionSet & { id?: string; role: RoleName; dojoId: string };

type Props = {
  scope: string;
  scopeQuery: string;
  currentUserId: string;
  onError: (message: string) => void;
};

const permissionLabels: Array<[keyof PermissionSet, string]> = [
  ['canTakeAttendance', 'Điểm danh'],
  ['canAddDateSession', 'Tạo/khóa buổi'],
  ['canAddStudent', 'Thêm võ sinh'],
  ['canEditStudentInfo', 'Sửa võ sinh'],
  ['canDeleteStudent', 'Ngừng võ sinh'],
  ['canEditSchedule', 'Xếp lớp/lịch'],
  ['canViewTuition', 'Xem học phí'],
  ['canEditTuition', 'Thu học phí'],
  ['canExportData', 'Xuất dữ liệu']
];

export function AdminPanel({ scope, scopeQuery, currentUserId, onError }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [busy, setBusy] = useState(false);

  const apiError = (error: unknown) => {
    if (error instanceof ApiError) onError(error.payload?.message || String(error.payload?.error || error.message));
    else onError(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
  };

  const load = useCallback(async () => {
    if (!scope) return;
    setBusy(true);
    try {
      const [userRes, permissionRes, auditRes] = await Promise.all([
        apiFetch<{ users: AdminUser[] }>(`/admin/users?${scopeQuery}`),
        apiFetch<{ permissions: PermissionRow[] }>(`/admin/permissions?${scopeQuery}`),
        apiFetch<{ auditLogs: AuditLog[] }>(`/admin/audit?${scopeQuery}${scopeQuery ? '&' : ''}limit=60`)
      ]);
      setUsers(userRes.users);
      setPermissions(permissionRes.permissions);
      setAudit(auditRes.auditLogs);
    } catch (error) { apiError(error); }
    finally { setBusy(false); }
  }, [scope, scopeQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const addStaff = async () => {
    const fullName = window.prompt('Họ tên nhân sự:')?.trim(); if (!fullName) return;
    const username = window.prompt('Username:')?.trim(); if (!username) return;
    const roleInput = window.prompt('Vai trò TEACHER hoặc COACH:', 'COACH')?.trim().toUpperCase();
    if (roleInput !== 'TEACHER' && roleInput !== 'COACH') return onError('Vai trò chỉ được TEACHER hoặc COACH.');
    const password = window.prompt('Mật khẩu ban đầu (>= 6 ký tự):', '123456'); if (!password) return;
    try {
      await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify({ fullName, username, role: roleInput, password, dojoId: scope }) });
      await load();
    } catch (error) { apiError(error); }
  };

  const toggleUser = async (user: AdminUser) => {
    if (user.id === currentUserId) return onError('Không thể tự khóa tài khoản đang đăng nhập.');
    const status = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    if (!window.confirm(`${status === 'LOCKED' ? 'Khóa' : 'Mở khóa'} tài khoản @${user.username}?`)) return;
    try {
      await apiFetch(`/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await load();
    } catch (error) { apiError(error); }
  };

  const resetPassword = async (user: AdminUser) => {
    const password = window.prompt(`Mật khẩu mới cho @${user.username} (>= 6 ký tự):`);
    if (!password) return;
    try {
      await apiFetch(`/admin/users/${user.id}/password`, { method: 'POST', body: JSON.stringify({ password }) });
      window.alert('Đã cập nhật mật khẩu.');
      await load();
    } catch (error) { apiError(error); }
  };

  const togglePermission = async (row: PermissionRow, key: keyof PermissionSet) => {
    const next = { ...row, [key]: !row[key] };
    const body: PermissionSet & { dojoId: string } = {
      dojoId: scope,
      canViewTuition: next.canViewTuition,
      canEditTuition: next.canEditTuition,
      canEditSchedule: next.canEditSchedule,
      canTakeAttendance: next.canTakeAttendance,
      canAddStudent: next.canAddStudent,
      canEditStudentInfo: next.canEditStudentInfo,
      canDeleteStudent: next.canDeleteStudent,
      canAddDateSession: next.canAddDateSession,
      canExportData: next.canExportData
    };
    try {
      const response = await apiFetch<{ permission: PermissionRow }>(`/admin/permissions/${row.role}`, { method: 'PUT', body: JSON.stringify(body) });
      setPermissions(items => items.map(item => item.role === row.role ? response.permission : item));
    } catch (error) { apiError(error); }
  };

  return <section className="space-y-5">
    <div>
      <div className="flex justify-between items-center mb-3"><div><h2 className="font-black text-lg">Tài khoản nhân sự</h2><p className="text-xs text-slate-500">Khóa/mở tài khoản và reset mật khẩu tại server</p></div><div className="flex gap-2"><button onClick={load} className="p-2 border rounded-xl"><RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`}/></button><button onClick={addStaff} className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"><Plus className="inline w-4 h-4"/> Nhân sự</button></div></div>
      <div className="grid md:grid-cols-2 gap-2">{users.map(user => <div key={user.id} className="bg-white border rounded-xl p-3 flex items-center gap-3">
        <UserRound className="w-5 h-5 text-indigo-600"/><div className="flex-1 min-w-0"><div className="font-bold truncate">{user.fullName}</div><div className="text-xs text-slate-500">@{user.username} · {user.role}</div></div>
        <button onClick={() => resetPassword(user)} className="px-2 py-1 rounded-lg border text-[10px] font-bold">Mật khẩu</button>
        <button onClick={() => toggleUser(user)} className={`px-2 py-1 rounded-lg text-[10px] font-bold ${user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{user.status}</button>
      </div>)}</div>
    </div>

    <div>
      <h2 className="font-black text-lg mb-1 flex items-center gap-2"><Shield className="w-5 h-5"/> Phân quyền</h2><p className="text-xs text-slate-500 mb-3">Thay đổi có hiệu lực ngay tại API, không cần đăng nhập lại.</p>
      <div className="grid lg:grid-cols-2 gap-3">{permissions.map(row => <div key={row.role} className="bg-white border rounded-2xl p-3"><div className="font-black mb-2">{row.role}</div><div className="grid grid-cols-2 gap-2">{permissionLabels.map(([key, label]) => <label key={key} className="flex items-center justify-between gap-2 border rounded-xl px-3 py-2 text-xs"><span>{label}</span><input type="checkbox" checked={Boolean(row[key])} onChange={() => togglePermission(row, key)} className="h-4 w-4"/></label>)}</div></div>)}</div>
    </div>

    <div>
      <h2 className="font-black text-lg mb-2 flex items-center gap-2"><Activity className="w-5 h-5"/> Nhật ký gần đây</h2>
      <div className="bg-white border rounded-2xl overflow-hidden">{audit.map(item => <div key={item.id} className="px-3 py-2 border-b last:border-0 text-xs"><span className="font-bold">{item.action}</span> · {item.actor?.fullName || 'Hệ thống'} <span className="text-slate-400 float-right">{new Date(item.createdAt).toLocaleString('vi-VN')}</span></div>)}</div>
    </div>
  </section>;
}
