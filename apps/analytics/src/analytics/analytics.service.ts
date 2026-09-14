import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import type {
  AnalyticsSummary,
  AnalyticsSummaryQueryDto,
  TrackAnalyticsEventDto,
} from '@vipcar/contracts';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(dto: TrackAnalyticsEventDto) {
    const event = String(dto.event || '').trim().slice(0, 64);
    if (!event) {
      throw new RpcException({ code: 'VALIDATION_ERROR', message: 'event is required', status: 400 });
    }
    await this.prisma.analyticsEvent.create({
      data: {
        event,
        path: clean(dto.path, 256),
        sessionId: clean(dto.sessionId, 128),
        locale: clean(dto.locale, 8),
        referrer: clean(dto.referrer, 512),
        device: clean(dto.device, 16),
        source: clean(dto.source, 128),
        medium: clean(dto.medium, 128),
        campaign: clean(dto.campaign, 128),
        landingPage: clean(dto.landingPage, 256),
        funnelStep: clean(dto.funnelStep, 64),
        context: dto.context ? (dto.context as Prisma.InputJsonValue) : undefined,
      },
    });
    return { ok: true } as const;
  }

  async summary(dto: AnalyticsSummaryQueryDto = {}): Promise<AnalyticsSummary> {
    const days = Math.min(90, Math.max(1, Number(dto.days) || 30));
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days + 1));
    const rows = await this.prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: start } },
      orderBy: { createdAt: 'asc' },
    });

    const daily = new Map<string, { views: number; visitors: Set<string>; quoteStarts: number; quoteRequests: number; contactRequests: number }>();
    const topPages = new Map<string, number>();
    const topSources = new Map<string, number>();
    const topLandingPages = new Map<string, number>();
    const uniqueVisitors = new Set<string>();
    let pageViews = 0;
    let quoteStarts = 0;
    let quoteRequests = 0;
    let quoteAbandons = 0;
    let contactRequests = 0;

    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days + 1 + offset));
      daily.set(date.toISOString().slice(0, 10), {
        views: 0,
        visitors: new Set(),
        quoteStarts: 0,
        quoteRequests: 0,
        contactRequests: 0,
      });
    }

    for (const row of rows) {
      const date = row.createdAt.toISOString().slice(0, 10);
      const point = daily.get(date);
      if (row.event === 'page_view') {
        pageViews += 1;
        const path = row.path || '/';
        topPages.set(path, (topPages.get(path) || 0) + 1);
        if (point) {
          point.views += 1;
          if (row.sessionId) point.visitors.add(row.sessionId);
        }
        if (row.sessionId) uniqueVisitors.add(row.sessionId);
        const landingPage = row.landingPage || path;
        topLandingPages.set(landingPage, (topLandingPages.get(landingPage) || 0) + 1);
      }
      if (row.event === 'page_view') {
        const source = row.source || row.medium || '(direct)';
        topSources.set(source, (topSources.get(source) || 0) + 1);
      }
      if (row.event === 'quote_start') {
        quoteStarts += 1;
        if (point) point.quoteStarts += 1;
      }
      if (row.event === 'quote_submit') {
        quoteRequests += 1;
        if (point) point.quoteRequests += 1;
      }
      if (row.event === 'quote_abandon') quoteAbandons += 1;
      if (row.event === 'contact_submit') {
        contactRequests += 1;
        if (point) point.contactRequests += 1;
      }
    }

    return {
      days,
      totals: {
        pageViews,
        uniqueVisitors: uniqueVisitors.size,
        quoteStarts,
        quoteRequests,
        quoteAbandons,
        contactRequests,
      },
      daily: [...daily.entries()].map(([date, point]) => ({
        date,
        views: point.views,
        visitors: point.visitors.size,
        quoteStarts: point.quoteStarts,
        quoteRequests: point.quoteRequests,
        contactRequests: point.contactRequests,
      })),
      topPages: [...topPages.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([path, views]) => ({ path, views })),
      topSources: [...topSources.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([source, events]) => ({ source, events })),
      topLandingPages: [...topLandingPages.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([path, views]) => ({ path, views })),
      generatedAt: new Date().toISOString(),
    };
  }
}

function clean(value: string | undefined, max: number): string | null {
  const result = String(value || '').trim().slice(0, max);
  return result || null;
}
