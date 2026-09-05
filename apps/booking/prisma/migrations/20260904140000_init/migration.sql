-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "booking";

SET search_path TO booking;

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('rental', 'transfer', 'chauffeur');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('received', 'quoted', 'expired', 'converted', 'cancelled');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('web', 'whatsapp', 'staff', 'contact');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'fr');

-- CreateEnum
CREATE TYPE "ChauffeurDuration" AS ENUM ('hourly', 'half-day', 'full-day');

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "service" "ServiceType" NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'received',
    "vehicleModelId" TEXT,
    "pickupLocationId" TEXT,
    "pickupLabel" TEXT,
    "dropoffLocationId" TEXT,
    "dropoffLabel" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "passengers" INTEGER,
    "duration" "ChauffeurDuration",
    "flightNumber" TEXT,
    "notes" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerId" TEXT,
    "language" "Locale" NOT NULL,
    "channel" "Channel" NOT NULL,
    "indicativePriceTnd" DECIMAL(12,3),
    "confirmedPriceTnd" DECIMAL(12,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quotes_createdAt_idx" ON "quotes"("createdAt");

-- CreateIndex
CREATE INDEX "quotes_channel_idx" ON "quotes"("channel");

-- CreateIndex
CREATE INDEX "outbox_events_publishedAt_idx" ON "outbox_events"("publishedAt");
