import React, { useState, useEffect } from 'react';
import { X, Calendar, School, Copy, Clock, Check, GraduationCap, Shield } from 'lucide-react';
import { Student, UserRole } from '../types';

export const DAYS_OF_WEEK = [
  { day: 2, label: 'Thứ 2', short: 'T2' },
  { day: 3, label: 'Thứ 3', short: 'T3' },
  { day: 4, label: 'Thứ 4', short: 'T4' },
  { day: 5, label: 'Thứ 5', short: 'T5' },
  { day: 6, label: 'Thứ 6', short: 'T6' },
  { day: 7, label: 'Thứ 7', short: 'T7' },
  { day: 8, label: 'Chủ Nhật', short: 'CN' }
];

export const formatScheduleDays = (days: number[], startTime?: string, endTime?: string): string => {
  if (!days || days.length === 0) return 'Chưa chọn ngày tập';
  const sorted = [...days].sort((a, b) => a - b);
  const labels = sorted.map(d => d === 8 ? 'Chủ Nhật' : `Thứ ${d}`);
  let dayStr = '';
  if (labels.length === 1) {
    dayStr = `Chỉ ${labels[0]}`;
  } else if (labels.length === 2) {
    dayStr = `${labels[0]} & ${labels[1]}`;
  } else {
    dayStr = sorted.map(d => d === 8 ? 'CN' : `T${d}`).join(', ');
  }

  if (startTime && endTime) {
    return `${dayStr} (${startTime} - ${endTime})`;
  }
  return dayStr;
};

export const formatRegistrationClassCode = (prefix: string, days: number[]): string => {
  if (!days || days.length === 0) return prefix;
  const sorted = [...days].sort((a, b) => a - b);
  const dayNums = sorted.map(d => d === 8 ? 'CN' : `${d}`).join(', ');
  return `${prefix} ${dayNums}`.trim();
};

/* =========================================================================
   1. MODAL: THÊM VÕ SINH MỚI VÀO LỚP
   ========================================================================= */
interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, belt: string, dob: string, phone: string, cls: string, registeredDays: number[]) => void;
  classPrefix?: string;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen, onClose, onAdd, classPrefix = 'TP'
}) => {
  const [name, setName] = useState('');
  const [belt, setBelt] = useState('Trắng kyu 10');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([4, 7]);
  const [customCls, setCustomCls] = useState('TP 4, 7');

  useEffect(() => {
    setCustomCls(formatRegistrationClassCode(classPrefix, selectedDays));
  }, [selectedDays, classPrefix]);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    setSelectedDays(prev => {
      const next = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      return next.sort((a, b) => a - b);
    });
  };

  const setPresetDays = (days: number[]) => {
    setSelectedDays(days);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), belt, dob.trim(), phone.trim(), customCls.trim(), selectedDays);
    setName('');
    setDob('');
    setPhone('');
    setSelectedDays([4, 7]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="font-extrabold text-base text-slate-900">Thêm Võ Sinh Mới Vào Lớp</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Họ và tên võ sinh:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Hoàng Minh Trí"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Cấp đai:</label>
              <select
                value={belt}
                onChange={(e) => setBelt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium text-xs bg-white cursor-pointer"
              >
                <option value="Trắng kyu 10">Trắng kyu 10</option>
                <option value="Cam kyu 8">Cam kyu 8</option>
                <option value="Vàng kyu 9">Vàng kyu 9</option>
                <option value="Xanh kyu 7">Xanh kyu 7</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã ca hiển thị:</label>
              <input
                type="text"
                value={customCls}
                onChange={(e) => setCustomCls(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-indigo-700 text-xs font-mono"
              />
            </div>
          </div>

          {/* Day Checkboxes */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <label className="font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
              <span>Chọn các ngày tập đăng ký:</span>
              <span className="text-[11px] text-indigo-600 font-medium">{selectedDays.length} ngày/tuần</span>
            </label>

            <div className="grid grid-cols-7 gap-1.5 my-2">
              {DAYS_OF_WEEK.map(d => {
                const isChecked = selectedDays.includes(d.day);
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => toggleDay(d.day)}
                    className={`py-2 rounded-xl font-bold text-center text-xs transition-all cursor-pointer border ${
                      isChecked 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>{d.short}</div>
                  </button>
                );
              })}
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-200">
              <span className="text-[10px] text-slate-400 self-center mr-1">Mẫu nhanh:</span>
              <button
                type="button"
                onClick={() => setPresetDays([4, 7])}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 text-[10px] font-semibold cursor-pointer"
              >
                T4 & T7 (Chuẩn)
              </button>
              <button
                type="button"
                onClick={() => setPresetDays([7])}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 text-[10px] font-semibold cursor-pointer"
              >
                Chỉ T7
              </button>
              <button
                type="button"
                onClick={() => setPresetDays([4])}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 text-[10px] font-semibold cursor-pointer"
              >
                Chỉ T4
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Ngày sinh:</label>
              <input
                type="text"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                placeholder="Ví dụ: 15/04/2018"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">SĐT Phụ huynh:</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0988 123 456"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer shadow-xs"
            >
              Lưu Võ Sinh
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   2. MODAL: ĐỔI LỊCH TẬP VÕ SINH (DÀNH CHO GIÁO VIÊN & ADMIN)
   ========================================================================= */
interface EditStudentScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSave: (studentId: string, registeredDays: number[], registrationClass: string) => void;
  classPrefix?: string;
  currentRole: UserRole;
}

export const EditStudentScheduleModal: React.FC<EditStudentScheduleModalProps> = ({
  isOpen, onClose, student, onSave, classPrefix = 'TP', currentRole
}) => {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [customCls, setCustomCls] = useState('');

  useEffect(() => {
    if (student) {
      const initDays = student.registeredDays && student.registeredDays.length > 0 
        ? student.registeredDays 
        : [4, 7];
      setSelectedDays(initDays);
      setCustomCls(student.registrationClass || formatRegistrationClassCode(classPrefix, initDays));
    }
  }, [student, classPrefix]);

  if (!isOpen || !student) return null;

  const toggleDay = (day: number) => {
    setSelectedDays(prev => {
      const next = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      const sorted = next.sort((a, b) => a - b);
      setCustomCls(formatRegistrationClassCode(classPrefix, sorted));
      return sorted;
    });
  };

  const setPreset = (days: number[]) => {
    setSelectedDays(days);
    setCustomCls(formatRegistrationClassCode(classPrefix, days));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDays.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ngày tập trong tuần cho võ sinh!');
      return;
    }
    onSave(student.id, selectedDays, customCls.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header with Role Badge */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                Xếp Lịch Tập Cho Võ Sinh
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {currentRole === 'ADMIN' ? (
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded-md flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" /> Quyền Admin
                  </span>
                ) : (
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-md flex items-center gap-1">
                    <GraduationCap className="w-2.5 h-2.5" /> Giáo Viên Phụ Trách
                  </span>
                )}
                <span className="text-[10px] text-slate-400">được phép chọn</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Info Bar */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 mb-4 flex items-center justify-between">
          <div>
            <div className="font-extrabold text-sm text-slate-900">{student.name}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span>{student.belt}</span>
              <span>•</span>
              <span>Hiện tại: <strong className="text-indigo-600">{student.registrationClass}</strong></span>
            </div>
          </div>
          <div className="text-right font-mono text-xs text-slate-400">
            #{student.stt}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Day Checkboxes (T2 -> CN) */}
          <div>
            <label className="font-bold text-slate-700 block mb-2 flex items-center justify-between">
              <span>Chọn các ngày tập trong tuần (Check box):</span>
              <span className="text-indigo-600 font-bold">{selectedDays.length} buổi/tuần</span>
            </label>

            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_OF_WEEK.map(d => {
                const isChecked = selectedDays.includes(d.day);
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => toggleDay(d.day)}
                    className={`py-2.5 rounded-xl font-extrabold text-center text-xs transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                      isChecked 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-300' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{d.short}</span>
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 block mb-1.5">Chọn mẫu lịch tập nhanh:</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPreset([4, 7])}
                className={`px-2 py-2 rounded-xl text-left border text-[11px] font-bold cursor-pointer transition-all ${
                  JSON.stringify(selectedDays) === JSON.stringify([4, 7])
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                T4 & T7 (Chuẩn)
              </button>
              <button
                type="button"
                onClick={() => setPreset([7])}
                className={`px-2 py-2 rounded-xl text-left border text-[11px] font-bold cursor-pointer transition-all ${
                  JSON.stringify(selectedDays) === JSON.stringify([7])
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                Chỉ Thứ 7
              </button>
              <button
                type="button"
                onClick={() => setPreset([4])}
                className={`px-2 py-2 rounded-xl text-left border text-[11px] font-bold cursor-pointer transition-all ${
                  JSON.stringify(selectedDays) === JSON.stringify([4])
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                Chỉ Thứ 4
              </button>
              <button
                type="button"
                onClick={() => setPreset([5, 7])}
                className={`px-2 py-2 rounded-xl text-left border text-[11px] font-bold cursor-pointer transition-all ${
                  JSON.stringify(selectedDays) === JSON.stringify([5, 7])
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                Thứ 5 & Thứ 7
              </button>
              <button
                type="button"
                onClick={() => setPreset([6, 7])}
                className={`px-2 py-2 rounded-xl text-left border text-[11px] font-bold cursor-pointer transition-all ${
                  JSON.stringify(selectedDays) === JSON.stringify([6, 7])
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                Thứ 6 & Thứ 7
              </button>
              <button
                type="button"
                onClick={() => setPreset([3, 5])}
                className={`px-2 py-2 rounded-xl text-left border text-[11px] font-bold cursor-pointer transition-all ${
                  JSON.stringify(selectedDays) === JSON.stringify([3, 5])
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                Thứ 3 & Thứ 5
              </button>
            </div>
          </div>

          {/* Registration Code & Summary */}
          <div className="bg-indigo-50/60 rounded-2xl p-3 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">Mã ca đăng ký:</label>
              <input
                type="text"
                value={customCls}
                onChange={(e) => setCustomCls(e.target.value)}
                placeholder="TP 4, 7"
                className="w-32 px-2.5 py-1 rounded-lg border border-indigo-300 font-black text-indigo-900 bg-white text-center text-xs font-mono"
              />
            </div>
            <div className="text-[11px] text-indigo-800">
              Tóm tắt lịch: <strong>{formatScheduleDays(selectedDays)}</strong>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs"
            >
              Cập Nhật Lịch Tập
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

/* =========================================================================
   3. MODAL: THÊM CỘT NGÀY TẬP MỚI
   ========================================================================= */
interface AddDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (dayName: string, dateStr: string, dayNumber: number) => void;
}

export const AddDateModal: React.FC<AddDateModalProps> = ({
  isOpen, onClose, onAdd
}) => {
  const [dayNumber, setDayNumber] = useState(7);
  const [dateStr, setDateStr] = useState('');

  if (!isOpen) return null;

  const dayObj = DAYS_OF_WEEK.find(d => d.day === dayNumber) || DAYS_OF_WEEK[5];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateStr.trim()) return;
    onAdd(dayObj.label, dateStr.trim(), dayNumber);
    setDateStr('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="font-extrabold text-base text-slate-900">Thêm Ngày Tập Mới</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Thứ trong tuần:</label>
            <select
              value={dayNumber}
              onChange={(e) => setDayNumber(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium bg-white cursor-pointer"
            >
              {DAYS_OF_WEEK.map(d => (
                <option key={d.day} value={d.day}>{d.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Ngày (dd/mm):</label>
            <input
              type="text"
              required
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              placeholder="Ví dụ: 03/10"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium font-mono"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer shadow-xs"
            >
              Thêm Cột Ngày
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   4. MODAL: THÊM LỚP HỌC / CƠ SỞ MỚI VỚI CHỌN CHECKBOX LỊCH TẬP
   ========================================================================= */
interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, activeDays: number[], startTime: string, endTime: string, schedule: string, venue: string) => void;
}

export const AddClassModal: React.FC<AddClassModalProps> = ({
  isOpen, onClose, onAdd
}) => {
  const [name, setName] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([3, 5]);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:30');
  const [venue, setVenue] = useState('');

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    setSelectedDays(prev => {
      const next = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      return next.sort((a, b) => a - b);
    });
  };

  const setPreset = (days: number[]) => {
    setSelectedDays(days);
  };

  const computedSchedule = formatScheduleDays(selectedDays, startTime, endTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (selectedDays.length === 0) {
      alert('Vui lòng chọn ít nhất một ngày tập trong tuần cho cơ sở mới!');
      return;
    }
    onAdd(name.trim(), selectedDays, startTime, endTime, computedSchedule, venue.trim());
    setName('');
    setVenue('');
    setSelectedDays([3, 5]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
            <School className="w-5 h-5 text-indigo-600" />
            <span>Thêm Cơ Sở / Lớp Học Mới</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên cơ sở / lớp học:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Lớp Cầu Giấy"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Day Checkboxes (Thứ 2 - Chủ Nhật) */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <label className="font-bold text-slate-800 block mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Lịch tập (Chọn check box các thứ):</span>
              </span>
              <span className="text-[11px] text-indigo-600 font-bold">{selectedDays.length} buổi/tuần</span>
            </label>

            <div className="grid grid-cols-7 gap-1.5 my-2">
              {DAYS_OF_WEEK.map(d => {
                const isChecked = selectedDays.includes(d.day);
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => toggleDay(d.day)}
                    className={`py-2 rounded-xl font-bold text-center text-xs transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                      isChecked 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{d.short}</span>
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-200">
              <span className="text-[10px] text-slate-400 self-center mr-1">Mẫu nhanh:</span>
              <button
                type="button"
                onClick={() => setPreset([3, 5])}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 text-[10px] font-semibold cursor-pointer"
              >
                T3 & T5
              </button>
              <button
                type="button"
                onClick={() => setPreset([4, 7])}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 text-[10px] font-semibold cursor-pointer"
              >
                T4 & T7
              </button>
              <button
                type="button"
                onClick={() => setPreset([2, 4, 6])}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 text-[10px] font-semibold cursor-pointer"
              >
                T2, T4, T6
              </button>
              <button
                type="button"
                onClick={() => setPreset([7, 8])}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 text-[10px] font-semibold cursor-pointer"
              >
                T7 & CN
              </button>
            </div>
          </div>

          {/* Time Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Giờ bắt đầu:</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Giờ kết thúc:</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white"
              />
            </div>
          </div>

          {/* Generated Schedule Preview */}
          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-900">
            <strong>Lịch hiển thị:</strong> {computedSchedule}
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Địa điểm / Sân tập:</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Ví dụ: Nhà thi đấu Cầu Giấy, số 35 Trần Quý Kiên"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs"
            >
              Tạo Lớp Học
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   5. MODAL: TẠO BẢNG ĐIỂM DANH THÁNG MỚI (ROLLOVER)
   ========================================================================= */
interface RolloverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRollover: (monthName: string) => void;
  currentMonth: string;
  studentCount: number;
}

export const RolloverMonthModal: React.FC<RolloverModalProps> = ({
  isOpen, onClose, onRollover, currentMonth, studentCount
}) => {
  const [newMonthName, setNewMonthName] = useState('Tháng 10/2026');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonthName.trim()) return;
    onRollover(newMonthName.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
            <Copy className="w-5 h-5 text-indigo-600" />
            <span>Tạo Bảng Điểm Danh Tháng Mới</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Hệ thống sẽ <strong>tự động sao chép toàn bộ {studentCount} võ sinh</strong> từ <em>{currentMonth}</em> sang tháng mới, giữ nguyên lịch tập đăng ký và làm mới lại bảng điểm danh.
          </p>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên bảng tháng mới:</label>
            <input
              type="text"
              required
              value={newMonthName}
              onChange={(e) => setNewMonthName(e.target.value)}
              placeholder="Ví dụ: Tháng 10/2026"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs"
            >
              Xác Nhận Tạo Tháng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   6. MODAL: SỬA THÔNG TIN VÕ SINH
   ========================================================================= */
interface EditStudentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSave: (studentId: string, name: string, belt: string, dob: string, phone: string) => void;
}

export const EditStudentInfoModal: React.FC<EditStudentInfoModalProps> = ({
  isOpen, onClose, student, onSave
}) => {
  const [name, setName] = useState('');
  const [belt, setBelt] = useState('Trắng kyu 10');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (student) {
      setName(student.name);
      setBelt(student.belt);
      setDob(student.dob || '');
      setPhone(student.parentPhone || '');
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(student.id, name.trim(), belt, dob.trim(), phone.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="font-extrabold text-base text-slate-900">
            Sửa Thông Tin Võ Sinh
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Họ và tên võ sinh:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Cấp đai:</label>
            <select
              value={belt}
              onChange={(e) => setBelt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium bg-white cursor-pointer"
            >
              <option value="Trắng kyu 10">Trắng kyu 10</option>
              <option value="Cam kyu 8">Cam kyu 8</option>
              <option value="Vàng kyu 9">Vàng kyu 9</option>
              <option value="Xanh kyu 7">Xanh kyu 7</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Ngày sinh:</label>
              <input
                type="text"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                placeholder="15/04/2018"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">SĐT Phụ huynh:</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0988 123 456"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium font-mono"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer shadow-xs"
            >
              Lưu Thông Tin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
