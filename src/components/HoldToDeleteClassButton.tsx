import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DojoClass } from '../types';
import { Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface HoldToDeleteClassButtonProps {
  classItem: DojoClass;
  onHoldComplete: (classItem: DojoClass) => void;
  className?: string;
  label?: string;
  variant?: 'icon' | 'badge';
}

const HOLD_DURATION_MS = 10000; // 10 seconds

export const HoldToDeleteClassButton: React.FC<HoldToDeleteClassButtonProps> = ({
  classItem,
  onHoldComplete,
  className = '',
  label = 'Giữ 10s để xóa',
  variant = 'icon'
}) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0 - 100%
  const [timeLeftSec, setTimeLeftSec] = useState(10.0);
  const [cancelToast, setCancelToast] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const activePointerIdRef = useRef<number | null>(null);

  const stopHold = useCallback((reason: 'completed' | 'cancelled') => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (reason === 'completed') {
      setIsHolding(false);
      setProgress(100);
      setTimeLeftSec(0);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([100, 50, 100]);
      }
      onHoldComplete(classItem);
    } else {
      if (isHolding) {
        setIsHolding(false);
        setProgress(0);
        setTimeLeftSec(10.0);
        setCancelToast('Đã hủy xóa lớp (cần giữ liên tục đủ 10 giây)');
        setTimeout(() => setCancelToast(null), 2500);
      }
    }
    activePointerIdRef.current = null;
  }, [isHolding, classItem, onHoldComplete]);

  const startHold = (e: React.PointerEvent) => {
    // Only allow primary mouse button (left-click) or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    e.preventDefault();
    e.stopPropagation();

    activePointerIdRef.current = e.pointerId;
    startTimeRef.current = Date.now();
    setIsHolding(true);
    setProgress(0);
    setTimeLeftSec(10.0);
    setCancelToast(null);

    // High frequency interval (50ms) for smooth progress
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      const remaining = Math.max(0, (HOLD_DURATION_MS - elapsed) / 1000);

      setProgress(pct);
      setTimeLeftSec(remaining);

      if (elapsed >= HOLD_DURATION_MS) {
        stopHold('completed');
      }
    }, 50);
  };

  // Global pointer up / cancel listener to handle releasing anywhere on the screen
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

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Calculate SVG circle progress
  const strokeDashoffset = 283 - (283 * progress) / 100;

  return (
    <>
      {/* Trigger Button */}
      {variant === 'badge' ? (
        <button
          type="button"
          onPointerDown={startHold}
          title="Nhấn giữ 10 giây để xóa lớp này"
          className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-red-200 hover:border-red-400 bg-red-50/60 hover:bg-red-100/80 text-red-600 hover:text-red-700 text-xs font-bold transition-all cursor-pointer select-none active:scale-95 touch-none ${className}`}
        >
          <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          <span className="text-[11px]">{label}</span>
        </button>
      ) : (
        <button
          type="button"
          onPointerDown={startHold}
          title="Nhấn giữ 10 giây để xóa lớp này"
          className={`p-1.5 rounded-lg border border-red-200/70 hover:border-red-400 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all cursor-pointer select-none active:scale-90 touch-none flex items-center justify-center shrink-0 ${className}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Floating toast if cancelled early */}
      {cancelToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/90 backdrop-blur-sm text-white text-xs font-bold rounded-full shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{cancelToast}</span>
        </div>
      )}

      {/* Fullscreen 10s Hold-to-Delete Modal Overlay */}
      {isHolding && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none touch-none animate-in fade-in duration-150"
          onPointerUp={() => stopHold('cancelled')}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="w-full max-w-sm bg-slate-900 border-2 border-red-500/80 rounded-3xl p-6 text-center text-white shadow-2xl shadow-red-500/20 flex flex-col items-center">
            
            {/* Warning Icon Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-extrabold mb-4 border border-red-500/30">
              <ShieldAlert className="w-4 h-4 animate-pulse text-red-500" />
              <span>YÊU CẦU GIỮ ĐỦ 10 GIÂY ĐỂ XÓA</span>
            </div>

            {/* Circular Countdown Progress Gauge */}
            <div className="relative w-40 h-40 my-2 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="text-slate-800"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Active Progress Ring */}
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

              {/* Countdown Number in Center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black font-mono tracking-tight text-white drop-shadow-md">
                  {timeLeftSec.toFixed(1)}<span className="text-xl font-normal text-red-400">s</span>
                </span>
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider mt-0.5">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Target Class Name */}
            <div className="mt-3 space-y-1">
              <h4 className="font-black text-lg text-white text-balance leading-tight">
                {classItem.name}
              </h4>
              <p className="text-xs text-slate-400 font-mono">Mã lớp: {classItem.id}</p>
            </div>

            {/* Hold Instructions */}
            <div className="mt-4 pt-4 border-t border-slate-800 w-full text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-amber-300">
                👉 Tiếp tục giữ tay / giữ chuột liên tục...
              </p>
              <p className="text-[11px] text-slate-400">
                (Thả tay ra bất kỳ lúc nào để hủy bỏ xóa lớp)
              </p>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
