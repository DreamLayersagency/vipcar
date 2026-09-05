-- Idempotent CalendarBlock per booking (NULL bookingId still allowed for maintenance/hold).
DROP INDEX IF EXISTS "calendar_blocks_bookingId_idx";

CREATE UNIQUE INDEX "calendar_blocks_bookingId_key" ON "calendar_blocks"("bookingId");
