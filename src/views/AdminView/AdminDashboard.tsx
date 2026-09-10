import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/StatCard';
import { 
  Users, CheckCircle2, AlertTriangle, Activity, 
  Calendar, Clock, ArrowUpRight, School, Dumbbell 
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { students, sessions, attendanceRecords, setActiveTab, exportAttendanceToCSV } = useApp();

  const totalStudents = students.length;
  const activeSessions = sessions.length;
  
  // Overall attendance rate today
  const totalMarked = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(r => r.status === 'PRESENT').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'LATE').length;
  const rateToday = totalMarked > 0 ? (((presentCount + lateCount) / totalMarked) * 100).toFixed(1) : '95.2';

  // Warnings count
  const warningStudents = students.filter(s => s.status === 'WARNING' || s.overallAttendanceRate < 80);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 rounded-full bg-purple-500/30 border border-purple-400/30 text-purple-200 text-xs font-bold uppercase tracking-wider">
            Bảng Điều Khiển Quản Trị Hệ Thống
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-3 tracking-tight">
            Tổng Quan Kiểm Diện Toàn Trường
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Giám sát thời gian thực tiến độ điểm danh của 6 khối lớp học thuật và 3 đội tuyển thể thao. Đảm bảo kỷ luật chuyên cần và cảnh báo sớm học sinh vắng học.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={() => setActiveTab('classes')}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <School className="w-4 h-4" /> Quản Lý Lớp & Đội Tuyển
            </button>
            <button
              onClick={() => exportAttendanceToCSV()}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" /> Xuất Báo Cáo Excel (CSV)
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng Học Sinh & VĐV"
          value={totalStudents}
          subtitle="Đang theo học tại trường & CLB"
          icon={Users}
          color="indigo"
          trend={{ value: "+4 học sinh mới", isPositive: true }}
        />
        <StatCard
          title="Tỷ Lệ Chuyên Cần Hôm Nay"
          value={`${rateToday}%`}
          subtitle="Tỷ lệ có mặt & đúng giờ"
          icon={CheckCircle2}
          color="emerald"
          trend={{ value: "+1.8%", isPositive: true }}
        />
        <StatCard
          title="Ca Học & Ca Tập"
          value={activeSessions}
          subtitle="Tiết văn hóa & Ca huấn luyện"
          icon={Activity}
          color="purple"
        />
        <StatCard
          title="Cảnh Báo Vắng Nhiều"
          value={warningStudents.length}
          subtitle="Học sinh có tỷ lệ vắng > 20%"
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Grid: Active Sessions + Weekly Attendance Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Sessions List (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Tiến Độ Điểm Danh Các Ca Hôm Nay</h3>
              <p className="text-xs text-slate-400">Cập nhật trực tiếp từ thiết bị của Giáo viên & Huấn luyện viên</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {sessions.length} Ca học
            </span>
          </div>

          <div className="space-y-3">
            {sessions.map(s => {
              const presentRate = s.totalStudents > 0 ? Math.round(((s.presentCount + s.lateCount) / s.totalStudents) * 100) : 0;
              return (
                <div key={s.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        s.type === 'CLASS' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {s.type === 'CLASS' ? <School className="w-5 h-5" /> : <Dumbbell className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{s.title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            s.type === 'CLASS' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {s.type === 'CLASS' ? 'Lớp Văn Hóa' : 'Ca Huấn Luyện'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="font-medium text-slate-700">{s.targetName}</span>
                          <span>•</span>
                          <span>{s.instructorName}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-600">{s.timeSlot}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-slate-800">{presentRate}%</span>
                      <p className="text-[11px] text-slate-400 font-medium">{s.presentCount + s.lateCount}/{s.totalStudents} có mặt</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden flex">
                    <div style={{ width: `${(s.presentCount / s.totalStudents) * 100}%` }} className="bg-emerald-500 h-full" title="Có mặt"></div>
                    <div style={{ width: `${(s.lateCount / s.totalStudents) * 100}%` }} className="bg-amber-400 h-full" title="Đi muộn"></div>
                    <div style={{ width: `${(s.excusedCount / s.totalStudents) * 100}%` }} className="bg-blue-400 h-full" title="Vắng có phép"></div>
                    <div style={{ width: `${(s.unexcusedCount / s.totalStudents) * 100}%` }} className="bg-rose-500 h-full" title="Vắng không phép"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Trend Chart Simulation (1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Xu Hướng Chuyên Cần Tuần Này</h3>
            <p className="text-xs text-slate-400">Biểu đồ tỷ lệ chuyên cần từ Thứ 2 đến Thứ 7</p>

            {/* Custom SVG Bar Chart */}
            <div className="mt-6 flex items-end justify-between h-44 px-2 pb-2 border-b border-slate-100">
              {[
                { day: 'T2', rate: 96, label: '96%' },
                { day: 'T3', rate: 94, label: '94%' },
                { day: 'T4', rate: 98, label: '98%' },
                { day: 'T5', rate: 93, label: '93%' },
                { day: 'T6', rate: 95, label: '95%' },
                { day: 'T7', rate: 91, label: '91%' }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1 group">
                  <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.label}
                  </span>
                  <div 
                    style={{ height: `${item.rate * 1.3}px` }} 
                    className={`w-8 rounded-t-lg transition-all group-hover:brightness-110 ${
                      item.day === 'T4' ? 'bg-gradient-to-t from-indigo-600 to-purple-500 shadow-md shadow-indigo-200' : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                  ></div>
                  <span className="text-xs font-semibold text-slate-600 mt-1">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 flex items-center justify-between">
            <div>
              <p className="font-bold">Đánh giá chung tuần này</p>
              <p className="text-[11px] text-indigo-700">Tỷ lệ chuyên cần đạt chuẩn BGH giao</p>
            </div>
            <span className="text-sm font-black text-indigo-600">95.3%</span>
          </div>
        </div>

      </div>

      {/* High-Risk / Warning Students Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Danh Sách Học Sinh Cần Lưu Tâm Đặc Biệt</h3>
              <p className="text-xs text-slate-400">Các trường hợp vắng trên 2 buổi liên tiếp hoặc tỷ lệ chuyên cần dưới 85%</p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
            {warningStudents.length} Học sinh
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Học Sinh</th>
                <th className="pb-3">Lớp / CLB</th>
                <th className="pb-3">Tỷ Lệ Chuyên Cần</th>
                <th className="pb-3">Vắng Liên Tiếp</th>
                <th className="pb-3">Phụ Huynh Liên Hệ</th>
                <th className="pb-3 text-right pr-2">Hành Động Đề Xuất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {warningStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 pl-2 flex items-center gap-3">
                    <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <span className="font-bold text-slate-900 block">{s.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{s.code}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="font-semibold text-slate-800">{s.className}</span>
                    {s.trainingGroupName && <span className="block text-[11px] text-slate-400">{s.trainingGroupName}</span>}
                  </td>
                  <td className="py-3">
                    <span className="px-2.5 py-1 rounded-lg font-bold bg-rose-100 text-rose-700">
                      {s.overallAttendanceRate}%
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="font-bold text-rose-600">{s.consecutiveAbsences} buổi</span>
                  </td>
                  <td className="py-3">
                    <span className="text-slate-900 block font-semibold">{s.parentName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{s.parentPhone}</span>
                  </td>
                  <td className="py-3 text-right pr-2">
                    <button 
                      onClick={() => alert(`Đã gửi thông báo nhắc nhở đến phụ huynh em ${s.name} (${s.parentPhone})`)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Gửi Cảnh Báo Phụ Huynh
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
