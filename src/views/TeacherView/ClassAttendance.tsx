import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceStatus } from '../../types';
import { 
  CheckCircle2, Clock, XCircle, AlertCircle, 
  Sparkles, Lock, QrCode, Search, MessageSquare 
} from 'lucide-react';

export const ClassAttendance: React.FC = () => {
  const { 
    sessions, attendanceRecords, updateAttendance, 
    batchMarkAllPresent, finalizeSession, setIsQrModalOpen 
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchName, setSearchName] = useState<string>('');

  const currentSession = sessions.find(s => s.id === 'SES-01') || sessions[0];
  const records = attendanceRecords.filter(r => r.sessionId === currentSession.id);

  const filteredRecords = records.filter(r => {
    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const matchName = r.studentName.toLowerCase().includes(searchName.toLowerCase()) || r.studentCode.toLowerCase().includes(searchName.toLowerCase());
    return matchStatus && matchName;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner Control */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              {currentSession.targetName}
            </span>
            <span className="text-xs text-slate-400 font-mono">{currentSession.timeSlot} • {currentSession.venue}</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1 tracking-tight">
            Điểm Danh {currentSession.title}
          </h2>
          <p className="text-xs text-slate-500">
            Sĩ số: <strong>{currentSession.totalStudents} học sinh</strong> • Có mặt: <strong className="text-emerald-600">{currentSession.presentCount}</strong> • Đi muộn: <strong className="text-amber-600">{currentSession.lateCount}</strong> • Vắng có phép: <strong className="text-blue-600">{currentSession.excusedCount}</strong> • Vắng không phép: <strong className="text-rose-600">{currentSession.unexcusedCount}</strong>
          </p>
        </div>

        {/* Quick Batch Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => batchMarkAllPresent(currentSession.id)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Chấm Tất Cả Có Mặt
          </button>

          <button
            onClick={() => setIsQrModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" /> Quét Thẻ / QR
          </button>

          <button
            onClick={() => finalizeSession(currentSession.id)}
            disabled={currentSession.isFinalized}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentSession.isFinalized 
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-black text-white shadow-xs'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> {currentSession.isFinalized ? 'Đã Khóa Sổ' : 'Khóa Sổ Điểm Danh'}
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Tìm học sinh trong lớp..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'PRESENT', label: 'Có mặt' },
            { id: 'LATE', label: 'Đi muộn' },
            { id: 'ABSENT_EXCUSED', label: 'Có phép' },
            { id: 'ABSENT_UNEXCUSED', label: 'Không phép' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === tab.id ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Roll Call Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecords.map(rec => (
          <div 
            key={rec.id} 
            className={`bg-white rounded-3xl p-5 border shadow-xs transition-all flex flex-col justify-between ${
              rec.status === 'PRESENT' ? 'border-emerald-200 bg-emerald-50/20' :
              rec.status === 'LATE' ? 'border-amber-200 bg-amber-50/20' :
              rec.status === 'ABSENT_EXCUSED' ? 'border-blue-200 bg-blue-50/20' :
              rec.status === 'ABSENT_UNEXCUSED' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img src={rec.avatar} alt={rec.studentName} className="w-11 h-11 rounded-2xl object-cover ring-1 ring-slate-200" />
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{rec.studentName}</h4>
                    <span className="text-xs text-slate-400 font-mono">{rec.studentCode}</span>
                  </div>
                </div>

                {/* Status indicator tag */}
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                  rec.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                  rec.status === 'LATE' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                  rec.status === 'ABSENT_EXCUSED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  rec.status === 'ABSENT_UNEXCUSED' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {rec.status === 'PRESENT' ? '✓ Có mặt' :
                   rec.status === 'LATE' ? `⏱ Muộn ${rec.lateMinutes || 15}p` :
                   rec.status === 'ABSENT_EXCUSED' ? '📝 Có phép' :
                   rec.status === 'ABSENT_UNEXCUSED' ? '✕ Không phép' : 'Chưa điểm'}
                </span>
              </div>

              {/* Action Toggle Buttons (1-Tap Change) */}
              <div className="grid grid-cols-4 gap-1.5 mt-4">
                <button
                  onClick={() => updateAttendance(rec.id, 'PRESENT')}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    rec.status === 'PRESENT' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200'
                  }`}
                  title="Đánh dấu Có mặt"
                >
                  Có Mặt
                </button>

                <button
                  onClick={() => updateAttendance(rec.id, 'LATE', rec.notes, (rec.lateMinutes || 10) + 5)}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    rec.status === 'LATE' ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'bg-slate-50 hover:bg-amber-50 text-slate-700 border-slate-200'
                  }`}
                  title="Đánh dấu Đi muộn"
                >
                  Muộn
                </button>

                <button
                  onClick={() => updateAttendance(rec.id, 'ABSENT_EXCUSED')}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    rec.status === 'ABSENT_EXCUSED' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                  }`}
                  title="Đánh dấu Vắng có phép"
                >
                  Có Phép
                </button>

                <button
                  onClick={() => updateAttendance(rec.id, 'ABSENT_UNEXCUSED')}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    rec.status === 'ABSENT_UNEXCUSED' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-slate-50 hover:bg-rose-50 text-slate-700 border-slate-200'
                  }`}
                  title="Đánh dấu Vắng không phép"
                >
                  Không Phép
                </button>
              </div>

              {/* Note / Checkin detail */}
              <div className="mt-3">
                <input
                  type="text"
                  defaultValue={rec.notes || ''}
                  onBlur={(e) => updateAttendance(rec.id, rec.status, e.target.value)}
                  placeholder="Ghi chú (quên sách, kiểm tra bài...)"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Cập nhật lúc: <strong className="text-slate-600 font-mono">{rec.updatedAt}</strong></span>
              <span>Bởi: <strong className="text-slate-600">{rec.updatedBy}</strong></span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
