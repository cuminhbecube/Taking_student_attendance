import React from 'react';
import { Student, AttendanceSessionDate, UserRole, RolePermissions } from '../types';
import { Check, Phone, Download, Calendar, Lock, Camera, UserCheck } from 'lucide-react';

interface SheetViewProps {
  students: Student[];
  dates: AttendanceSessionDate[];
  attendance: Record<string, Record<string, boolean>>;
  toggleAttendance: (studentId: string, dateId: string) => void;
  getPresentCountForDate: (dateId: string) => number;
  getTotalPresentForStudent: (studentId: string) => number;
  exportToCSV: () => void;
  toggleTuitionStatus: (studentId: string) => void;
  paidCount: number;
  currentRole: UserRole;
  onEditStudentSchedule: (student: Student) => void;
  permissions: RolePermissions;
  onOpenShareZalo: (dateId: string) => void;
  onOpenCrossSearch?: (initialTerm?: string) => void;
}

export const SheetAttendanceView: React.FC<SheetViewProps> = ({
  students, dates, attendance, toggleAttendance,
  getPresentCountForDate, getTotalPresentForStudent, exportToCSV,
  toggleTuitionStatus, paidCount, currentRole, onEditStudentSchedule,
  permissions, onOpenShareZalo, onOpenCrossSearch
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-md overflow-hidden">
      
      {/* Clean Top Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="font-extrabold text-slate-800 text-xs">
          Bảng điểm danh ({students.length} võ sinh)
        </div>

        {/* Action Buttons: Share Zalo & Cross Search & Export CSV */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onOpenShareZalo(dates[0]?.id || '')}
            className="px-3 py-1.5 rounded-lg bg-[#0068FF] hover:bg-[#0052cc] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
            title="Chụp ảnh điểm danh và gửi lên Zalo"
          >
            <Camera className="w-3.5 h-3.5" /> Chụp & Gửi Zalo
          </button>

          {onOpenCrossSearch && (
            <button
              onClick={onOpenCrossSearch}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
              title="Tìm kiếm chéo võ sinh các lớp khác trong võ đường để điểm danh học bù"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-200" /> Tìm Học Bù
            </button>
          )}

          {/* Export Button: Shown only if canExportData */}
          {permissions.canExportData ? (
            <button
              onClick={exportToCSV}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Xuất Excel
            </button>
          ) : (
            <div className="text-slate-400 text-xs italic flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Xuất Excel bị khóa
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Sheet Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse text-xs">
          
          {/* Header Row */}
          <thead>
            <tr className="bg-[#1e3a5f] text-white font-bold border-b border-slate-400 text-[11px]">
              <th className="py-2.5 px-2 border-r border-slate-400/40 w-10">STT</th>
              <th className="py-2.5 px-3 border-r border-slate-400/40 text-left min-w-[180px] sticky left-0 bg-[#1e3a5f] z-10">
                Họ và tên Võ sinh
              </th>
              <th className="py-2.5 px-2 border-r border-slate-400/40 min-w-[95px]">Cấp đai</th>
              <th className="py-2.5 px-2 border-r border-slate-400/40 min-w-[85px]">Ngày sinh</th>
              <th className="py-2.5 px-2 border-r border-slate-400/40 min-w-[110px]">Số điện thoại</th>
              <th className="py-2.5 px-2 border-r border-slate-400/40 min-w-[95px]">Lớp đăng ký</th>
              
              {/* Tuition Header: Rendered only if canViewTuition */}
              {permissions.canViewTuition && (
                <th className="py-2.5 px-2 border-r border-slate-400/40 min-w-[80px] bg-[#162a45]">
                  Học phí
                </th>
              )}

              <th className="py-2.5 px-2 border-r border-slate-400/40 min-w-[70px] bg-[#162a45]">
                Số buổi (x)
              </th>
              {dates.map(d => (
                <th key={d.id} className="py-1 px-2 border-r border-slate-400/40 min-w-[50px] bg-[#23436d]">
                  <div className="text-[10px] leading-tight">{d.dayName}</div>
                  <div className="font-mono text-[9px] text-slate-300">{d.dateStr}</div>
                </th>
              ))}
            </tr>

            {/* Total count row */}
            <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-700 text-xs">
              <td 
                colSpan={permissions.canViewTuition ? 7 : 6} 
                className="py-1.5 px-3 text-right pr-4 border-r border-slate-300 sticky left-0 bg-slate-100 z-10"
              >
                Tổng số võ sinh đi học:
              </td>
              <td className="py-1.5 px-2 border-r border-slate-300 bg-indigo-50 text-indigo-700 font-black">
                --
              </td>
              {dates.map(d => (
                <td key={d.id} className="py-1.5 px-1 border-r border-slate-300 text-slate-900 font-black text-xs">
                  {getPresentCountForDate(d.id)}
                </td>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200">
            {students.map((s, idx) => {
              const totalPresent = getTotalPresentForStudent(s.id);
              return (
                <tr key={s.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="py-2 px-1 border-r border-slate-200 font-mono text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 text-left font-bold text-slate-900 sticky left-0 bg-white z-10 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{s.name}</span>
                      {s.isMakeup && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          Học bù {s.originClassName ? `(${s.originClassName})` : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {/* Belt */}
                  <td className="py-2 px-2 border-r border-slate-200">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold block ${
                      s.belt.includes('Nâu') ? 'bg-amber-900 text-amber-100 font-bold' :
                      s.belt.includes('Cam') ? 'bg-amber-500 text-white font-bold' :
                      s.belt.includes('Vàng') ? 'bg-yellow-400 text-slate-900 font-bold' :
                      s.belt.includes('Xanh kyu 5') ? 'bg-blue-700 text-white font-bold' :
                      s.belt.includes('Xanh kyu 6') ? 'bg-emerald-600 text-white font-bold' :
                      s.belt.includes('Xanh kyu 7') ? 'bg-sky-500 text-white font-bold' :
                      s.belt.includes('Xanh') ? 'bg-blue-600 text-white font-bold' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {s.belt}
                    </span>
                  </td>

                  <td className="py-2 px-2 border-r border-slate-200 font-mono text-[11px] text-slate-600">
                    {s.dob || '-'}
                  </td>

                  {/* Phone with call link */}
                  <td className="py-2 px-2 border-r border-slate-200 font-mono text-xs text-slate-800">
                    {s.parentPhone ? (
                      <div className="flex items-center justify-center gap-1">
                        <span>{s.parentPhone}</span>
                        <a href={`tel:${s.parentPhone.replace(/\s+/g, '')}`} className="text-emerald-600 hover:text-emerald-700" title="Gọi">
                          <Phone className="w-3 h-3 inline" />
                        </a>
                      </div>
                    ) : '-'}
                  </td>

                  {/* Registration Class with click to edit */}
                  <td className="py-2 px-2 border-r border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        if (permissions.canEditSchedule) {
                          onEditStudentSchedule(s);
                        } else {
                          alert('Admin chưa cấp quyền xếp lịch tập cho vai trò này!');
                        }
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-transform active:scale-90 ${
                        s.registrationClass === 'TC CN' || s.registrationClass === 'TC 2' ||
                        s.registrationClass.includes('ĐC 6') || (s.registrationClass.includes('ĐC 3') && !s.registrationClass.includes(',')) ||
                        s.registrationClass === 'TP 7' || s.registrationClass === 'TP 4'
                          ? 'bg-rose-700 text-white font-black' 
                          : s.registrationClass.startsWith('TC')
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                      title={permissions.canEditSchedule ? "Bấm để đổi lịch tập võ sinh" : "Khóa quyền sửa lịch"}
                    >
                      <span>{s.registrationClass}</span>
                      {permissions.canEditSchedule && <Calendar className="w-2.5 h-2.5 opacity-70" />}
                    </button>
                  </td>

                  {/* Tuition Status Column */}
                  {permissions.canViewTuition && (
                    <td className="py-1.5 px-1 border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          if (permissions.canEditTuition) {
                            toggleTuitionStatus(s.id);
                          } else {
                            alert('Admin chỉ cho phép bạn xem học phí, không được quyền cập nhật!');
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-transform active:scale-90 cursor-pointer ${
                          s.tuitionStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                          s.tuitionStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          'bg-rose-50 text-rose-700 border-rose-300'
                        }`}
                        title={permissions.canEditTuition ? "Bấm để đổi trạng thái học phí" : "Chỉ xem học phí"}
                      >
                        {s.tuitionStatus === 'PAID' ? 'Đã nộp' :
                         s.tuitionStatus === 'PARTIAL' ? 'Nợ 50%' : 'Chưa nộp'}
                      </button>
                    </td>
                  )}

                  {/* Total Present Count Column */}
                  <td className="py-2 px-2 border-r border-slate-200 font-black text-slate-900 bg-slate-50 text-sm">
                    {totalPresent}
                  </td>

                  {/* Date Columns Checkboxes (Gated by canTakeAttendance) */}
                  {dates.map(d => {
                    const isChecked = !!attendance[s.id]?.[d.id];
                    return (
                      <td 
                        key={d.id} 
                        onClick={() => {
                          if (permissions.canTakeAttendance) {
                            toggleAttendance(s.id, d.id);
                          } else {
                            alert('Admin đã khóa quyền điểm danh của bạn!');
                          }
                        }}
                        className={`py-1.5 px-1 border-r border-slate-200 transition-colors select-none ${
                          permissions.canTakeAttendance ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'
                        } ${
                          isChecked ? 'bg-indigo-50/80 font-bold text-indigo-700' : 'hover:bg-slate-100'
                        }`}
                      >
                        <div className={`w-5 h-5 mx-auto rounded border flex items-center justify-center transition-all ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

        </table>
      </div>

    </div>
  );
};
