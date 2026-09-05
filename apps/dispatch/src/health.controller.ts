import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { NATS_PATTERNS } from '@vipcar/contracts';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { data: { status: 'ok', service: 'dispatch' } };
  }

  @MessagePattern(NATS_PATTERNS.dispatch.health)
  natsHealth() {
    return { status: 'ok', service: 'dispatch' };
  }
}
