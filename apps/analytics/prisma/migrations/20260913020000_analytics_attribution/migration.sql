CREATE SCHEMA IF NOT EXISTS "analytics";

SET search_path TO analytics;

ALTER TABLE "analytics_events" ADD COLUMN "source" TEXT;
ALTER TABLE "analytics_events" ADD COLUMN "medium" TEXT;
ALTER TABLE "analytics_events" ADD COLUMN "campaign" TEXT;
ALTER TABLE "analytics_events" ADD COLUMN "landingPage" TEXT;
ALTER TABLE "analytics_events" ADD COLUMN "funnelStep" TEXT;
ALTER TABLE "analytics_events" ADD COLUMN "context" JSONB;

CREATE INDEX "analytics_events_source_createdAt_idx" ON "analytics_events"("source", "createdAt");
CREATE INDEX "analytics_events_landingPage_createdAt_idx" ON "analytics_events"("landingPage", "createdAt");
