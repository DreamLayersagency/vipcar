import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { NATS_PATTERNS } from '@vipcar/contracts';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { data: { status: 'ok', service: 'billing' } };
  }

  @MessagePattern(NATS_PATTERNS.billing.health)
  natsHealth() {
    return { status: 'ok', service: 'billing' };
  }
}
