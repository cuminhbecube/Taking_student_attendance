import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, X, Send } from 'lucide-react';

export const LeaveRequestModal: React.FC = () => {
  const { isLeaveModalOpen, setIsLeaveModalOpen, students, submitLeaveRequest } = useApp();
  
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [sessionType, setSessionType] = useState<'CLASS' | 'TRAINING'>('CLASS');
  const [fromDate, setFromDate] = useState('Hôm nay');
  const [toDate, setToDate] = useState('Hôm nay');
  const [reason, setReason] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isLeaveModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    submitLeaveRequest({
      studentId: student.id,
      studentName: student.name,
      studentCode: student.code,
      className: sessionType === 'CLASS' ? student.className : (student.trainingGroupName || 'Ca tập thể thao'),
      sessionType,
      fromDate,
      toDate,
      reason,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      evidenceUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&auto=format&fit=crop&q=80'
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setIsLeaveModalOpen(false);
      setReason('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        
        <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Nộp Đơn Xin Nghỉ Phép Trực Tuyến</h3>
              <p className="text-xs text-indigo-100">Dành cho Phụ huynh / Học sinh gửi Giáo viên hoặc HLV</p>
            </div>
          </div>
          <button 
            onClick={() => setIsLeaveModalOpen(false)}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-2xl font-black">
              ✓
            </div>
            <h4 className="text-lg font-bold text-slate-900">Nộp đơn thành công!</h4>
            <p className="text-xs text-slate-500">Đơn đã được chuyển tới bàn làm việc của Giáo viên / Huấn luyện viên phụ trách để xem xét phê duyệt.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Chọn học sinh / Vận động viên:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) - Lớp {s.className}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Xin nghỉ ca nào:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSessionType('CLASS')}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer text-center transition-all ${
                    sessionType === 'CLASS' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  🏫 Lớp Học Văn Hóa
                </button>
                <button
                  type="button"
                  onClick={() => setSessionType('TRAINING')}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer text-center transition-all ${
                    sessionType === 'TRAINING' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  ⚽ Ca Tập Luyện / CLB
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Từ ngày:</label>
                <input
                  type="text"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Đến ngày:</label>
                <input
                  type="text"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Lý do xin nghỉ phép:</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Em bị ốm sốt theo đơn thuốc của bác sĩ, xin phép nghỉ 1 ngày..."
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Gửi Đơn Xin Phép
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
