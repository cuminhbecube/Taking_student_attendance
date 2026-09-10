import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, School, Users, FileCheck2, ClipboardList, 
  BarChart3, Activity, HeartPulse, History, CalendarCheck
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentUser, activeTab, setActiveTab, leaveRequests } = useApp();

  const pendingLeaves = leaveRequests.filter(r => r.status === 'PENDING').length;

  const renderNavLinks = () => {
    if (currentUser.role === 'ADMIN') {
      return (
        <div className="space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Quản Trị Toàn Trường</div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Tổng Quan Hệ Thống</span>
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'classes' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Lớp Học & Đội Nhóm</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'students' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Hồ Sơ Học Sinh</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'analytics' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Báo Cáo & Phân Tích</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'audit' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Nhật Ký Chỉnh Sửa (Audit)</span>
          </button>
        </div>
      );
    }

    if (currentUser.role === 'TEACHER') {
      return (
        <div className="space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Không Gian Giáo Viên</div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Bàn Làm Việc GV</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Điểm Danh Lớp 10A1</span>
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'leaves' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileCheck2 className="w-4 h-4" />
              <span>Duyệt Đơn Nghỉ Phép</span>
            </div>
            {pendingLeaves > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'leaves' ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'}`}>
                {pendingLeaves}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'report' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Sổ Chuyên Cần Lớp</span>
          </button>
        </div>
      );
    }

    if (currentUser.role === 'COACH') {
      return (
        <div className="space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Không Gian Huấn Luyện</div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-amber-600 text-white shadow-md shadow-amber-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Bàn Làm Việc HLV</span>
          </button>

          <button
            onClick={() => setActiveTab('session_attendance')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'session_attendance' ? 'bg-amber-600 text-white shadow-md shadow-amber-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Điểm Danh Ca Tập U15</span>
          </button>

          <button
            onClick={() => setActiveTab('readiness')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'readiness' ? 'bg-amber-600 text-white shadow-md shadow-amber-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Theo Dõi Thể Lực & Chấn Thương</span>
          </button>

          <button
            onClick={() => setActiveTab('coach_report')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'coach_report' ? 'bg-amber-600 text-white shadow-md shadow-amber-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Đánh Giá Phong Độ Đội Tuyển</span>
          </button>
        </div>
      );
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between hidden md:flex shrink-0">
      <div>
        {renderNavLinks()}
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 space-y-1">
        <div className="flex items-center justify-between font-semibold text-slate-700">
          <span>Trạng thái kết nối</span>
          <span className="flex items-center gap-1 text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Trực tuyến
          </span>
        </div>
        <p>Cơ sở 1: Trường THPT & CLB Năng Khiếu</p>
      </div>
    </aside>
  );
};
