import React, { useMemo, useState } from 'react';
import { Banknote, Plus, Search, UserRound } from 'lucide-react';
import { apiFetch, ApiError } from '../services/api';
import type { ClassItem, PermissionSet, StudentItem } from './types';
import { downloadCsv } from './export';
import { matchesVietnameseSearch } from './search';

type Props = {
  students: StudentItem[];
  classes: ClassItem[];
  activeClassId: string;
  scope: string;
  isSuperAdmin: boolean;
  permissions: PermissionSet;
  onReload: () => Promise<void>;
  onCreateInvoice?: (student: StudentItem) => void;
  onError: (message: string) => void;
};

export function StudentsPanel({ students, classes, activeClassId, scope, isSuperAdmin, permissions, onReload, onCreateInvoice, onError }: Props) {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState(activeClassId || 'ALL');
  const filtered = useMemo(() => students.filter(student => {
    const text = `${student.code} ${student.name} ${student.parentPhone ?? ''} ${student.belt ?? ''}`;
    const matchesSearch = matchesVietnameseSearch(text, search);
    const matchesClass = classFilter === 'ALL' || student.enrollments.some(enrollment => enrollment.classId === classFilter);
    return matchesSearch && matchesClass;
  }), [students, search, classFilter]);

  const apiError = (error: unknown) => {
    if (error instanceof ApiError) onError(error.payload?.message || String(error.payload?.error || error.message));
    else onError(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
  };

  const addStudent = async () => {
    const name = window.prompt('Họ tên võ sinh:')?.trim(); if (!name) return;
    const code = window.prompt('Mã võ sinh:')?.trim(); if (!code) return;
    const belt = window.prompt('Đai hiện tại:', 'Trắng')?.trim() || undefined;
    const parentPhone = window.prompt('SĐT phụ huynh (có thể bỏ trống):')?.trim() || undefined;
    const classId = activeClassId || undefined;
    try {
      await apiFetch('/students', {
        method: 'POST',
        body: JSON.stringify({ name, code, belt, parentPhone, classId, dojoId: isSuperAdmin ? scope : undefined })
      });
      await onReload();
    } catch (error) { apiError(error); }
  };

  const editStudent = async (student: StudentItem) => {
    const name = window.prompt('Họ tên:', student.name)?.trim(); if (!name) return;
    const belt = window.prompt('Đai:', student.belt || '')?.trim() || undefined;
    const parentPhone = window.prompt('SĐT phụ huynh:', student.parentPhone || '')?.trim() || undefined;
    try {
      await apiFetch(`/students/${student.id}`, { method: 'PATCH', body: JSON.stringify({ name, belt, parentPhone }) });
      await onReload();
    } catch (error) { apiError(error); }
  };

  const deactivate = async (student: StudentItem) => {
    if (!window.confirm(`Ngừng hoạt động võ sinh "${student.name}"? Dữ liệu lịch sử vẫn được giữ.`)) return;
    try {
      await apiFetch(`/students/${student.id}`, { method: 'DELETE' });
      await onReload();
    } catch (error) { apiError(error); }
  };

  const enroll = async (student: StudentItem) => {
    const available = classes.filter(item => !student.enrollments.some(enrollment => enrollment.classId === item.id));
    if (!available.length) return onError('Võ sinh đã được xếp vào tất cả lớp hiện có.');
    const options = available.map(item => `${item.code}: ${item.name}`).join('\n');
    const code = window.prompt(`Nhập mã lớp muốn xếp:\n${options}`)?.trim().toUpperCase();
    const target = available.find(item => item.code.toUpperCase() === code);
    if (!target) return;
    try {
      await apiFetch(`/students/${student.id}/enrollments`, { method: 'POST', body: JSON.stringify({ classId: target.id, isPrimary: student.enrollments.length === 0 }) });
      await onReload();
    } catch (error) { apiError(error); }
  };

  const exportStudents = () => {
    const rows: Array<Array<string | number>> = [['STT', 'Mã', 'Họ tên', 'Đai', 'SĐT phụ huynh', 'Lớp đang học']];
    filtered.forEach((student, index) => rows.push([
      index + 1, student.code, student.name, student.belt || '', student.parentPhone || '', student.enrollments.map(item => item.class.name).join(' | ')
    ]));
    downloadCsv(`vo-sinh_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return <section>
    <div className="bg-white rounded-2xl border p-3 mb-3 flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-52"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên không dấu, mã, SĐT..." className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm"/></div>
      <select value={classFilter} onChange={event => setClassFilter(event.target.value)} className="border rounded-xl px-3 py-2 text-sm"><option value="ALL">Tất cả lớp</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      {permissions.canExportData && <button onClick={exportStudents} className="px-3 py-2 rounded-xl border text-sm font-bold">Xuất CSV</button>}
      {permissions.canAddStudent && <button onClick={addStudent} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold"><Plus className="inline w-4 h-4"/> Thêm</button>}
    </div>

    <div className="grid md:grid-cols-2 gap-2">{filtered.map(student => <div key={student.id} className="bg-white border rounded-2xl p-3 flex gap-3">
      <div className="h-10 w-10 bg-indigo-50 text-indigo-700 rounded-xl grid place-items-center"><UserRound className="w-5 h-5"/></div>
      <div className="flex-1 min-w-0"><div className="font-bold truncate">{student.name}</div><div className="text-xs text-slate-500">{student.code} · {student.belt || 'Chưa có đai'}{student.parentPhone ? ` · ${student.parentPhone}` : ''}</div><div className="text-xs text-slate-500 mt-1">{student.enrollments.map(item => item.class.name).join(', ') || 'Chưa xếp lớp'}</div>
        <div className="mt-2 flex gap-1 flex-wrap">{permissions.canEditStudentInfo && <button onClick={() => editStudent(student)} className="px-2 py-1 rounded-lg border text-[11px] font-bold">Sửa</button>}{permissions.canEditSchedule && <button onClick={() => enroll(student)} className="px-2 py-1 rounded-lg border text-[11px] font-bold">Xếp lớp</button>}{permissions.canDeleteStudent && <button onClick={() => deactivate(student)} className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-bold">Ngừng hoạt động</button>}</div>
      </div>
      {permissions.canEditTuition && onCreateInvoice && <button onClick={() => onCreateInvoice(student)} title="Tạo học phí" className="p-2 self-start rounded-lg bg-amber-50 text-amber-700"><Banknote className="w-4 h-4"/></button>}
    </div>)}</div>
    {!filtered.length && <div className="bg-white border border-dashed rounded-2xl py-10 text-center text-slate-400 text-sm">Không có võ sinh phù hợp.</div>}
  </section>;
}
