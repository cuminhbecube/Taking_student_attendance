import React from 'react';
import { useApp } from '../../context/AppContext';
import { Download, Trophy, Award } from 'lucide-react';

export const CoachReport: React.FC = () => {
  const { exportAttendanceToCSV } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Báo Cáo Chuyên Cần & Phong Độ U15</h2>
          <p className="text-xs text-slate-500 mt-0.5">Tiêu chí xét duyệt danh sách đăng ký tham dự Giải Bóng Đá Học Đường</p>
        </div>
        <button
          onClick={() => exportAttendanceToCSV('SES-02')}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" /> Xuất Danh Sách Thi Đấu (.CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Điều Kiện Tham Gia Giải</span>
          <h3 className="text-2xl font-black text-slate-900">≥ 80% Số Buổi</h3>
          <p className="text-xs text-slate-500">Bắt buộc tham gia ít nhất 12/15 ca tập đối kháng gần nhất</p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Đã Đạt Chuẩn Đăng Ký</span>
          <h3 className="text-2xl font-black text-slate-900">8 / 10 VĐV</h3>
          <p className="text-xs text-slate-500">Đủ điều kiện thể lực và thời lượng rèn luyện</p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Cần Bổ Sung Thể Lực</span>
          <h3 className="text-2xl font-black text-slate-900">2 VĐV</h3>
          <p className="text-xs text-slate-500">Cần bố trí 2 ca tập bổ trợ vào sáng Chủ Nhật</p>
        </div>
      </div>
    </div>
  );
};
