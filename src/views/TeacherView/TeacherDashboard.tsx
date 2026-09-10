import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/StatCard';
import { 
  Users, CheckCircle2, FileText, CalendarCheck, 
  Clock, ArrowRight, ShieldAlert, Sparkles 
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { currentUser, sessions, leaveRequests, setActiveTab, batchMarkAllPresent } = useApp();

  const classSession = sessions.find(s => s.id === 'SES-01') || sessions[0];
  const pendingLeaves = leaveRequests.filter(r => r.status === 'PENDING' && r.sessionType === 'CLASS');

  return (
    <div className="space-y-6">
      
      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-500/30 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
              Không Gian Giáo Viên Chủ Nhiệm
            </span>
            <span className="text-xs text-blue-200 font-mono">10A1 Chuyên Toán</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mt-3 tracking-tight">
            Xin chào, {currentUser.name}!
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl">
            Tiết học hôm nay: <strong>Tiết 1-2 Đại Số (07:15 - 08:50)</strong> tại Phòng 301 - Tòa A. Hiện có <strong>{pendingLeaves.length} đơn xin nghỉ phép</strong> cần bạn phê duyệt.
          </p>

          <div className="flex flex-wrap gap-3 mt-5">
            <button
              onClick={() => setActiveTab('attendance')}
              className="px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4" /> Bắt Đầu Điểm Danh Ngay
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className="px-4 py-2.5 rounded-xl bg-blue-500/30 hover:bg-blue-500/50 text-white text-xs font-bold transition-all border border-blue-400/30 cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" /> Xem Đơn Nghỉ Phép ({pendingLeaves.length})
            </button>
          </div>
        </div>

        {/* Quick Roll Call Mini Box */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shrink-0 w-full md:w-64">
          <div className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-2">Trạng thái lớp 10A1</div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black">{classSession.presentCount + classSession.lateCount}/{classSession.totalStudents}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
              Đang diễn ra
            </span>
          </div>
          <p className="text-[11px] text-blue-200 mt-1">Đã có {classSession.presentCount} học sinh có mặt</p>
          <button
            onClick={() => batchMarkAllPresent(classSession.id)}
            className="w-full mt-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Chấm Nhanh Cả Lớp Có Mặt
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Sĩ Số Lớp 10A1"
          value={`${classSession.totalStudents} Học Sinh`}
          subtitle="12 Nam • Lớp Chuyên Toán"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Tỷ Lệ Chuyên Cần Hôm Nay"
          value={`${Math.round(((classSession.presentCount + classSession.lateCount) / classSession.totalStudents) * 100)}%`}
          subtitle={`${classSession.lateCount} em trễ • ${classSession.unexcusedCount} em chưa phép`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Đơn Xin Nghỉ Phép Chờ Duyệt"
          value={`${pendingLeaves.length} Đơn`}
          subtitle="Cần phản hồi trước 08:00"
          icon={FileText}
          color={pendingLeaves.length > 0 ? "rose" : "indigo"}
        />
      </div>

      {/* Schedule & Guidelines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm">Thời Khóa Biểu Giảng Dạy Trong Ngày</h3>
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-blue-900">Tiết 1-2: Đại Số 10 (Hàm số bậc hai)</p>
                <p className="text-[11px] text-blue-700">07:15 - 08:50 • Phòng 301 - Tòa A</p>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded-md shadow-2xs">Đang diễn ra</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between opacity-70">
              <div>
                <p className="font-bold text-xs text-slate-800">Tiết 3-4: Hình Học 10 (Vectơ trong không gian)</p>
                <p className="text-[11px] text-slate-500">09:05 - 10:40 • Phòng 301 - Tòa A</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">Sắp tới</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm">Quy Định Điểm Danh Của Nhà Trường</h3>
          <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
            <li>Giáo viên hoàn tất điểm danh chậm nhất 15 phút sau khi tiết học bắt đầu (trước 07:30).</li>
            <li>Trường hợp học sinh vắng không rõ lý do, hệ thống tự động gửi tin nhắn Zalo đến phụ huynh.</li>
            <li>Nếu phụ huynh đã nộp đơn xin phép qua cổng Web, giáo viên bấm <strong>"Duyệt đơn"</strong> để tự động chuyển trạng thái học sinh sang <em>Vắng có phép</em>.</li>
          </ul>
        </div>
      </div>

    </div>
  );
};
