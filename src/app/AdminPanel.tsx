import React, { useCallback, useEffect, useState } from 'react';
import { Activity, CalendarDays, Pencil, Plus, RefreshCw, Shield, Trash2, UserRound } from 'lucide-react';
import { apiFetch, ApiError } from '../services/api';
import type { AdminUser, AuditLog, ClassItem, PermissionSet } from './types';

type RoleName = 'TEACHER' | 'COACH';
type PermissionRow = PermissionSet & { id?: string; role: RoleName; dojoId: string };

type Props = {
  scope: string;
  scopeQuery: string;
  currentUserId: string;
  onError: (message: string) => void;
  onCoreReload?: () => Promise<void> | void;
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

const dayNames: Record<number, string> = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 7: 'CN' };

export function AdminPanel({ scope, scopeQuery, currentUserId, onError, onCoreReload }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [busy, setBusy] = useState(false);

  const apiError = (error: unknown) => {
    if (error instanceof ApiError) onError(error.payload?.message || String(error.payload?.error || error.message));
    else onError(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
  };

  const load = useCallback(async () => {
    if (!scope) return;
    setBusy(true);
    try {
      const [userRes, permissionRes, auditRes, classRes] = await Promise.all([
        apiFetch<{ users: AdminUser[] }>(`/admin/users?${scopeQuery}`),
        apiFetch<{ permissions: PermissionRow[] }>(`/admin/permissions?${scopeQuery}`),
        apiFetch<{ auditLogs: AuditLog[] }>(`/admin/audit?${scopeQuery}${scopeQuery ? '&' : ''}limit=60`),
        apiFetch<{ classes: ClassItem[] }>(`/classes?${scopeQuery}`)
      ]);
      setUsers(userRes.users);
      setPermissions(permissionRes.permissions);
      setAudit(auditRes.auditLogs);
      setClasses(classRes.classes);
    } catch (error) { apiError(error); }
    finally { setBusy(false); }
  }, [scope, scopeQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const refreshAll = async () => {
    await load();
    await onCoreReload?.();
  };

  const addStaff = async () => {
    const fullName = window.prompt('Họ tên nhân sự:')?.trim(); if (!fullName) return;
    const username = window.prompt('Username:')?.trim(); if (!username) return;
    const roleInput = window.prompt('Vai trò TEACHER hoặc COACH:', 'COACH')?.trim().toUpperCase();
    if (roleInput !== 'TEACHER' && roleInput !== 'COACH') return onError('Vai trò chỉ được TEACHER hoặc COACH.');
    const password = window.prompt('Mật khẩu ban đầu (>= 8 ký tự):'); if (!password) return;
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
    const password = window.prompt(`Mật khẩu mới cho @${user.username} (>= 8 ký tự):`);
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

  const parseDays = (value: string) => [...new Set(value.split(',').map(item => Number(item.trim())).filter(day => Number.isInteger(day) && day >= 1 && day <= 7))].sort();

  const addClass = async () => {
    const code = window.prompt('Mã lớp:')?.trim(); if (!code) return;
    const name = window.prompt('Tên lớp:')?.trim(); if (!name) return;
    const activeDays = parseDays(window.prompt('Ngày tập (1=T2 ... 7=CN), cách nhau dấu phẩy:', '2,5') || '');
    const startTime = window.prompt('Giờ bắt đầu:', '18:00')?.trim() || undefined;
    const endTime = window.prompt('Giờ kết thúc:', '19:30')?.trim() || undefined;
    const venue = window.prompt('Địa điểm:')?.trim() || undefined;
    try {
      await apiFetch('/classes', { method: 'POST', body: JSON.stringify({ code, name, activeDays, startTime, endTime, venue, dojoId: scope }) });
      await refreshAll();
    } catch (error) { apiError(error); }
  };

  const editClass = async (item: ClassItem) => {
    const name = window.prompt('Tên lớp:', item.name)?.trim(); if (!name) return;
    const activeDays = parseDays(window.prompt('Ngày tập (1=T2 ... 7=CN):', item.activeDays.join(',')) || '');
    const startTime = window.prompt('Giờ bắt đầu:', item.startTime || '')?.trim() || undefined;
    const endTime = window.prompt('Giờ kết thúc:', item.endTime || '')?.trim() || undefined;
    const venue = window.prompt('Địa điểm:', item.venue || '')?.trim() || undefined;
    const instructorName = window.prompt('Giáo viên/HLV:', item.instructorName || '')?.trim() || undefined;
    try {
      await apiFetch(`/classes/${item.id}`, { method: 'PATCH', body: JSON.stringify({ name, activeDays, startTime, endTime, venue, instructorName }) });
      await refreshAll();
    } catch (error) { apiError(error); }
  };

  const deleteClass = async (item: ClassItem) => {
    const typed = window.prompt(`Xóa lớp chỉ được phép khi chưa có lịch sử điểm danh.\nNhập mã ${item.code} để xác nhận:`)?.trim().toUpperCase();
    if (typed !== item.code.toUpperCase()) return;
    try {
      await apiFetch(`/classes/${item.id}`, { method: 'DELETE' });
      await refreshAll();
    } catch (error) { apiError(error); }
  };

  return <section className="space-y-5">
    <div>
      <div className="flex justify-between items-center mb-3"><div><h2 className="font-black text-lg flex items-center gap-2"><CalendarDays className="w-5 h-5"/> Lớp học</h2><p className="text-xs text-slate-500">Quản lý lịch, địa điểm và lớp đang hoạt động</p></div><button onClick={addClass} className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"><Plus className="inline w-4 h-4"/> Lớp</button></div>
      <div className="grid md:grid-cols-2 gap-2">{classes.map(item => <div key={item.id} className="bg-white border rounded-xl p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0"><div className="font-bold truncate">{item.name} <span className="text-xs text-slate-400">({item.code})</span></div><div className="text-xs text-slate-500">{item.activeDays.map(day => dayNames[day]).join(' · ') || 'Chưa xếp ngày'} {item.startTime ? `· ${item.startTime}${item.endTime ? `–${item.endTime}` : ''}` : ''}</div><div className="text-[11px] text-slate-400">{item.venue || 'Chưa có địa điểm'} · {item._count?.enrollments ?? 0} đăng ký · {item._count?.sessions ?? 0} buổi</div></div>
        <button onClick={() => editClass(item)} className="p-2 border rounded-lg" aria-label={`Sửa ${item.name}`}><Pencil className="w-4 h-4"/></button>
        <button onClick={() => deleteClass(item)} className="p-2 border rounded-lg text-rose-600" aria-label={`Xóa ${item.name}`}><Trash2 className="w-4 h-4"/></button>
      </div>)}</div>
    </div>

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
