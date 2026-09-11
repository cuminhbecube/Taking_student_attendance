# Taking_student_attendance

Ứng dụng Web quản lý và điểm danh võ sinh, tối ưu mobile-first cho HLV trên sân tập và đồng bộ dữ liệu nhiều thiết bị qua server.

## Kiến trúc

```text
React 19 + Vite + TypeScript
            |
            | HTTPS / JSON / HttpOnly session cookie
            v
Fastify 5 + server-side RBAC
            |
            v
Prisma ORM + migrations
            |
            v
PostgreSQL 16
```

Dữ liệu nghiệp vụ **không dùng localStorage làm source of truth**. Frontend production khởi động từ `src/ProductionApp.tsx`; `src/App.tsx` cũ chỉ còn để đối chiếu migration.

## Tính năng chính

- Đăng nhập server-side bằng bcrypt + JWT trong **HttpOnly cookie**; Bearer token vẫn được hỗ trợ cho test/CLI.
- Khóa tài khoản và khóa võ đường.
- Multi-tenant theo `dojoId`, tenant scope được enforce ở backend.
- RBAC: `SUPER_ADMIN`, `DOJO_ADMIN`, `TEACHER`, `COACH`.
- Permission matrix động cho TEACHER/COACH; thay đổi quyền có hiệu lực ngay tại API.
- Quản lý lớp, lịch tập, địa điểm, võ sinh và enrollment.
- Tìm võ sinh tiếng Việt **không dấu** (`Nguyễn Đức` có thể tìm bằng `nguyen duc`).
- Điểm danh `NORMAL` / `MAKEUP` / `TRIAL`; trạng thái `PRESENT` / `ABSENT` / `LATE` / `EXCUSED`.
- Điểm danh hàng loạt, học bù qua lớp khác, khóa sổ buổi tập và audit log.
- Phát hiện xung đột khi hai thiết bị sửa cùng bản ghi điểm danh bằng `updatedAt` / `409 ATTENDANCE_CONFLICT`.
- Polling nhiều thiết bị với server là source of truth.
- Xuất CSV và tạo ảnh PNG danh sách điểm danh; trên thiết bị hỗ trợ Web Share có thể chia sẻ trực tiếp sang Zalo/app khác.
- Học phí theo invoice + nhiều lần thanh toán; tự tính `UNPAID` / `PARTIAL` / `PAID`; chặn overpayment.
- Quản trị tài khoản, reset mật khẩu, permission, lớp học và audit log.
- Helmet, CORS allow-list, rate limiting, body limit, error mapping.
- Prisma migration production, backup/restore PostgreSQL và Docker Compose production stack.

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
npm run prisma:migrate:deploy
npm run prisma:seed
npm run dev
```

Backend mặc định: `http://localhost:3001`.

> `prisma db push` chỉ dành cho thử nghiệm phát triển. Schema production phải đi qua migration đã commit.

### 3. Frontend

Mở terminal khác tại thư mục gốc:

```bash
cp .env.example .env
npm install
npm run dev
```

Frontend mặc định: `http://localhost:5173`.

## Tài khoản demo development/test

| Vai trò | Username | Password |
|---|---|---|
| Super Admin | `admin` | `admin123` |
| Dojo Admin HNK | `hanoikid` | `123456` |
| Teacher | `gv_lan` | `123456` |
| Coach | `hlv_tuan` | `123456` |
| Dojo Admin Cầu Giấy | `dojo_cg` | `dojo123` |

Các nút điền nhanh demo bị ẩn trong production. `prisma/seed.ts` cũng từ chối chạy khi `NODE_ENV=production`, trừ khi chủ động đặt `ALLOW_DEMO_SEED=true` cho môi trường disposable.

**Không dùng credential demo cho production.**

## Test

```bash
# Frontend
npm ci
npm run build

# Backend
cd server
npm install
npm run security:audit
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run build
npm run test:e2e       # E2E chính + functional regression
npm run test:regression
```

CI dùng PostgreSQL 16 thật và kiểm tra nhiều luồng: auth/cookie, RBAC, tenant isolation, permission revoke, CRUD, enrollment, tìm kiếm không dấu, attendance thường/học bù/bulk, concurrency, finalize, tuition, lock account/dojo và audit.

CI còn có `deploy-smoke`:

```text
compose config
 -> build PostgreSQL/API/Web images
 -> start production stack
 -> prisma migrate deploy
 -> /healthz through nginx
 -> frontend root response
 -> down -v
```

## Deploy production

```bash
cp .env.production.example .env
# sửa POSTGRES_PASSWORD, JWT_SECRET, CORS_ORIGIN

docker compose --env-file .env -f docker-compose.prod.yml up -d --build
curl -f http://127.0.0.1:${WEB_PORT:-8080}/healthz
```

Chi tiết HTTPS, backup, restore và upgrade: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

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

## Mô hình dữ liệu

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

Roadmap, tiêu chí PASS/FAIL và trạng thái migration: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).
