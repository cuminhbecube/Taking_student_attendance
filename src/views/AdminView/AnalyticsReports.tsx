import React from 'react';
import { useApp } from '../../context/AppContext';
import { Download, BarChart2, PieChart, TrendingUp, Award, AlertOctagon } from 'lucide-react';

export const AnalyticsReports: React.FC = () => {
  const { students, attendanceRecords, exportAttendanceToCSV } = useApp();

  const total = attendanceRecords.length;
  const present = attendanceRecords.filter(r => r.status === 'PRESENT').length;
  const late = attendanceRecords.filter(r => r.status === 'LATE').length;
  const excused = attendanceRecords.filter(r => r.status === 'ABSENT_EXCUSED').length;
  const unexcused = attendanceRecords.filter(r => r.status === 'ABSENT_UNEXCUSED').length;

  const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;
  const latePct = total > 0 ? Math.round((late / total) * 100) : 0;
  const excusedPct = total > 0 ? Math.round((excused / total) * 100) : 0;
  const unexcusedPct = total > 0 ? Math.round((unexcused / total) * 100) : 0;

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Báo Cáo & Phân Tích Chuyên Sâu</h2>
          <p className="text-xs text-slate-500 mt-0.5">Thống kê tỷ lệ tham gia theo khối, tỷ lệ chuyên cần và trích xuất dữ liệu Excel</p>
        </div>

        <button
          onClick={() => exportAttendanceToCSV()}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" /> Xuất Báo Cáo Sang Excel (.CSV)
        </button>
      </div>

      {/* 4 breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Có Mặt Đúng Giờ</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{present} <span className="text-xs font-medium text-slate-400">({presentPct}%)</span></div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div style={{ width: `${presentPct}%` }} className="bg-emerald-500 h-full"></div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Đi Muộn</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{late} <span className="text-xs font-medium text-slate-400">({latePct}%)</span></div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div style={{ width: `${latePct}%` }} className="bg-amber-500 h-full"></div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Vắng Có Phép</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{excused} <span className="text-xs font-medium text-slate-400">({excusedPct}%)</span></div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div style={{ width: `${excusedPct}%` }} className="bg-blue-500 h-full"></div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Vắng Không Phép</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{unexcused} <span className="text-xs font-medium text-slate-400">({unexcusedPct}%)</span></div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div style={{ width: `${unexcusedPct}%` }} className="bg-rose-500 h-full"></div>
          </div>
        </div>
      </div>

      {/* Top Performing Class vs Need Improvement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <Award className="w-5 h-5" />
            <h3 className="text-base font-extrabold text-slate-900">Top Lớp & CLB Chuyên Cần Xuất Sắc</h3>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Lớp 10A1 Chuyên Toán', rate: 96.5, teacher: 'Thầy Nguyễn Văn An' },
              { name: 'CLB Bơi Lội Nâng Cao', rate: 98.0, teacher: 'HLV. Phạm Huỳnh Long' },
              { name: 'Đội Tuyển U15 Bóng Đá', rate: 94.2, teacher: 'HLV. Phạm Huỳnh Long' }
            ].map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="font-bold text-xs text-slate-900">{c.name}</p>
                  <p className="text-[11px] text-slate-400">{c.teacher}</p>
                </div>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  {c.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertOctagon className="w-5 h-5" />
            <h3 className="text-base font-extrabold text-slate-900">Biện Pháp Tăng Cường Kỷ Cương</h3>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <p className="font-bold">Đề xuất tự động từ hệ thống:</p>
            <ul className="list-disc pl-4 space-y-1 text-amber-800 text-[11px]">
              <li>Gửi SMS/ZNS tự động tới phụ huynh khi học sinh chưa check-in sau 07:30.</li>
              <li>Yêu cầu học sinh nộp đơn xin phép trước 24h đối với ca tập thể thao.</li>
              <li>Tổ chức gặp gỡ phụ huynh đối với học sinh có tỷ lệ chuyên cần &lt; 80%.</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
};
