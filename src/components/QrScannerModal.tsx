import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { QrCode, X, CheckCircle2, AlertCircle, Scan, Sparkles } from 'lucide-react';

export const QrScannerModal: React.FC = () => {
  const { isQrModalOpen, setIsQrModalOpen, processQrCheckIn, students } = useApp();
  const [inputCode, setInputCode] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isQrModalOpen) return null;

  const handleScanSubmit = (codeToScan?: string) => {
    const code = codeToScan || inputCode;
    if (!code.trim()) return;
    const res = processQrCheckIn(code);
    setResult(res);
    setInputCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Trạm Quét Thẻ / QR Điểm Danh Kiosk</h3>
              <p className="text-xs text-slate-400">Hỗ trợ mã vạch, thẻ từ học sinh & QR Code</p>
            </div>
          </div>
          <button 
            onClick={() => { setIsQrModalOpen(false); setResult(null); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="relative aspect-video rounded-2xl bg-slate-950 flex flex-col items-center justify-center overflow-hidden border-2 border-indigo-500/50 shadow-inner">
            <div className="w-44 h-44 rounded-2xl border-2 border-dashed border-indigo-400/80 flex items-center justify-center relative">
              <Scan className="w-10 h-10 text-indigo-400/40 animate-pulse" />
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-bounce top-0"></div>
            </div>
            <p className="text-xs text-slate-400 mt-3 font-mono">Đưa mã QR hoặc thẻ học sinh trước camera</p>
          </div>

          {result && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-in slide-in-from-top-2 duration-200 ${
              result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {result.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              <div className="text-xs">
                <p className="font-bold">{result.success ? 'CHECK-IN THÀNH CÔNG!' : 'QUÉT THẤT BẠI'}</p>
                <p className="mt-0.5">{result.message}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nhập mã học sinh thủ công (hoặc máy đọc barcode tự điền):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScanSubmit()}
                placeholder="Ví dụ: HS-1001, HS-1002..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => handleScanSubmit()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                Xác Nhận
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Bấm nhanh để kiểm thử quét mã:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {students.slice(0, 8).map(stu => (
                <button
                  key={stu.id}
                  onClick={() => handleScanSubmit(stu.code)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-xs font-medium text-slate-700 transition-all cursor-pointer"
                >
                  {stu.name} ({stu.code})
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
