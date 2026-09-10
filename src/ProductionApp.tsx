import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Banknote, BookOpenCheck, Building2, Check, CheckCircle2, Clock3, LogOut, Plus, RefreshCw, Search, Shield, UserRound, Users, X, XCircle } from 'lucide-react';
import { LoginView } from './components/LoginView';
import { apiFetch, ApiError, setAccessToken } from './services/api';
import type { UserAccount } from './types';

type PermissionSet = {
  canViewTuition: boolean; canEditTuition: boolean; canEditSchedule: boolean; canTakeAttendance: boolean;
  canAddStudent: boolean; canEditStudentInfo: boolean; canDeleteStudent: boolean; canAddDateSession: boolean; canExportData: boolean;
};
type ServerUser = {
  id: string; username: string; fullName: string; role: UserAccount['role']; dojoId: string | null;
  phone?: string | null; email?: string | null; status: string;
  dojo?: { id: string; code: string; name: string; status: string } | null;
  permissions: PermissionSet;
};
type Dojo = { id: string; code: string; name: string; status: string };
type ClassItem = { id: string; dojoId: string; code: string; name: string; activeDays: number[]; startTime?: string; endTime?: string; venue?: string; _count?: { enrollments: number; sessions: number } };
type StudentItem = { id: string; dojoId: string; code: string; name: string; belt?: string; parentPhone?: string; isActive: boolean; enrollments: Array<{ id: string; classId: string; isPrimary: boolean; class: ClassItem }> };
type Session = { id: string; classId: string; dojoId: string; sessionDate: string; title?: string; isFinalized: boolean; records?: AttendanceRecord[]; _count?: { records: number } };
type AttendanceRecord = { id: string; studentId: string; status: 'PRESENT'|'ABSENT'|'LATE'|'EXCUSED'; type: 'NORMAL'|'MAKEUP'|'TRIAL'; student?: StudentItem };
type Invoice = { id: string; studentId: string; monthKey: string; amountDue: number; totalPaid: number; status: 'UNPAID'|'PARTIAL'|'PAID'; student: StudentItem };
type AdminUser = { id: string; username: string; fullName: string; role: string; status: string; dojoId: string; phone?: string };
type Tab = 'attendance' | 'students' | 'tuition' | 'admin';

