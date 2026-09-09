import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AnalyticsSummaryQueryDto, NATS_PATTERNS, TrackAnalyticsEventDto } from '@vipcar/contracts';
import { AnalyticsService } from './analytics.service';

@Controller()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @MessagePattern(NATS_PATTERNS.analytics.eventTrack)
  track(@Payload() dto: TrackAnalyticsEventDto) {
    return this.analytics.track(dto);
  }

  @MessagePattern(NATS_PATTERNS.analytics.summary)
  summary(@Payload() dto: AnalyticsSummaryQueryDto) {
    return this.analytics.summary(dto);
  }
}
