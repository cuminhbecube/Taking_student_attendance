import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, LockKeyhole, Plus, RefreshCw, Search, UserPlus, X } from 'lucide-react';
import { apiFetch, ApiError } from '../services/api';
import type { AttendanceRecord, AttendanceStatus, ClassItem, PermissionSet, Session, StudentItem } from './types';
import { downloadCsv } from './export';

type Props = {
  classes: ClassItem[];
  students: StudentItem[];
  classId: string;
  setClassId: (id: string) => void;
  permissions: PermissionSet;
  scopeQuery: string;
  onError: (message: string) => void;
};

const dateLabel = (value: string) => new Date(value).toLocaleDateString('vi-VN');
const todayIso = () => `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

export function AttendancePanel({ classes, students, classId, setClassId, permissions, scopeQuery, onError }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [makeupOpen, setMakeupOpen] = useState(false);
  const [makeupSearch, setMakeupSearch] = useState('');

  const classStudents = useMemo(() => students.filter(student => student.enrollments.some(enrollment => enrollment.classId === classId)), [students, classId]);
  const recordMap = useMemo(() => new Map((session?.records ?? []).map(record => [record.studentId, record])), [session]);
  const makeupCandidates = useMemo(() => {
    const term = makeupSearch.trim().toLowerCase();
    return students.filter(student => {
      const inCurrent = student.enrollments.some(enrollment => enrollment.classId === classId);
      const hasOtherClass = student.enrollments.some(enrollment => enrollment.classId !== classId);
      const matches = !term || `${student.code} ${student.name} ${student.parentPhone ?? ''}`.toLowerCase().includes(term);
      return !inCurrent && hasOtherClass && matches;
    });
  }, [students, classId, makeupSearch]);

  const allRows = useMemo(() => {
    const map = new Map<string, StudentItem>();
    for (const student of classStudents) map.set(student.id, student);
    for (const record of session?.records ?? []) {
      const canonical = students.find(student => student.id === record.studentId);
      if (canonical) map.set(record.studentId, canonical);
      else if (record.student) map.set(record.studentId, { ...record.student, enrollments: record.student.enrollments ?? [] });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [classStudents, session, students]);

  const loadSessionDetail = useCallback(async (sessionId: string) => {
    if (!sessionId) return setSession(null);
    setSession((await apiFetch<{ session: Session }>(`/attendance/sessions/${sessionId}`)).session);
  }, []);

  const loadSessions = useCallback(async (preferredId?: string) => {
    if (!classId) { setSessions([]); setSession(null); return; }
    try {
      const separator = scopeQuery ? '&' : '';
      const response = await apiFetch<{ sessions: Session[] }>(`/attendance/sessions?${scopeQuery}${separator}classId=${encodeURIComponent(classId)}`);
      setSessions(response.sessions);
      const target = response.sessions.find(item => item.id === preferredId) ?? response.sessions.find(item => item.id === session?.id) ?? response.sessions[0];
      if (target) await loadSessionDetail(target.id); else setSession(null);
    } catch (error) { reportError(error); }
  }, [classId, scopeQuery, session?.id, loadSessionDetail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadSessions(); }, [classId, scopeQuery]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!classId) return;
    const timer = window.setInterval(() => { if (!busy) loadSessions(session?.id); }, 7000);
    return () => window.clearInterval(timer);
  }, [classId, busy, loadSessions, session?.id]);

  const reportError = (error: unknown) => {
    if (error instanceof ApiError) onError(error.payload?.message || String(error.payload?.error || error.message));
    else onError(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
  };

  const createToday = async () => {
    if (!classId) return;
    setBusy(true);
    try {
      const response = await apiFetch<{ session: Session }>('/attendance/sessions', { method: 'POST', body: JSON.stringify({ classId, sessionDate: todayIso(), title: 'Buổi tập' }) });
      await loadSessions(response.session.id);
    } catch (error) { reportError(error); }
    finally { setBusy(false); }
  };

  const markNormal = async (student: StudentItem, status: AttendanceStatus) => {
    if (!session || session.isFinalized) return;
    const existing = recordMap.get(student.id);
    setBusy(true);
    try {
      await apiFetch(`/attendance/sessions/${session.id}/records`, {
        method: 'PUT',
        body: JSON.stringify({ studentId: student.id, status, type: 'NORMAL', registeredClassId: classId, expectedUpdatedAt: existing?.updatedAt })
      });
      await loadSessionDetail(session.id);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.payload?.error === 'ATTENDANCE_CONFLICT') {
        await loadSessionDetail(session.id);
        onError('Dữ liệu vừa được HLV khác cập nhật. Đã tải bản mới, hãy thao tác lại.');
      } else reportError(error);
    } finally { setBusy(false); }
  };

  const markMakeup = async (student: StudentItem) => {
    if (!session || session.isFinalized) return;
    const origin = student.enrollments.find(enrollment => enrollment.classId !== classId);
    if (!origin) return onError('Không tìm thấy lớp đăng ký gốc của võ sinh học bù.');
    setBusy(true);
    try {
      await apiFetch(`/attendance/sessions/${session.id}/records`, { method: 'PUT', body: JSON.stringify({ studentId: student.id, status: 'PRESENT', type: 'MAKEUP', registeredClassId: origin.classId }) });
      setMakeupOpen(false); setMakeupSearch('');
      await loadSessionDetail(session.id);
    } catch (error) { reportError(error); }
    finally { setBusy(false); }
  };

  const markAllPresent = async () => {
    if (!session || session.isFinalized || !classStudents.length) return;
    const records = classStudents.map(student => ({ studentId: student.id, status: 'PRESENT', type: 'NORMAL', registeredClassId: classId, expectedUpdatedAt: recordMap.get(student.id)?.updatedAt }));
    setBusy(true);
    try {
      await apiFetch(`/attendance/sessions/${session.id}/records/bulk`, { method: 'PUT', body: JSON.stringify({ records }) });
      await loadSessionDetail(session.id);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) await loadSessionDetail(session.id);
      reportError(error);
    } finally { setBusy(false); }
  };

  const finalize = async () => {
    if (!session || session.isFinalized || !window.confirm('Khóa sổ buổi điểm danh? Sau khi khóa sẽ không thể sửa.')) return;
    try { await apiFetch(`/attendance/sessions/${session.id}/finalize`, { method: 'POST' }); await loadSessionDetail(session.id); }
    catch (error) { reportError(error); }
  };

  const exportAttendance = () => {
    if (!session) return;
    const rows: Array<Array<string | number>> = [['STT', 'Mã', 'Họ tên', 'Lớp đăng ký', 'Trạng thái', 'Loại']];
    allRows.forEach((student, index) => {
      const record = recordMap.get(student.id);
      const origin = record?.registeredClass?.name ?? student.enrollments.find(item => item.id === record?.registeredClassId)?.class.name ?? student.enrollments.find(item => item.classId === classId)?.class.name ?? '';
      rows.push([index + 1, student.code, student.name, origin, record?.status ?? 'CHƯA ĐIỂM DANH', record?.type ?? 'NORMAL']);
    });
    downloadCsv(`diem-danh_${dateLabel(session.sessionDate).replaceAll('/', '-')}.csv`, rows);
  };

  return <section>
    <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-3 flex flex-wrap gap-2 items-center">
      <select value={classId} onChange={event => setClassId(event.target.value)} className="flex-1 min-w-44 border rounded-xl px-3 py-2 text-sm"><option value="">Chọn lớp</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select value={session?.id ?? ''} onChange={event => loadSessionDetail(event.target.value)} className="flex-1 min-w-40 border rounded-xl px-3 py-2 text-sm"><option value="">Chọn ngày</option>{sessions.map(item => <option key={item.id} value={item.id}>{dateLabel(item.sessionDate)} {item.isFinalized ? '🔒' : ''}</option>)}</select>
      {permissions.canAddDateSession && <button onClick={createToday} disabled={!classId || busy} className="bg-indigo-600 text-white rounded-xl px-3 py-2 text-sm font-bold"><Plus className="inline w-4 h-4"/> Hôm nay</button>}
      <button onClick={() => loadSessions(session?.id)} disabled={!classId} className="border rounded-xl px-3 py-2 text-sm"><RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`}/></button>
    </div>

    {session && <div className="mb-3 bg-white rounded-2xl border p-3 flex flex-wrap items-center gap-2">
      <div className="flex-1 min-w-44"><div className="font-black">{dateLabel(session.sessionDate)}</div><div className="text-xs text-slate-500">{session.isFinalized ? 'Đã khóa sổ' : 'Đang điểm danh'} · {(session.records ?? []).length}/{classStudents.length} bản ghi</div></div>
      {permissions.canTakeAttendance && !session.isFinalized && <button onClick={() => setMakeupOpen(true)} className="px-3 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold"><UserPlus className="inline w-4 h-4"/> Học bù</button>}
      {permissions.canTakeAttendance && !session.isFinalized && <button onClick={markAllPresent} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Có mặt tất cả</button>}
      {permissions.canExportData && <button onClick={exportAttendance} className="px-3 py-2 rounded-xl border text-xs font-bold">Xuất CSV</button>}
      {permissions.canAddDateSession && !session.isFinalized && <button onClick={finalize} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"><LockKeyhole className="inline w-4 h-4"/> Khóa sổ</button>}
    </div>}

    <div className="space-y-2">{allRows.map((student, index) => {
      const record = recordMap.get(student.id);
      const enrolledHere = student.enrollments.some(item => item.classId === classId);
      return <div key={student.id} className={`bg-white rounded-2xl border p-3 flex items-center gap-3 ${record?.type === 'MAKEUP' ? 'border-cyan-300' : ''}`}>
        <div className="w-8 text-center text-xs text-slate-400">{index + 1}</div>
        <div className="flex-1 min-w-0"><div className="font-bold truncate">{student.name}{record?.type === 'MAKEUP' ? ' · Học bù' : ''}</div><div className="text-xs text-slate-500">{student.code} · {student.belt || 'Chưa cập nhật'} {record ? `· ${record.status}` : ''}</div></div>
        {permissions.canTakeAttendance && session && !session.isFinalized && enrolledHere && <div className="flex gap-1"><button aria-label={`Có mặt ${student.name}`} onClick={() => markNormal(student, 'PRESENT')} className={`p-2 rounded-xl ${record?.status === 'PRESENT' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}><Check className="w-5 h-5"/></button><button aria-label={`Vắng ${student.name}`} onClick={() => markNormal(student, 'ABSENT')} className={`p-2 rounded-xl ${record?.status === 'ABSENT' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'}`}><X className="w-5 h-5"/></button></div>}
      </div>;
    })}</div>
    {!classId && <Empty text="Chọn lớp để bắt đầu điểm danh"/>}
    {classId && !allRows.length && <Empty text="Lớp chưa có võ sinh"/>}

    {makeupOpen && <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={() => setMakeupOpen(false)}><div className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={event => event.stopPropagation()}>
      <div className="p-4 border-b flex items-center gap-2"><UserPlus className="text-cyan-600"/><div className="flex-1"><div className="font-black">Chọn võ sinh học bù</div><div className="text-xs text-slate-500">Chỉ võ sinh lớp khác trong cùng võ đường</div></div><button onClick={() => setMakeupOpen(false)}><X/></button></div>
      <div className="p-3 border-b relative"><Search className="absolute left-6 top-5 w-4 h-4 text-slate-400"/><input autoFocus value={makeupSearch} onChange={event => setMakeupSearch(event.target.value)} placeholder="Tìm tên, mã, SĐT..." className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm"/></div>
      <div className="p-3 overflow-auto max-h-[55vh] space-y-2">{makeupCandidates.map(student => { const origin = student.enrollments.find(item => item.classId !== classId); return <button key={student.id} onClick={() => markMakeup(student)} className="w-full text-left border rounded-xl p-3 hover:bg-cyan-50"><div className="font-bold">{student.name}</div><div className="text-xs text-slate-500">{student.code} · Lớp gốc: {origin?.class.name ?? 'Không rõ'}</div></button>; })}{!makeupCandidates.length && <Empty text="Không tìm thấy võ sinh phù hợp"/>}</div>
    </div></div>}
  </section>;
}

function Empty({ text }: { text: string }) { return <div className="bg-white border border-dashed rounded-2xl py-10 text-center text-slate-400 text-sm">{text}</div>; }
