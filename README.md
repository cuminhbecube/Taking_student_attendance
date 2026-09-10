# Taking_student_attendance

Ứng dụng Web Quản Lý & Điểm Danh Võ Sinh, tối ưu mobile-first cho HLV trên sân tập và đồng bộ dữ liệu nhiều thiết bị qua server.

## Kiến trúc hiện tại

```text
React 19 + Vite + TypeScript
            |
            | HTTPS / JSON / JWT
            v
Fastify 5 + server-side RBAC
            |
            v
Prisma ORM
            |
            v
PostgreSQL 16
```

Dữ liệu nghiệp vụ **không còn lấy localStorage làm source of truth**. Frontend production khởi động từ `src/ProductionApp.tsx`; `src/App.tsx` cũ được giữ tạm để đối chiếu trong giai đoạn migration.

## Tính năng đã có ở full-stack foundation

- JWT authentication, bcrypt password hashing, khóa tài khoản/võ đường.
- Multi-tenant theo `dojoId`, tenant scope được kiểm tra tại server.
- RBAC: SUPER_ADMIN, DOJO_ADMIN, TEACHER, COACH.
- Permission matrix cho TEACHER/COACH được enforce tại API.
- Quản lý lớp, võ sinh và enrollment.
- Điểm danh NORMAL / MAKEUP / TRIAL, trạng thái PRESENT / ABSENT / LATE / EXCUSED.
- Bulk attendance, khóa sổ buổi tập và audit log.
- Học phí theo invoice + nhiều lần thanh toán, tự tính UNPAID/PARTIAL/PAID và chặn overpayment.
- Admin API cho võ đường, tài khoản, reset mật khẩu, permission và audit.
- Mobile UI dùng server làm source of truth, polling để cập nhật thay đổi từ thiết bị khác.
- Helmet, CORS allow-list, rate limiting và chuẩn hóa lỗi API.
- CI chạy frontend build, dependency audit, Prisma validation, PostgreSQL thật và API E2E.

## Chạy local

### 1. PostgreSQL

```bash
docker compose up -d
```

### 2. Backend

```bash
cd server
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

Backend mặc định: `http://localhost:3001`.

### 3. Frontend

Mở terminal khác tại thư mục gốc:

```bash
cp .env.example .env
npm install
npm run dev
```

Frontend mặc định: `http://localhost:5173`.

## Tài khoản seed để test

| Vai trò | Username | Password |
|---|---|---|
| Super Admin | `admin` | `admin123` |
| Dojo Admin HNK | `hanoikid` | `123456` |
| Teacher | `gv_lan` | `123456` |
| Coach | `hlv_tuan` | `123456` |
| Dojo Admin Cầu Giấy | `dojo_cg` | `dojo123` |

**Không sử dụng các mật khẩu seed trên production.** Sau deploy phải thay toàn bộ credential mặc định và dùng JWT secret ngẫu nhiên mạnh.

## Test

```bash
# Frontend
npm run build

# Backend
cd server
npm run security:audit
npm run prisma:generate
npm run prisma:validate
npm run build
npm run test:e2e
```

CI sử dụng PostgreSQL 16 thật và seed hai võ đường để kiểm tra cả luồng hợp lệ lẫn cố tình vượt role/tenant.

## API chính

```text
/api/health
/api/auth/*
/api/classes/*
/api/students/*
/api/attendance/*
/api/tuition/*
/api/admin/*
```

## Mô hình dữ liệu chính

```text
Dojo
 |- User
 |- RolePermission
 |- DojoClass
 |   |- ClassEnrollment
 |   `- AttendanceSession
 |       `- AttendanceRecord
 |- Student
 |   |- AttendanceRecord
 |   `- TuitionInvoice
 |       `- TuitionPayment
 `- AuditLog
```

Chi tiết roadmap và tiêu chí migration: `docs/IMPLEMENTATION_PLAN.md`.
