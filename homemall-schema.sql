-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPER_ADMIN', 'MANAGER');

-- CreateEnum
CREATE TYPE "AdminPermission" AS ENUM ('MANAGE_USERS', 'MANAGE_LISTINGS', 'MODERATE_REPORTS', 'MANAGE_IMPORTS', 'MANAGE_SETTINGS', 'MANAGE_ADMINS');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('APARTMENT', 'HOUSE', 'STUDIO', 'VILLA', 'LAND');

-- CreateEnum
CREATE TYPE "ListingPurpose" AS ENUM ('RENT', 'BUY');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ListingSourcePlatform" AS ENUM ('MANUAL', 'AVITO', 'MUBAWAB', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "contactPhone" TEXT,
    "contactWhatsApp" TEXT,
    "contactInstagram" TEXT,
    "contactFacebook" TEXT,
    "contactWebsite" TEXT,
    "passwordResetCodeHash" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "adminPermissions" "AdminPermission"[] DEFAULT ARRAY[]::"AdminPermission"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "budgetMin" INTEGER NOT NULL,
    "budgetMax" INTEGER NOT NULL,
    "workLat" DOUBLE PRECISION NOT NULL,
    "workLng" DOUBLE PRECISION NOT NULL,
    "mobilityModes" JSONB NOT NULL,
    "sensitivities" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "metaJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneMetrics" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "noiseIndex" DOUBLE PRECISION NOT NULL,
    "greenIndex" DOUBLE PRECISION NOT NULL,
    "airQualityIndex" DOUBLE PRECISION NOT NULL,
    "pollenIndex" DOUBLE PRECISION NOT NULL,
    "floodRiskIndex" DOUBLE PRECISION NOT NULL,
    "heatIndex" DOUBLE PRECISION NOT NULL,
    "transitIndex" DOUBLE PRECISION NOT NULL,
    "walkIndex" DOUBLE PRECISION NOT NULL,
    "futureValueIndex" DOUBLE PRECISION NOT NULL,
    "zoningRiskIndex" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ZoneMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "scoreJson" JSONB NOT NULL,
    "tclJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserListing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ListingType" NOT NULL,
    "purpose" "ListingPurpose" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourcePlatform" "ListingSourcePlatform" NOT NULL DEFAULT 'MANUAL',
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "sourceListingId" TEXT,
    "externalReference" JSONB,
    "importedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "priceMonthly" DOUBLE PRECISION,
    "priceSale" DOUBLE PRECISION,
    "areaM2" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "imageUrls" JSONB NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "contactWhatsApp" TEXT,
    "contactInstagram" TEXT,
    "contactFacebook" TEXT,
    "contactWebsite" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingReport" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ZoneMetrics_zoneId_key" ON "ZoneMetrics"("zoneId");

-- CreateIndex
CREATE INDEX "UserListing_zoneId_status_purpose_idx" ON "UserListing"("zoneId", "status", "purpose");

-- CreateIndex
CREATE INDEX "UserListing_sellerId_createdAt_idx" ON "UserListing"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "UserListing_isExternal_lastSeenAt_idx" ON "UserListing"("isExternal", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserListing_sourcePlatform_sourceListingId_key" ON "UserListing"("sourcePlatform", "sourceListingId");

-- CreateIndex
CREATE INDEX "ListingReport_createdAt_idx" ON "ListingReport"("createdAt");

-- CreateIndex
CREATE INDEX "ListingReport_listingId_createdAt_idx" ON "ListingReport"("listingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListingReport_listingId_reporterId_key" ON "ListingReport"("listingId", "reporterId");

-- CreateIndex
CREATE INDEX "ChatConversation_sellerId_updatedAt_idx" ON "ChatConversation"("sellerId", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatConversation_buyerId_updatedAt_idx" ON "ChatConversation"("buyerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversation_listingId_buyerId_key" ON "ChatConversation"("listingId", "buyerId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_senderId_createdAt_idx" ON "ChatMessage"("senderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_updatedById_idx" ON "SystemSetting"("updatedById");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneMetrics" ADD CONSTRAINT "ZoneMetrics_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserListing" ADD CONSTRAINT "UserListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserListing" ADD CONSTRAINT "UserListing_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingReport" ADD CONSTRAINT "ListingReport_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UserListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingReport" ADD CONSTRAINT "ListingReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UserListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

