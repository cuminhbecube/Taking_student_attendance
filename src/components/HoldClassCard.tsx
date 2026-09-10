import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DojoClass } from '../types';
import { Calendar, ShieldAlert, AlertTriangle } from 'lucide-react';

interface HoldClassCardProps {
  classItem: DojoClass;
  isActive: boolean;
  canDelete: boolean;
  onHoldDeleteComplete: (classItem: DojoClass) => void;
  className?: string;
}

const HOLD_ACTIVATION_DELAY_MS = 350;
const TOTAL_HOLD_MS = 10000;

export const HoldClassCard: React.FC<HoldClassCardProps> = ({
  classItem,
  isActive,
  canDelete,
  onHoldDeleteComplete,
  className = ''
}) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState(10.0);
  const [cancelToast, setCancelToast] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const activationTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasTriggeredHoldRef = useRef(false);

  const cleanTimers = () => {
    if (activationTimerRef.current) {
      clearTimeout(activationTimerRef.current);
      activationTimerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopHold = useCallback((reason: 'completed' | 'cancelled') => {
    cleanTimers();

    if (reason === 'completed') {
      setIsHolding(false);
      setProgress(100);
      setTimeLeftSec(0);
      hasTriggeredHoldRef.current = false;
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([100, 50, 100]);
      }
      onHoldDeleteComplete(classItem);
    } else {
      if (isHolding) {
        setIsHolding(false);
        setProgress(0);
        setTimeLeftSec(10.0);
        setCancelToast('Đã hủy thao tác xóa lớp (cần giữ liên tục đủ 10 giây)');
        setTimeout(() => setCancelToast(null), 2500);
      }
      hasTriggeredHoldRef.current = false;
    }
    pointerStartPosRef.current = null;
  }, [isHolding, classItem, onHoldDeleteComplete]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    hasTriggeredHoldRef.current = false;

    if (!canDelete) return;

    activationTimerRef.current = window.setTimeout(() => {
      hasTriggeredHoldRef.current = true;
      setIsHolding(true);
      startTimeRef.current = Date.now();
      setProgress(0);
      setTimeLeftSec(10.0);
      setCancelToast(null);

      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const pct = Math.min(100, (elapsed / TOTAL_HOLD_MS) * 100);
        const remaining = Math.max(0, (TOTAL_HOLD_MS - elapsed) / 1000);

        setProgress(pct);
        setTimeLeftSec(remaining);

        if (elapsed >= TOTAL_HOLD_MS) {
          stopHold('completed');
        }
      }, 50);
    }, HOLD_ACTIVATION_DELAY_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartPosRef.current) return;
    const deltaX = Math.abs(e.clientX - pointerStartPosRef.current.x);
    const deltaY = Math.abs(e.clientY - pointerStartPosRef.current.y);

    if (!hasTriggeredHoldRef.current && (deltaX > 12 || deltaY > 12)) {
      cleanTimers();
      pointerStartPosRef.current = null;
    }
  };

  const handlePointerUp = () => {
    if (isHolding) {
      stopHold('cancelled');
    }
    cleanTimers();
    pointerStartPosRef.current = null;
  };

  useEffect(() => {
    if (!isHolding) return;

    const handleGlobalPointerUp = () => {
      stopHold('cancelled');
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    window.addEventListener('blur', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
      window.removeEventListener('blur', handleGlobalPointerUp);
    };
  }, [isHolding, stopHold]);

  useEffect(() => {
    return () => cleanTimers();
  }, []);

  const strokeDashoffset = 283 - (283 * progress) / 100;

  return (
    <>
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => {
          if (canDelete) e.preventDefault();
        }}
        className={`rounded-2xl p-4 border-2 transition-all shadow-xs relative select-none touch-pan-y ${
          isActive 
            ? 'border-indigo-500 bg-indigo-50/30' 
            : 'border-slate-200 bg-white hover:border-slate-300'
        } ${className}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400">[{classItem.id}]</span>
              <h4 className="font-extrabold text-base text-slate-900">{classItem.name}</h4>
            </div>
            <div className="text-xs font-bold text-indigo-700 mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{classItem.schedule}</span>
            </div>
          </div>
          {isActive && (
            <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
              Đang chọn
            </span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
          <p>📍 <strong>Địa điểm:</strong> {classItem.venue || 'Chưa cập nhật'}</p>
          <p>🥋 <strong>Phụ trách:</strong> {classItem.instructorName || 'Huấn luyện viên'}</p>
        </div>

        {canDelete && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="italic flex items-center gap-1">
              <span>💡</span>
              <span>Nhấn giữ thẻ 10s để xóa lớp</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">10 giây</span>
          </div>
        )}
      </div>

      {cancelToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/90 backdrop-blur-sm text-white text-xs font-bold rounded-full shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{cancelToast}</span>
        </div>
      )}

      {isHolding && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none touch-none animate-in fade-in duration-150"
          onPointerUp={() => stopHold('cancelled')}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="w-full max-w-sm bg-slate-900 border-2 border-red-500/80 rounded-3xl p-6 text-center text-white shadow-2xl shadow-red-500/20 flex flex-col items-center">
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-extrabold mb-4 border border-red-500/30">
              <ShieldAlert className="w-4 h-4 animate-pulse text-red-500" />
              <span>GIỮ LIÊN TỤC 10 GIÂY ĐỂ XÓA LỚP</span>
            </div>

            <div className="relative w-40 h-40 my-2 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="text-slate-800"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="text-red-500 transition-all duration-75 ease-linear"
                  strokeWidth="8"
                  strokeDasharray="283"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black font-mono tracking-tight text-white drop-shadow-md">
                  {timeLeftSec.toFixed(1)}<span className="text-xl font-normal text-red-400">s</span>
                </span>
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider mt-0.5">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <h4 className="font-black text-lg text-white text-balance leading-tight">
                {classItem.name}
              </h4>
              <p className="text-xs text-slate-400 font-mono">Mã lớp: {classItem.id}</p>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 w-full text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-amber-300">
                👉 Tiếp tục giữ tay / chuột liên tục...
              </p>
              <p className="text-[11px] text-slate-400">
                (Thả tay ra bất kỳ lúc nào để hủy bỏ)
              </p>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
