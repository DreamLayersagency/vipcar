-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "fleet";

SET search_path TO fleet;

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('available', 'reserved', 'rented', 'maintenance', 'inactive');

-- CreateEnum
CREATE TYPE "CalendarBlockReason" AS ENUM ('booking', 'maintenance', 'hold');

-- CreateTable
CREATE TABLE "vehicle_units" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'available',
    "depositAmountTnd" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "vehicle_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_blocks" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "bookingId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" "CalendarBlockReason" NOT NULL,

    CONSTRAINT "calendar_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_units_modelId_idx" ON "vehicle_units"("modelId");

-- CreateIndex
CREATE INDEX "vehicle_units_hubId_idx" ON "vehicle_units"("hubId");

-- CreateIndex
CREATE INDEX "vehicle_units_status_idx" ON "vehicle_units"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_units_hubId_plate_key" ON "vehicle_units"("hubId", "plate");

-- CreateIndex
CREATE INDEX "calendar_blocks_unitId_startAt_endAt_idx" ON "calendar_blocks"("unitId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "calendar_blocks_bookingId_idx" ON "calendar_blocks"("bookingId");

-- AddForeignKey
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "vehicle_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
