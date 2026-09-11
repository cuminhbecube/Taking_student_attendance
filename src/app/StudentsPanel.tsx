import React, { useMemo, useState } from 'react';
import { Banknote, Plus, Search, UserRound, X } from 'lucide-react';
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

type StudentForm = {
  code: string;
  name: string;
  gender: '' | 'MALE' | 'FEMALE' | 'OTHER';
  belt: string;
  dob: string;
  parentPhone: string;
  contactName: string;
  address: string;
  notes: string;
};

function formFromStudent(student: StudentItem): StudentForm {
  return {
    code: student.code,
    name: student.name,
    gender: student.gender ?? '',
    belt: student.belt ?? '',
    dob: student.dob ? student.dob.slice(0, 10) : '',
    parentPhone: student.parentPhone ?? '',
    contactName: student.contactName ?? '',
    address: student.address ?? '',
    notes: student.notes ?? ''
  };
}

export function StudentsPanel({ students, classes, activeClassId, scope, isSuperAdmin, permissions, onReload, onCreateInvoice, onError }: Props) {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState(activeClassId || 'ALL');
  const [editing, setEditing] = useState<StudentItem | null>(null);
  const [editForm, setEditForm] = useState<StudentForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() => students.filter(student => {
    const text = `${student.code} ${student.name} ${student.parentPhone ?? ''} ${student.contactName ?? ''} ${student.address ?? ''} ${student.belt ?? ''}`;
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

  const openEdit = (student: StudentItem) => {
    setEditing(student);
    setEditForm(formFromStudent(student));
    setFormError('');
  };

  const closeEdit = () => {
    if (saving) return;
    setEditing(null);
    setEditForm(null);
    setFormError('');
  };

  const saveStudent = async () => {
    if (!editing || !editForm) return;
    const code = editForm.code.trim();
    const name = editForm.name.trim();
    if (!code || !name) {
      setFormError('Mã võ sinh và họ tên là bắt buộc.');
      return;
    }
    if (editForm.dob) {
      const selected = new Date(`${editForm.dob}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected.getTime() > today.getTime()) {
        setFormError('Ngày sinh không được ở tương lai.');
        return;
      }
    }

    setSaving(true);
    setFormError('');
    try {
      await apiFetch(`/students/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          code,
          name,
          gender: editForm.gender || null,
          belt: editForm.belt,
          dob: editForm.dob || null,
          parentPhone: editForm.parentPhone,
          contactName: editForm.contactName,
          address: editForm.address,
          notes: editForm.notes,
          expectedUpdatedAt: editing.updatedAt
        })
      });
      setEditing(null);
      setEditForm(null);
      await onReload();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.payload?.error === 'STUDENT_CONFLICT') {
        await onReload();
        setEditing(null);
        setEditForm(null);
        onError('Thông tin võ sinh vừa được thay đổi ở thiết bị khác. Danh sách đã được tải lại, hãy mở lại để sửa trên dữ liệu mới nhất.');
      } else if (error instanceof ApiError && error.status === 409 && error.payload?.error === 'STUDENT_CODE_EXISTS') {
        setFormError('Mã võ sinh đã tồn tại trong võ đường này.');
      } else {
        setFormError(error instanceof ApiError ? String(error.payload?.error || error.message) : 'Không thể lưu thông tin võ sinh.');
      }
    } finally {
      setSaving(false);
    }
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
    const rows: Array<Array<string | number>> = [['STT', 'Mã', 'Họ tên', 'Giới tính', 'Ngày sinh', 'Đai', 'Người liên hệ', 'SĐT phụ huynh', 'Địa chỉ', 'Lớp đang học']];
    filtered.forEach((student, index) => rows.push([
      index + 1,
      student.code,
      student.name,
      student.gender === 'MALE' ? 'Nam' : student.gender === 'FEMALE' ? 'Nữ' : student.gender === 'OTHER' ? 'Khác' : '',
      student.dob ? student.dob.slice(0, 10) : '',
      student.belt || '',
      student.contactName || '',
      student.parentPhone || '',
      student.address || '',
      student.enrollments.map(item => item.class.name).join(' | ')
    ]));
    downloadCsv(`vo-sinh_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return <section>
    <div className="bg-white rounded-2xl border p-3 mb-3 flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-52"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên không dấu, mã, SĐT, liên hệ..." className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm"/></div>
      <select value={classFilter} onChange={event => setClassFilter(event.target.value)} className="border rounded-xl px-3 py-2 text-sm"><option value="ALL">Tất cả lớp</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      {permissions.canExportData && <button onClick={exportStudents} className="px-3 py-2 rounded-xl border text-sm font-bold">Xuất CSV</button>}
      {permissions.canAddStudent && <button onClick={addStudent} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold"><Plus className="inline w-4 h-4"/> Thêm</button>}
    </div>

    <div className="grid md:grid-cols-2 gap-2">{filtered.map(student => <div key={student.id} className="bg-white border rounded-2xl p-3 flex gap-3">
      <div className="h-10 w-10 bg-indigo-50 text-indigo-700 rounded-xl grid place-items-center"><UserRound className="w-5 h-5"/></div>
      <div className="flex-1 min-w-0"><div className="font-bold truncate">{student.name}</div><div className="text-xs text-slate-500">{student.code} · {student.belt || 'Chưa có đai'}{student.parentPhone ? ` · ${student.parentPhone}` : ''}</div><div className="text-xs text-slate-500 mt-1">{student.enrollments.map(item => item.class.name).join(', ') || 'Chưa xếp lớp'}</div>
        {student.contactName && <div className="text-xs text-slate-400 mt-1">Liên hệ: {student.contactName}</div>}
        <div className="mt-2 flex gap-1 flex-wrap">{permissions.canEditStudentInfo && <button onClick={() => openEdit(student)} className="px-2 py-1 rounded-lg border text-[11px] font-bold">Sửa</button>}{permissions.canEditSchedule && <button onClick={() => enroll(student)} className="px-2 py-1 rounded-lg border text-[11px] font-bold">Xếp lớp</button>}{permissions.canDeleteStudent && <button onClick={() => deactivate(student)} className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-bold">Ngừng hoạt động</button>}</div>
      </div>
      {permissions.canEditTuition && onCreateInvoice && <button onClick={() => onCreateInvoice(student)} title="Tạo học phí" className="p-2 self-start rounded-lg bg-amber-50 text-amber-700"><Banknote className="w-4 h-4"/></button>}
    </div>)}</div>
    {!filtered.length && <div className="bg-white border border-dashed rounded-2xl py-10 text-center text-slate-400 text-sm">Không có võ sinh phù hợp.</div>}

    {editing && editForm && <div className="fixed inset-0 z-50 bg-slate-950/40 p-3 sm:p-6 flex items-center justify-center" onMouseDown={event => { if (event.target === event.currentTarget) closeEdit(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <div><div className="font-bold text-slate-900">Sửa thông tin võ sinh</div><div className="text-xs text-slate-500">Lớp học được quản lý riêng qua chức năng Xếp lớp.</div></div>
          <button type="button" onClick={closeEdit} disabled={saving} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-4 space-y-4">
          {formError && <div className="rounded-xl bg-rose-50 text-rose-700 px-3 py-2 text-sm">{formError}</div>}

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Thông tin cơ bản</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm">Mã võ sinh<input value={editForm.code} onChange={event => setEditForm({ ...editForm, code: event.target.value })} maxLength={50} className="mt-1 w-full border rounded-xl px-3 py-2"/></label>
              <label className="text-sm">Họ tên<input value={editForm.name} onChange={event => setEditForm({ ...editForm, name: event.target.value })} maxLength={200} className="mt-1 w-full border rounded-xl px-3 py-2"/></label>
              <label className="text-sm">Giới tính<select value={editForm.gender} onChange={event => setEditForm({ ...editForm, gender: event.target.value as StudentForm['gender'] })} className="mt-1 w-full border rounded-xl px-3 py-2"><option value="">Chưa chọn</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option></select></label>
              <label className="text-sm">Ngày sinh<input type="date" value={editForm.dob} max={new Date().toISOString().slice(0, 10)} onChange={event => setEditForm({ ...editForm, dob: event.target.value })} className="mt-1 w-full border rounded-xl px-3 py-2"/></label>
              <label className="text-sm sm:col-span-2">Đai hiện tại<input value={editForm.belt} onChange={event => setEditForm({ ...editForm, belt: event.target.value })} maxLength={100} className="mt-1 w-full border rounded-xl px-3 py-2"/></label>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Liên hệ phụ huynh</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm">Tên người liên hệ<input value={editForm.contactName} onChange={event => setEditForm({ ...editForm, contactName: event.target.value })} maxLength={200} className="mt-1 w-full border rounded-xl px-3 py-2"/></label>
              <label className="text-sm">SĐT phụ huynh<input value={editForm.parentPhone} onChange={event => setEditForm({ ...editForm, parentPhone: event.target.value })} maxLength={30} inputMode="tel" className="mt-1 w-full border rounded-xl px-3 py-2"/></label>
              <label className="text-sm sm:col-span-2">Địa chỉ<textarea value={editForm.address} onChange={event => setEditForm({ ...editForm, address: event.target.value })} maxLength={500} rows={2} className="mt-1 w-full border rounded-xl px-3 py-2 resize-y"/></label>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Ghi chú</div>
            <textarea value={editForm.notes} onChange={event => setEditForm({ ...editForm, notes: event.target.value })} maxLength={2000} rows={4} className="w-full border rounded-xl px-3 py-2 resize-y"/>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-4 py-3 flex justify-end gap-2 rounded-b-2xl">
          <button type="button" onClick={closeEdit} disabled={saving} className="px-4 py-2 rounded-xl border text-sm font-bold disabled:opacity-50">Hủy</button>
          <button type="button" onClick={saveStudent} disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
        </div>
      </div>
    </div>}
  </section>;
}
