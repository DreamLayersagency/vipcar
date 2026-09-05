-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "catalog";

SET search_path TO catalog;

-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('Luxury', 'SUV', 'Sedan', 'Van & Group', 'Compact', 'Economy', 'Pick-up');

-- CreateEnum
CREATE TYPE "VehicleTier" AS ENUM ('Luxury', 'Premium', 'Standard', 'Economy');

-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('Automatic', 'Manual');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('city', 'airport', 'hotel', 'other');

-- CreateTable
CREATE TABLE "hubs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Tunis',

    CONSTRAINT "hubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_models" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "VehicleCategory" NOT NULL,
    "tier" "VehicleTier" NOT NULL,
    "seats" INTEGER NOT NULL,
    "bags" INTEGER NOT NULL,
    "transmission" "Transmission" NOT NULL,
    "imageKey" TEXT NOT NULL,
    "baseDailyPriceTnd" DECIMAL(12,3) NOT NULL,
    "defaultHubId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "airportName" TEXT,
    "hubId" TEXT,
    "supportsRental" BOOLEAN NOT NULL DEFAULT true,
    "supportsTransfer" BOOLEAN NOT NULL DEFAULT true,
    "supportsChauffeur" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hubs_slug_key" ON "hubs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_models_slug_key" ON "vehicle_models"("slug");

-- CreateIndex
CREATE INDEX "vehicle_models_category_idx" ON "vehicle_models"("category");

-- CreateIndex
CREATE INDEX "vehicle_models_isPublished_idx" ON "vehicle_models"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "locations_slug_key" ON "locations"("slug");

-- CreateIndex
CREATE INDEX "locations_isPublished_idx" ON "locations"("isPublished");

-- AddForeignKey
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_defaultHubId_fkey" FOREIGN KEY ("defaultHubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
