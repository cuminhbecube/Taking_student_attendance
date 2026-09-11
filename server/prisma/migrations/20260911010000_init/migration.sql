-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'DOJO_ADMIN', 'TEACHER', 'COACH');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('NORMAL', 'MAKEUP', 'TRIAL');

-- CreateEnum
CREATE TYPE "TuitionStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateTable
CREATE TABLE "Dojo" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Dojo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "dojoId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "dojoId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "canViewTuition" BOOLEAN NOT NULL DEFAULT false,
    "canEditTuition" BOOLEAN NOT NULL DEFAULT false,
    "canEditSchedule" BOOLEAN NOT NULL DEFAULT false,
    "canTakeAttendance" BOOLEAN NOT NULL DEFAULT false,
    "canAddStudent" BOOLEAN NOT NULL DEFAULT false,
    "canEditStudentInfo" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteStudent" BOOLEAN NOT NULL DEFAULT false,
    "canAddDateSession" BOOLEAN NOT NULL DEFAULT false,
    "canExportData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DojoClass" (
    "id" TEXT NOT NULL,
    "dojoId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activeDays" INTEGER[],
    "startTime" TEXT,
    "endTime" TEXT,
    "venue" TEXT,
    "instructorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DojoClass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "dojoId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "belt" TEXT,
    "dob" TIMESTAMP(3),
    "parentPhone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "dojoId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "finalizedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "type" "AttendanceType" NOT NULL DEFAULT 'NORMAL',
    "registeredClassId" TEXT NOT NULL,
    "attendedClassId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedByUserId" TEXT,
    "note" TEXT,
    "lateMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TuitionInvoice" (
    "id" TEXT NOT NULL,
    "dojoId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "status" "TuitionStatus" NOT NULL DEFAULT 'UNPAID',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TuitionInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TuitionPayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TuitionPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "dojoId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dojo_code_key" ON "Dojo"("code");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_dojoId_role_idx" ON "User"("dojoId", "role");
CREATE UNIQUE INDEX "RolePermission_dojoId_role_key" ON "RolePermission"("dojoId", "role");
CREATE INDEX "DojoClass_dojoId_name_idx" ON "DojoClass"("dojoId", "name");
CREATE UNIQUE INDEX "DojoClass_dojoId_code_key" ON "DojoClass"("dojoId", "code");
CREATE INDEX "Student_dojoId_name_idx" ON "Student"("dojoId", "name");
CREATE INDEX "Student_parentPhone_idx" ON "Student"("parentPhone");
CREATE UNIQUE INDEX "Student_dojoId_code_key" ON "Student"("dojoId", "code");
CREATE INDEX "ClassEnrollment_studentId_endedAt_idx" ON "ClassEnrollment"("studentId", "endedAt");
CREATE UNIQUE INDEX "ClassEnrollment_classId_studentId_startedAt_key" ON "ClassEnrollment"("classId", "studentId", "startedAt");
CREATE INDEX "AttendanceSession_dojoId_sessionDate_idx" ON "AttendanceSession"("dojoId", "sessionDate");
CREATE UNIQUE INDEX "AttendanceSession_classId_sessionDate_key" ON "AttendanceSession"("classId", "sessionDate");
CREATE INDEX "AttendanceRecord_studentId_checkedAt_idx" ON "AttendanceRecord"("studentId", "checkedAt");
CREATE INDEX "AttendanceRecord_attendedClassId_checkedAt_idx" ON "AttendanceRecord"("attendedClassId", "checkedAt");
CREATE UNIQUE INDEX "AttendanceRecord_sessionId_studentId_key" ON "AttendanceRecord"("sessionId", "studentId");
CREATE INDEX "TuitionInvoice_dojoId_monthKey_status_idx" ON "TuitionInvoice"("dojoId", "monthKey", "status");
CREATE UNIQUE INDEX "TuitionInvoice_dojoId_studentId_monthKey_key" ON "TuitionInvoice"("dojoId", "studentId", "monthKey");
CREATE INDEX "TuitionPayment_invoiceId_paidAt_idx" ON "TuitionPayment"("invoiceId", "paidAt");
CREATE INDEX "AuditLog_dojoId_createdAt_idx" ON "AuditLog"("dojoId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DojoClass" ADD CONSTRAINT "DojoClass_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "DojoClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "DojoClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_registeredClassId_fkey" FOREIGN KEY ("registeredClassId") REFERENCES "DojoClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_attendedClassId_fkey" FOREIGN KEY ("attendedClassId") REFERENCES "DojoClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TuitionInvoice" ADD CONSTRAINT "TuitionInvoice_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TuitionInvoice" ADD CONSTRAINT "TuitionInvoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TuitionPayment" ADD CONSTRAINT "TuitionPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "TuitionInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
