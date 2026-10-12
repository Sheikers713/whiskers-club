-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'EDITOR', 'FINANCE');

-- CreateEnum
CREATE TYPE "PublicationState" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StatusGroup" AS ENUM ('ACTIVE', 'ADOPTED', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('FEMALE', 'MALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TriState" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TestResult" AS ENUM ('NEGATIVE', 'POSITIVE', 'PENDING', 'NOT_TESTED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('PHOTO', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('TESTS', 'CONCLUSION', 'PRESCRIPTION', 'CLINIC_INVOICE', 'VET_PASSPORT', 'CONTRACT', 'PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('ADOPTION', 'VOLUNTEER', 'FOSTER', 'PARTNERSHIP');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'CONTACTED', 'INTERVIEW', 'MEETING', 'APPROVED', 'REJECTED', 'COMPLETED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProofLevel" AS ENUM ('FISCAL_VERIFIED', 'DOCUMENT', 'NONE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roles" "Role"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactTelegram" TEXT,
    "contactPhone" TEXT,
    "contactWhatsapp" TEXT,
    "contactViber" TEXT,
    "contactInstagram" TEXT,
    "telegramChatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roles" "Role"[],
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatStatus" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#888888',
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "group" "StatusGroup" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "CatStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatFlag" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CatFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogFilter" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "statusGroups" "StatusGroup"[] DEFAULT ARRAY['ACTIVE']::"StatusGroup"[],
    "statusKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "flagKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requireActiveCampaign" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CatalogFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "story" JSONB NOT NULL DEFAULT '{}',
    "character" JSONB NOT NULL DEFAULT '{}',
    "health" JSONB NOT NULL DEFAULT '{}',
    "adoptionTerms" JSONB NOT NULL DEFAULT '{}',
    "specialNeeds" JSONB NOT NULL DEFAULT '{}',
    "originalLocale" TEXT NOT NULL DEFAULT 'ru',
    "sex" "Sex" NOT NULL DEFAULT 'UNKNOWN',
    "birthDate" DATE,
    "color" TEXT,
    "sterilized" "TriState" NOT NULL DEFAULT 'UNKNOWN',
    "vaccinated" "TriState" NOT NULL DEFAULT 'UNKNOWN',
    "chipped" "TriState" NOT NULL DEFAULT 'UNKNOWN',
    "fiv" "TestResult" NOT NULL DEFAULT 'NOT_TESTED',
    "felv" "TestResult" NOT NULL DEFAULT 'NOT_TESTED',
    "goodWithCats" "TriState" NOT NULL DEFAULT 'UNKNOWN',
    "goodWithDogs" "TriState" NOT NULL DEFAULT 'UNKNOWN',
    "goodWithKids" "TriState" NOT NULL DEFAULT 'UNKNOWN',
    "hasSpecialNeeds" BOOLEAN NOT NULL DEFAULT false,
    "statusId" UUID NOT NULL,
    "state" "PublicationState" NOT NULL DEFAULT 'DRAFT',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "manualPriority" INTEGER NOT NULL DEFAULT 0,
    "countInStats" BOOLEAN NOT NULL DEFAULT true,
    "intakeDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adoptedAt" DATE,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "coverId" UUID,

    CONSTRAINT "Cat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatFlagOnCat" (
    "catId" UUID NOT NULL,
    "flagId" UUID NOT NULL,

    CONSTRAINT "CatFlagOnCat_pkey" PRIMARY KEY ("catId","flagId")
);

-- CreateTable
CREATE TABLE "CatCurator" (
    "catId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CatCurator_pkey" PRIMARY KEY ("catId","userId")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'PHOTO',
    "catId" UUID,
    "storageKey" TEXT,
    "mime" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "url" TEXT,
    "alt" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatUpdate" (
    "id" UUID NOT NULL,
    "catId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text" JSONB NOT NULL,
    "state" "PublicationState" NOT NULL DEFAULT 'PUBLISHED',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalDocument" (
    "id" UUID NOT NULL,
    "catId" UUID NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "title" JSONB NOT NULL DEFAULT '{}',
    "summary" JSONB NOT NULL DEFAULT '{}',
    "documentDate" DATE,
    "originalLocale" TEXT,
    "fileId" UUID NOT NULL,
    "redactedFileId" UUID,
    "state" "PublicationState" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "type" "ApplicationType" NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "catId" UUID,
    "name" TEXT NOT NULL,
    "contactMethod" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "city" TEXT,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "locale" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "internalNotes" TEXT,
    "rejectReason" TEXT,
    "assignedToId" UUID,
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" UUID NOT NULL,
    "title" JSONB NOT NULL,
    "value" TEXT,
    "url" TEXT,
    "currencyNote" TEXT,
    "instructions" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB NOT NULL DEFAULT '{}',
    "categoryId" UUID,
    "targetRsd" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "state" "PublicationState" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignCat" (
    "campaignId" UUID NOT NULL,
    "catId" UUID NOT NULL,

    CONSTRAINT "CampaignCat_pkey" PRIMARY KEY ("campaignId","catId")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amountRsd" INTEGER NOT NULL,
    "donorName" TEXT,
    "publicName" TEXT,
    "showName" BOOLEAN NOT NULL DEFAULT false,
    "method" TEXT,
    "comment" TEXT,
    "internalComment" TEXT,
    "campaignId" UUID,
    "catId" UUID,
    "state" "PublicationState" NOT NULL DEFAULT 'DRAFT',
    "importKey" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationFile" (
    "donationId" UUID NOT NULL,
    "fileId" UUID NOT NULL,

    CONSTRAINT "DonationFile_pkey" PRIMARY KEY ("donationId","fileId")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "vendor" TEXT,
    "amountRsd" INTEGER NOT NULL,
    "categoryId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "publicSummary" JSONB NOT NULL DEFAULT '{}',
    "paymentMethod" TEXT,
    "proof" "ProofLevel" NOT NULL DEFAULT 'DOCUMENT',
    "noReceiptReason" TEXT,
    "fiscalId" TEXT,
    "payer" TEXT,
    "internalComment" TEXT,
    "campaignId" UUID,
    "state" "PublicationState" NOT NULL DEFAULT 'DRAFT',
    "importKey" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCat" (
    "expenseId" UUID NOT NULL,
    "catId" UUID NOT NULL,

    CONSTRAINT "ExpenseCat_pkey" PRIMARY KEY ("expenseId","catId")
);

-- CreateTable
CREATE TABLE "ExpenseFile" (
    "expenseId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExpenseFile_pkey" PRIMARY KEY ("expenseId","fileId")
);

-- CreateTable
CREATE TABLE "FundTransfer" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amountRsd" INTEGER NOT NULL,
    "fromCampaignId" UUID,
    "toCampaignId" UUID,
    "note" JSONB NOT NULL DEFAULT '{}',
    "state" "PublicationState" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "logoKey" TEXT,
    "description" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemEvent" (
    "id" UUID NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "SystemEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_Bonded" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_Bonded_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CatStatus_key_key" ON "CatStatus"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CatFlag_key_key" ON "CatFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogFilter_key_key" ON "CatalogFilter"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_key_key" ON "ExpenseCategory"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Cat_slug_key" ON "Cat"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Cat_coverId_key" ON "Cat"("coverId");

-- CreateIndex
CREATE INDEX "Cat_state_statusId_idx" ON "Cat"("state", "statusId");

-- CreateIndex
CREATE INDEX "MediaAsset_catId_sortOrder_idx" ON "MediaAsset"("catId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_storageKey_key" ON "StoredFile"("storageKey");

-- CreateIndex
CREATE INDEX "Application_type_status_idx" ON "Application"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_importKey_key" ON "Donation"("importKey");

-- CreateIndex
CREATE INDEX "Donation_state_date_idx" ON "Donation"("state", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_importKey_key" ON "Expense"("importKey");

-- CreateIndex
CREATE INDEX "Expense_state_date_idx" ON "Expense"("state", "date");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_at_idx" ON "AuditEvent"("at");

-- CreateIndex
CREATE INDEX "SystemEvent_at_idx" ON "SystemEvent"("at");

-- CreateIndex
CREATE INDEX "_Bonded_B_index" ON "_Bonded"("B");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat" ADD CONSTRAINT "Cat_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "CatStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat" ADD CONSTRAINT "Cat_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatFlagOnCat" ADD CONSTRAINT "CatFlagOnCat_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatFlagOnCat" ADD CONSTRAINT "CatFlagOnCat_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "CatFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatCurator" ADD CONSTRAINT "CatCurator_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatCurator" ADD CONSTRAINT "CatCurator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatUpdate" ADD CONSTRAINT "CatUpdate_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_redactedFileId_fkey" FOREIGN KEY ("redactedFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignCat" ADD CONSTRAINT "CampaignCat_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignCat" ADD CONSTRAINT "CampaignCat_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationFile" ADD CONSTRAINT "DonationFile_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationFile" ADD CONSTRAINT "DonationFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCat" ADD CONSTRAINT "ExpenseCat_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCat" ADD CONSTRAINT "ExpenseCat_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseFile" ADD CONSTRAINT "ExpenseFile_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseFile" ADD CONSTRAINT "ExpenseFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundTransfer" ADD CONSTRAINT "FundTransfer_fromCampaignId_fkey" FOREIGN KEY ("fromCampaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundTransfer" ADD CONSTRAINT "FundTransfer_toCampaignId_fkey" FOREIGN KEY ("toCampaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Bonded" ADD CONSTRAINT "_Bonded_A_fkey" FOREIGN KEY ("A") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Bonded" ADD CONSTRAINT "_Bonded_B_fkey" FOREIGN KEY ("B") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
