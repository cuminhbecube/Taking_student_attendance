# Kế hoạch triển khai full-stack cho Taking_student_attendance

## Trạng thái hiện tại

| Phase | Trạng thái | Kết quả |
|---|---|---|
| 0 — Baseline / kiến trúc | ✅ Hoàn tất | Frontend legacy được giữ để đối chiếu; production entry chuyển sang `ProductionApp` modular |
| 1 — Backend foundation | ✅ Hoàn tất | Fastify 5 + TypeScript + health endpoint + env/CORS |
| 2 — Database schema | ✅ Hoàn tất | PostgreSQL + Prisma schema + migration production đã commit |
| 3 — Authentication + RBAC | ✅ Hoàn tất | bcrypt, JWT, HttpOnly cookie, role + permission guard, tenant isolation |
| 4 — Dojo/Class/Student | ✅ Hoàn tất core | CRUD, enrollment, tìm tiếng Việt không dấu, admin class UI |
| 5 — Attendance | ✅ Hoàn tất core | NORMAL/MAKEUP/TRIAL, bulk, finalize, audit, conflict detection |
| 6 — Tuition | ✅ Hoàn tất core | invoice, partial payment, status derivation, overpayment guard |
| 7 — Frontend migration | ✅ Hoàn tất core | Auth/Class/Student/Attendance/Tuition/Admin đều dùng API server-side |
| 8 — Multi-device sync | ✅ MVP hoàn tất | Polling + `updatedAt` optimistic conflict guard; SSE/WebSocket để sau MVP |
| 9 — Security hardening | ✅ MVP hoàn tất | Helmet, rate-limit, HttpOnly cookie, demo guard, backup/restore, HTTPS deployment guide |
| 10 — CI/Test/Deploy | ✅ Hoàn tất core | Build + audit + PostgreSQL migrations + multi-suite E2E/regression + production Docker smoke |

### Các hạng mục hậu MVP
- SSE/WebSocket thay polling nếu cần realtime tức thời.
- Browser E2E bằng Playwright cho các thao tác UI quan trọng.
- Package lock riêng cho `server/` để dependency backend reproducible tuyệt đối.
- Chính sách retention/archival AuditLog dài hạn.
- Tự động hóa backup off-host và kiểm thử restore định kỳ.
- QR attendance nếu nghiệp vụ thực tế yêu cầu.

## Mục tiêu
Chuyển dự án từ prototype React + localStorage sang hệ thống full-stack có backend, database, xác thực, RBAC và dữ liệu multi-tenant an toàn.

## Nguyên tắc triển khai
- Server là source of truth cho dữ liệu nghiệp vụ.
- Multi-tenant được enforce ở backend bằng `dojoId` từ phiên đăng nhập; không tin scope do client gửi.
- Mật khẩu chỉ lưu dạng bcrypt hash.
- Điểm danh, học phí và thao tác quản trị quan trọng có audit trail.
- Mọi thay đổi quan trọng phải có tiêu chí PASS/FAIL và regression test khi phù hợp.
- Production schema chỉ triển khai bằng Prisma migrations, không bằng `db push`.

## Phase 0 — Baseline và dọn kiến trúc
### Đã triển khai
- Giữ `src/App.tsx` legacy để đối chiếu.
- Production dùng `src/ProductionApp.tsx` và các domain panel dưới `src/app/`.
- Business data không còn dựa vào localStorage.

### PASS
- Frontend production build thành công trong CI.

## Phase 1 — Backend foundation
### Đã triển khai
- Node.js + TypeScript + Fastify.
- Prisma + PostgreSQL.
- `GET /api/health`.
- Env validation, CORS, error mapping.

### PASS
- Backend compile và healthcheck thành công.

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

### Đã triển khai thêm
- Unique/index cho tenant/business keys.
- `prisma/migrations/20260911010000_init/migration.sql`.
- CI chạy `prisma migrate deploy` trên PostgreSQL sạch.

