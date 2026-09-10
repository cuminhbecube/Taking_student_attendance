import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/StatCard';
import { 
  Dumbbell, Activity, HeartPulse, Trophy, 
  Clock, MapPin, ArrowRight, ShieldCheck 
} from 'lucide-react';

export const CoachDashboard: React.FC = () => {
  const { currentUser, sessions, attendanceRecords, setActiveTab } = useApp();

  const coachSession = sessions.find(s => s.id === 'SES-02') || sessions[1];
  const records = attendanceRecords.filter(r => r.sessionId === coachSession.id);
  
  const injuredCount = records.filter(r => r.healthStatus === 'MINOR_INJURY' || r.healthStatus === 'REHAB_ONLY').length;
  const fitCount = records.filter(r => r.healthStatus === 'EXCELLENT' || r.healthStatus === 'NORMAL').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/20 border border-white/20 text-white text-xs font-bold uppercase tracking-wider">
              Không Gian Huấn Luyện Viên
            </span>
            <span className="text-xs text-amber-100 font-mono">Tuyển U15 Bóng Đá & Bơi Lội</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mt-3 tracking-tight">
            Chào {currentUser.name}!
          </h2>
          <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-xl">
            Ca tập chiều nay: <strong>{coachSession.title}</strong> tại {coachSession.venue}. Nhớ ghi nhận tình trạng chấn thương và chấm điểm nỗ lực của các VĐV.
          </p>

          <div className="flex flex-wrap gap-3 mt-5">
            <button
              onClick={() => setActiveTab('session_attendance')}
              className="px-4 py-2.5 rounded-xl bg-white text-amber-700 hover:bg-amber-50 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Activity className="w-4 h-4" /> Điểm Danh Ca Tập U15
            </button>
            <button
              onClick={() => setActiveTab('readiness')}
              className="px-4 py-2.5 rounded-xl bg-amber-700/40 hover:bg-amber-700/60 text-white text-xs font-bold transition-all border border-amber-400/30 cursor-pointer flex items-center gap-1.5"
            >
              <HeartPulse className="w-4 h-4" /> Báo Cáo Chấn Thương ({injuredCount})
            </button>
          </div>
        </div>

        {/* Readiness Widget */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shrink-0 w-full md:w-64">
          <div className="text-xs font-bold text-amber-200 uppercase tracking-wider mb-1">Chỉ số sẵn sàng thi đấu</div>
          <div className="text-2xl font-black text-white">{fitCount}/{coachSession.totalStudents} VĐV</div>
          <p className="text-[11px] text-amber-200 mt-1">{injuredCount} VĐV đang đau cơ / cần tập riêng</p>
          <div className="w-full bg-white/20 h-2 rounded-full mt-3 overflow-hidden">
            <div style={{ width: `${(fitCount / coachSession.totalStudents) * 100}%` }} className="bg-emerald-400 h-full"></div>
          </div>
        </div>
      </div>

      {/* 4 Athletic Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Lực Lượng Đội U15"
          value={`${coachSession.totalStudents} VĐV`}
          subtitle="Đội hình chuẩn bị giải VĐ Thiếu Niên"
          icon={Trophy}
          color="amber"
        />
        <StatCard
          title="Có Mặt Chiều Nay"
          value={`${coachSession.presentCount + coachSession.lateCount} VĐV`}
          subtitle={`${coachSession.lateCount} em trễ giờ do kẹt học thêm`}
          icon={Activity}
          color="emerald"
        />
        <StatCard
          title="Vận Động Viên Đau Cơ"
          value={`${injuredCount} VĐV`}
          subtitle="Chấn thương nhẹ, bố trí bài tập riêng"
          icon={HeartPulse}
          color={injuredCount > 0 ? "rose" : "emerald"}
        />
        <StatCard
          title="Điểm Nỗ Lực Trung Bình"
          value="4.4 / 5.0"
          subtitle="Đánh giá thái độ & giáo án"
          icon={ShieldCheck}
          color="purple"
        />
      </div>

      {/* Training Plan Guidelines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm">Giáo Án Tập Luyện Chiều Nay</h3>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block">16:30 - 17:00: Khởi động & Đo nhịp tim</strong>
                <span>Chạy nhẹ quanh sân, giãn cơ động học. Báo cáo chấn thương.</span>
              </div>
              <span className="font-mono text-slate-400">30p</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-900 flex items-center justify-between">
              <div>
                <strong className="text-amber-950 block">17:00 - 18:00: Kỹ thuật chuyền bóng & Ban bật</strong>
                <span>Bài tập phối hợp 3 người, thoát pressing tốc độ cao.</span>
              </div>
              <span className="font-mono text-amber-700">60p</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block">18:00 - 18:30: Đối kháng nội bộ 8v8 & Thả lỏng</strong>
                <span>Chấm điểm nỗ lực và chốt sổ điểm danh ca tập.</span>
              </div>
              <span className="font-mono text-slate-400">30p</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm">Lưu Ý Sức Khỏe & An Toàn Thể Thao</h3>
          <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
            <li>VĐV có biểu hiện căng cứng cơ hoặc chấn thương nhẹ <strong>phải chuyển sang trạng thái "Tập riêng"</strong>, không tham gia đối kháng va chạm.</li>
            <li>HLV chấm điểm nỗ lực (1-5 sao) sau mỗi buổi tập để làm tiêu chí xếp hạt giống thi đấu.</li>
            <li>Sau buổi tập, nhắc nhở học viên trả đầy đủ áo bib và bóng về kho dụng cụ.</li>
          </ul>
        </div>
      </div>

    </div>
  );
};
