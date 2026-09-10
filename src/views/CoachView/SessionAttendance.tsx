import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceStatus, HealthStatus } from '../../types';
import { 
  Dumbbell, Star, HeartPulse, CheckCircle2, 
  Sparkles, Lock, QrCode, Search, ShieldCheck 
} from 'lucide-react';

export const SessionAttendance: React.FC = () => {
  const { 
    sessions, attendanceRecords, updateAttendance, 
    batchMarkAllPresent, finalizeSession, setIsQrModalOpen 
  } = useApp();

  const [filterHealth, setFilterHealth] = useState<string>('ALL');

  const coachSession = sessions.find(s => s.id === 'SES-02') || sessions[1];
  const records = attendanceRecords.filter(r => r.sessionId === coachSession.id);

  const filteredRecords = records.filter(r => {
    if (filterHealth === 'ALL') return true;
    if (filterHealth === 'INJURED') return r.healthStatus === 'MINOR_INJURY' || r.healthStatus === 'REHAB_ONLY';
    return r.healthStatus === filterHealth;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              {coachSession.targetName}
            </span>
            <span className="text-xs text-slate-400 font-mono">{coachSession.timeSlot} • {coachSession.venue}</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1 tracking-tight">
            Điểm Danh & Đánh Giá Thể Lực: {coachSession.title}
          </h2>
          <p className="text-xs text-slate-500">
            Lực lượng: <strong>{coachSession.totalStudents} VĐV</strong> • Có mặt: <strong className="text-emerald-600">{coachSession.presentCount}</strong> • Đi muộn: <strong className="text-amber-600">{coachSession.lateCount}</strong> • Vắng có phép: <strong className="text-blue-600">{coachSession.excusedCount}</strong>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => batchMarkAllPresent(coachSession.id)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Có Mặt Toàn Đội
          </button>

          <button
            onClick={() => setIsQrModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" /> Quét Thẻ VĐV
          </button>

          <button
            onClick={() => finalizeSession(coachSession.id)}
            disabled={coachSession.isFinalized}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              coachSession.isFinalized 
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-black text-white shadow-xs'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> {coachSession.isFinalized ? 'Đã Khóa Ca Tập' : 'Khóa Sổ Ca Tập'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'ALL', label: 'Tất cả VĐV' },
          { id: 'EXCELLENT', label: '🟢 Sung sức' },
          { id: 'NORMAL', label: '⚪ Bình thường' },
          { id: 'INJURED', label: '⚠️ Chấn thương / Đau cơ' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterHealth(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
              filterHealth === tab.id ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Athlete Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecords.map(rec => (
          <div key={rec.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4 hover:border-amber-300 transition-colors">
            
            {/* Header: Athlete info & Presence toggle */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img src={rec.avatar} alt={rec.studentName} className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-200" />
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">{rec.studentName}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <span>{rec.studentCode}</span>
                    <span>•</span>
                    <span className="text-slate-600 font-sans font-medium">Check-in: {rec.checkInTime || '--:--'}</span>
                  </div>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex gap-1">
                <button
                  onClick={() => updateAttendance(rec.id, 'PRESENT')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    rec.status === 'PRESENT' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Có Mặt
                </button>
                <button
                  onClick={() => updateAttendance(rec.id, 'LATE', rec.notes, 15)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    rec.status === 'LATE' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Muộn
                </button>
                <button
                  onClick={() => updateAttendance(rec.id, 'ABSENT_EXCUSED')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    rec.status === 'ABSENT_EXCUSED' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Phép
                </button>
              </div>
            </div>

            {/* Health / Readiness Selector */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Tình trạng thể lực:
                </span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  rec.healthStatus === 'EXCELLENT' ? 'bg-emerald-100 text-emerald-800' :
                  rec.healthStatus === 'MINOR_INJURY' ? 'bg-amber-100 text-amber-800' :
                  rec.healthStatus === 'REHAB_ONLY' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {rec.healthStatus === 'EXCELLENT' ? '🟢 Sung sức / Đạt chuẩn' :
                   rec.healthStatus === 'MINOR_INJURY' ? '🟡 Chấn thương nhẹ - Tập riêng' :
                   rec.healthStatus === 'REHAB_ONLY' ? '🔴 Nghỉ hồi phục' : '⚪ Bình thường'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  onClick={() => updateAttendance(rec.id, rec.status, rec.notes, rec.lateMinutes, 'EXCELLENT')}
                  className={`py-1 rounded-lg font-semibold border text-center transition-all cursor-pointer ${
                    rec.healthStatus === 'EXCELLENT' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Sung Sức
                </button>
                <button
                  onClick={() => updateAttendance(rec.id, rec.status, rec.notes, rec.lateMinutes, 'MINOR_INJURY')}
                  className={`py-1 rounded-lg font-semibold border text-center transition-all cursor-pointer ${
                    rec.healthStatus === 'MINOR_INJURY' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Đau Cơ / Tập Riêng
                </button>
                <button
                  onClick={() => updateAttendance(rec.id, rec.status, rec.notes, rec.lateMinutes, 'REHAB_ONLY')}
                  className={`py-1 rounded-lg font-semibold border text-center transition-all cursor-pointer ${
                    rec.healthStatus === 'REHAB_ONLY' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Dưỡng Thương
                </button>
              </div>
            </div>

            {/* Effort Rating (Stars) & Notes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Đánh giá nỗ lực & thái độ:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => updateAttendance(rec.id, rec.status, rec.notes, rec.lateMinutes, rec.healthStatus, star)}
                      className="cursor-pointer p-0.5 hover:scale-125 transition-transform"
                    >
                      <Star 
                        className={`w-4 h-4 ${
                          (rec.intensityRating || 4) >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                        }`} 
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-800 ml-1">{rec.intensityRating || 4}/5</span>
                </div>
              </div>

              <input
                type="text"
                defaultValue={rec.notes || ''}
                onBlur={(e) => updateAttendance(rec.id, rec.status, e.target.value)}
                placeholder="Ghi chú chiến thuật (sút phạt tốt, tốc độ cải thiện...)"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
