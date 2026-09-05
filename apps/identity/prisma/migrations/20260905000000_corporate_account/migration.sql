-- CorporateAccount + User membership (H3)

SET search_path TO identity;

-- CreateTable
CREATE TABLE "corporate_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_accounts_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "corporateAccountId" TEXT;

-- CreateIndex
CREATE INDEX "users_corporateAccountId_idx" ON "users"("corporateAccountId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
