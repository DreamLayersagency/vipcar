import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { NATS_PATTERNS } from '@vipcar/contracts';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { data: { status: 'ok', service: 'fleet' } };
  }

  @MessagePattern(NATS_PATTERNS.fleet.health)
  natsHealth() {
    return { status: 'ok', service: 'fleet' };
  }
}
