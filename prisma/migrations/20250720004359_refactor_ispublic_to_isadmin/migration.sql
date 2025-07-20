/*
  Warnings:

  - You are about to drop the column `isPublic` on the `Role` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "isPublic",
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;
