CREATE SCHEMA IF NOT EXISTS "notify";

SET search_path TO notify;

CREATE TABLE "ops_notifications" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ops_notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ops_notification_reads" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ops_notification_reads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ops_notifications_kind_entityId_key" ON "ops_notifications"("kind", "entityId");
CREATE INDEX "ops_notifications_createdAt_idx" ON "ops_notifications"("createdAt");
CREATE UNIQUE INDEX "ops_notification_reads_notificationId_userId_key" ON "ops_notification_reads"("notificationId", "userId");
CREATE INDEX "ops_notification_reads_userId_readAt_idx" ON "ops_notification_reads"("userId", "readAt");

ALTER TABLE "ops_notification_reads"
  ADD CONSTRAINT "ops_notification_reads_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "ops_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
