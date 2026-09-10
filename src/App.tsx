import React, { useState, useEffect, useMemo } from 'react';
import { 
  initialStudents, initialDates, initialAttendanceMap, initialClasses,
  initialDojos, initialAccounts, initialDatesTranDien, initialAttendanceTranDien,
  initialDatesTruongChinh, initialStudentsTruongChinh, initialAttendanceTruongChinh
} from './data/mockData';
import { 
  Student, AttendanceSessionDate, UserRole, DojoClass, TuitionStatus, 
  AppPermissions, RolePermissions, defaultPermissions, UserAccount, Dojo 
} from './types';
import { Header } from './components/Header';
import { MobileAttendanceView } from './components/MobileAttendanceView';
import { SheetAttendanceView } from './components/SheetAttendanceView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { LoginView } from './components/LoginView';
import { UserProfileModal } from './components/UserProfileModal';
import { 
  AddStudentModal, AddDateModal, AddClassModal, RolloverMonthModal, 
  EditStudentScheduleModal, EditStudentInfoModal 
} from './components/AdminModals';
import { ShareAttendanceModal } from './components/ShareAttendanceModal';
import { CrossClassSearchModal, DojoCrossStudent } from './components/CrossClassSearchModal';
import { DeleteClassPasswordModal } from './components/DeleteClassPasswordModal';
import { loadFromStorage, saveToStorage } from './utils/storage';
import { matchStudentSearch } from './utils/vietnameseSearch';
import { Plus, Sliders, Lock, Shield, GraduationCap, Dumbbell, Building2, UserCheck } from 'lucide-react';

const getDefaultStudentsForClass = (dojoId: string, classId: string): Student[] => {
  if (classId === 'CLS-TC') {
    return initialStudentsTruongChinh;
  }
  if (classId === 'CLS-TD') {
    return initialStudents.filter(s => s.id.startsWith('STU-TD'));
  }
  if (classId === 'CLS-TP-02') {
    return initialStudents.filter(s => s.id.startsWith('STU-TP2'));
  }
  if (classId === 'CLS-CG') {
    return initialStudents.filter(s => s.id.startsWith('STU-CG'));
  }
  return initialStudents.filter(s => 
    !s.id.startsWith('STU-TP2') && 
    !s.id.startsWith('STU-CG') &&
    !s.id.startsWith('STU-TD') &&
    !s.id.startsWith('STU-TC')
  );
};

const getDefaultDatesForClass = (classId: string): AttendanceSessionDate[] => {
  if (classId === 'CLS-TC') {
    return initialDatesTruongChinh;
  }
  if (classId === 'CLS-TD') {
    return initialDatesTranDien;
  }
  return initialDates;
};

const getDefaultAttendanceForClass = (classId: string): Record<string, Record<string, boolean>> => {
  if (classId === 'CLS-TC') {
    return initialAttendanceTruongChinh;
  }
  if (classId === 'CLS-TD') {
    return initialAttendanceTranDien;
  }
  return initialAttendanceMap;
};

