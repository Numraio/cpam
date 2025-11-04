-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "VersionTag" AS ENUM ('PRELIMINARY', 'FINAL', 'REVISED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CalcStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(20,12) NOT NULL,
    "baseCurrency" VARCHAR(3) NOT NULL,
    "uom" TEXT NOT NULL,
    "pamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PAM" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "graph" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PAM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexSeries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "seriesCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "unit" TEXT,
    "frequency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexValue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "asOfDate" DATE NOT NULL,
    "value" DECIMAL(20,12) NOT NULL,
    "versionTag" "VersionTag" NOT NULL DEFAULT 'PRELIMINARY',
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalcBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pamId" TEXT NOT NULL,
    "contractId" TEXT,
    "inputsHash" TEXT NOT NULL,
    "status" "CalcStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalcBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalcResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "adjustedPrice" DECIMAL(20,12) NOT NULL,
    "adjustedCurrency" VARCHAR(3) NOT NULL,
    "contributions" JSONB NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalcResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "rejectedBy" TEXT,
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contract_tenantId_idx" ON "Contract"("tenantId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Contract_tenantId_status_idx" ON "Contract"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Item_tenantId_idx" ON "Item"("tenantId");

-- CreateIndex
CREATE INDEX "Item_contractId_idx" ON "Item"("contractId");

-- CreateIndex
CREATE INDEX "Item_pamId_idx" ON "Item"("pamId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_tenantId_contractId_sku_key" ON "Item"("tenantId", "contractId", "sku");

-- CreateIndex
CREATE INDEX "PAM_tenantId_idx" ON "PAM"("tenantId");

-- CreateIndex
CREATE INDEX "PAM_tenantId_name_idx" ON "PAM"("tenantId", "name");

-- CreateIndex
CREATE INDEX "IndexSeries_tenantId_idx" ON "IndexSeries"("tenantId");

-- CreateIndex
CREATE INDEX "IndexSeries_provider_idx" ON "IndexSeries"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "IndexSeries_tenantId_seriesCode_key" ON "IndexSeries"("tenantId", "seriesCode");

-- CreateIndex
CREATE INDEX "IndexValue_tenantId_idx" ON "IndexValue"("tenantId");

-- CreateIndex
CREATE INDEX "IndexValue_seriesId_asOfDate_idx" ON "IndexValue"("seriesId", "asOfDate");

-- CreateIndex
CREATE INDEX "IndexValue_asOfDate_idx" ON "IndexValue"("asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX "IndexValue_seriesId_asOfDate_versionTag_key" ON "IndexValue"("seriesId", "asOfDate", "versionTag");

-- CreateIndex
CREATE INDEX "CalcBatch_tenantId_idx" ON "CalcBatch"("tenantId");

-- CreateIndex
CREATE INDEX "CalcBatch_pamId_idx" ON "CalcBatch"("pamId");

-- CreateIndex
CREATE INDEX "CalcBatch_status_idx" ON "CalcBatch"("status");

-- CreateIndex
CREATE INDEX "CalcBatch_inputsHash_idx" ON "CalcBatch"("inputsHash");

-- CreateIndex
CREATE INDEX "CalcResult_tenantId_idx" ON "CalcResult"("tenantId");

-- CreateIndex
CREATE INDEX "CalcResult_batchId_idx" ON "CalcResult"("batchId");

-- CreateIndex
CREATE INDEX "CalcResult_itemId_idx" ON "CalcResult"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "CalcResult_batchId_itemId_effectiveDate_key" ON "CalcResult"("batchId", "itemId", "effectiveDate");

-- CreateIndex
CREATE INDEX "ApprovalEvent_tenantId_idx" ON "ApprovalEvent"("tenantId");

-- CreateIndex
CREATE INDEX "ApprovalEvent_entityType_entityId_idx" ON "ApprovalEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ApprovalEvent_status_idx" ON "ApprovalEvent"("status");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_pamId_fkey" FOREIGN KEY ("pamId") REFERENCES "PAM"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PAM" ADD CONSTRAINT "PAM_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexSeries" ADD CONSTRAINT "IndexSeries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexValue" ADD CONSTRAINT "IndexValue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexValue" ADD CONSTRAINT "IndexValue_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "IndexSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalcBatch" ADD CONSTRAINT "CalcBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalcBatch" ADD CONSTRAINT "CalcBatch_pamId_fkey" FOREIGN KEY ("pamId") REFERENCES "PAM"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalcResult" ADD CONSTRAINT "CalcResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalcResult" ADD CONSTRAINT "CalcResult_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CalcBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalcResult" ADD CONSTRAINT "CalcResult_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEvent" ADD CONSTRAINT "ApprovalEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
