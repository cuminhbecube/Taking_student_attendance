import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dojo = await prisma.dojo.upsert({
    where: { code: 'HNK' },
    update: {},
    create: {
      code: 'HNK',
      name: 'Võ Đường Hà Nội Kid',
      status: 'ACTIVE'
    }
  });

  const adminPassword = await bcrypt.hash('admin123', 12);
  const dojoPassword = await bcrypt.hash('123456', 12);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPassword, role: UserRole.SUPER_ADMIN, dojoId: null, status: 'ACTIVE' },
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      fullName: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      dojoId: null
    }
  });

  await prisma.user.upsert({
    where: { username: 'hanoikid' },
    update: { passwordHash: dojoPassword, role: UserRole.DOJO_ADMIN, dojoId: dojo.id, status: 'ACTIVE' },
    create: {
      username: 'hanoikid',
      passwordHash: dojoPassword,
      fullName: 'Quản trị Hà Nội Kid',
      role: UserRole.DOJO_ADMIN,
      dojoId: dojo.id
    }
  });

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
      where: { dojoId_role: { dojoId: dojo.id, role: permission.role } },
      update: permission,
      create: { dojoId: dojo.id, ...permission }
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async error => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
