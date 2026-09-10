import React from 'react';
import { useApp } from '../../context/AppContext';
import { Download, Users, Award, AlertTriangle } from 'lucide-react';

export const TeacherReport: React.FC = () => {
  const { students, exportAttendanceToCSV } = useApp();
  const classStudents = students.filter(s => s.className === '10A1');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Sổ Chuyên Cần Lớp 10A1</h2>
          <p className="text-xs text-slate-500 mt-0.5">Thống kê tỷ lệ đi học đầy đủ và cảnh báo học sinh nghỉ học của lớp</p>
        </div>
        <button
          onClick={() => exportAttendanceToCSV('SES-01')}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" /> Xuất Báo Cáo Lớp 10A1 (.CSV)
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 pl-6">Học Sinh</th>
              <th className="py-3.5">Mã HS</th>
              <th className="py-3.5">Tỷ Lệ Chuyên Cần</th>
              <th className="py-3.5">Số Buổi Vắng</th>
              <th className="py-3.5">Đánh Giá Hạnh Kiểm</th>
              <th className="py-3.5 pr-6 text-right">Tình Trạng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {classStudents.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 pl-6 flex items-center gap-3">
                  <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover" />
                  <span className="font-bold text-slate-900">{s.name}</span>
                </td>
                <td className="py-3.5 font-mono text-slate-500">{s.code}</td>
                <td className="py-3.5 font-bold text-slate-800">{s.overallAttendanceRate}%</td>
                <td className="py-3.5">
                  <span className={s.consecutiveAbsences > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                    {s.consecutiveAbsences} buổi
                  </span>
                </td>
                <td className="py-3.5">
                  {s.overallAttendanceRate >= 95 ? (
                    <span className="text-emerald-700 font-bold">Tốt - Chuyên cần</span>
                  ) : s.overallAttendanceRate >= 85 ? (
                    <span className="text-blue-700 font-medium">Khá</span>
                  ) : (
                    <span className="text-rose-700 font-bold">Cần chấn chỉnh</span>
                  )}
                </td>
                <td className="py-3.5 pr-6 text-right">
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {s.status === 'ACTIVE' ? 'Đạt chuẩn' : 'Cảnh báo vắng'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
