export type UserRole = 'SUPER_ADMIN' | 'DOJO_ADMIN' | 'TEACHER' | 'COACH';

export type TuitionStatus = 'PAID' | 'UNPAID' | 'PARTIAL';

export interface Dojo {
  id: string;             // VD: 'DOJO-TP', 'DOJO-CG'
  name: string;           // 'Võ Thuật Trung Phụng', 'CLB Cầu Giấy'
  code: string;           // 'TP', 'CG'
  address: string;        // Địa chỉ võ đường / cơ sở
  phone: string;          // Số điện thoại hotline
  adminUsername: string;  // Tên đăng nhập của tài khoản quản trị võ đường
  status: 'ACTIVE' | 'LOCKED';
  createdAt: string;
}

export interface UserAccount {
  id: string;             // VD: 'USR-001'
  username: string;       // Unique, chữ thường không dấu (VD: 'admin', 'dojo_tp', 'gv_lan')
  password: string;       // Mật khẩu tài khoản (mặc định khởi tạo hoặc reset là '123456')
  fullName: string;       // Họ và tên người dùng
  role: UserRole;
  dojoId: string;         // 'ALL' (cho Super Admin) hoặc ID võ đường cụ thể ('DOJO-TP')
  phone: string;
  email?: string;
  status: 'ACTIVE' | 'LOCKED';
  createdAt: string;
  lastLogin?: string;
}

export interface Student {
  stt: number;
  id: string;
  dojoId?: string; // ID võ đường mà võ sinh trực thuộc
  name: string;
  belt: string; // 'Trắng kyu 10', 'Cam kyu 8', 'Vàng kyu 9'
  dob: string;  // '03/08/2020', '1/1/2019'
  parentPhone: string;
  registeredDays?: number[]; // [4, 7] for T4 & T7, [7] for T7, etc.
  registrationClass: string; // 'TP 4, 7', 'TP 7', 'TP 4', etc.
  tuitionStatus: TuitionStatus;
  tuitionNote?: string;
  notes?: string;
  isMakeup?: boolean; // Học bù từ lớp khác sang
  originClassName?: string; // Tên lớp gốc của võ sinh
}

export interface AttendanceSessionDate {
  id: string;
  dayName: string; // 'Thứ 7', 'Thứ 4'
  dayNumber?: number; // 4 for T4, 7 for T7
  dateStr: string; // '05/09', '09/09', '12/09'
  fullDate: string;
}

export interface DojoClass {
  id: string;
  dojoId?: string; // ID võ đường
  name: string;
  activeDays: number[]; // [4, 7]
  startTime: string;
  endTime: string;
  schedule: string;
  venue: string;
  instructorName: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  pin?: string;
}

export interface RolePermissions {
  canViewTuition: boolean;          // Xem trạng thái học phí
  canEditTuition: boolean;          // Đổi trạng thái nộp học phí
  canEditSchedule: boolean;         // Xếp/đổi lịch tập võ sinh (checkbox)
  canTakeAttendance: boolean;       // Điểm danh võ sinh
  canAddStudent: boolean;           // Thêm võ sinh mới vào lớp
  canEditStudentInfo: boolean;      // Chỉnh sửa thông tin võ sinh (Tên, SĐT, Cấp đai)
  canDeleteStudent: boolean;        // Xóa võ sinh khỏi danh sách
  canAddDateSession: boolean;       // Thêm cột ngày tập mới
  canExportData: boolean;           // Xuất file Excel (.CSV)
}

export interface AppPermissions {
  COACH: RolePermissions;
  TEACHER: RolePermissions;
}

export const defaultPermissions: AppPermissions = {
  COACH: {
    canViewTuition: false,
    canEditTuition: false,
    canEditSchedule: false,
    canTakeAttendance: true,
    canAddStudent: false,
    canEditStudentInfo: false,
    canDeleteStudent: false,
    canAddDateSession: false,
    canExportData: true
  },
  TEACHER: {
    canViewTuition: false,
    canEditTuition: false,
    canEditSchedule: true,
    canTakeAttendance: true,
    canAddStudent: true,
    canEditStudentInfo: true,
    canDeleteStudent: false,
    canAddDateSession: true,
    canExportData: true
  }
};
