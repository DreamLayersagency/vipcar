import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { NATS_PATTERNS } from '@vipcar/contracts';

@Controller()
export class HealthController {
  @Get('health')
  httpHealth() {
    return { data: { status: 'ok', service: 'analytics' } };
  }

  @MessagePattern(NATS_PATTERNS.analytics.health)
  health() {
    return { status: 'ok', service: 'analytics' };
  }
}
