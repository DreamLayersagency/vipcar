-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notify";

SET search_path TO notify;

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('whatsapp', 'email');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('queued', 'sent', 'failed');

-- CreateTable
CREATE TABLE "delivery_logs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "to" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_logs_status_nextAttemptAt_idx" ON "delivery_logs"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "delivery_logs_eventName_idx" ON "delivery_logs"("eventName");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_logs_eventId_channel_template_key" ON "delivery_logs"("eventId", "channel", "template");
