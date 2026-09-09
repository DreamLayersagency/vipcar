import { Controller, Get, HttpException, Inject, Query, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AnalyticsSummaryQueryDto,
  NATS_PATTERNS,
  type AnalyticsSummary,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ANALYTICS_SERVICE } from '../analytics.constants';

@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ops_agent', 'admin')
export class OpsAnalyticsController {
  constructor(@Inject(ANALYTICS_SERVICE) private readonly analytics: ClientProxy) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get traffic and visitor analytics', description: 'Operational visitor metrics from the first-party analytics store.' })
  async summary(@Query() query: AnalyticsSummaryQueryDto) {
    try {
      const data = await firstValueFrom(
        this.analytics.send<AnalyticsSummary>(NATS_PATTERNS.analytics.summary, query).pipe(timeout(5000)),
      );
      return { data };
    } catch (error: unknown) {
      throw mapAnalyticsError(error);
    }
  }
}

function mapAnalyticsError(error: unknown): HttpException {
  const rpc = unwrapRpc(error);
  const status = typeof rpc.status === 'number' ? rpc.status : 502;
  const code = typeof rpc.code === 'string' ? rpc.code : 'ANALYTICS_ERROR';
  const message = typeof rpc.message === 'string' ? rpc.message : 'Analytics service error';
  return new HttpException({ error: { code, message, details: [] } }, status);
}

function unwrapRpc(error: unknown): { status?: number; code?: string; message?: string } {
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.error === 'object' && record.error !== null) {
      return record.error as { status?: number; code?: string; message?: string };
    }
    return record as { status?: number; code?: string; message?: string };
  }
  return {};
}
