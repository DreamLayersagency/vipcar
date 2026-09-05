-- CreateTable
CREATE TABLE "corporate_billing_profiles" (
    "id" TEXT NOT NULL,
    "corporateAccountId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "taxId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_billing_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "corporate_billing_profiles_corporateAccountId_key" ON "corporate_billing_profiles"("corporateAccountId");

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "companyName" TEXT;
ALTER TABLE "invoices" ADD COLUMN "billingEmail" TEXT;
ALTER TABLE "invoices" ADD COLUMN "taxId" TEXT;
