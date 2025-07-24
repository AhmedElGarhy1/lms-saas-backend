/*
  Warnings:

  - You are about to drop the column `type` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `UserAccess` table. All the data in the column will be lost.
  - You are about to drop the `CenterAccess` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeacherUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_GroupStudents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_StudentGradeLevels` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Guardian` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "CenterAccess" DROP CONSTRAINT "CenterAccess_centerId_fkey";

-- DropForeignKey
ALTER TABLE "CenterAccess" DROP CONSTRAINT "CenterAccess_userId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherUser" DROP CONSTRAINT "TeacherUser_roleId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherUser" DROP CONSTRAINT "TeacherUser_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherUser" DROP CONSTRAINT "TeacherUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserAccess" DROP CONSTRAINT "UserAccess_roleId_fkey";

-- DropForeignKey
ALTER TABLE "_GroupStudents" DROP CONSTRAINT "_GroupStudents_A_fkey";

-- DropForeignKey
ALTER TABLE "_GroupStudents" DROP CONSTRAINT "_GroupStudents_B_fkey";

-- DropForeignKey
ALTER TABLE "_GroupTeachers" DROP CONSTRAINT "_GroupTeachers_B_fkey";

-- DropForeignKey
ALTER TABLE "_StudentGradeLevels" DROP CONSTRAINT "_StudentGradeLevels_A_fkey";

-- DropForeignKey
ALTER TABLE "_StudentGradeLevels" DROP CONSTRAINT "_StudentGradeLevels_B_fkey";

-- DropForeignKey
ALTER TABLE "_SubjectTeachers" DROP CONSTRAINT "_SubjectTeachers_B_fkey";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "gradeLevelId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "UserAccess" DROP COLUMN "roleId";

-- DropTable
DROP TABLE "CenterAccess";

-- DropTable
DROP TABLE "TeacherUser";

-- DropTable
DROP TABLE "_GroupStudents";

-- DropTable
DROP TABLE "_StudentGradeLevels";

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_userId_key" ON "Guardian"("userId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_gradeLevelId_fkey" FOREIGN KEY ("gradeLevelId") REFERENCES "GradeLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupTeachers" ADD CONSTRAINT "_GroupTeachers_B_fkey" FOREIGN KEY ("B") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubjectTeachers" ADD CONSTRAINT "_SubjectTeachers_B_fkey" FOREIGN KEY ("B") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
