import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceSessionDate } from '../types';
import { 
  generateAttendanceImage, 
  generateZaloTextMessage, 
  GeneratedAttendanceReport 
} from '../utils/attendanceImageGenerator';
import { 
  X, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Camera, 
  Calendar, 
  Users, 
  Filter,
  FileText
} from 'lucide-react';

interface ShareAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  dojoName: string;
  className: string;
  dates: AttendanceSessionDate[];
  currentDateId: string;
  students: Student[];
  attendance: Record<string, Record<string, boolean>>; // studentId -> { dateId: boolean }
  initialClassFilter?: string;
}

export const ShareAttendanceModal: React.FC<ShareAttendanceModalProps> = ({
  isOpen,
  onClose,
  dojoName,
  className,
  dates,
  currentDateId,
  students,
  attendance,
  initialClassFilter = 'ALL'
}) => {
  const [selectedDateId, setSelectedDateId] = useState<string>(currentDateId);
  const [selectedClassGroup, setSelectedClassGroup] = useState<string>(initialClassFilter);
  const [report, setReport] = useState<GeneratedAttendanceReport | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'IMAGE' | 'TEXT'>('IMAGE');

  // Sync with prop when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedDateId(currentDateId);
      setSelectedClassGroup(initialClassFilter || 'ALL');
    }
  }, [isOpen, currentDateId, initialClassFilter]);

  // Extract all distinct registration class groups in this student list
  const classGroups = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.registrationClass) {
        set.add(s.registrationClass);
      }
    });
    return Array.from(set);
  }, [students]);

  // Filter students based on selected class group
  const displayStudents = useMemo(() => {
    if (selectedClassGroup === 'ALL') {
      return students;
    }
    return students.filter((s) => s.registrationClass === selectedClassGroup);
  }, [students, selectedClassGroup]);

  // Selected date object
  const selectedDateObj = useMemo(() => {
    return dates.find(d => d.id === selectedDateId) || dates[0] || {
      id: 'd1',
      dayName: 'Hôm nay',
      dateStr: '11/09',
      fullDate: '11/09/2026'
    };
  }, [dates, selectedDateId]);

  // Class title on the report
  const effectiveClassName = useMemo(() => {
    if (selectedClassGroup !== 'ALL') {
      return `${className} (${selectedClassGroup})`;
    }
    return className;
  }, [className, selectedClassGroup]);

  // Build accurate attendance mapping: studentId -> boolean for the selected date
  const attendanceMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    displayStudents.forEach((s) => {
      // NOTE: attendance is keyed as attendance[studentId][dateId]!
      map[s.id] = !!attendance[s.id]?.[selectedDateId];
    });
    return map;
  }, [displayStudents, attendance, selectedDateId]);

  // Re-generate image whenever selected date, class group, or attendance changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    generateAttendanceImage({
      dojoName,
      className: effectiveClassName,
      dayName: selectedDateObj.dayName,
      dateStr: selectedDateObj.dateStr,
      fullDate: selectedDateObj.fullDate,
      students: displayStudents,
      attendanceMap
    })
      .then((res) => {
        if (isMounted) {
          setReport(res);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Error generating attendance image:', err);
        if (isMounted) {
          setIsGenerating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedDateId, selectedClassGroup, attendanceMap, displayStudents, dojoName, effectiveClassName, selectedDateObj]);

  if (!isOpen) return null;

  const zaloText = generateZaloTextMessage({
    dojoName,
    className: effectiveClassName,
    dayName: selectedDateObj.dayName,
    dateStr: selectedDateObj.dateStr,
    fullDate: selectedDateObj.fullDate,
    students: displayStudents,
    attendanceMap
  });

  // Action: Download Image
  const handleDownload = () => {
    if (!report) return;
    const a = document.createElement('a');
    a.href = report.dataUrl;
    a.download = report.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setShareSuccess('Đã tải ảnh về máy thành công!');
    setTimeout(() => setShareSuccess(null), 3000);
  };

  // Action: Copy Image to Clipboard
  const handleCopyImage = async () => {
    if (!report) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': report.blob })
        ]);
        setCopiedImage(true);
        setShareSuccess('Đã sao chép ảnh vào bộ nhớ tạm! Bạn chỉ cần sang Zalo và bấm Dán (Paste).');
        setTimeout(() => {
          setCopiedImage(false);
          setShareSuccess(null);
        }, 4000);
      } else {
        // Fallback to download if ClipboardItem not supported
        handleDownload();
      }
    } catch (err) {
      console.warn('Clipboard write failed, fallback to download:', err);
      handleDownload();
    }
  };

  // Action: Copy Zalo Text Message
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(zaloText);
      setCopiedText(true);
      setShareSuccess('Đã sao chép tin nhắn Zalo kèm icon!');
      setTimeout(() => {
        setCopiedText(false);
        setShareSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Copy text failed:', err);
    }
  };

  // Action: Share via Web Share API or open Zalo
  const handleShareZalo = async () => {
    if (!report) return;

    try {
      const file = new File([report.blob], report.fileName, { type: 'image/png' });

      // Check Web Share API with files support
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Điểm danh ${effectiveClassName} - ${selectedDateObj.dayName} (${selectedDateObj.dateStr})`,
          text: `Báo cáo điểm danh võ sinh ${effectiveClassName} - ${selectedDateObj.dayName}, ngày ${selectedDateObj.fullDate || selectedDateObj.dateStr}.`
        });
        setShareSuccess('Đã mở menu chia sẻ thành công!');
        setTimeout(() => setShareSuccess(null), 3000);
        return;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Web Share failed, falling back:', err);
      } else {
        return; // User cancelled share sheet
      }
    }

    // Fallback: Copy image, download, and prompt to open Zalo
    await handleCopyImage();
    window.open('https://chat.zalo.me', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0068FF] to-[#0052cc] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight flex items-center gap-2">
                Chụp & Chia Sẻ Zalo
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 font-black uppercase tracking-wider">
                  Chuẩn xác
                </span>
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Báo cáo khớp 100% với điểm danh thực tế • Tối giản, không lộ thông tin riêng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Bar: Date & Class Group Picker */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            
            {/* 1. Date Selector */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={selectedDateId}
                onChange={(e) => setSelectedDateId(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-[#0068FF] cursor-pointer shadow-2xs"
              >
                {dates.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.dayName} ({d.dateStr})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Class Group Selector (if multiple groups exist) */}
            {classGroups.length > 1 && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  value={selectedClassGroup}
                  onChange={(e) => setSelectedClassGroup(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-[#0068FF] cursor-pointer shadow-2xs"
                >
                  <option value="ALL">Tất cả võ sinh ({students.length})</option>
                  {classGroups.map((grp) => {
                    const count = students.filter(s => s.registrationClass === grp).length;
                    return (
                      <option key={grp} value={grp}>
                        Nhóm {grp} ({count} em)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

          </div>

          {/* Tab Switcher: Ảnh Báo Cáo vs Tin Nhắn Text */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold self-start sm:self-auto shrink-0">
            <button
              onClick={() => setActiveTab('IMAGE')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'IMAGE' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-[#0068FF]" /> Ảnh Báo Cáo
            </button>
            <button
              onClick={() => setActiveTab('TEXT')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'TEXT' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" /> Tin Nhắn Chat
            </button>
          </div>
        </div>

        {/* Status Toast Alert */}
        {shareSuccess && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shareSuccess}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          
          {activeTab === 'IMAGE' ? (
            <div className="space-y-3">
              {/* Accurate Real-time Summary Badges */}
              {report && (
                <div className="flex items-center justify-between text-xs px-3 py-1.5 bg-blue-50/80 rounded-xl border border-blue-200 text-slate-800 font-semibold">
                  <span>Sĩ số: <strong className="text-slate-900">{report.totalCount} võ sinh</strong></span>
                  <span className="text-emerald-700 font-extrabold bg-emerald-100 px-2 py-0.5 rounded-md">
                    ✓ Đi học: {report.presentCount}
                  </span>
                  <span className="text-rose-700 font-extrabold bg-rose-100 px-2 py-0.5 rounded-md">
                    ✗ Nghỉ: {report.absentCount}
                  </span>
                </div>
              )}

              {/* Image Preview Container */}
              <div className="relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-100/70 p-2 flex items-center justify-center min-h-[260px] max-h-[420px] overflow-auto">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-slate-500 text-xs font-semibold">
                    <div className="w-8 h-8 border-3 border-[#0068FF] border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang tạo ảnh điểm danh thực tế...</span>
                  </div>
                ) : report ? (
                  <img
                    src={report.dataUrl}
                    alt="Báo cáo điểm danh"
                    className="max-w-full h-auto rounded-xl shadow-md border border-slate-200 object-contain mx-auto"
                  />
                ) : (
                  <div className="text-slate-400 text-xs py-10">Không thể tạo ảnh điểm danh</div>
                )}
              </div>
            </div>
          ) : (
            /* Zalo Text Message Preview Tab */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Nội dung tin nhắn mẫu gửi nhóm Zalo:</span>
                <button
                  onClick={handleCopyText}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedText ? 'Đã copy' : 'Copy văn bản'}
                </button>
              </div>
              <textarea
                readOnly
                value={zaloText}
                rows={10}
                className="w-full p-3 rounded-2xl border border-slate-300 text-xs font-mono bg-slate-50 text-slate-800 leading-relaxed focus:outline-none select-all"
              />
            </div>
          )}

        </div>

        {/* Modal Footer Actions (Mobile Thumb Friendly) */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2 shrink-0">
          
          {/* Primary Action Button: Gửi qua Zalo */}
          <button
            onClick={handleShareZalo}
            disabled={isGenerating || !report}
            className="w-full py-3 px-4 rounded-2xl bg-[#0068FF] hover:bg-[#0052cc] active:scale-[0.98] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            <span>Gửi Qua Zalo / Ứng Dụng</span>
          </button>

          {/* Secondary Action Row: Tải ảnh & Sao chép ảnh */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownload}
              disabled={isGenerating || !report}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Ảnh Về Máy</span>
            </button>

            <button
              onClick={handleCopyImage}
              disabled={isGenerating || !report}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copiedImage ? 'Đã Copy Ảnh' : 'Sao Chép Ảnh'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
