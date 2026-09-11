import type { UserAccount } from '../types';

export type PermissionSet = {
  canViewTuition: boolean;
  canEditTuition: boolean;
  canEditSchedule: boolean;
  canTakeAttendance: boolean;
  canAddStudent: boolean;
  canEditStudentInfo: boolean;
  canDeleteStudent: boolean;
  canAddDateSession: boolean;
  canExportData: boolean;
};

export type ServerUser = {
  id: string;
  username: string;
  fullName: string;
  role: UserAccount['role'];
  dojoId: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  dojo?: { id: string; code: string; name: string; status: string } | null;
  permissions: PermissionSet;
};

export type Dojo = { id: string; code: string; name: string; status: string; address?: string; phone?: string };
export type ClassItem = { id: string; dojoId: string; code: string; name: string; activeDays: number[]; startTime?: string; endTime?: string; venue?: string; instructorName?: string; _count?: { enrollments: number; sessions: number } };
export type Enrollment = { id: string; classId: string; studentId: string; isPrimary: boolean; endedAt?: string | null; class: ClassItem };
export type StudentItem = {
  id: string;
  dojoId: string;
  code: string;
  name: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  belt?: string | null;
  dob?: string | null;
  parentPhone?: string | null;
  contactName?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt: string;
  enrollments: Enrollment[];
};
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type AttendanceType = 'NORMAL' | 'MAKEUP' | 'TRIAL';
export type AttendanceRecord = { id: string; studentId: string; status: AttendanceStatus; type: AttendanceType; registeredClassId: string; attendedClassId: string; lateMinutes?: number | null; note?: string; checkedAt?: string; createdAt?: string; updatedAt: string; student?: StudentItem; registeredClass?: ClassItem };
export type Session = { id: string; classId: string; dojoId: string; sessionDate: string; title?: string; isFinalized: boolean; finalizedAt?: string | null; records?: AttendanceRecord[]; _count?: { records: number }; class?: ClassItem };
export type Invoice = { id: string; studentId: string; monthKey: string; amountDue: number; totalPaid: number; status: 'UNPAID'|'PARTIAL'|'PAID'; student: StudentItem; payments?: Array<{ id: string; amount: number; paidAt: string; method?: string }> };
export type AdminUser = { id: string; username: string; fullName: string; role: string; status: string; dojoId: string; phone?: string; email?: string; lastLoginAt?: string };
export type AuditLog = { id: string; action: string; entityType: string; entityId?: string; createdAt: string; actor?: { username: string; fullName: string; role: string }; metadata?: Record<string, unknown> };
export type Tab = 'attendance' | 'students' | 'tuition' | 'admin';
