import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, BookOpenCheck, LogOut, RefreshCw, Shield, Users, X, XCircle } from 'lucide-react';
import { LoginView } from './components/LoginView';
import { apiFetch, ApiError, setAccessToken } from './services/api';
import { AttendancePanel } from './app/AttendancePanel';
import { StudentsPanel } from './app/StudentsPanel';
import { TuitionPanel } from './app/TuitionPanel';
import { AdminPanel } from './app/AdminPanel';
import type { ClassItem, Dojo, ServerUser, StudentItem, Tab } from './app/types';

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
  const [busy, setBusy] = useState(false);

  const scope = user?.role === 'SUPER_ADMIN' ? dojoId : user?.dojoId || '';
  const scopeQuery = scope ? `dojoId=${encodeURIComponent(scope)}` : '';
  const selectedDojo = useMemo(() => dojos.find(item => item.id === dojoId), [dojos, dojoId]);

  const clearLocalSession = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem('ea_auth_user');
    setUser(null);
    setDojos([]);
    setDojoId('');
    setClasses([]);
    setStudents([]);
    setClassId('');
    setTab('attendance');
  }, []);

  const logout = useCallback(() => {
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clearLocalSession();
  }, [clearLocalSession]);

  const refreshMe = useCallback(async (initial = false) => {
    try {
      const response = await apiFetch<{ user: ServerUser }>('/auth/me');
      setUser(response.user);
      if (response.user.role !== 'SUPER_ADMIN') setDojoId(response.user.dojoId || '');
      return true;
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) clearLocalSession();
      else if (!initial) setError(caught instanceof Error ? caught.message : 'Không thể cập nhật phiên đăng nhập.');
      return false;
    } finally {
      if (initial) setChecking(false);
    }
  }, [clearLocalSession]);

  useEffect(() => { refreshMe(true); }, [refreshMe]);
  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => { refreshMe(false); }, 30_000);
    return () => window.clearInterval(timer);
  }, [user, refreshMe]);

  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') return;
    apiFetch<{ dojos: Dojo[] }>('/admin/dojos')
      .then(response => {
        const active = response.dojos.filter(item => item.status === 'ACTIVE');
        setDojos(active);
        setDojoId(previous => active.some(item => item.id === previous) ? previous : active[0]?.id || '');
      })
      .catch(caught => setError(caught instanceof Error ? caught.message : 'Không tải được danh sách võ đường.'));
  }, [user?.id, user?.role]);

  const loadCore = useCallback(async () => {
    if (!user || !scope) {
      setClasses([]);
      setStudents([]);
      setClassId('');
      return;
    }
    setBusy(true);
    try {
      const suffix = scopeQuery ? `?${scopeQuery}` : '';
      const [classResponse, studentResponse] = await Promise.all([
        apiFetch<{ classes: ClassItem[] }>(`/classes${suffix}`),
        apiFetch<{ students: StudentItem[] }>(`/students${suffix}`)
      ]);
      setClasses(classResponse.classes);
      setStudents(studentResponse.students);
      setClassId(previous => classResponse.classes.some(item => item.id === previous) ? previous : classResponse.classes[0]?.id || '');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tải được dữ liệu võ đường.');
    } finally {
      setBusy(false);
    }
  }, [user, scope, scopeQuery]);

  useEffect(() => { loadCore(); }, [loadCore]);

  const handleLogin = () => {
    setChecking(true);
    refreshMe(true);
  };

  if (checking) return <div className="min-h-screen bg-slate-950 text-white grid place-items-center"><RefreshCw className="w-6 h-6 animate-spin"/></div>;
  if (!user) return <LoginView onLogin={handleLogin}/>;

  const canAdmin = user.role === 'SUPER_ADMIN' || user.role === 'DOJO_ADMIN';
  const visibleTabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'attendance', label: 'Điểm danh', icon: BookOpenCheck },
    { id: 'students', label: 'Võ sinh', icon: Users },
    ...(user.permissions.canViewTuition ? [{ id: 'tuition' as Tab, label: 'Học phí', icon: Banknote }] : []),
    ...(canAdmin ? [{ id: 'admin' as Tab, label: 'Quản trị', icon: Shield }] : [])
  ];
  const activeTab: Tab = visibleTabs.some(item => item.id === tab) ? tab : 'attendance';
  const dojoName = user.role === 'SUPER_ADMIN' ? selectedDojo?.name || 'Chọn võ đường' : user.dojo?.name || 'Võ đường';

  return <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
    <header className="sticky top-0 z-30 bg-slate-950 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-3 py-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-500 grid place-items-center font-black">HNK</div>
        <div className="min-w-0 flex-1"><div className="font-black truncate">{dojoName}</div><div className="text-[11px] text-slate-400 truncate">{user.fullName} · {user.role}</div></div>
        {user.role === 'SUPER_ADMIN' && <select value={dojoId} onChange={event => setDojoId(event.target.value)} className="max-w-44 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs"><option value="">Chọn võ đường</option>{dojos.map(dojo => <option key={dojo.id} value={dojo.id}>{dojo.name}</option>)}</select>}
        <button onClick={loadCore} title="Làm mới" className="p-2 rounded-lg bg-slate-800"><RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`}/></button>
        <button onClick={logout} title="Đăng xuất" className="p-2 rounded-lg bg-rose-600"><LogOut className="w-4 h-4"/></button>
      </div>
    </header>

    <main className="max-w-6xl mx-auto px-3 py-3">
      {error && <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 text-sm flex gap-2"><XCircle className="w-4 h-4 shrink-0 mt-0.5"/><span className="flex-1">{error}</span><button onClick={() => setError('')}><X className="w-4 h-4"/></button></div>}
      <div className="flex gap-2 overflow-x-auto mb-3">{visibleTabs.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200'}`}><Icon className="w-4 h-4"/>{item.label}</button>; })}</div>

      {!scope && user.role === 'SUPER_ADMIN'
        ? <div className="bg-white border border-dashed rounded-2xl py-16 text-center text-slate-400">Chọn võ đường để xem dữ liệu.</div>
        : <>
          {activeTab === 'attendance' && <AttendancePanel classes={classes} students={students} classId={classId} setClassId={setClassId} permissions={user.permissions} scopeQuery={scopeQuery} onError={setError}/>} 
          {activeTab === 'students' && <StudentsPanel students={students} classes={classes} activeClassId={classId} scope={scope} isSuperAdmin={user.role === 'SUPER_ADMIN'} permissions={user.permissions} onReload={loadCore} onError={setError}/>} 
          {activeTab === 'tuition' && user.permissions.canViewTuition && <TuitionPanel students={students} permissions={user.permissions} scopeQuery={scopeQuery} onError={setError}/>} 
          {activeTab === 'admin' && canAdmin && <AdminPanel scope={scope} scopeQuery={scopeQuery} currentUserId={user.id} onError={setError}/>} 
        </>}
    </main>

    <nav className="fixed bottom-0 inset-x-0 bg-white border-t z-30"><div className="max-w-6xl mx-auto grid" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>{visibleTabs.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className={`py-2 flex flex-col items-center text-[10px] font-bold ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-500'}`}><Icon className="w-5 h-5 mb-0.5"/>{item.label}</button>; })}</div></nav>
  </div>;
}
