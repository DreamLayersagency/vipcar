import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NATS_PATTERNS, TrackAnalyticsEventDto } from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { ANALYTICS_SERVICE } from '../analytics.constants';

@ApiTags('analytics')
@Controller('analytics/events')
export class AnalyticsController {
  constructor(@Inject(ANALYTICS_SERVICE) private readonly analytics: ClientProxy) {}

  @Post()
  @ApiOperation({ summary: 'Record a public website analytics event' })
  async track(@Body() body: TrackAnalyticsEventDto) {
    try {
      await firstValueFrom(this.analytics.send(NATS_PATTERNS.analytics.eventTrack, body).pipe(timeout(1500)));
      return { data: { accepted: true } };
    } catch {
      // Tracking must never interrupt the public booking journey during a brief service restart.
      return { data: { accepted: false } };
    }
  }
}
