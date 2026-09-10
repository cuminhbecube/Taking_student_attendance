import React, { createContext, useContext, useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  User, UserRole, Student, AcademicClass, TrainingGroup, 
  Session, AttendanceRecord, AttendanceStatus, LeaveRequest, AuditLog, HealthStatus 
} from '../types';
import { 
  initialUsers, initialClasses, initialTrainingGroups, 
  initialStudents, initialSessions, initialAttendanceRecords, 
  initialLeaveRequests, initialAuditLogs 
} from '../data/mockData';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  users: User[];
  students: Student[];
  classes: AcademicClass[];
  trainingGroups: TrainingGroup[];
  sessions: Session[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  auditLogs: AuditLog[];
  
  // Actions
  updateAttendance: (recordId: string, status: AttendanceStatus, notes?: string, lateMinutes?: number, healthStatus?: HealthStatus, intensityRating?: number) => void;
  batchMarkAllPresent: (sessionId: string) => void;
  finalizeSession: (sessionId: string) => void;
  processQrCheckIn: (code: string) => { success: boolean; message: string; student?: Student };
  approveLeaveRequest: (requestId: string, note?: string) => void;
  rejectLeaveRequest: (requestId: string, note?: string) => void;
  submitLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'status' | 'appliedAt'>) => void;
  addStudent: (student: Omit<Student, 'id' | 'qrCode' | 'overallAttendanceRate' | 'consecutiveAbsences' | 'status'>) => void;
  exportAttendanceToCSV: (sessionId?: string) => void;
  isQrModalOpen: boolean;
  setIsQrModalOpen: (open: boolean) => void;
  isLeaveModalOpen: boolean;
  setIsLeaveModalOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users] = useState<User[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    return initialUsers.find(u => u.role === 'ADMIN') || initialUsers[0];
  });
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [classes] = useState<AcademicClass[]>(initialClasses);
  const [trainingGroups] = useState<TrainingGroup[]>(initialTrainingGroups);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(initialAttendanceRecords);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const switchRole = (role: UserRole) => {
    const user = users.find(u => u.role === role);
    if (user) {
      setCurrentUser(user);
      setActiveTab('dashboard');
    }
  };

  const refreshSessionStats = (sessionId: string, updatedRecords: AttendanceRecord[]) => {
    const sessionRecords = updatedRecords.filter(r => r.sessionId === sessionId);
    const presentCount = sessionRecords.filter(r => r.status === 'PRESENT').length;
    const lateCount = sessionRecords.filter(r => r.status === 'LATE').length;
    const excusedCount = sessionRecords.filter(r => r.status === 'ABSENT_EXCUSED').length;
    const unexcusedCount = sessionRecords.filter(r => r.status === 'ABSENT_UNEXCUSED').length;

    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          presentCount,
          lateCount,
          excusedCount,
          unexcusedCount
        };
      }
      return s;
    }));
  };

  const updateAttendance = (
    recordId: string, 
    status: AttendanceStatus, 
    notes?: string, 
    lateMinutes?: number, 
    healthStatus?: HealthStatus, 
    intensityRating?: number
  ) => {
    let targetStudentName = '';
    let targetSessionId = '';
    let oldStatus = '';

    const newRecords = attendanceRecords.map(rec => {
      if (rec.id === recordId) {
        targetStudentName = rec.studentName;
        targetSessionId = rec.sessionId;
        oldStatus = rec.status;
        return {
          ...rec,
          status,
          notes: notes !== undefined ? notes : rec.notes,
          lateMinutes: status === 'LATE' ? (lateMinutes || rec.lateMinutes || 15) : undefined,
          healthStatus: healthStatus !== undefined ? healthStatus : rec.healthStatus,
          intensityRating: intensityRating !== undefined ? intensityRating : rec.intensityRating,
          updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          updatedBy: currentUser.name
        };
      }
      return rec;
    });

    setAttendanceRecords(newRecords);
    if (targetSessionId) {
      refreshSessionStats(targetSessionId, newRecords);
    }

    const newLog: AuditLog = {
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'CẬP NHẬT ĐIỂM DANH',
      targetName: targetStudentName,
      details: `Đổi trạng thái: [${oldStatus}] -> [${status}]` + (notes ? ` | Ghi chú: ${notes}` : ''),
      sessionId: targetSessionId
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const batchMarkAllPresent = (sessionId: string) => {
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newRecords = attendanceRecords.map(rec => {
      if (rec.sessionId === sessionId && rec.status !== 'ABSENT_EXCUSED') {
        return {
          ...rec,
          status: 'PRESENT' as AttendanceStatus,
          checkInTime: rec.checkInTime || timeNow,
          updatedAt: timeNow,
          updatedBy: currentUser.name
        };
      }
      return rec;
    });

    setAttendanceRecords(newRecords);
    refreshSessionStats(sessionId, newRecords);

    const session = sessions.find(s => s.id === sessionId);
    setAuditLogs(prev => [{
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'ĐIỂM DANH HÀNG LOẠT',
      targetName: session?.title || sessionId,
      details: 'Đánh dấu tất cả học sinh CÓ MẶT (ngoại trừ học sinh có phép)',
      sessionId
    }, ...prev]);
  };

  const finalizeSession = (sessionId: string) => {
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          isFinalized: true,
          finalizedAt: timeNow
        };
      }
      return s;
    }));

    setAuditLogs(prev => [{
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'KHÓA SỔ ĐIỂM DANH',
      targetName: sessions.find(s => s.id === sessionId)?.title || sessionId,
      details: 'Đã hoàn tất kiểm diện và chốt dữ liệu báo cáo',
      sessionId
    }, ...prev]);
  };

  const processQrCheckIn = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const student = students.find(s => s.code.toUpperCase() === cleanCode || s.qrCode.toUpperCase() === cleanCode);
    
    if (!student) {
      return { success: false, message: `Không tìm thấy mã học sinh: "${code}". Vui lòng kiểm tra lại thẻ!` };
    }

    const activeSession = sessions.find(s => !s.isFinalized && (s.targetId === student.classId || s.targetId === student.trainingGroupId));
    const targetSessionId = activeSession ? activeSession.id : 'SES-01';

    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    let updated = false;
    const newRecords = attendanceRecords.map(rec => {
      if (rec.studentId === student.id && rec.sessionId === targetSessionId) {
        updated = true;
        return {
          ...rec,
          status: 'PRESENT' as AttendanceStatus,
          checkInTime: timeNow,
          method: 'QR_CODE' as const,
          updatedAt: timeNow,
          updatedBy: 'Hệ Thống QR Kiosk'
        };
      }
      return rec;
    });

    if (!updated) {
      newRecords.push({
        id: 'REC-' + Date.now(),
        sessionId: targetSessionId,
        studentId: student.id,
        studentCode: student.code,
        studentName: student.name,
        avatar: student.avatar,
        status: 'PRESENT',
        checkInTime: timeNow,
        method: 'QR_CODE',
        updatedAt: timeNow,
        updatedBy: 'Hệ Thống QR Kiosk'
      });
    }

    setAttendanceRecords(newRecords);
    refreshSessionStats(targetSessionId, newRecords);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore if not supported
    }

    setAuditLogs(prev => [{
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      actorName: 'Kiosk Check-in',
      actorRole: 'ADMIN',
      action: 'QUÉT THẺ THÀNH CÔNG',
      targetName: `${student.name} (${student.code})`,
      details: `Điểm danh QR thành công lúc ${timeNow} tại ${activeSession?.title || 'Lớp học'}`,
      sessionId: targetSessionId
    }, ...prev]);

    return { 
      success: true, 
      message: `Điểm danh thành công: ${student.name} (${student.code}) - Lớp ${student.className} lúc ${timeNow}`,
      student 
    };
  };

  const approveLeaveRequest = (requestId: string, note?: string) => {
    const req = leaveRequests.find(r => r.id === requestId);
    if (!req) return;

    setLeaveRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'APPROVED',
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          reviewNote: note || 'Đồng ý duyệt phép nghỉ'
        };
      }
      return r;
    }));

    const newRecords = attendanceRecords.map(rec => {
      if (rec.studentId === req.studentId) {
        return {
          ...rec,
          status: 'ABSENT_EXCUSED' as AttendanceStatus,
          notes: `Nghỉ có phép: ${req.reason}`,
          updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          updatedBy: currentUser.name
        };
      }
      return rec;
    });

    setAttendanceRecords(newRecords);
    sessions.forEach(s => refreshSessionStats(s.id, newRecords));

    setAuditLogs(prev => [{
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'DUYỆT ĐƠN NGHỈ PHÉP',
      targetName: `${req.studentName} (${req.studentCode})`,
      details: `Duyệt phép lý do: "${req.reason}". Ghi chú: "${note || 'Đã duyệt'}"`
    }, ...prev]);
  };

  const rejectLeaveRequest = (requestId: string, note?: string) => {
    const req = leaveRequests.find(r => r.id === requestId);
    if (!req) return;

    setLeaveRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'REJECTED',
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          reviewNote: note || 'Không đủ căn cứ chấp thuận'
        };
      }
      return r;
    }));

    setAuditLogs(prev => [{
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'TỪ CHỐI ĐƠN PHÉP',
      targetName: `${req.studentName} (${req.studentCode})`,
      details: `Từ chối đơn phép. Lý do: "${note || 'Không duyệt'}"`
    }, ...prev]);
  };

  const submitLeaveRequest = (req: Omit<LeaveRequest, 'id' | 'status' | 'appliedAt'>) => {
    const newReq: LeaveRequest = {
      ...req,
      id: 'LR-' + Date.now(),
      status: 'PENDING',
      appliedAt: 'Vừa gửi (' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ')'
    };
    setLeaveRequests(prev => [newReq, ...prev]);

    setAuditLogs(prev => [{
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      actorName: req.parentName,
      actorRole: 'ADMIN',
      action: 'NỘP ĐƠN NGHỈ PHÉP MỚI',
      targetName: `${req.studentName} (${req.studentCode})`,
      details: `Xin nghỉ từ ${req.fromDate} đến ${req.toDate}. Lý do: ${req.reason}`
    }, ...prev]);
  };

  const addStudent = (stu: Omit<Student, 'id' | 'qrCode' | 'overallAttendanceRate' | 'consecutiveAbsences' | 'status'>) => {
    const id = 'STU-' + (students.length + 1).toString().padStart(2, '0');
    const newStudent: Student = {
      ...stu,
      id,
      qrCode: stu.code,
      overallAttendanceRate: 100,
      consecutiveAbsences: 0,
      status: 'ACTIVE'
    };
    setStudents(prev => [...prev, newStudent]);
  };

  const exportAttendanceToCSV = (sessionId?: string) => {
    const recordsToExport = sessionId 
      ? attendanceRecords.filter(r => r.sessionId === sessionId)
      : attendanceRecords;

    const headers = ['Mã Học Sinh', 'Họ Và Tên', 'Lớp / Nhóm', 'Trạng Thái', 'Giờ Check-in', 'Số Phút Trễ', 'Thể Lực / Chấn Thương', 'Đánh Giá HLV (Sao)', 'Ghi Chú', 'Người Điểm Danh', 'Thời Gian Cập Nhật'];
    
    const rows = recordsToExport.map(r => {
      const student = students.find(s => s.id === r.studentId);
      return [
        r.studentCode,
        r.studentName,
        student?.className || '',
        r.status === 'PRESENT' ? 'Có mặt' : r.status === 'LATE' ? 'Đi muộn' : r.status === 'ABSENT_EXCUSED' ? 'Vắng có phép' : r.status === 'ABSENT_UNEXCUSED' ? 'Vắng không phép' : 'Chưa điểm danh',
        r.checkInTime || '',
        r.lateMinutes || '',
        r.healthStatus === 'EXCELLENT' ? 'Sung sức' : r.healthStatus === 'NORMAL' ? 'Bình thường' : r.healthStatus === 'MINOR_INJURY' ? 'Chấn thương nhẹ' : r.healthStatus === 'REHAB_ONLY' ? 'Tập phục hồi' : '',
        r.intensityRating || '',
        `"${(r.notes || '').replace(/"/g, '""')}"`,
        r.updatedBy,
        r.updatedAt
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Diem_Danh_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      switchRole,
      activeTab,
      setActiveTab,
      users,
      students,
      classes,
      trainingGroups,
      sessions,
      attendanceRecords,
      leaveRequests,
      auditLogs,
      updateAttendance,
      batchMarkAllPresent,
      finalizeSession,
      processQrCheckIn,
      approveLeaveRequest,
      rejectLeaveRequest,
      submitLeaveRequest,
      addStudent,
      exportAttendanceToCSV,
      isQrModalOpen,
      setIsQrModalOpen,
      isLeaveModalOpen,
      setIsLeaveModalOpen
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