export const App: React.FC = () => {
  // 1. Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const defaultUser = initialAccounts.find(a => a.username === 'hanoikid') || initialAccounts[0];
    const stored = loadFromStorage<UserAccount | null>('ea_auth_user', defaultUser);
    if (!stored || stored.username === 'dojo_tp') return defaultUser;
    return stored;
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // 2. Multi-Tenant Dojos & User Accounts
  const [dojos, setDojos] = useState<Dojo[]>(() => {
    const stored = loadFromStorage<Dojo[]>('ea_dojos', initialDojos);
    const hasHnk = stored.some(d => d.id === 'DOJO-HNK');
    if (!hasHnk) {
      return [...initialDojos.filter(d => d.id === 'DOJO-HNK'), ...stored.filter(d => d.id !== 'DOJO-TP')];
    }
    return stored;
  });
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    const stored = loadFromStorage<UserAccount[]>('ea_accounts', initialAccounts);
    const missing = initialAccounts.filter(ia => !stored.some(sa => sa.username === ia.username));
    return missing.length > 0 ? [...stored, ...missing] : stored;
  });

  // Super Admin active inspected Dojo
  const [superAdminDojoId, setSuperAdminDojoId] = useState<string>(() => 
    loadFromStorage('ea_super_dojo', 'DOJO-HNK')
  );

  // Determine effective Dojo based on logged-in user
  const effectiveDojoId = useMemo(() => {
    if (!currentUser) return 'DOJO-HNK';
    if (currentUser.role === 'SUPER_ADMIN') {
      return superAdminDojoId || 'DOJO-HNK';
    }
    return currentUser.dojoId || 'DOJO-HNK';
  }, [currentUser, superAdminDojoId]);

  const currentDojo = useMemo(() => {
    return dojos.find(d => d.id === effectiveDojoId) || dojos[0];
  }, [dojos, effectiveDojoId]);

  // View Mode: MOBILE | SHEET | ADMIN_DASHBOARD
  const [viewMode, setViewMode] = useState<'MOBILE' | 'SHEET' | 'ADMIN_DASHBOARD'>('MOBILE');

  // RBAC Permission Settings Matrix
  const [permissions, setPermissions] = useState<AppPermissions>(() => 
    loadFromStorage('ea_app_permissions', defaultPermissions)
  );

  // Classes & Months (Multi-Tenant Isolated)
  const [classes, setClasses] = useState<DojoClass[]>(() => {
    const stored = loadFromStorage<DojoClass[]>('ea_classes', initialClasses);
    const migrated = stored.map(c => c.dojoId === 'DOJO-TP' ? { ...c, dojoId: 'DOJO-HNK' } : c);
    const missing = initialClasses.filter(ic => !migrated.some(sc => sc.id === ic.id));
    return missing.length > 0 ? [...migrated, ...missing] : migrated;
  });

  // Active Classes filtered by current Dojo
  const dojoClasses = useMemo(() => {
    return classes.filter(c => !c.dojoId || c.dojoId === effectiveDojoId);
  }, [classes, effectiveDojoId]);

  const [activeClassId, setActiveClassId] = useState<string>(() => 
    loadFromStorage(`ea_active_class_${effectiveDojoId}`, 'CLS-TC')
  );

  // If activeClassId is not in current dojoClasses, update it
  useEffect(() => {
    if (dojoClasses.length > 0 && !dojoClasses.some(c => c.id === activeClassId)) {
      setActiveClassId(dojoClasses[0].id);
    }
  }, [dojoClasses, activeClassId]);

  const [availableMonths, setAvailableMonths] = useState<string[]>(() => 
    loadFromStorage('ea_months', ['Tháng 9/2026'])
  );
  const [activeMonth, setActiveMonth] = useState<string>(() => 
    loadFromStorage('ea_active_month', 'Tháng 9/2026')
  );

  // 3. Data State for the Active Class & Month (Keyed per Dojo for complete data isolation!)
  const storageKeyPrefix = `ea_data_${effectiveDojoId}_${activeClassId}_${activeMonth}`;

  const [students, setStudents] = useState<Student[]>(() => 
    loadFromStorage(`${storageKeyPrefix}_students`, getDefaultStudentsForClass(effectiveDojoId, activeClassId))
  );
  const [dates, setDates] = useState<AttendanceSessionDate[]>(() => 
    loadFromStorage(`${storageKeyPrefix}_dates`, getDefaultDatesForClass(activeClassId))
  );
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>(() => 
    loadFromStorage(`${storageKeyPrefix}_attendance`, getDefaultAttendanceForClass(activeClassId))
  );

  // Active Selected Date for Mobile Roll Call
  const [selectedDateId, setSelectedDateId] = useState<string>(() => {
    if (activeClassId === 'CLS-TC') return 'D1009';
    if (activeClassId === 'CLS-TD') return 'D0409';
    return dates[0]?.id || 'D1009';
  });

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterTuition, setFilterTuition] = useState('ALL');

  // Modals State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddDateOpen, setIsAddDateOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);

  // Cross-Class Search for Makeup Attendance Modal State
  const [isCrossSearchOpen, setIsCrossSearchOpen] = useState(false);
  const [crossSearchInitialTerm, setCrossSearchInitialTerm] = useState('');

  const handleOpenCrossSearch = (initialTerm?: string) => {
    setCrossSearchInitialTerm(initialTerm || '');
    setIsCrossSearchOpen(true);
  };

  // Student Modals
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const [selectedStudentForSchedule, setSelectedStudentForSchedule] = useState<Student | null>(null);

  const [isEditStudentInfoOpen, setIsEditStudentInfoOpen] = useState(false);
  const [selectedStudentForInfo, setSelectedStudentForInfo] = useState<Student | null>(null);

  // Share Attendance Report to Zalo Modal State
  const [isShareZaloOpen, setIsShareZaloOpen] = useState(false);
  const [shareZaloDateId, setShareZaloDateId] = useState<string>('');
  const [shareZaloClassFilter, setShareZaloClassFilter] = useState<string>('ALL');

  const handleOpenShareZalo = (dateId?: string, classFilter?: string) => {
    setShareZaloDateId(dateId || selectedDateId || dates[0]?.id || '');
    setShareZaloClassFilter(classFilter || filterClass || 'ALL');
    setIsShareZaloOpen(true);
  };

  // Delete Class State & Triggers
  const [classPendingDelete, setClassPendingDelete] = useState<DojoClass | null>(null);
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);

  const handleRequestDeleteClass = (classItem: DojoClass) => {
    setClassPendingDelete(classItem);
    setIsDeleteClassModalOpen(true);
  };

  // Auto fallback if role changes away from ADMIN or DOJO_ADMIN while in ADMIN_DASHBOARD
  useEffect(() => {
    if (currentUser && currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'DOJO_ADMIN' && viewMode === 'ADMIN_DASHBOARD') {
      setViewMode('MOBILE');
    }
  }, [currentUser, viewMode]);

  // Compute active permissions for the currently logged-in user
  const activeRolePermissions: RolePermissions = useMemo(() => {
    if (!currentUser) return defaultPermissions.COACH;
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DOJO_ADMIN') {
      return {
        canViewTuition: true,
        canEditTuition: true,
        canEditSchedule: true,
        canTakeAttendance: true,
        canAddStudent: true,
        canEditStudentInfo: true,
        canDeleteStudent: true,
        canAddDateSession: true,
        canExportData: true
      };
    }
    return permissions[currentUser.role] || defaultPermissions.COACH;
  }, [currentUser, permissions]);

  // Auto-Save Configuration
  useEffect(() => {
    saveToStorage('ea_auth_user', currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveToStorage('ea_dojos', dojos);
  }, [dojos]);

  useEffect(() => {
    saveToStorage('ea_accounts', accounts);
  }, [accounts]);

  useEffect(() => {
    saveToStorage('ea_super_dojo', superAdminDojoId);
  }, [superAdminDojoId]);

  useEffect(() => {
    saveToStorage('ea_app_permissions', permissions);
  }, [permissions]);

  useEffect(() => {
    saveToStorage('ea_classes', classes);
  }, [classes]);

  useEffect(() => {
    saveToStorage(`ea_active_class_${effectiveDojoId}`, activeClassId);
  }, [activeClassId, effectiveDojoId]);

  useEffect(() => {
    saveToStorage('ea_months', availableMonths);
  }, [availableMonths]);

  useEffect(() => {
    saveToStorage('ea_active_month', activeMonth);
  }, [activeMonth]);

  // When active class, month, or dojo changes, reload corresponding data
  useEffect(() => {
    const key = `ea_data_${effectiveDojoId}_${activeClassId}_${activeMonth}`;
    const defaultStudents = getDefaultStudentsForClass(effectiveDojoId, activeClassId);
    const defaultDates = getDefaultDatesForClass(activeClassId);
    const defaultAttendance = getDefaultAttendanceForClass(activeClassId);
    const loadedStudents = loadFromStorage(`${key}_students`, defaultStudents);
    const loadedDates = loadFromStorage(`${key}_dates`, defaultDates);
    const loadedAttendance = loadFromStorage(`${key}_attendance`, defaultAttendance);

    setStudents(loadedStudents);
    setDates(loadedDates);
    setAttendance(loadedAttendance);
    if (loadedDates.length > 0) {
      if (activeClassId === 'CLS-TC') {
        setSelectedDateId('D1009');
      } else if (activeClassId === 'CLS-TD') {
        setSelectedDateId('D0409');
      } else {
        setSelectedDateId(loadedDates[0].id);
      }
    }
  }, [effectiveDojoId, activeClassId, activeMonth]);

  // Save current class & month data
  useEffect(() => {
    saveToStorage(`${storageKeyPrefix}_students`, students);
  }, [students, storageKeyPrefix]);

  useEffect(() => {
    saveToStorage(`${storageKeyPrefix}_dates`, dates);
  }, [dates, storageKeyPrefix]);

  useEffect(() => {
    saveToStorage(`${storageKeyPrefix}_attendance`, attendance);
  }, [attendance, storageKeyPrefix]);

  // =========================================================================
  // AUTHENTICATION & ACCOUNT HANDLERS
  // =========================================================================
  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    // If user is DOJO_ADMIN, set active inspected dojo to user's dojo
    if (user.dojoId && user.dojoId !== 'ALL') {
      setSuperAdminDojoId(user.dojoId);
    }
    setViewMode('MOBILE');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleUpdateProfile = (userId: string, fullName: string, phone: string, email?: string) => {
    setAccounts(prev => prev.map(a => a.id === userId ? { ...a, fullName, phone, email } : a));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, fullName, phone, email } : null);
    }
  };

  const handleChangePassword = (userId: string, oldPass: string, newPass: string): { success: boolean; message?: string } => {
    const target = accounts.find(a => a.id === userId);
    if (!target) return { success: false, message: 'Không tìm thấy tài khoản!' };
    if (target.password !== oldPass) {
      return { success: false, message: 'Mật khẩu hiện tại không chính xác!' };
    }
    setAccounts(prev => prev.map(a => a.id === userId ? { ...a, password: newPass } : a));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, password: newPass } : null);
    }
    return { success: true };
  };

  // =========================================================================
  // DOJO & STAFF MANAGEMENT HANDLERS (MULTI-TENANT)
  // =========================================================================
  const handleAddDojo = (
    name: string, code: string, address: string, phone: string, adminUsername: string, initialPassword = 'dojo123'
  ) => {
    const dojoId = 'DOJO-' + code.toUpperCase();
    const newDojo: Dojo = {
      id: dojoId,
      name,
      code: code.toUpperCase(),
      address,
      phone,
      adminUsername,
      status: 'ACTIVE',
      createdAt: new Date().toLocaleDateString('vi-VN')
    };

    const newAdminAcc: UserAccount = {
      id: 'USR-' + Date.now().toString().slice(-4),
      username: adminUsername.toLowerCase(),
      password: initialPassword,
      fullName: `Chủ Nhiệm (${name})`,
      role: 'DOJO_ADMIN',
      dojoId,
      phone,
      status: 'ACTIVE',
      createdAt: new Date().toLocaleDateString('vi-VN')
    };

    // Create sample class for this new Dojo
    const newClass: DojoClass = {
      id: `CLS-${code.toUpperCase()}`,
      dojoId,
      name: `Lớp ${name}`,
      activeDays: [4, 7],
      startTime: '17:30',
      endTime: '19:00',
      schedule: 'Thứ 4 & Thứ 7 (17:30 - 19:00)',
      venue: address || 'Sân tập võ đường',
      instructorName: newAdminAcc.fullName
    };

    setDojos(prev => [...prev, newDojo]);
    setAccounts(prev => [...prev, newAdminAcc]);
    setClasses(prev => [...prev, newClass]);
    setSuperAdminDojoId(dojoId);
    setActiveClassId(newClass.id);
  };

  const handleUpdateDojo = (dojoId: string, name: string, address: string, phone: string) => {
    setDojos(prev => prev.map(d => d.id === dojoId ? { ...d, name, address, phone } : d));
  };

  const handleDeleteDojo = (dojoId: string) => {
    setDojos(prev => prev.filter(d => d.id !== dojoId));
    setAccounts(prev => prev.filter(a => a.dojoId !== dojoId));
    setClasses(prev => prev.filter(c => c.dojoId !== dojoId));
    if (superAdminDojoId === dojoId) {
      setSuperAdminDojoId('DOJO-TP');
    }
  };

  const handleAddStaffAccount = (
    dojoId: string, fullName: string, username: string, role: 'TEACHER' | 'COACH', phone: string, initialPassword = '123456'
  ): { success: boolean; message?: string } => {
    if (accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Tên đăng nhập (@username) đã tồn tại trong hệ thống!' };
    }

    const newAcc: UserAccount = {
      id: 'USR-' + Date.now().toString().slice(-4),
      username: username.toLowerCase(),
      password: initialPassword,
      fullName,
      role,
      dojoId,
      phone,
      status: 'ACTIVE',
      createdAt: new Date().toLocaleDateString('vi-VN')
    };

    setAccounts(prev => [...prev, newAcc]);
    return { success: true };
  };

  const handleUpdateStaffAccount = (userId: string, fullName: string, role: 'TEACHER' | 'COACH', phone: string) => {
    setAccounts(prev => prev.map(a => a.id === userId ? { ...a, fullName, role, phone } : a));
  };

  const handleToggleAccountStatus = (userId: string) => {
    setAccounts(prev => prev.map(a => {
      if (a.id === userId) {
        return { ...a, status: a.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE' };
      }
      return a;
    }));
  };

  const handleDeleteAccount = (userId: string) => {
    setAccounts(prev => prev.filter(a => a.id !== userId));
  };

  const handleResetPasswordToDefault = (userId: string): { success: boolean; defaultPassword: string } => {
    const defaultPassword = '123456';
    setAccounts(prev => prev.map(a => a.id === userId ? { ...a, password: defaultPassword } : a));
    return { success: true, defaultPassword };
  };

  // =========================================================================
  // ATTENDANCE & STUDENT LOGIC
  // =========================================================================
  const toggleAttendance = (studentId: string, dateId: string) => {
    if (!activeRolePermissions.canTakeAttendance) {
      alert('Admin đã khóa quyền điểm danh của vai trò này!');
      return;
    }
    setAttendance(prev => {
      const studentDates = prev[studentId] || {};
      const currentVal = !!studentDates[dateId];
      return {
        ...prev,
        [studentId]: {
          ...studentDates,
          [dateId]: !currentVal
        }
      };
    });
  };

  const markAllForDate = (dateId: string, isPresent: boolean) => {
    if (!activeRolePermissions.canTakeAttendance) {
      alert('Admin đã khóa quyền điểm danh của vai trò này!');
      return;
    }
    setAttendance(prev => {
      const next = { ...prev };
      students.forEach(s => {
        if (!next[s.id]) next[s.id] = {};
        next[s.id] = {
          ...next[s.id],
          [dateId]: isPresent
        };
      });
      return next;
    });
  };

  const toggleTuitionStatus = (studentId: string) => {
    if (!activeRolePermissions.canEditTuition) {
      alert('Admin chỉ cho phép bạn xem học phí, không được quyền cập nhật thu tiền!');
      return;
    }
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const nextStatus: TuitionStatus = 
          s.tuitionStatus === 'PAID' ? 'UNPAID' :
          s.tuitionStatus === 'UNPAID' ? 'PARTIAL' : 'PAID';
        return { ...s, tuitionStatus: nextStatus };
      }
      return s;
    }));
  };

  const handleOpenEditSchedule = (student: Student) => {
    if (!activeRolePermissions.canEditSchedule) {
      alert('Admin chưa cấp quyền xếp lịch tập cho vai trò này!');
      return;
    }
    setSelectedStudentForSchedule(student);
    setIsEditScheduleOpen(true);
  };

  const handleSaveStudentSchedule = (studentId: string, registeredDays: number[], registrationClass: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, registeredDays, registrationClass };
      }
      return s;
    }));
  };

  const handleOpenEditStudentInfo = (student: Student) => {
    if (!activeRolePermissions.canEditStudentInfo) {
      alert('Admin chưa cấp quyền sửa thông tin võ sinh cho vai trò này!');
      return;
    }
    setSelectedStudentForInfo(student);
    setIsEditStudentInfoOpen(true);
  };

  const handleSaveStudentInfo = (studentId: string, name: string, belt: string, dob: string, phone: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, name, belt, dob, parentPhone: phone };
      }
      return s;
    }));
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (!activeRolePermissions.canDeleteStudent) {
      alert('Bạn không có quyền xóa võ sinh khỏi lớp học!');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa võ sinh "${studentName}" khỏi lớp học không? Hành động này không thể hoàn tác.`)) {
      setStudents(prev => prev.filter(s => s.id !== studentId));
      setAttendance(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!activeRolePermissions.canExportData) {
      alert('Admin chưa cấp quyền xuất file Excel cho vai trò này!');
      return;
    }

    const currentClassObj = dojoClasses.find(c => c.id === activeClassId);
    const header = [
      'STT', 'Họ và tên Võ sinh', 'Cấp đai', 'Ngày sinh', 'Số điện thoại', 'Lớp đăng ký',
      ...(activeRolePermissions.canViewTuition ? ['Tình trạng học phí'] : []),
      'Số buổi đi học',
      ...dates.map(d => `${d.dayName} (${d.dateStr})`),
      'Ghi chú'
    ];

    const rows = students.map((s, idx) => {
      const dateCols = dates.map(d => attendance[s.id]?.[d.id] ? 'x' : '');
      const totalPresent = getTotalPresentForStudent(s.id);
      const tuitionLabel = s.tuitionStatus === 'PAID' ? 'Đã nộp' : s.tuitionStatus === 'PARTIAL' ? 'Nợ phí 50%' : 'Chưa nộp';
      
      const rowData = [
        idx + 1,
        `"${s.name}"`,
        `"${s.belt}"`,
        `"${s.dob}"`,
        `"${s.parentPhone}"`,
        `"${s.registrationClass}"`,
        ...(activeRolePermissions.canViewTuition ? [`"${tuitionLabel}"`] : []),
        totalPresent,
        ...dateCols,
        `"${activeRolePermissions.canViewTuition ? (s.tuitionNote ? `${s.tuitionNote} ` : '') : ''}${s.notes || ''}"`
      ];

      return rowData.join(',');
    });

    const csvContent = '\uFEFF' + [
      `"BẢNG ĐIỂM DANH - ${currentDojo?.name.toUpperCase() || 'VÕ ĐƯỜNG'} - ${currentClassObj?.name.toUpperCase() || 'LỚP VÕ'} - ${activeMonth.toUpperCase()}"`,
      header.join(','),
      ...rows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Diem_Danh_${currentDojo?.code || 'DOJO'}_${activeClassId}_${activeMonth.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Student
  const handleAddStudent = (
    name: string, belt: string, dob: string, phone: string, cls: string, registeredDays: number[]
  ) => {
    if (!activeRolePermissions.canAddStudent) {
      alert('Admin chưa cấp quyền thêm võ sinh cho vai trò này!');
      return;
    }

    const newStu: Student = {
      stt: students.length + 1,
      id: 'STU-' + (students.length + 1).toString().padStart(2, '0'),
      dojoId: effectiveDojoId,
      name: name.trim(),
      belt,
      dob: dob.trim(),
      parentPhone: phone.trim(),
      registrationClass: cls.trim(),
      registeredDays,
      tuitionStatus: 'UNPAID'
    };

    setStudents(prev => [...prev, newStu]);
  };

  // Add Date
  const handleAddDate = (dayName: string, dateStr: string, dayNumber: number) => {
    if (!activeRolePermissions.canAddDateSession) {
      alert('Admin chưa cấp quyền thêm ngày tập mới cho vai trò này!');
      return;
    }

    const id = 'D' + dateStr.replace(/[^0-9]/g, '');
    const newDate: AttendanceSessionDate = {
      id: id || ('D' + Date.now()),
      dayName,
      dayNumber,
      dateStr: dateStr.trim(),
      fullDate: `${dateStr.trim()}/2026`
    };

    setDates(prev => [...prev, newDate]);
    setSelectedDateId(newDate.id);
  };

  // Add Class
  const handleAddClass = (
    name: string, activeDays: number[], startTime: string, endTime: string, schedule: string, venue: string
  ) => {
    const id = 'CLS-' + Date.now().toString().slice(-4);
    const newCls: DojoClass = {
      id,
      dojoId: effectiveDojoId,
      name,
      activeDays,
      startTime,
      endTime,
      schedule,
      venue,
      instructorName: currentUser?.fullName || 'Huấn luyện viên phụ trách'
    };
    setClasses(prev => [...prev, newCls]);
    setActiveClassId(newCls.id);
  };

  // Delete Class (Requires DOJO_ADMIN or SUPER_ADMIN + Hold 10s + Password verification)
  const handleDeleteClass = (classId: string, passwordInput: string): { success: boolean; message?: string } => {
    if (!currentUser || (currentUser.role !== 'DOJO_ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
      return { success: false, message: 'Bạn không có quyền quản trị để xóa lớp học!' };
    }

    if (passwordInput !== currentUser.password) {
      return { success: false, message: 'Mật khẩu tài khoản không chính xác! Vui lòng thử lại.' };
    }

    const targetClass = classes.find(c => c.id === classId);
    const targetName = targetClass?.name || classId;

    const updatedClasses = classes.filter(c => c.id !== classId);
    setClasses(updatedClasses);
    saveToStorage('ea_classes', updatedClasses);

    // If active class is deleted, switch to the first remaining class in the current dojo
    const remainingDojoClasses = updatedClasses.filter(c => !c.dojoId || c.dojoId === effectiveDojoId);
    if (activeClassId === classId) {
      if (remainingDojoClasses.length > 0) {
        setActiveClassId(remainingDojoClasses[0].id);
        saveToStorage(`ea_active_class_${effectiveDojoId}`, remainingDojoClasses[0].id);
      } else {
        setActiveClassId('');
      }
    }

    // Clean up all local storage data for this class
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes(`_${classId}_`) || key.includes(`_${classId}`))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Storage cleanup warning', e);
    }

    alert(`Đã xóa vĩnh viễn lớp "${targetName}" thành công!`);
    return { success: true };
  };

  // Month Rollover
  const handleRolloverMonth = (newMonthName: string) => {
    if (!availableMonths.includes(newMonthName)) {
      setAvailableMonths(prev => [...prev, newMonthName]);
    }
    setActiveMonth(newMonthName);

    const freshDates: AttendanceSessionDate[] = [
      { id: 'D0310', dayName: 'Thứ 7', dayNumber: 7, dateStr: '03/10', fullDate: '03/10/2026' },
      { id: 'D0710', dayName: 'Thứ 4', dayNumber: 4, dateStr: '07/10', fullDate: '07/10/2026' },
      { id: 'D1010', dayName: 'Thứ 7', dayNumber: 7, dateStr: '10/10', fullDate: '10/10/2026' },
      { id: 'D1410', dayName: 'Thứ 4', dayNumber: 4, dateStr: '14/10', fullDate: '14/10/2026' },
      { id: 'D1710', dayName: 'Thứ 7', dayNumber: 7, dateStr: '17/10', fullDate: '17/10/2026' },
      { id: 'D2110', dayName: 'Thứ 4', dayNumber: 4, dateStr: '21/10', fullDate: '21/10/2026' },
      { id: 'D2410', dayName: 'Thứ 7', dayNumber: 7, dateStr: '24/10', fullDate: '24/10/2026' },
      { id: 'D2810', dayName: 'Thứ 4', dayNumber: 4, dateStr: '28/10', fullDate: '28/10/2026' },
      { id: 'D3110', dayName: 'Thứ 7', dayNumber: 7, dateStr: '31/10', fullDate: '31/10/2026' }
    ];

    const rolledStudents: Student[] = students.map(s => ({
      ...s,
      tuitionStatus: 'UNPAID',
      tuitionNote: ''
    }));

    const freshAttendance: Record<string, Record<string, boolean>> = {};

    const key = `ea_data_${effectiveDojoId}_${activeClassId}_${newMonthName}`;
    saveToStorage(`${key}_students`, rolledStudents);
    saveToStorage(`${key}_dates`, freshDates);
    saveToStorage(`${key}_attendance`, freshAttendance);

    setStudents(rolledStudents);
    setDates(freshDates);
    setAttendance(freshAttendance);
    setSelectedDateId(freshDates[0].id);
  };

  // Backup System: Export JSON
  const handleExportBackup = () => {
    const backupData = {
      dojos,
      accounts,
      classes,
      activeClassId,
      availableMonths,
      activeMonth,
      permissions,
      students,
      dates,
      attendance,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Diem_Danh_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Backup System: Import JSON
  const handleImportBackup = (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.classes && data.students && data.dates) {
        if (data.dojos) setDojos(data.dojos);
        if (data.accounts) setAccounts(data.accounts);
        if (data.permissions) setPermissions(data.permissions);
        if (data.classes) setClasses(data.classes);
        if (data.students) setStudents(data.students);
        if (data.dates) setDates(data.dates);
        if (data.attendance) setAttendance(data.attendance);
        alert('Phục hồi dữ liệu từ file sao lưu thành công!');
      } else {
        alert('File JSON không đúng định dạng dữ liệu điểm danh!');
      }
    } catch {
      alert('Lỗi đọc file sao lưu JSON!');
    }
  };

  // Factory Reset
  const handleResetAllData = () => {
    localStorage.clear();
    setPermissions(defaultPermissions);
    setDojos(initialDojos);
    setAccounts(initialAccounts);
    setClasses(initialClasses);
    setActiveClassId('CLS-TP');
    setStudents(initialStudents);
    setDates(initialDates);
    setAttendance(initialAttendanceMap);
    setCurrentUser(initialAccounts[0]);
    alert('Đã khôi phục toàn bộ hệ thống về dữ liệu gốc ban đầu thành công!');
  };

  // Counts
  const getPresentCountForDate = (dateId: string) => {
    return students.filter(s => !!attendance[s.id]?.[dateId]).length;
  };

  const getTotalPresentForStudent = (studentId: string) => {
    const studentDates = attendance[studentId] || {};
    return Object.values(studentDates).filter(Boolean).length;
  };

  const paidCount = students.filter(s => s.tuitionStatus === 'PAID').length;

  // Filtered Students for Roll Call
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = !searchTerm.trim() || matchStudentSearch(s, searchTerm).matched;
      const matchClass = filterClass === 'ALL' || s.registrationClass === filterClass;
      const matchTuition = !activeRolePermissions.canViewTuition || filterTuition === 'ALL' || s.tuitionStatus === filterTuition;
      return matchSearch && matchClass && matchTuition;
    });
  }, [students, searchTerm, filterClass, filterTuition, activeRolePermissions.canViewTuition]);

  const currentClassObj = dojoClasses.find(c => c.id === activeClassId);
  const classCodePrefix = currentDojo?.code || 'TP';

  const availableRegistrationClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.registrationClass) set.add(s.registrationClass);
    });
    return Array.from(set);
  }, [students]);

  const selectedDateObj = useMemo(() => {
    return dates.find(d => d.id === selectedDateId) || dates[0] || {
      id: 'D00',
      dayName: 'Hôm nay',
      dayNumber: 0,
      dateStr: '11/09',
      fullDate: '11/09/2026'
    };
  }, [dates, selectedDateId]);

  // Aggregated list of students from all other classes in the SAME Dojo for make-up search
  const allDojoStudentsWithClass = useMemo(() => {
    const list: DojoCrossStudent[] = [];
    dojoClasses.forEach(cls => {
      if (cls.id === activeClassId) return; // Only from other classes
      const key = `ea_data_${effectiveDojoId}_${cls.id}_${activeMonth}_students`;
      const defaultStudents = getDefaultStudentsForClass(effectiveDojoId, cls.id);
      const clsStudents = loadFromStorage<Student[]>(key, defaultStudents);
      clsStudents.forEach(s => {
        if (!list.some(item => item.id === s.id)) {
          list.push({
            ...s,
            originClassName: cls.name,
            originClassId: cls.id
          });
        }
      });
    });
    return list;
  }, [dojoClasses, effectiveDojoId, activeMonth, activeClassId]);

  const currentClassStudentIds = useMemo(() => {
    return new Set(students.map(s => s.id));
  }, [students]);

  const handleSelectMakeupStudent = (student: Student, originClassName: string) => {
    const existing = students.find(s => s.id === student.id);
    if (!existing) {
      const makeupStudent: Student = {
        ...student,
        stt: students.length + 1,
        isMakeup: true,
        originClassName
      };
      setStudents(prev => [...prev, makeupStudent]);
    }

    // Automatically mark attendance as present for the selected date
    setAttendance(prev => {
      const studentDates = prev[student.id] || {};
      return {
        ...prev,
        [student.id]: {
          ...studentDates,
          [selectedDateId]: true
        }
      };
    });
  };

  // =========================================================================
  // IF NOT LOGGED IN: RENDER LOGIN VIEW
  // =========================================================================
  if (!currentUser) {
    return <LoginView accounts={accounts} onLogin={handleLogin} />;
  }

  const isDojoAdmin = currentUser.role === 'DOJO_ADMIN';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const canAccessDashboard = isSuperAdmin || isDojoAdmin;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans pb-12">
      <Header
        currentUser={currentUser}
        currentDojo={currentDojo}
        allDojos={dojos}
        onSelectDojo={(dojoId) => setSuperAdminDojoId(dojoId)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
        viewMode={viewMode}
        setViewMode={setViewMode}
        studentCount={students.length}
        classes={dojoClasses}
        activeClassId={activeClassId}
        setActiveClassId={setActiveClassId}
        activeMonth={activeMonth}
        setActiveMonth={setActiveMonth}
        availableMonths={availableMonths}
        onOpenAddClass={() => setIsAddClassOpen(true)}
        onOpenRollover={() => setIsRolloverOpen(true)}
        onOpenAddStudent={() => setIsAddStudentOpen(true)}
        onOpenAddDate={() => setIsAddDateOpen(true)}
        onExportCSV={exportToCSV}
        permissions={activeRolePermissions}
        onOpenShareZalo={() => handleOpenShareZalo()}
        onRequestDeleteClass={handleRequestDeleteClass}
      />

      <main className="max-w-7xl w-full mx-auto px-2.5 sm:px-6 pt-3 flex-1">
        
        {/* VIEW 1: DEDICATED ADMIN MANAGEMENT DASHBOARD */}
        {viewMode === 'ADMIN_DASHBOARD' && canAccessDashboard ? (
          <AdminDashboardView
            currentUser={currentUser}
            dojos={dojos}
            activeDojo={currentDojo}
            accounts={accounts}
            permissions={permissions}
            onUpdatePermissions={setPermissions}
            onResetPermissions={() => setPermissions(defaultPermissions)}
            students={students}
            onAddStudent={() => setIsAddStudentOpen(true)}
            onEditStudentSchedule={handleOpenEditSchedule}
            onEditStudentInfo={handleOpenEditStudentInfo}
            onDeleteStudent={handleDeleteStudent}
            classes={dojoClasses}
            activeClassId={activeClassId}
            onOpenAddClass={() => setIsAddClassOpen(true)}
            onBackToAttendance={() => setViewMode('MOBILE')}
            onAddDojo={handleAddDojo}
            onUpdateDojo={handleUpdateDojo}
            onDeleteDojo={handleDeleteDojo}
            onAddStaffAccount={handleAddStaffAccount}
            onUpdateStaffAccount={handleUpdateStaffAccount}
            onToggleAccountStatus={handleToggleAccountStatus}
            onDeleteAccount={handleDeleteAccount}
            onResetPasswordToDefault={handleResetPasswordToDefault}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onResetAllData={handleResetAllData}
            onRequestDeleteClass={handleRequestDeleteClass}
          />
        ) : (
          /* VIEW 2: ROLL CALL ATTENDANCE VIEWS (MOBILE OR SHEET) */
          <>
            {/* Sleek, Modern Sub-Bar */}
            <div className="mb-3 px-1 flex flex-wrap items-center justify-between gap-2 text-xs">
              
              {/* Context info: Dojo & schedule & instructor */}
              <div className="flex items-center gap-2 text-slate-500 font-medium flex-wrap">
                <span className="font-extrabold text-slate-800 text-xs sm:text-sm flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{currentDojo?.name}</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {currentClassObj?.schedule || 'Lịch tập'}
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="hidden sm:inline text-slate-600 font-medium">
                  {currentClassObj?.instructorName || currentUser.fullName}
                </span>
              </div>

              {/* Fast 1-touch Actions for current role */}
              <div className="flex items-center gap-1.5">
                {canAccessDashboard && (
                  <button
                    onClick={() => setViewMode('ADMIN_DASHBOARD')}
                    className="px-2.5 py-1 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                    title="Mở Bảng Quản Trị Hệ Thống"
                  >
                    <Sliders className="w-3 h-3 text-purple-700" />
                    <span className="hidden sm:inline">Quản Trị</span>
                  </button>
                )}

                {/* Cross-Class Makeup Search: GVCN, HLV, and Admin can all search for makeup students */}
                <button
                  onClick={() => setIsCrossSearchOpen(true)}
                  className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Tìm kiếm võ sinh các lớp khác trong võ đường để điểm danh học bù"
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-200" />
                  <span>+ Tìm Học Bù</span>
                </button>

                {activeRolePermissions.canAddStudent && (
                  <button
                    onClick={() => setIsAddStudentOpen(true)}
                    className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                    title="Thêm võ sinh mới vào lớp"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">+ Thêm Võ Sinh</span>
                  </button>
                )}
              </div>

            </div>

            {/* Mobile View vs Sheet View */}
            {viewMode === 'MOBILE' ? (
              <MobileAttendanceView
                dates={dates}
                selectedDateId={selectedDateId}
                setSelectedDateId={setSelectedDateId}
                filteredStudents={filteredStudents}
                attendance={attendance}
                toggleAttendance={toggleAttendance}
                markAllForDate={markAllForDate}
                getPresentCountForDate={getPresentCountForDate}
                getTotalPresentForStudent={getTotalPresentForStudent}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterClass={filterClass}
                setFilterClass={setFilterClass}
                totalStudentsCount={students.length}
                filterTuition={filterTuition}
                setFilterTuition={setFilterTuition}
                toggleTuitionStatus={toggleTuitionStatus}
                paidCount={paidCount}
                currentRole={currentUser.role}
                onEditStudentSchedule={handleOpenEditSchedule}
                permissions={activeRolePermissions}
                onOpenShareZalo={handleOpenShareZalo}
                onOpenCrossSearch={handleOpenCrossSearch}
                availableRegistrationClasses={availableRegistrationClasses}
              />
            ) : (
              <SheetAttendanceView
                students={filteredStudents}
                dates={dates}
                attendance={attendance}
                toggleAttendance={toggleAttendance}
                getPresentCountForDate={getPresentCountForDate}
                getTotalPresentForStudent={getTotalPresentForStudent}
                exportToCSV={exportToCSV}
                toggleTuitionStatus={toggleTuitionStatus}
                paidCount={paidCount}
                currentRole={currentUser.role}
                onEditStudentSchedule={handleOpenEditSchedule}
                permissions={activeRolePermissions}
                onOpenShareZalo={handleOpenShareZalo}
                onOpenCrossSearch={handleOpenCrossSearch}
              />
            )}
          </>
        )}

      </main>

      {/* Admin / Teacher Modals */}
      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onAdd={handleAddStudent}
        classPrefix={classCodePrefix}
      />

      <AddDateModal
        isOpen={isAddDateOpen}
        onClose={() => setIsAddDateOpen(false)}
        onAdd={handleAddDate}
      />

      <AddClassModal
        isOpen={isAddClassOpen}
        onClose={() => setIsAddClassOpen(false)}
        onAdd={handleAddClass}
      />

      <RolloverMonthModal
        isOpen={isRolloverOpen}
        onClose={() => setIsRolloverOpen(false)}
        onRollover={handleRolloverMonth}
        currentMonth={activeMonth}
        studentCount={students.length}
      />

      <EditStudentScheduleModal
        isOpen={isEditScheduleOpen}
        onClose={() => setIsEditScheduleOpen(false)}
        student={selectedStudentForSchedule}
        onSave={handleSaveStudentSchedule}
        classPrefix={classCodePrefix}
        currentRole={currentUser.role}
      />

      <EditStudentInfoModal
        isOpen={isEditStudentInfoOpen}
        onClose={() => setIsEditStudentInfoOpen(false)}
        student={selectedStudentForInfo}
        onSave={handleSaveStudentInfo}
      />

      {/* User Profile & Password Change Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        currentDojo={currentDojo}
        onUpdateProfile={handleUpdateProfile}
        onChangePassword={handleChangePassword}
        onLogout={handleLogout}
      />

      {/* Share Attendance Report to Zalo Modal */}
      <ShareAttendanceModal
        isOpen={isShareZaloOpen}
        onClose={() => setIsShareZaloOpen(false)}
        dojoName={currentDojo?.name || 'Võ Thuật Trung Phụng'}
        className={currentClassObj?.name || 'Lớp Võ Thuật'}
        dates={dates}
        currentDateId={shareZaloDateId || selectedDateId || dates[0]?.id || ''}
        students={students}
        attendance={attendance}
        initialClassFilter={shareZaloClassFilter}
      />

      {/* Cross-Class Search for Makeup Attendance Modal */}
      <CrossClassSearchModal
        isOpen={isCrossSearchOpen}
        onClose={() => setIsCrossSearchOpen(false)}
        initialSearchTerm={crossSearchInitialTerm}
        dojoName={currentDojo?.name || 'Võ Đường'}
        currentClassId={activeClassId}
        currentClassName={currentClassObj?.name || 'Lớp Hiện Tại'}
        selectedDateObj={selectedDateObj}
        studentsFromOtherClasses={allDojoStudentsWithClass}
        currentClassStudentIds={currentClassStudentIds}
        onSelectMakeupStudent={handleSelectMakeupStudent}
      />

      {/* Delete Class Password Confirmation Modal (Requires 10s Hold First) */}
      <DeleteClassPasswordModal
        isOpen={isDeleteClassModalOpen}
        onClose={() => {
          setIsDeleteClassModalOpen(false);
          setClassPendingDelete(null);
        }}
        classItem={classPendingDelete}
        currentUser={currentUser}
        studentCount={
          classPendingDelete?.id === activeClassId 
            ? students.length 
            : (classPendingDelete ? loadFromStorage(`ea_data_${effectiveDojoId}_${classPendingDelete.id}_${activeMonth}_students`, getDefaultStudentsForClass(effectiveDojoId, classPendingDelete.id)).length : 0)
        }
        onConfirm={handleDeleteClass}
      />

    </div>
  );
};

export default App;
