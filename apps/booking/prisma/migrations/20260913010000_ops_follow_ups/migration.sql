CREATE SCHEMA IF NOT EXISTS "booking";

SET search_path TO booking;

CREATE TYPE "OpsFollowUpStatus" AS ENUM ('new', 'replied', 'awaiting_customer', 'confirmed', 'closed');

CREATE TABLE "ops_follow_ups" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "status" "OpsFollowUpStatus" NOT NULL DEFAULT 'new',
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ops_follow_ups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ops_follow_ups_recordId_key" ON "ops_follow_ups"("recordId");
CREATE INDEX "ops_follow_ups_updatedAt_idx" ON "ops_follow_ups"("updatedAt");
