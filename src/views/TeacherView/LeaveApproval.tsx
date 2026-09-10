import React from 'react';
import { useApp } from '../../context/AppContext';
import { FileCheck2, Check, X, Clock, ExternalLink, User } from 'lucide-react';

export const LeaveApproval: React.FC = () => {
  const { leaveRequests, approveLeaveRequest, rejectLeaveRequest } = useApp();

  const classLeaves = leaveRequests.filter(r => r.sessionType === 'CLASS');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Phê Duyệt Đơn Xin Nghỉ Phép (Lớp 10A1)</h2>
        <p className="text-xs text-slate-500 mt-0.5">Kiểm tra minh chứng, giấy khám bác sĩ và phê duyệt phép cho học sinh</p>
      </div>

      <div className="space-y-4">
        {classLeaves.map(req => (
          <div key={req.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  {req.studentName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{req.studentName}</h3>
                  <p className="text-xs text-slate-400 font-mono">{req.studentCode} • Lớp {req.className} • Phụ huynh: {req.parentName} ({req.parentPhone})</p>
                </div>
              </div>

              <div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                  req.status === 'PENDING' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {req.status === 'PENDING' ? '⏳ Đang chờ duyệt' :
                   req.status === 'APPROVED' ? '✓ Đã chấp thuận' : '✕ Từ chối'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-2 space-y-2">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Lý do xin nghỉ:</p>
                <p className="text-slate-800 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                  "{req.reason}"
                </p>
                <div className="flex items-center gap-4 text-slate-500 pt-1">
                  <span>Thời gian xin nghỉ: <strong className="text-slate-800 font-mono">{req.fromDate} → {req.toDate}</strong></span>
                  <span>•</span>
                  <span>Thời điểm nộp: <strong className="text-slate-800">{req.appliedAt}</strong></span>
                </div>
              </div>

              {/* Evidence / Doctor Note Thumbnail */}
              {req.evidenceUrl && (
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[11px] mb-2">Giấy tờ minh chứng:</p>
                  <a href={req.evidenceUrl} target="_blank" rel="noreferrer" className="block relative rounded-2xl overflow-hidden border border-slate-200 group">
                    <img src={req.evidenceUrl} alt="Giấy khám bệnh" className="w-full h-24 object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
                      <ExternalLink className="w-4 h-4" /> Xem ảnh gốc
                    </div>
                  </a>
                </div>
              )}
            </div>

            {/* Approval Buttons */}
            {req.status === 'PENDING' && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => rejectLeaveRequest(req.id, 'Chưa đủ giấy tờ minh chứng')}
                  className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" /> Từ Chối
                </button>
                <button
                  onClick={() => approveLeaveRequest(req.id, 'Giáo viên chủ nhiệm đã duyệt')}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Phê Duyệt Nghỉ Có Phép
                </button>
              </div>
            )}

            {req.status === 'APPROVED' && (
              <div className="pt-2 text-xs text-emerald-700 font-medium">
                ✓ Đã duyệt bởi <strong>{req.reviewedBy}</strong> lúc {req.reviewedAt}. Hệ thống đã tự động cập nhật trạng thái điểm danh sang <em>Vắng có phép</em>.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
