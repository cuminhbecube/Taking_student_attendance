import React from 'react';
import { useApp } from '../../context/AppContext';
import { HeartPulse, AlertTriangle, ShieldCheck, Dumbbell } from 'lucide-react';

export const AthleteReadiness: React.FC = () => {
  const { students, attendanceRecords } = useApp();
  const coachRecords = attendanceRecords.filter(r => r.sessionId === 'SES-02');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Hồ Sơ Y Tế & Thể Lực Vận Động Viên (U15)</h2>
        <p className="text-xs text-slate-500 mt-0.5">Giám sát chấn thương, tiền sử căng cơ và khả năng thi đấu đối kháng</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 pl-6">Vận Động Viên</th>
              <th className="py-3.5">Mã Thẻ</th>
              <th className="py-3.5">Tình Trạng Hiện Tại</th>
              <th className="py-3.5">Đánh Giá Nỗ Lực</th>
              <th className="py-3.5">Ghi Chú Của HLV</th>
              <th className="py-3.5 pr-6 text-right">Khuyến Nghị</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {coachRecords.map(rec => (
              <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 pl-6 flex items-center gap-3">
                  <img src={rec.avatar} alt={rec.studentName} className="w-8 h-8 rounded-full object-cover" />
                  <span className="font-bold text-slate-900">{rec.studentName}</span>
                </td>
                <td className="py-3.5 font-mono text-slate-500">{rec.studentCode}</td>
                <td className="py-3.5">
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    rec.healthStatus === 'EXCELLENT' ? 'bg-emerald-100 text-emerald-800' :
                    rec.healthStatus === 'MINOR_INJURY' ? 'bg-amber-100 text-amber-800' :
                    rec.healthStatus === 'REHAB_ONLY' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {rec.healthStatus === 'EXCELLENT' ? '🟢 Sung sức' :
                     rec.healthStatus === 'MINOR_INJURY' ? '🟡 Căng cơ nhẹ' :
                     rec.healthStatus === 'REHAB_ONLY' ? '🔴 Sốt / Nghỉ dưỡng' : '⚪ Bình thường'}
                  </span>
                </td>
                <td className="py-3.5 font-bold text-amber-600">
                  {rec.intensityRating ? `${rec.intensityRating} / 5 ★` : 'Chưa chấm'}
                </td>
                <td className="py-3.5 text-slate-600 max-w-xs truncate">
                  {rec.notes || 'Không có ghi chú bất thường'}
                </td>
                <td className="py-3.5 pr-6 text-right">
                  {rec.healthStatus === 'MINOR_INJURY' ? (
                    <span className="text-amber-700 font-bold bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                      Tập riêng 30p
                    </span>
                  ) : rec.healthStatus === 'REHAB_ONLY' ? (
                    <span className="text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                      Nghỉ ngơi tại nhà
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                      Đủ điều kiện đối kháng
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
