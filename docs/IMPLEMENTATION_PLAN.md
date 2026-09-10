# Kế hoạch triển khai full-stack cho Taking_student_attendance

## Mục tiêu
Chuyển dự án từ prototype React + localStorage sang hệ thống full-stack có backend, database, xác thực, RBAC và dữ liệu multi-tenant an toàn.

## Nguyên tắc triển khai
- Không phá UI hiện tại trong giai đoạn đầu.
- Mọi thay đổi backend được làm song song, frontend migrate từng module.
- Multi-tenant phải được enforce ở backend bằng dojoId lấy từ phiên đăng nhập, không tin dojoId do client gửi.
- Mật khẩu chỉ lưu dạng hash.
- Điểm danh và học phí phải có audit trail.
- Mỗi bước có tiêu chí PASS/FAIL rõ ràng.

## Phase 0 — Baseline và dọn kiến trúc
### Công việc
1. Giữ `src/App.tsx` làm luồng frontend hiện hành.
2. Đánh dấu `src/context/AppContext.tsx` và các view cũ là legacy nếu không còn import.
3. Không xóa ngay code legacy trước khi build/test xác nhận.
4. Ghi lại data model chính: Dojo, UserAccount, DojoClass, Student, AttendanceSession, AttendanceRecord, TuitionPayment, AuditLog.

### PASS
- `npm run build` frontend vẫn thành công.
- Không thay đổi hành vi UI hiện tại.

## Phase 1 — Backend foundation
### Công việc
- Tạo `server/` dùng Node.js + TypeScript + Fastify.
- Prisma + PostgreSQL.
- Health endpoint `GET /api/health`.
- Cấu hình env và CORS.

### PASS
- Backend compile thành công.
- `GET /api/health` trả `{ status: "ok" }`.

## Phase 2 — Database schema
### Bảng chính
- Dojo
- User
- RolePermission
- DojoClass
- Student
- ClassEnrollment
- AttendanceSession
- AttendanceRecord
- TuitionInvoice
- TuitionPayment
- AuditLog

### PASS
- `prisma validate` thành công.
- Có unique/index cho username, dojo/code, student/code và attendance session/student.

## Phase 3 — Authentication + RBAC
### Công việc
- `POST /api/auth/login`
- JWT access token.
- bcrypt password verification.
- Middleware `authenticate`.
- Middleware role/permission.
- `GET /api/auth/me`.

### PASS
- Sai mật khẩu -> 401.
- Tài khoản LOCKED -> 403.
- User dojo A không truy cập dữ liệu dojo B.

## Phase 4 — Dojo/Class/Student API
### API
- `GET /api/dojos` (SUPER_ADMIN)
- CRUD class.
- CRUD student.
- Search student không dấu.

### PASS
- TEACHER/COACH chỉ đọc dữ liệu đúng dojo.
- Các thao tác sửa/xóa bị chặn nếu không có quyền.

## Phase 5 — Attendance API
### API
- Tạo session theo lớp/ngày.
- Điểm danh PRESENT/ABSENT/LATE/EXCUSED.
- Batch mark present.
- Makeup attendance: lưu `registeredClassId` và `attendedClassId`.
- Finalize session.

### PASS
- Unique `(sessionId, studentId)`.
- Session finalized không được chỉnh nếu không có quyền override.
- Mọi thay đổi tạo AuditLog.

## Phase 6 — Tuition API
### Công việc
- Invoice theo tháng.
- Payment nhiều lần hỗ trợ PARTIAL.
- Tính PAID/PARTIAL/UNPAID từ dữ liệu thật, không chỉ lưu cờ.

### PASS
- Tổng payment được tính chính xác.
- COACH mặc định không xem/sửa học phí.

## Phase 7 — Frontend migration
### Thứ tự
1. Auth
2. Current user / dojo context
3. Class
4. Student
5. Attendance
6. Tuition
7. Admin accounts/permissions

### Chiến lược
- Tạo `src/services/api.ts`.
- Giữ localStorage adapter tạm thời làm fallback trong lúc migrate.
- Khi module đã migrate xong mới bỏ localStorage tương ứng.

## Phase 8 — Đồng bộ nhiều thiết bị
- Server là source of truth.
- Optimistic UI có rollback khi API lỗi.
- Có `updatedAt` để phát hiện dữ liệu cũ.
- Sau MVP có thể thêm WebSocket/SSE để cập nhật điểm danh realtime.

## Phase 9 — Bảo mật và production hardening
- Rate limit login.
- Helmet/security headers.
- Refresh token hoặc session cookie HttpOnly.
- Audit log bất biến ở tầng ứng dụng.
- Backup PostgreSQL.
- HTTPS reverse proxy.
- Không để tài khoản demo trong production.

## Phase 10 — CI/Test/Deploy
- Unit test service.
- Integration test auth/RBAC/attendance.
- GitHub Actions build frontend + backend + prisma validate.
- Docker Compose: PostgreSQL + API + frontend/reverse proxy.

## Thứ tự commit đề xuất
1. `docs: add full-stack migration plan`
2. `feat(server): add Fastify TypeScript foundation`
3. `feat(db): add Prisma multi-tenant schema`
4. `feat(auth): add JWT login and RBAC middleware`
5. `feat(api): add dojo class and student endpoints`
6. `feat(api): add attendance and audit endpoints`
7. `feat(api): add tuition endpoints`
8. `refactor(web): add API client and migrate auth`
9. `refactor(web): migrate attendance and tuition`
10. `ci: add full-stack checks`
