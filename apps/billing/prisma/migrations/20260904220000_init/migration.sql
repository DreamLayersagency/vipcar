-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "billing";

SET search_path TO billing;

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('deposit', 'rental', 'transfer', 'chauffeur', 'invoice');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'authorized', 'captured', 'failed', 'refunded', 'released');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'issued', 'paid', 'void');

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "amountTnd" DECIMAL(12,3) NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "bookingId" TEXT,
    "customerId" TEXT,
    "corporateAccountId" TEXT,
    "lines" JSONB NOT NULL,
    "subtotalTnd" DECIMAL(12,3) NOT NULL,
    "taxTnd" DECIMAL(12,3) NOT NULL,
    "totalTnd" DECIMAL(12,3) NOT NULL,
    "pdfKey" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_providerRef_key" ON "payments"("provider", "providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_bookingId_idx" ON "invoices"("bookingId");

-- CreateIndex
CREATE INDEX "invoices_corporateAccountId_idx" ON "invoices"("corporateAccountId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
