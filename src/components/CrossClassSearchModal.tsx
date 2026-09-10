import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceSessionDate } from '../types';
import { 
  X, 
  Search, 
  UserCheck, 
  Building2, 
  Check, 
  Phone, 
  Filter, 
  ArrowRight,
  School,
  Sparkles,
  User,
  Users
} from 'lucide-react';
import { 
  matchStudentSearch, 
  normalizeVietnamese, 
  extractNameSuggestions,
  StudentMatchResult
} from '../utils/vietnameseSearch';

export interface DojoCrossStudent extends Student {
  originClassName: string;
  originClassId: string;
}

interface CrossClassSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearchTerm?: string;
  dojoName: string;
  currentClassId: string;
  currentClassName: string;
  selectedDateObj: AttendanceSessionDate;
  studentsFromOtherClasses: DojoCrossStudent[];
  currentClassStudentIds: Set<string>;
  onSelectMakeupStudent: (student: Student, originClassName: string) => void;
}

export const CrossClassSearchModal: React.FC<CrossClassSearchModalProps> = ({
  isOpen,
  onClose,
  initialSearchTerm = '',
  dojoName,
  currentClassId,
  currentClassName,
  selectedDateObj,
  studentsFromOtherClasses,
  currentClassStudentIds,
  onSelectMakeupStudent
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [filterClassId, setFilterClassId] = useState('ALL');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Synchronize initialSearchTerm when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm(initialSearchTerm || '');
      setAddedIds(new Set());
    }
  }, [isOpen, initialSearchTerm]);

  // Distinct other classes
  const otherClasses = useMemo(() => {
    const map = new Map<string, string>();
    studentsFromOtherClasses.forEach(s => {
      if (s.originClassId && s.originClassName) {
        map.set(s.originClassId, s.originClassName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [studentsFromOtherClasses]);

  // Extract common Given Names and Surnames across other classes for quick suggestion chips
  const nameSuggestions = useMemo(() => {
    return extractNameSuggestions(studentsFromOtherClasses);
  }, [studentsFromOtherClasses]);

  // Filter suggestion chips based on what user has typed so far
  const visibleSuggestions = useMemo(() => {
    const qNorm = normalizeVietnamese(searchTerm);
    
    // Filter given names (Tên Cuối)
    let matchedGiven = nameSuggestions.givenNames;
    if (qNorm) {
      matchedGiven = matchedGiven.filter(g => {
        const gNorm = normalizeVietnamese(g.name);
        return gNorm.startsWith(qNorm) || qNorm.startsWith(gNorm) || gNorm.includes(qNorm);
      });
    }

    // Filter surnames (Họ)
    let matchedSurnames = nameSuggestions.surnames;
    if (qNorm) {
      matchedSurnames = matchedSurnames.filter(s => {
        const sNorm = normalizeVietnamese(s.name);
        return sNorm.startsWith(qNorm) || qNorm.startsWith(sNorm) || sNorm.includes(qNorm);
      });
    }

    return {
      givenNames: matchedGiven.slice(0, 8),
      surnames: matchedSurnames.slice(0, 6),
      hasSuggestions: matchedGiven.length > 0 || matchedSurnames.length > 0
    };
  }, [nameSuggestions, searchTerm]);

  // Filtered & Ranked results
  const filteredStudents = useMemo(() => {
    const results: { student: DojoCrossStudent; match: StudentMatchResult }[] = [];

    for (const s of studentsFromOtherClasses) {
      // Class filter
      if (filterClassId !== 'ALL' && s.originClassId !== filterClassId) {
        continue;
      }

      // Name & Phone matching with ranking
      const match = matchStudentSearch(s, searchTerm);
      if (match.matched) {
        results.push({ student: s, match });
      }
    }

    // Sort: highest score first, then alphabetically by student name
    results.sort((a, b) => {
      if (b.match.score !== a.match.score) {
        return b.match.score - a.match.score;
      }
      return a.student.name.localeCompare(b.student.name, 'vi');
    });

    return results;
  }, [studentsFromOtherClasses, searchTerm, filterClassId]);

  if (!isOpen) return null;

  const handleAdd = (student: Student, originClassName: string) => {
    onSelectMakeupStudent(student, originClassName);
    setAddedIds(prev => new Set(prev).add(student.id));
  };

  const handleSelectSuggestion = (name: string) => {
    setSearchTerm(name);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-700 to-purple-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-inner">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight flex items-center gap-2">
                Tìm Học Sinh Học Bù
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black uppercase tracking-wider">
                  Toàn Võ Đường
                </span>
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                {dojoName} • Điểm danh buổi: <strong>{selectedDateObj.dayName} ({selectedDateObj.dateStr})</strong>
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

        {/* Search & Filter Bar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5 shrink-0">
          
          {/* Main Search Input */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-indigo-500 absolute left-3.5" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Chỉ cần gõ tên cuối (An, Kiệt, Tuấn) hoặc họ (Nguyễn, Trần)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-indigo-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white shadow-2xs text-slate-800 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 bg-slate-100 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Suggestion Chips (Tên Cuối / Họ) */}
          {visibleSuggestions.hasSuggestions && (
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-indigo-950 flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                  Gợi ý nhanh {searchTerm ? `khớp với "${searchTerm}"` : 'theo Tên cuối & Họ'}:
                </span>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    Xem tất cả ({studentsFromOtherClasses.length})
                  </button>
                )}
              </div>

              {/* Chips row */}
              <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto pr-1">
                {/* Tên Cuối Chips (Green) */}
                {visibleSuggestions.givenNames.map(g => {
                  const isCurrent = normalizeVietnamese(searchTerm) === normalizeVietnamese(g.name);
                  return (
                    <button
                      key={`first-${g.name}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(g.name)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                        isCurrent
                          ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400'
                          : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase opacity-75">Tên</span>
                      <span>{g.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">({g.count})</span>
                    </button>
                  );
                })}

                {/* Họ Chips (Purple) */}
                {visibleSuggestions.surnames.map(s => {
                  const isCurrent = normalizeVietnamese(searchTerm) === normalizeVietnamese(s.name);
                  return (
                    <button
                      key={`last-${s.name}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(s.name)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                        isCurrent
                          ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-400'
                          : 'bg-white text-purple-800 border border-purple-200 hover:bg-purple-50 hover:border-purple-300'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase opacity-75">Họ</span>
                      <span>{s.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">({s.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Class Filter Tabs (if more than 1 class exists) */}
          {otherClasses.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setFilterClassId('ALL')}
                className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-colors cursor-pointer text-xs ${
                  filterClassId === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tất cả lớp khác ({studentsFromOtherClasses.length})
              </button>
              {otherClasses.map(c => {
                const count = studentsFromOtherClasses.filter(s => s.originClassId === c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => setFilterClassId(c.id)}
                    className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-colors cursor-pointer text-xs ${
                      filterClassId === c.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {c.name} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5 bg-slate-50/50">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <UserCheck className="w-10 h-10 mx-auto opacity-40 mb-2" />
              <p className="font-bold text-slate-600 text-sm">Không tìm thấy võ sinh nào</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {searchTerm 
                  ? `Không có võ sinh nào khớp với từ khóa "${searchTerm}" trong các lớp khác của ${dojoName}. Hãy thử tìm bằng tên cuối (VD: An, Kiệt, Dũng) hoặc họ (Nguyễn, Trần).`
                  : `Không có võ sinh nào thuộc các lớp khác trong võ đường này.`}
              </p>
            </div>
          ) : (
            filteredStudents.map(({ student: s, match }) => {
              const isAlreadyInCurrentClass = currentClassStudentIds.has(s.id);
              const isJustAdded = addedIds.has(s.id);

              return (
                <div
                  key={s.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isAlreadyInCurrentClass || isJustAdded
                      ? 'bg-emerald-50/80 border-emerald-300'
                      : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                      {s.stt || 'VS'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm text-slate-900 leading-tight">
                          {s.name}
                        </h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-300">
                          {s.belt}
                        </span>
                        {match.reason && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            match.type === 'FIRST_NAME'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : match.type === 'LAST_NAME'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : match.type === 'PHONE'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}>
                            {match.reason}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 flex items-center gap-1">
                          <School className="w-3 h-3 text-indigo-500" /> Lớp gốc: {s.originClassName}
                        </span>
                        {s.parentPhone && (
                          <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            PH: {s.parentPhone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="shrink-0 flex justify-end">
                    {isAlreadyInCurrentClass || isJustAdded ? (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center gap-1.5 border border-emerald-300">
                        <Check className="w-4 h-4" /> Đã thêm học bù
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAdd(s, s.originClassName)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>+ Điểm Danh Học Bù</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Lớp đang điểm danh: <strong className="text-slate-800 font-bold">{currentClassName}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 font-bold cursor-pointer transition-all"
          >
            Hoàn tất & Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
