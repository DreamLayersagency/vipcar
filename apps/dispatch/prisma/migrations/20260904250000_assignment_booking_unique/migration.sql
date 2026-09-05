-- Unique bookingId for idempotent assignment create from booking.confirmed (G2)
SET search_path TO dispatch;

DROP INDEX IF EXISTS "assignments_bookingId_idx";

CREATE UNIQUE INDEX "assignments_bookingId_key" ON "assignments"("bookingId");
