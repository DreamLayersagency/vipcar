import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class TrackAnalyticsEventDto {
  @IsString()
  @MaxLength(64)
  event!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;

  @IsOptional()
  @IsIn(['en', 'fr', 'ar'])
  locale?: 'en' | 'fr' | 'ar';

  @IsOptional()
  @IsString()
  @MaxLength(512)
  referrer?: string;

  @IsOptional()
  @IsIn(['mobile', 'tablet', 'desktop'])
  device?: 'mobile' | 'tablet' | 'desktop';

  @IsOptional()
  @IsString()
  @MaxLength(128)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  medium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  landingPage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  funnelStep?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, string | number | boolean | null>;
}

export class AnalyticsSummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number = 30;
}

export type AnalyticsDailyPoint = {
  date: string;
  views: number;
  visitors: number;
  quoteStarts: number;
  quoteRequests: number;
  contactRequests: number;
};

export type AnalyticsSummary = {
  days: number;
  totals: {
    pageViews: number;
    uniqueVisitors: number;
    quoteStarts: number;
    quoteRequests: number;
    quoteAbandons: number;
    contactRequests: number;
  };
  daily: AnalyticsDailyPoint[];
  topPages: Array<{ path: string; views: number }>;
  topSources: Array<{ source: string; events: number }>;
  topLandingPages: Array<{ path: string; views: number }>;
  generatedAt: string;
};