## Phase 3 — Authentication + RBAC
### Đã triển khai
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`.
- bcrypt password verification.
- JWT 12 giờ trong HttpOnly cookie; Bearer hỗ trợ test/CLI.
- Account/dojo lock.
- Role guard + permission guard đọc DB để permission revoke có hiệu lực ngay.
- Password change/reset.

### PASS
- Sai mật khẩu -> 401.
- Tài khoản/võ đường LOCKED -> 403.
- Cookie-only `/auth/me` PASS trong regression test.
- User dojo A không truy cập dữ liệu dojo B.

## Phase 4 — Dojo/Class/Student API
### Đã triển khai
- Dojo admin API.
- CRUD class + UI quản trị lớp.
- CRUD/soft-deactivate student.
- Enrollment / unenrollment.
- Search student không dấu bằng Unicode normalization.

### PASS
- Cross-tenant read/write bị chặn.
- Class create → patch → delete được regression test.
- `Nguyễn Đức` tìm bằng `nguyen duc` được functional regression test.

## Phase 5 — Attendance API
### Đã triển khai
- Session theo lớp/ngày, ngày được normalize để tránh duplicate khác giờ.
- PRESENT/ABSENT/LATE/EXCUSED.
- NORMAL/MAKEUP/TRIAL.
- Bulk attendance.
- Finalize session.
- AuditLog.
- `expectedUpdatedAt` chống silent overwrite giữa nhiều thiết bị.
- Export CSV + PNG/Web Share.

### PASS
- Unique `(sessionId, studentId)`.
- Finalized session không chỉnh được.
- Stale writer nhận `409 ATTENDANCE_CONFLICT`.
- Học bù lưu cả lớp đăng ký và lớp thực tế.

## Phase 6 — Tuition API
### Đã triển khai
- Invoice theo tháng.
- Nhiều payment hỗ trợ PARTIAL.
- Tổng tiền thực tế quyết định UNPAID/PARTIAL/PAID.
- Chặn overpayment.
- Permission `canViewTuition` / `canEditTuition`.

## Phase 7 — Frontend migration
### Đã triển khai
- API client.
- Current user/dojo scope.
- AttendancePanel.
- StudentsPanel.
- TuitionPanel.
- AdminPanel.
- Class management.
- Production login không lưu JWT trong localStorage.
- Demo credential chỉ hiện ở DEV hoặc khi bật cờ explicit.

## Phase 8 — Đồng bộ nhiều thiết bị
### Đã triển khai
- Server là source of truth.
- Poll attendance định kỳ.
- `updatedAt` + conflict response để ngăn ghi đè dữ liệu mới.
- Permission/session refresh định kỳ.

### Hậu MVP
- SSE/WebSocket nếu cần cập nhật tức thời thay polling.

## Phase 9 — Bảo mật và production hardening
### Đã triển khai
- Helmet/security headers.
- Global rate limiting + login limit.
- HttpOnly session cookie.
- CORS allow-list.
- Demo seed bị từ chối khi `NODE_ENV=production` trừ explicit override.
- PostgreSQL backup/restore scripts.
- Nginx reverse proxy; HTTPS được terminate ở proxy/load balancer phía trước.
- Production `.env` mẫu không chứa secret thật.

## Phase 10 — CI/Test/Deploy
### Đã triển khai
- Frontend build.
- Backend TypeScript build.
- `npm audit` gate.
- Prisma generate/validate/migrate deploy.
- PostgreSQL 16 service thật.
- E2E 50+ assertions.
- Regression: HttpOnly cookie, session date normalization, concurrency, permission revoke.
- Functional regression: search không dấu, tenant isolation, class CRUD lifecycle.
- Docker production stack: PostgreSQL + API + Nginx/Web.
- `deploy-smoke` build/start stack thật và gọi `/healthz` qua Nginx.

## Tiêu chí trước merge vào `main`
1. Frontend job PASS.
2. Backend job PASS gồm audit + migration + all test suites.
3. `deploy-smoke` PASS.
4. Không còn migration/schema drift.
5. PR diff được rà lần cuối về secret/demo credential/tenant scope.
6. PR chỉ chuyển khỏi Draft sau khi head cuối cùng đạt toàn bộ tiêu chí trên.
