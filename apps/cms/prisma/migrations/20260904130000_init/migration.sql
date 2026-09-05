-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cms";

SET search_path TO cms;

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "summaryFr" TEXT NOT NULL,
    "sectionsEn" JSONB NOT NULL,
    "sectionsFr" JSONB NOT NULL,
    "imageKey" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_items" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "questionFr" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "answerFr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyFr" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_isPublished_idx" ON "articles"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "faq_items_slug_key" ON "faq_items"("slug");

-- CreateIndex
CREATE INDEX "faq_items_isPublished_sortOrder_idx" ON "faq_items"("isPublished", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "legal_pages_slug_key" ON "legal_pages"("slug");

-- CreateIndex
CREATE INDEX "legal_pages_isPublished_idx" ON "legal_pages"("isPublished");
