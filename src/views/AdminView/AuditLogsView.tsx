import React from 'react';
import { useApp } from '../../context/AppContext';
import { History, Shield, Clock, FileText, UserCheck } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Nhật Ký Chỉnh Sửa & Giám Sát (Audit Trail)</h2>
        <p className="text-xs text-slate-500 mt-0.5">Ghi vết toàn bộ hành vi sửa điểm danh, duyệt đơn phép nhằm bảo đảm tính minh bạch</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-slate-800">Lịch sử thao tác gần đây ({auditLogs.length} sự kiện)</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Tự động đồng bộ</span>
        </div>

        <div className="divide-y divide-slate-100">
          {auditLogs.map(log => (
            <div key={log.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  log.actorRole === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                  log.actorRole === 'TEACHER' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{log.action}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-semibold text-indigo-600">{log.targetName}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{log.details}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-600">{log.actorName}</span>
                    <span>({log.actorRole})</span>
                    <span>•</span>
                    <span className="font-mono">{log.timestamp}</span>
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500 shrink-0">
                {log.id}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
