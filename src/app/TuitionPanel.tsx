import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Plus } from 'lucide-react';
import { apiFetch, ApiError } from '../services/api';
import type { Invoice, PermissionSet, StudentItem } from './types';
import { downloadCsv } from './export';

type Props = {
  students: StudentItem[];
  permissions: PermissionSet;
  scopeQuery: string;
  onError: (message: string) => void;
};

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫';

export function TuitionPanel({ students, permissions, scopeQuery, onError }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [monthKey, setMonthKey] = useState(new Date().toISOString().slice(0, 7));

  const apiError = (error: unknown) => {
    if (error instanceof ApiError) onError(error.payload?.message || String(error.payload?.error || error.message));
    else onError(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
  };

  const load = useCallback(async () => {
    if (!permissions.canViewTuition) return;
    try {
      const suffix = `${scopeQuery}${scopeQuery ? '&' : ''}monthKey=${encodeURIComponent(monthKey)}`;
      setInvoices((await apiFetch<{ invoices: Invoice[] }>(`/tuition/invoices?${suffix}`)).invoices);
    } catch (error) { apiError(error); }
  }, [permissions.canViewTuition, scopeQuery, monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const createInvoice = async (student?: StudentItem) => {
    let target = student;
    if (!target) {
      const code = window.prompt('Mã võ sinh cần tạo học phí:')?.trim().toLowerCase();
      target = students.find(item => item.code.toLowerCase() === code);
    }
    if (!target) return onError('Không tìm thấy võ sinh.');
    const amountDue = Number(window.prompt(`Học phí ${monthKey} của ${target.name}:`, '500000'));
    if (!(amountDue > 0)) return;
    try {
      await apiFetch('/tuition/invoices', { method: 'POST', body: JSON.stringify({ studentId: target.id, monthKey, amountDue }) });
      await load();
    } catch (error) { apiError(error); }
  };

  const pay = async (invoice: Invoice) => {
    const remaining = invoice.amountDue - invoice.totalPaid;
    const amount = Number(window.prompt(`Còn thiếu ${money(remaining)}. Nhập số tiền thu:`, String(remaining)));
    if (!(amount > 0)) return;
    const method = window.prompt('Phương thức (CASH/TRANSFER):', 'CASH')?.trim() || 'CASH';
    try {
      await apiFetch(`/tuition/invoices/${invoice.id}/payments`, { method: 'POST', body: JSON.stringify({ amount, method }) });
      await load();
    } catch (error) { apiError(error); }
  };

  const totals = useMemo(() => invoices.reduce((acc, invoice) => ({
    due: acc.due + invoice.amountDue,
    paid: acc.paid + invoice.totalPaid
  }), { due: 0, paid: 0 }), [invoices]);

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [['Mã', 'Họ tên', 'Tháng', 'Phải thu', 'Đã thu', 'Còn thiếu', 'Trạng thái']];
    invoices.forEach(invoice => rows.push([invoice.student.code, invoice.student.name, invoice.monthKey, invoice.amountDue, invoice.totalPaid, invoice.amountDue - invoice.totalPaid, invoice.status]));
    downloadCsv(`hoc-phi_${monthKey}.csv`, rows);
  };

  return <section>
    <div className="bg-white border rounded-2xl p-3 mb-3 flex flex-wrap items-center gap-2">
      <label className="text-xs font-bold text-slate-500">Tháng</label>
      <input type="month" value={monthKey} onChange={event => setMonthKey(event.target.value)} className="border rounded-xl px-3 py-2 text-sm"/>
      <div className="flex-1"/>
      {permissions.canExportData && <button onClick={exportCsv} className="px-3 py-2 rounded-xl border text-xs font-bold">Xuất CSV</button>}
      {permissions.canEditTuition && <button onClick={() => createInvoice()} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"><Plus className="inline w-4 h-4"/> Tạo học phí</button>}
    </div>

    <div className="grid sm:grid-cols-3 gap-2 mb-3"><Stat label="Tổng phải thu" value={money(totals.due)}/><Stat label="Đã thu" value={money(totals.paid)}/><Stat label="Còn thiếu" value={money(totals.due - totals.paid)}/></div>
    <div className="space-y-2">{invoices.map(invoice => <div key={invoice.id} className="bg-white border rounded-2xl p-3 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl grid place-items-center ${invoice.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : invoice.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{invoice.status === 'PAID' ? <CheckCircle2/> : <Clock3/>}</div>
      <div className="flex-1"><div className="font-bold">{invoice.student.name}</div><div className="text-xs text-slate-500">{invoice.student.code} · {money(invoice.totalPaid)} / {money(invoice.amountDue)} · {invoice.status}</div></div>
      {permissions.canEditTuition && invoice.status !== 'PAID' && <button onClick={() => pay(invoice)} className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Thu tiền</button>}
    </div>)}</div>
    {!invoices.length && <div className="bg-white border border-dashed rounded-2xl py-10 text-center text-slate-400 text-sm">Chưa có học phí tháng {monthKey}.</div>}
  </section>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-white border rounded-2xl p-3"><div className="text-xs text-slate-500">{label}</div><div className="font-black text-lg mt-1">{value}</div></div>;
}
