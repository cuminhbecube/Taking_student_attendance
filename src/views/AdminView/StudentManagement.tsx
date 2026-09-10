import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Filter, QrCode, Plus, Download, Eye } from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const { students, exportAttendanceToCSV, setIsQrModalOpen } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = filterClass === 'ALL' || s.className === filterClass;
    return matchSearch && matchClass;
  });

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Hồ Sơ Học Sinh & Thẻ Điểm Danh</h2>
          <p className="text-xs text-slate-500 mt-0.5">Quản lý mã QR thẻ học sinh, lịch sử chuyên cần và phụ huynh</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAttendanceToCSV()}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Xuất Danh Sách
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo họ tên, mã HS (HS-1001)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">Lọc lớp:</span>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tất cả lớp học</option>
            <option value="10A1">Lớp 10A1</option>
            <option value="10A2">Lớp 10A2</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 pl-6">Học Sinh</th>
                <th className="py-3.5">Mã Thẻ / QR</th>
                <th className="py-3.5">Lớp Học Thuật</th>
                <th className="py-3.5">Đội Tuyển / CLB</th>
                <th className="py-3.5">Chuyên Cần</th>
                <th className="py-3.5">Phụ Huynh & SĐT</th>
                <th className="py-3.5 pr-6 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 pl-6 flex items-center gap-3">
                    <img src={s.avatar} alt={s.name} className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200" />
                    <div>
                      <span className="font-bold text-slate-900 block">{s.name}</span>
                      <span className="text-[11px] text-slate-400">{s.gender} • {s.dob}</span>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200 flex items-center gap-1 w-fit">
                      <QrCode className="w-3.5 h-3.5" /> {s.code}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className="font-bold text-slate-800">{s.className}</span>
                  </td>
                  <td className="py-3.5">
                    {s.trainingGroupName ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                        {s.trainingGroupName}
                      </span>
                    ) : (
                      <span className="text-slate-400">Chưa tham gia</span>
                    )}
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${s.overallAttendanceRate}%` }} 
                          className={`h-full ${s.overallAttendanceRate >= 90 ? 'bg-emerald-500' : s.overallAttendanceRate >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        ></div>
                      </div>
                      <span className="font-bold text-slate-800">{s.overallAttendanceRate}%</span>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span className="font-semibold text-slate-900 block">{s.parentName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{s.parentPhone}</span>
                  </td>
                  <td className="py-3.5 pr-6 text-right">
                    <button
                      onClick={() => setIsQrModalOpen(true)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                      title="Kiểm thử quét mã của em này"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
