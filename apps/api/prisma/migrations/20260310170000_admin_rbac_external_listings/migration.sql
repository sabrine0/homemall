-- CreateEnum
CREATE TYPE "AdminPermission" AS ENUM ('MANAGE_USERS', 'MANAGE_LISTINGS', 'MODERATE_REPORTS', 'MANAGE_IMPORTS', 'MANAGE_SETTINGS', 'MANAGE_ADMINS');

-- CreateEnum
CREATE TYPE "ListingSourcePlatform" AS ENUM ('MANUAL', 'AVITO', 'MUBAWAB', 'OTHER');

-- CreateEnum
CREATE TYPE "UserRole_new" AS ENUM ('USER', 'SUPER_ADMIN', 'MANAGER');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "adminPermissions" "AdminPermission"[] NOT NULL DEFAULT ARRAY[]::"AdminPermission"[];

-- Alter User role enum values and map legacy roles
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE "role"::text
      WHEN 'ADMIN' THEN 'SUPER_ADMIN'
      WHEN 'DATA_MANAGER' THEN 'MANAGER'
      WHEN 'ANALYST' THEN 'MANAGER'
      ELSE "role"::text
    END
  )::"UserRole_new";

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- AlterTable
ALTER TABLE "UserListing"
  ADD COLUMN "sourcePlatform" "ListingSourcePlatform" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "sourceName" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "sourceListingId" TEXT,
  ADD COLUMN "externalReference" JSONB,
  ADD COLUMN "importedAt" TIMESTAMP(3),
  ADD COLUMN "lastSeenAt" TIMESTAMP(3),
  ADD COLUMN "isExternal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SystemSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "valueJson" JSONB NOT NULL,
  "description" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserListing_isExternal_lastSeenAt_idx" ON "UserListing"("isExternal", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserListing_sourcePlatform_sourceListingId_key" ON "UserListing"("sourcePlatform", "sourceListingId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_updatedById_idx" ON "SystemSetting"("updatedById");

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
