import React from 'react';
import { Student, AttendanceSessionDate, UserRole, RolePermissions } from '../types';
import { Check, X, Phone, MessageCircle, Search, CheckCircle2, DollarSign, AlertCircle, Calendar, Lock, Camera, UserCheck } from 'lucide-react';

interface MobileViewProps {
  dates: AttendanceSessionDate[];
  selectedDateId: string;
  setSelectedDateId: (id: string) => void;
  filteredStudents: Student[];
  attendance: Record<string, Record<string, boolean>>;
  toggleAttendance: (studentId: string, dateId: string) => void;
  markAllForDate: (dateId: string, isPresent: boolean) => void;
  getPresentCountForDate: (dateId: string) => number;
  getTotalPresentForStudent: (studentId: string) => number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterClass: string;
  setFilterClass: (cls: string) => void;
  totalStudentsCount: number;
  filterTuition: string;
  setFilterTuition: (t: string) => void;
  toggleTuitionStatus: (studentId: string) => void;
  paidCount: number;
  currentRole: UserRole;
  onEditStudentSchedule: (student: Student) => void;
  permissions: RolePermissions;
  onOpenShareZalo: (dateId: string, classFilter?: string) => void;
  onOpenCrossSearch: (initialTerm?: string) => void;
  availableRegistrationClasses?: string[];
}

