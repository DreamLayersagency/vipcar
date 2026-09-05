-- AlterTable: transfer flightNumber snapshot on booking (G2)
SET search_path TO booking;

ALTER TABLE "bookings" ADD COLUMN "flightNumber" TEXT;
