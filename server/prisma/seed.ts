import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertUser(input: { username: string; password: string; fullName: string; role: UserRole; dojoId: string | null }) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.user.upsert({
    where: { username: input.username },
    update: { passwordHash, fullName: input.fullName, role: input.role, dojoId: input.dojoId, status: 'ACTIVE' },
    create: { username: input.username, passwordHash, fullName: input.fullName, role: input.role, dojoId: input.dojoId, status: 'ACTIVE' }
  });
}

async function seedPermissions(dojoId: string) {
  const defaults = [
    {
      role: UserRole.COACH,
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
    {
      role: UserRole.TEACHER,
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
  ];

  for (const permission of defaults) {
    await prisma.rolePermission.upsert({
      where: { dojoId_role: { dojoId, role: permission.role } },
      update: permission,
      create: { dojoId, ...permission }
    });
  }
}

async function main() {
  const hnk = await prisma.dojo.upsert({
    where: { code: 'HNK' },
    update: { name: 'Võ Đường Hà Nội Kid', status: 'ACTIVE' },
    create: { code: 'HNK', name: 'Võ Đường Hà Nội Kid', status: 'ACTIVE' }
  });

  const cg = await prisma.dojo.upsert({
    where: { code: 'CG' },
    update: { name: 'CLB Cầu Giấy', status: 'ACTIVE' },
    create: { code: 'CG', name: 'CLB Cầu Giấy', status: 'ACTIVE' }
  });

  await upsertUser({ username: 'admin', password: 'admin123', fullName: 'Super Admin', role: UserRole.SUPER_ADMIN, dojoId: null });
  await upsertUser({ username: 'hanoikid', password: '123456', fullName: 'Quản trị Hà Nội Kid', role: UserRole.DOJO_ADMIN, dojoId: hnk.id });
  await upsertUser({ username: 'gv_lan', password: '123456', fullName: 'Cô Lan', role: UserRole.TEACHER, dojoId: hnk.id });
  await upsertUser({ username: 'hlv_tuan', password: '123456', fullName: 'Thầy Tuấn', role: UserRole.COACH, dojoId: hnk.id });
  await upsertUser({ username: 'dojo_cg', password: 'dojo123', fullName: 'Quản trị Cầu Giấy', role: UserRole.DOJO_ADMIN, dojoId: cg.id });

  await seedPermissions(hnk.id);
  await seedPermissions(cg.id);

  const classHnk = await prisma.dojoClass.upsert({
    where: { dojoId_code: { dojoId: hnk.id, code: 'TC' } },
    update: { name: 'Lớp Trường Chinh', activeDays: [3, 6], startTime: '18:00', endTime: '19:30' },
    create: { dojoId: hnk.id, code: 'TC', name: 'Lớp Trường Chinh', activeDays: [3, 6], startTime: '18:00', endTime: '19:30', venue: 'Hà Nội Kid' }
  });

  await prisma.dojoClass.upsert({
    where: { dojoId_code: { dojoId: cg.id, code: 'CG01' } },
    update: { name: 'Lớp Cầu Giấy', activeDays: [2, 5], startTime: '18:00', endTime: '19:30' },
    create: { dojoId: cg.id, code: 'CG01', name: 'Lớp Cầu Giấy', activeDays: [2, 5], startTime: '18:00', endTime: '19:30', venue: 'Cầu Giấy' }
  });

  const student = await prisma.student.upsert({
    where: { dojoId_code: { dojoId: hnk.id, code: 'HNK001' } },
    update: { name: 'Võ Sinh Mẫu', isActive: true },
    create: { dojoId: hnk.id, code: 'HNK001', name: 'Võ Sinh Mẫu', belt: 'Trắng', isActive: true }
  });

  const existingEnrollment = await prisma.classEnrollment.findFirst({ where: { classId: classHnk.id, studentId: student.id, endedAt: null } });
  if (!existingEnrollment) {
    await prisma.classEnrollment.create({ data: { classId: classHnk.id, studentId: student.id, isPrimary: true } });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async error => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