export const MobileAttendanceView: React.FC<MobileViewProps> = ({
  dates, selectedDateId, setSelectedDateId, filteredStudents,
  attendance, toggleAttendance, markAllForDate, getPresentCountForDate,
  getTotalPresentForStudent, searchTerm, setSearchTerm, filterClass, setFilterClass,
  totalStudentsCount, filterTuition, setFilterTuition, toggleTuitionStatus, paidCount,
  currentRole, onEditStudentSchedule, permissions, onOpenShareZalo, onOpenCrossSearch,
  availableRegistrationClasses = []
}) => {
  const selectedDateObj = dates.find(d => d.id === selectedDateId) || dates[0];
  const presentTodayCount = getPresentCountForDate(selectedDateId);

  return (
    <div className="space-y-4">
      
      {/* Date Carousel (Chọn buổi tập) */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Chọn ngày điểm danh:</span>
          <span className="text-indigo-600 font-mono font-bold">
            {selectedDateObj.dayName} ({selectedDateObj.dateStr})
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scroll-smooth">
          {dates.map(d => {
            const count = getPresentCountForDate(d.id);
            const isSelected = selectedDateId === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDateId(d.id)}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300' 
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="text-xs font-black leading-tight">{d.dayName}</div>
                <div className={`text-[11px] font-mono leading-tight ${isSelected ? 'text-indigo-100 font-bold' : 'text-slate-500'}`}>
                  {d.dateStr}
                </div>
                <div className={`text-[10px] font-semibold mt-1 px-1.5 py-0.2 rounded-md inline-block ${
                  isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count} có mặt
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Session Summary & Quick Batch Buttons */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-500">
            Buổi tập: <strong className="text-slate-900 text-sm">{selectedDateObj.dayName} - {selectedDateObj.fullDate}</strong>
          </div>
          <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>Đi học: <strong className="text-emerald-600 text-sm">{presentTodayCount}</strong> / {totalStudentsCount} em</span>
            <span>•</span>
            <span>Nghỉ: <strong className="text-slate-500 text-sm">{totalStudentsCount - presentTodayCount}</strong> em</span>
          </div>
        </div>

        {/* Actions: Batch attendance & Share Zalo & Cross-class search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Share Zalo Button (Always available for GVCN, HLV, Admin) */}
          <button
            onClick={() => onOpenShareZalo(selectedDateId, filterClass)}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-[#0068FF] hover:bg-[#0052cc] active:scale-95 text-white text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            title="Chụp ảnh điểm danh và gửi lên Zalo"
          >
            <Camera className="w-4 h-4" /> Chụp & Gửi Zalo
          </button>

          {/* Cross Class Make-up Search Button */}
          <button
            onClick={() => onOpenCrossSearch(searchTerm)}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            title="Tìm kiếm võ sinh các lớp khác trong võ đường để điểm danh học bù"
          >
            <UserCheck className="w-4 h-4 text-indigo-200" /> Tìm Học Bù
          </button>

          {/* Batch buttons: Only if canTakeAttendance */}
          {permissions.canTakeAttendance ? (
            <>
              <button
                onClick={() => markAllForDate(selectedDateId, true)}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Tất Cả Có Mặt
              </button>
              <button
                onClick={() => markAllForDate(selectedDateId, false)}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Bỏ Chọn Hết
              </button>
            </>
          ) : (
            <div className="text-xs text-rose-700 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Điểm danh bị khóa</span>
            </div>
          )}
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className={`grid grid-cols-1 ${permissions.canViewTuition ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2`}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc SĐT..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white shadow-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 bg-slate-100 cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter by Registration Class */}
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="ALL">Tất cả ca đăng ký ({totalStudentsCount})</option>
          {availableRegistrationClasses && availableRegistrationClasses.length > 0 ? (
            availableRegistrationClasses.map(cls => (
              <option key={cls} value={cls}>Ca {cls}</option>
            ))
          ) : (
            <>
              <option value="ĐC 3, 6">Ca ĐC 3, 6</option>
              <option value="ĐC 6">Ca ĐC 6</option>
              <option value="ĐC 3">Ca ĐC 3</option>
              <option value="ĐC 2, 6">Ca ĐC 2, 6</option>
              <option value="TP 4, 7">Ca TP 4, 7</option>
              <option value="TP 7">Ca TP 7</option>
              <option value="TP 4">Ca TP 4</option>
              <option value="TP 5, 7">Ca TP 5, 7</option>
              <option value="TP 6, 7">Ca TP 6, 7</option>
            </>
          )}
        </select>

        {/* Filter by Tuition Status (Only if permitted) */}
        {permissions.canViewTuition && (
          <select
            value={filterTuition}
            onChange={(e) => setFilterTuition(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer animate-in fade-in duration-150"
          >
            <option value="ALL">Tất cả tình trạng học phí</option>
            <option value="UNPAID">Chưa đóng học phí ({totalStudentsCount - paidCount})</option>
            <option value="PAID">Đã đóng đủ ({paidCount})</option>
            <option value="PARTIAL">Còn nợ / Đóng một phần</option>
          </select>
        )}
      </div>

      {/* Student Cards List */}
      <div className="space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs space-y-3">
            <Search className="w-8 h-8 text-slate-400 mx-auto" />
            <div>
              <p className="font-extrabold text-sm text-slate-800">
                {searchTerm ? `Không tìm thấy võ sinh "${searchTerm}" trong lớp này` : 'Chưa có võ sinh nào trong lớp'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Võ sinh có thể thuộc lớp khác trong cùng võ đường sang học bù?
              </p>
            </div>
            <button
              onClick={() => onOpenCrossSearch(searchTerm)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <UserCheck className="w-4 h-4 text-indigo-200" />
              <span>{searchTerm ? `Tìm "${searchTerm}" trong toàn bộ võ đường` : 'Tìm võ sinh lớp khác để học bù'}</span>
            </button>
          </div>
        ) : (
          filteredStudents.map((s) => {
            const isPresent = !!attendance[s.id]?.[selectedDateId];
            const totalPresent = getTotalPresentForStudent(s.id);
            
            // Check if today matches student's registered schedule
            const isRegisteredToday = !s.registeredDays || s.registeredDays.length === 0 || 
              (selectedDateObj?.dayNumber ? s.registeredDays.includes(selectedDateObj.dayNumber) : true);

            return (
              <div 
                key={s.id}
                className={`bg-white rounded-2xl p-4 border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isPresent ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                    {s.stt}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                        {s.name}
                      </h3>

                      {/* Make-up Student Badge */}
                      {s.isMakeup && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          Học bù {s.originClassName ? `(${s.originClassName})` : ''}
                        </span>
                      )}

                      {/* Belt Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        s.belt.includes('Nâu') ? 'bg-amber-900 text-amber-100 border-amber-950 font-bold' :
                        s.belt.includes('Cam') ? 'bg-amber-500 text-white border-amber-600' :
                        s.belt.includes('Vàng') ? 'bg-yellow-400 text-slate-900 border-yellow-500' :
                        s.belt.includes('Xanh kyu 5') ? 'bg-blue-700 text-white border-blue-800' :
                        s.belt.includes('Xanh kyu 6') ? 'bg-emerald-600 text-white border-emerald-700' :
                        s.belt.includes('Xanh kyu 7') ? 'bg-sky-500 text-white border-sky-600' :
                        s.belt.includes('Xanh') ? 'bg-blue-600 text-white border-blue-700' :
                        'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {s.belt}
                      </span>

                    {/* Registration Class Badge */}
                    <button
                      type="button"
                      onClick={() => {
                        if (permissions.canEditSchedule) {
                          onEditStudentSchedule(s);
                        } else {
                          alert('Admin chưa cấp quyền xếp lịch tập học sinh cho vai trò này!');
                        }
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                        s.registrationClass === 'TC CN' || s.registrationClass === 'TC 2' ||
                        s.registrationClass.includes('ĐC 6') || (s.registrationClass.includes('ĐC 3') && !s.registrationClass.includes(',')) ||
                        s.registrationClass === 'TP 7' || s.registrationClass === 'TP 4'
                          ? 'bg-rose-700 text-white border-rose-800 font-black' 
                          : s.registrationClass.startsWith('TC')
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                      title={permissions.canEditSchedule ? "Bấm để đổi lịch tập võ sinh" : "Bạn không có quyền sửa lịch tập"}
                    >
                      <span>{s.registrationClass}</span>
                      {permissions.canEditSchedule && <Calendar className="w-2.5 h-2.5 opacity-75" />}
                    </button>
                  </div>

                  {/* Sub-info: Attendance count & Parent Phone */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                    <span>Đã đi: <strong className="text-indigo-600 font-bold">{totalPresent} buổi</strong></span>

                    {/* Parent Phone & 1-tap Actions */}
                    {s.parentPhone && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] text-slate-400">PH:</span>
                        <span className="text-xs font-mono font-bold text-slate-700">{s.parentPhone}</span>

                        {/* Click to Call */}
                        <a 
                          href={`tel:${s.parentPhone.replace(/\s+/g, '')}`}
                          className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center gap-0.5 transition-colors"
                          title="Gọi điện cho phụ huynh"
                        >
                          <Phone className="w-3 h-3" /> Gọi
                        </a>

                        {/* Click to Zalo */}
                        <a 
                          href={`https://zalo.me/${s.parentPhone.replace(/\s+/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center gap-0.5 transition-colors"
                          title="Nhắn tin Zalo phụ huynh"
                        >
                          <MessageCircle className="w-3 h-3" /> Zalo
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Big Touch Button for Roll Call (Gated by canTakeAttendance) */}
              <div className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex justify-end">
                {permissions.canTakeAttendance ? (
                  <button
                    onClick={() => toggleAttendance(s.id, selectedDateId)}
                    className={`w-full sm:w-36 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 ${
                      isPresent 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400 ring-offset-1' 
                        : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-300'
                    }`}
                  >
                    {isPresent ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-white" />
                        <span>ĐÃ ĐI HỌC</span>
                      </>
                    ) : (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-slate-400"></span>
                        <span>NGHỈ HỌC</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full sm:w-36 py-3 px-4 rounded-xl text-slate-400 bg-slate-100 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Khóa Điểm Danh</span>
                  </div>
                )}
              </div>

            </div>
          );
        })
      )}
      </div>

    </div>
  );
};