const fmtDate = (value: string) => new Date(value).toLocaleDateString('vi-VN');
const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
const todayIso = () => `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

export default function ProductionApp() {
  const [user, setUser] = useState<ServerUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('attendance');
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [dojoId, setDojoId] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const scope = user?.role === 'SUPER_ADMIN' ? dojoId : user?.dojoId || '';
  const qScope = scope ? `dojoId=${encodeURIComponent(scope)}` : '';

  const logout = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem('ea_auth_user');
    setUser(null);
    setClasses([]); setStudents([]); setSessions([]); setSession(null);
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const res = await apiFetch<{ user: ServerUser }>('/auth/me');
      setUser(res.user);
      if (res.user.role !== 'SUPER_ADMIN') setDojoId(res.user.dojoId || '');
    } catch {
      logout();
    } finally {
      setChecking(false);
    }
  }, [logout]);

  useEffect(() => { loadMe(); }, [loadMe]);

  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') return;
    apiFetch<{ dojos: Dojo[] }>('/admin/dojos').then(r => {
      setDojos(r.dojos.filter(d => d.status === 'ACTIVE'));
      setDojoId(prev => prev || r.dojos.find(d => d.status === 'ACTIVE')?.id || '');
    }).catch(e => setError(e.message));
  }, [user]);

  const loadCore = useCallback(async () => {
    if (!user || !scope) return;
    setBusy(true); setError('');
    try {
      const [c, s] = await Promise.all([
        apiFetch<{ classes: ClassItem[] }>(`/classes?${qScope}`),
        apiFetch<{ students: StudentItem[] }>(`/students?${qScope}`)
      ]);
      setClasses(c.classes); setStudents(s.students);
      setClassId(prev => c.classes.some(x => x.id === prev) ? prev : c.classes[0]?.id || '');
    } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'); }
    finally { setBusy(false); }
  }, [user, scope, qScope]);

  useEffect(() => { loadCore(); }, [loadCore]);

  const loadSessions = useCallback(async () => {
    if (!classId || !scope) { setSessions([]); setSession(null); return; }
    try {
      const r = await apiFetch<{ sessions: Session[] }>(`/attendance/sessions?${qScope}&classId=${encodeURIComponent(classId)}`);
      setSessions(r.sessions);
      const chosen = r.sessions.find(x => x.id === session?.id) || r.sessions[0];
      if (chosen) {
        const detail = await apiFetch<{ session: Session }>(`/attendance/sessions/${chosen.id}`);
        setSession(detail.session);
      } else setSession(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi tải buổi tập'); }
  }, [classId, scope, qScope, session?.id]);

  useEffect(() => { loadSessions(); }, [classId, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  // Multi-device refresh: server remains source of truth.
  useEffect(() => {
    if (!user || tab !== 'attendance' || !classId) return;
    const id = window.setInterval(() => { if (!busy) loadSessions(); }, 7000);
    return () => window.clearInterval(id);
  }, [user, tab, classId, busy, loadSessions]);

  const selectSession = async (id: string) => {
    try { setSession((await apiFetch<{ session: Session }>(`/attendance/sessions/${id}`)).session); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được buổi tập'); }
  };

  const createTodaySession = async () => {
    if (!classId) return;
    setBusy(true);
    try {
      const r = await apiFetch<{ session: Session }>('/attendance/sessions', { method: 'POST', body: JSON.stringify({ classId, sessionDate: todayIso(), title: 'Buổi tập' }) });
      await selectSession(r.session.id); await loadSessions();
    } catch (e) { showApiError(e); } finally { setBusy(false); }
  };

  const showApiError = (e: unknown) => {
    if (e instanceof ApiError) setError(e.payload?.message || String(e.payload?.error || e.message));
    else setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
  };

  const mark = async (student: StudentItem, status: AttendanceRecord['status']) => {
    if (!session || session.isFinalized) return;
    const enrolled = student.enrollments.find(e => e.classId === classId);
    if (!enrolled) return setError(`${student.name} chưa đăng ký lớp này; hãy dùng chức năng học bù.`);
    setBusy(true);
    try {
      await apiFetch(`/attendance/sessions/${session.id}/records`, { method: 'PUT', body: JSON.stringify({ studentId: student.id, status, type: 'NORMAL', registeredClassId: classId }) });
      await selectSession(session.id);
    } catch (e) { showApiError(e); } finally { setBusy(false); }
  };

  const markAllPresent = async () => {
    if (!session || session.isFinalized) return;
    const rows = classStudents.map(s => ({ studentId: s.id, status: 'PRESENT', type: 'NORMAL', registeredClassId: classId }));
    if (!rows.length) return;
    setBusy(true);
    try {
      await apiFetch(`/attendance/sessions/${session.id}/records/bulk`, { method: 'PUT', body: JSON.stringify({ records: rows }) });
      await selectSession(session.id);
    } catch (e) { showApiError(e); } finally { setBusy(false); }
  };

  const finalize = async () => {
    if (!session || !confirm('Khóa sổ buổi điểm danh? Sau khi khóa sẽ không thể sửa.')) return;
    try { await apiFetch(`/attendance/sessions/${session.id}/finalize`, { method: 'POST' }); await selectSession(session.id); }
    catch (e) { showApiError(e); }
  };

  const addStudent = async () => {
    const name = prompt('Họ tên võ sinh:')?.trim(); if (!name) return;
    const code = prompt('Mã võ sinh:')?.trim(); if (!code) return;
    const belt = prompt('Đai hiện tại:', 'Trắng')?.trim() || undefined;
    try {
      await apiFetch('/students', { method: 'POST', body: JSON.stringify({ name, code, belt, classId: classId || undefined, dojoId: user?.role === 'SUPER_ADMIN' ? scope : undefined }) });
      await loadCore();
    } catch (e) { showApiError(e); }
  };

  const loadTuition = useCallback(async () => {
    if (!user?.permissions.canViewTuition || !scope) return;
    try { setInvoices((await apiFetch<{ invoices: Invoice[] }>(`/tuition/invoices?${qScope}`)).invoices); }
    catch (e) { showApiError(e); }
  }, [user, scope, qScope]);
  useEffect(() => { if (tab === 'tuition') loadTuition(); }, [tab, loadTuition]);

  const createInvoice = async (student: StudentItem) => {
    const monthKey = prompt('Tháng học phí (YYYY-MM):', new Date().toISOString().slice(0, 7)); if (!monthKey) return;
    const amountDue = Number(prompt('Học phí phải thu (VNĐ):', '500000')); if (!(amountDue > 0)) return;
    try { await apiFetch('/tuition/invoices', { method: 'POST', body: JSON.stringify({ studentId: student.id, monthKey, amountDue }) }); await loadTuition(); }
    catch (e) { showApiError(e); }
  };
  const payInvoice = async (invoice: Invoice) => {
    const remain = invoice.amountDue - invoice.totalPaid;
    const amount = Number(prompt(`Thu thêm, còn ${money(remain)}:`, String(remain))); if (!(amount > 0)) return;
    try { await apiFetch(`/tuition/invoices/${invoice.id}/payments`, { method: 'POST', body: JSON.stringify({ amount, method: 'CASH' }) }); await loadTuition(); }
    catch (e) { showApiError(e); }
  };

  const loadAdmin = useCallback(async () => {
    if (!user || !scope || !['SUPER_ADMIN','DOJO_ADMIN'].includes(user.role)) return;
    try {
      const [u, a] = await Promise.all([
        apiFetch<{ users: AdminUser[] }>(`/admin/users?${qScope}`),
        apiFetch<{ auditLogs: any[] }>(`/admin/audit?${qScope}&limit=50`)
      ]);
      setAdminUsers(u.users); setAuditLogs(a.auditLogs);
    } catch (e) { showApiError(e); }
  }, [user, scope, qScope]);
  useEffect(() => { if (tab === 'admin') loadAdmin(); }, [tab, loadAdmin]);

  const addStaff = async () => {
    const fullName = prompt('Họ tên nhân sự:')?.trim(); if (!fullName) return;
    const username = prompt('Username:')?.trim(); if (!username) return;
    const role = prompt('Vai trò TEACHER hoặc COACH:', 'COACH')?.trim().toUpperCase(); if (!['TEACHER','COACH'].includes(role || '')) return;
    const password = prompt('Mật khẩu ban đầu (>=6 ký tự):', '123456'); if (!password) return;
    try { await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify({ fullName, username, role, password, dojoId: scope }) }); await loadAdmin(); }
    catch (e) { showApiError(e); }
  };

  const classStudents = useMemo(() => students.filter(s => s.enrollments.some(e => e.classId === classId)), [students, classId]);
  const filteredStudents = useMemo(() => students.filter(s => `${s.code} ${s.name} ${s.parentPhone || ''}`.toLowerCase().includes(search.toLowerCase())), [students, search]);
  const recordMap = useMemo(() => new Map((session?.records || []).map(r => [r.studentId, r])), [session]);

  if (checking) return <div className="min-h-screen bg-slate-950 text-white grid place-items-center"><RefreshCw className="animate-spin" /></div>;
  if (!user) return <LoginView onLogin={() => { setChecking(true); loadMe(); }} />;

  const canAdmin = user.role === 'SUPER_ADMIN' || user.role === 'DOJO_ADMIN';
  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType; show: boolean }> = [
    { id: 'attendance', label: 'Điểm danh', icon: BookOpenCheck, show: true },
    { id: 'students', label: 'Võ sinh', icon: Users, show: true },
    { id: 'tuition', label: 'Học phí', icon: Banknote, show: user.permissions.canViewTuition },
    { id: 'admin', label: 'Quản trị', icon: Shield, show: canAdmin }
  ];

  return <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
    <header className="sticky top-0 z-30 bg-slate-950 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-3 py-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-500 grid place-items-center font-black">HNK</div>
        <div className="min-w-0 flex-1"><div className="font-black truncate">{user.dojo?.name || (user.role === 'SUPER_ADMIN' ? 'Quản trị hệ thống' : 'Võ đường')}</div><div className="text-[11px] text-slate-400 truncate">{user.fullName} · {user.role}</div></div>
        {user.role === 'SUPER_ADMIN' && <select value={dojoId} onChange={e => setDojoId(e.target.value)} className="max-w-40 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs"><option value="">Chọn võ đường</option>{dojos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
        <button onClick={loadCore} title="Làm mới" className="p-2 rounded-lg bg-slate-800"><RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /></button>
        <button onClick={logout} title="Đăng xuất" className="p-2 rounded-lg bg-rose-600"><LogOut className="w-4 h-4" /></button>
      </div>
    </header>

    <div className="max-w-6xl mx-auto px-3 py-3">
      {error && <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 text-sm flex gap-2"><XCircle className="w-4 h-4 shrink-0 mt-0.5" /><span className="flex-1">{error}</span><button onClick={() => setError('')}><X className="w-4 h-4" /></button></div>}
      <div className="flex gap-2 overflow-x-auto mb-3">{tabs.filter(t => t.show).map(t => { const Icon=t.icon; return <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${tab===t.id?'bg-indigo-600 text-white':'bg-white border border-slate-200'}`}><Icon className="w-4 h-4" />{t.label}</button>; })}</div>

      {tab === 'attendance' && <section>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-3 flex flex-wrap gap-2 items-center">
          <select value={classId} onChange={e => setClassId(e.target.value)} className="flex-1 min-w-44 border rounded-xl px-3 py-2 text-sm"><option value="">Chọn lớp</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={session?.id || ''} onChange={e => selectSession(e.target.value)} className="flex-1 min-w-40 border rounded-xl px-3 py-2 text-sm"><option value="">Chọn ngày</option>{sessions.map(s => <option key={s.id} value={s.id}>{fmtDate(s.sessionDate)} {s.isFinalized?'🔒':''}</option>)}</select>
          {user.permissions.canAddDateSession && <button onClick={createTodaySession} disabled={!classId || busy} className="bg-indigo-600 text-white rounded-xl px-3 py-2 text-sm font-bold"><Plus className="inline w-4 h-4" /> Hôm nay</button>}
        </div>
        {session && <div className="mb-3 flex items-center justify-between bg-white rounded-xl border p-3"><div><div className="font-bold">{fmtDate(session.sessionDate)}</div><div className="text-xs text-slate-500">{session.isFinalized?'Đã khóa sổ':'Đang điểm danh'} · {(session.records||[]).length}/{classStudents.length} đã ghi nhận</div></div><div className="flex gap-2">{user.permissions.canTakeAttendance&&!session.isFinalized&&<button onClick={markAllPresent} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">Có mặt tất cả</button>}{user.permissions.canAddDateSession&&!session.isFinalized&&<button onClick={finalize} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold">Khóa sổ</button>}</div></div>}
        <div className="space-y-2">{classStudents.map((s,i) => { const r=recordMap.get(s.id); return <div key={s.id} className="bg-white rounded-2xl border p-3 flex items-center gap-3"><div className="w-8 text-center text-xs text-slate-400">{i+1}</div><div className="flex-1 min-w-0"><div className="font-bold truncate">{s.name}</div><div className="text-xs text-slate-500">{s.code} · {s.belt||'Chưa cập nhật'} {r ? `· ${r.status}`:''}</div></div>{user.permissions.canTakeAttendance&&session&&!session.isFinalized&&<div className="flex gap-1"><button onClick={()=>mark(s,'PRESENT')} className={`p-2 rounded-xl ${r?.status==='PRESENT'?'bg-emerald-600 text-white':'bg-emerald-50 text-emerald-700'}`}><Check className="w-5 h-5" /></button><button onClick={()=>mark(s,'ABSENT')} className={`p-2 rounded-xl ${r?.status==='ABSENT'?'bg-rose-600 text-white':'bg-rose-50 text-rose-700'}`}><X className="w-5 h-5" /></button></div>}</div>; })}</div>
        {!classId && <Empty text="Chọn lớp để bắt đầu điểm danh" />}
      </section>}

      {tab === 'students' && <section>
        <div className="bg-white rounded-2xl border p-3 mb-3 flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm tên, mã, SĐT..." className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm"/></div>{user.permissions.canAddStudent&&<button onClick={addStudent} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold"><Plus className="inline w-4 h-4"/> Thêm</button>}</div>
        <div className="grid md:grid-cols-2 gap-2">{filteredStudents.map(s=><div key={s.id} className="bg-white border rounded-2xl p-3 flex gap-3"><div className="h-10 w-10 bg-indigo-50 text-indigo-700 rounded-xl grid place-items-center"><UserRound className="w-5 h-5"/></div><div className="flex-1"><div className="font-bold">{s.name}</div><div className="text-xs text-slate-500">{s.code} · {s.belt||'Chưa có đai'}</div><div className="text-xs text-slate-500 mt-1">{s.enrollments.map(e=>e.class.name).join(', ')||'Chưa xếp lớp'}</div></div>{user.permissions.canEditTuition&&<button onClick={()=>createInvoice(s)} title="Tạo học phí" className="p-2 self-start rounded-lg bg-amber-50 text-amber-700"><Banknote className="w-4 h-4"/></button>}</div>)}</div>
      </section>}

      {tab === 'tuition' && user.permissions.canViewTuition && <section>
        <div className="grid sm:grid-cols-3 gap-2 mb-3"><Stat label="Tổng phải thu" value={money(invoices.reduce((a,b)=>a+b.amountDue,0))}/><Stat label="Đã thu" value={money(invoices.reduce((a,b)=>a+b.totalPaid,0))}/><Stat label="Còn thiếu" value={money(invoices.reduce((a,b)=>a+(b.amountDue-b.totalPaid),0))}/></div>
        <div className="space-y-2">{invoices.map(i=><div key={i.id} className="bg-white border rounded-2xl p-3 flex items-center gap-3"><div className={`h-10 w-10 rounded-xl grid place-items-center ${i.status==='PAID'?'bg-emerald-50 text-emerald-700':i.status==='PARTIAL'?'bg-amber-50 text-amber-700':'bg-rose-50 text-rose-700'}`}>{i.status==='PAID'?<CheckCircle2/>:<Clock3/>}</div><div className="flex-1"><div className="font-bold">{i.student.name} · {i.monthKey}</div><div className="text-xs text-slate-500">{money(i.totalPaid)} / {money(i.amountDue)} · {i.status}</div></div>{user.permissions.canEditTuition&&i.status!=='PAID'&&<button onClick={()=>payInvoice(i)} className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Thu tiền</button>}</div>)}</div>
        {!invoices.length&&<Empty text="Chưa có hóa đơn học phí"/>}
      </section>}

      {tab === 'admin' && canAdmin && <section>
        <div className="flex justify-between items-center mb-3"><div><h2 className="font-black text-lg">Tài khoản nhân sự</h2><p className="text-xs text-slate-500">Dữ liệu và phân quyền được kiểm soát tại server</p></div><button onClick={addStaff} className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"><Plus className="inline w-4 h-4"/> Nhân sự</button></div>
        <div className="grid md:grid-cols-2 gap-2 mb-5">{adminUsers.map(u=><div key={u.id} className="bg-white border rounded-xl p-3 flex items-center gap-3"><UserRound className="w-5 h-5 text-indigo-600"/><div className="flex-1"><div className="font-bold">{u.fullName}</div><div className="text-xs text-slate-500">@{u.username} · {u.role}</div></div><span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${u.status==='ACTIVE'?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>{u.status}</span></div>)}</div>
        <h2 className="font-black text-lg mb-2 flex items-center gap-2"><Activity className="w-5 h-5"/> Nhật ký gần đây</h2><div className="bg-white border rounded-2xl overflow-hidden">{auditLogs.map((a,i)=><div key={a.id||i} className="px-3 py-2 border-b last:border-0 text-xs"><span className="font-bold">{a.action}</span> · {a.actor?.fullName||'Hệ thống'} <span className="text-slate-400 float-right">{fmtDate(a.createdAt)}</span></div>)}</div>
      </section>}
    </div>

    <nav className="fixed bottom-0 inset-x-0 bg-white border-t z-30"><div className="max-w-6xl mx-auto grid" style={{gridTemplateColumns:`repeat(${tabs.filter(t=>t.show).length},minmax(0,1fr))`}}>{tabs.filter(t=>t.show).map(t=>{const Icon=t.icon;return <button key={t.id} onClick={()=>setTab(t.id)} className={`py-2 flex flex-col items-center text-[10px] font-bold ${tab===t.id?'text-indigo-600':'text-slate-500'}`}><Icon className="w-5 h-5 mb-0.5"/>{t.label}</button>})}</div></nav>
  </div>;
}

function Empty({text}:{text:string}) { return <div className="bg-white border border-dashed rounded-2xl py-12 text-center text-slate-400 text-sm"><Building2 className="w-8 h-8 mx-auto mb-2 opacity-40"/>{text}</div>; }
function Stat({label,value}:{label:string;value:string}) { return <div className="bg-white border rounded-2xl p-3"><div className="text-xs text-slate-500">{label}</div><div className="font-black text-lg mt-1">{value}</div></div>; }
