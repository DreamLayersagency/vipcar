-- AlterEnum / CreateEnum in booking schema
SET search_path TO booking;

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM (
  'quote_requested',
  'quoted',
  'awaiting_payment',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'quote_requested',
    "vehicleModelId" TEXT,
    "unitId" TEXT,
    "driverId" TEXT,
    "pickupLabel" TEXT NOT NULL,
    "dropoffLabel" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "priceTnd" DECIMAL(12,3) NOT NULL,
    "depositTnd" DECIMAL(12,3) NOT NULL,
    "cancellationPolicySnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_quoteId_key" ON "bookings"("quoteId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_customerId_idx" ON "bookings"("customerId");

-- CreateIndex
CREATE INDEX "bookings_startAt_endAt_idx" ON "bookings"("startAt", "endAt");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
