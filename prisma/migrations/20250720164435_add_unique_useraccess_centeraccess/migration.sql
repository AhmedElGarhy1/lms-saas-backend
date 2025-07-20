/*
  Warnings:

  - A unique constraint covering the columns `[userId,centerId]` on the table `CenterAccess` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,targetUserId]` on the table `UserAccess` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CenterAccess_userId_centerId_key" ON "CenterAccess"("userId", "centerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccess_userId_targetUserId_key" ON "UserAccess"("userId", "targetUserId");
