/*
  Warnings:

  - You are about to drop the column `email` on the `Guardian` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Guardian` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Guardian` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Guardian` table. All the data in the column will be lost.
  - You are about to drop the column `used` on the `PasswordResetToken` table. All the data in the column will be lost.
  - You are about to drop the column `guardianId` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `teacherId` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the column `centerId` on the `UserAccess` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Guardian` table without a default value. This is not possible if the table is not empty.

*/

-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('TEACHER', 'STUDENT', 'GUARDIAN', 'BASE_USER');

-- CreateTable
CREATE TABLE "BaseUser" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaseUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ProfileType" NOT NULL DEFAULT 'BASE_USER',
    "phone" TEXT,
    "address" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "avatar" TEXT,
    "teacherId" TEXT,
    "studentId" TEXT,
    "guardianId" TEXT,
    "baseUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_teacherId_key" ON "Profile"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_studentId_key" ON "Profile"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_guardianId_key" ON "Profile"("guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_baseUserId_key" ON "Profile"("baseUserId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_baseUserId_fkey" FOREIGN KEY ("baseUserId") REFERENCES "BaseUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data to new structure
-- First, create profiles for existing teachers
INSERT INTO "Profile" ("id", "userId", "type", "createdAt", "updatedAt", "teacherId")
SELECT 
    gen_random_uuid()::text,
    "Teacher"."userId",
    'TEACHER',
    "Teacher"."createdAt",
    "Teacher"."updatedAt",
    "Teacher"."id"
FROM "Teacher";

-- Create profiles for existing students
INSERT INTO "Profile" ("id", "userId", "type", "createdAt", "updatedAt", "studentId")
SELECT 
    gen_random_uuid()::text,
    "Student"."userId",
    'STUDENT',
    "Student"."createdAt",
    "Student"."updatedAt",
    "Student"."id"
FROM "Student";

-- Create profiles for existing guardians
INSERT INTO "Profile" ("id", "userId", "type", "createdAt", "updatedAt", "guardianId")
SELECT 
    gen_random_uuid()::text,
    "Guardian"."userId",
    'GUARDIAN',
    "Guardian"."createdAt",
    "Guardian"."updatedAt",
    "Guardian"."id"
FROM "Guardian" WHERE "Guardian"."userId" IS NOT NULL;

-- Create base user profiles for users without specific profiles
INSERT INTO "BaseUser" ("id", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    "User"."createdAt",
    "User"."updatedAt"
FROM "User" 
WHERE "User"."id" NOT IN (
    SELECT "userId" FROM "Profile"
);

-- Create profiles for base users
INSERT INTO "Profile" ("id", "userId", "type", "createdAt", "updatedAt", "baseUserId")
SELECT 
    gen_random_uuid()::text,
    "User"."id",
    'BASE_USER',
    "User"."createdAt",
    "User"."updatedAt",
    "BaseUser"."id"
FROM "User" 
JOIN "BaseUser" ON "BaseUser"."createdAt" = "User"."createdAt"
WHERE "User"."id" NOT IN (
    SELECT "userId" FROM "Profile" WHERE "type" != 'BASE_USER'
);

-- Now update the existing tables to remove the userId columns and add new structure
-- Update Guardian table
ALTER TABLE "Guardian" 
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "emergencyContact" TEXT,
ADD COLUMN "relationship" TEXT;

-- Update Student table to remove old columns and add new structure
ALTER TABLE "Student" 
ADD COLUMN "gradeLevelId" TEXT;

-- Drop old foreign key constraints
ALTER TABLE "Guardian" DROP CONSTRAINT IF EXISTS "Guardian_userId_fkey";
ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_userId_fkey";
ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_guardianId_fkey";
ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_teacherId_fkey";
ALTER TABLE "Teacher" DROP CONSTRAINT IF EXISTS "Teacher_userId_fkey";

-- Drop old columns
ALTER TABLE "Guardian" DROP COLUMN IF EXISTS "email";
ALTER TABLE "Guardian" DROP COLUMN IF EXISTS "name";
ALTER TABLE "Guardian" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "Guardian" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Student" DROP COLUMN IF EXISTS "guardianId";
ALTER TABLE "Student" DROP COLUMN IF EXISTS "teacherId";
ALTER TABLE "Student" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Teacher" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "PasswordResetToken" DROP COLUMN IF EXISTS "used";
ALTER TABLE "UserAccess" DROP COLUMN IF EXISTS "centerId";

-- Add new foreign key constraints
ALTER TABLE "Student" ADD CONSTRAINT "Student_gradeLevelId_fkey" FOREIGN KEY ("gradeLevelId") REFERENCES "GradeLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update indexes
CREATE INDEX "Student_gradeLevelId_idx" ON "Student"("gradeLevelId");
