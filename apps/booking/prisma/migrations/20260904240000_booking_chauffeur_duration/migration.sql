-- AlterTable: chauffeur duration snapshot on booking (G3)
SET search_path TO booking;

ALTER TABLE "bookings" ADD COLUMN "duration" "ChauffeurDuration";
