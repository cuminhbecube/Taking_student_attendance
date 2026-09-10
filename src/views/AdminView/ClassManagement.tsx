import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { School, Dumbbell, Plus, Users, MapPin, Calendar, CheckCircle } from 'lucide-react';

export const ClassManagement: React.FC = () => {
  const { classes, trainingGroups } = useApp();
  const [activeTab, setActiveTab] = useState<'ACADEMIC' | 'SPORTS'>('ACADEMIC');

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Quản Lý Lớp Học & Đội Tuyển</h2>
          <p className="text-xs text-slate-500 mt-0.5">Phân bổ Giáo viên chủ nhiệm và Huấn luyện viên thể thao chuyên trách</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1 bg-slate-100 rounded-xl border border-slate-200 flex">
            <button
              onClick={() => setActiveTab('ACADEMIC')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ACADEMIC' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lớp Học Văn Hóa ({classes.length})
            </button>
            <button
              onClick={() => setActiveTab('SPORTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'SPORTS' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CLB / Đội Tuyển Thể Thao ({trainingGroups.length})
            </button>
          </div>

          <button 
            onClick={() => alert('Mở form tạo lớp/đội nhóm mới')}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm Mới
          </button>
        </div>
      </div>

      {/* Academic Classes Tab */}
      {activeTab === 'ACADEMIC' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map(c => (
            <div key={c.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                    <School className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
                    {c.code}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 mt-4">{c.name}</h3>
                <p className="text-xs text-slate-500">{c.grade}</p>

                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Sĩ số: <strong className="text-slate-900">{c.studentCount} học sinh</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>Địa điểm: <strong className="text-slate-900">{c.room}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Lịch học: {c.scheduleDescription}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Giáo viên chủ nhiệm:</span>
                <span className="font-bold text-blue-600">{c.homeroomTeacherName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sports / Training Groups Tab */}
      {activeTab === 'SPORTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trainingGroups.map(g => (
            <div key={g.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono font-bold bg-amber-100 px-2.5 py-1 rounded-lg text-amber-800">
                    {g.sportCategory}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 mt-4">{g.name}</h3>
                <p className="text-xs text-slate-500">Mã đội: {g.code}</p>

                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Lực lượng: <strong className="text-slate-900">{g.studentCount} vận động viên</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>Sân tập: <strong className="text-slate-900">{g.venue}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Khung giờ: {g.scheduleDescription}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">HLV Phụ trách:</span>
                <span className="font-bold text-amber-600">{g.coachName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
