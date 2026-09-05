-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "dispatch";

SET search_path TO dispatch;

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'fr');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('available', 'on_trip', 'off_duty', 'inactive');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('transfer', 'chauffeur');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('pending', 'assigned', 'en_route', 'arrived', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ChauffeurDuration" AS ENUM ('hourly', 'half-day', 'full-day');

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "languages" "Locale"[],
    "hubId" TEXT NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'available',
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "driverId" TEXT,
    "type" "AssignmentType" NOT NULL,
    "flightNumber" TEXT,
    "duration" "ChauffeurDuration",
    "status" "AssignmentStatus" NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE INDEX "drivers_hubId_idx" ON "drivers"("hubId");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE INDEX "assignments_bookingId_idx" ON "assignments"("bookingId");

-- CreateIndex
CREATE INDEX "assignments_driverId_idx" ON "assignments"("driverId");

-- CreateIndex
CREATE INDEX "assignments_status_idx" ON "assignments"("status");

-- CreateIndex
CREATE INDEX "assignments_scheduledAt_idx" ON "assignments"("scheduledAt");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
