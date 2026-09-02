import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import { NATS_PATTERNS } from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { IDENTITY_SERVICE } from './identity.constants';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(@Inject(IDENTITY_SERVICE) private readonly identity: ClientProxy) {}

  @Get('health')
  async health() {
    try {
      const identity = await firstValueFrom(
        this.identity.send(NATS_PATTERNS.identity.health, {}).pipe(timeout(3000)),
      );
      return { data: { status: 'ok', service: 'gateway', identity } };
    } catch {
      throw new ServiceUnavailableException({
        error: {
          code: 'IDENTITY_UNAVAILABLE',
          message: 'Gateway is up but identity is unreachable',
          details: [],
        },
      });
    }
  }
}
