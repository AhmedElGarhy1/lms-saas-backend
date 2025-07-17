/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Center` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,centerId,roleId]` on the table `UserOnCenter` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Center_name_key" ON "Center"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserOnCenter_userId_centerId_roleId_key" ON "UserOnCenter"("userId", "centerId", "roleId");
