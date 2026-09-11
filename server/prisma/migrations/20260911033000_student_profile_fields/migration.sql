CREATE TYPE "StudentGender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

ALTER TABLE "Student"
  ADD COLUMN "gender" "StudentGender",
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "address" TEXT;
