import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AcquireHoldDto, NATS_PATTERNS, ReleaseHoldDto } from '@vipcar/contracts';
import { HoldService } from './hold.service';

@Controller()
export class HoldController {
  constructor(private readonly holds: HoldService) {}

  @MessagePattern(NATS_PATTERNS.fleet.hold.acquire)
  acquire(@Payload() dto: AcquireHoldDto) {
    return this.holds.acquire(dto);
  }

  @MessagePattern(NATS_PATTERNS.fleet.hold.release)
  release(@Payload() dto: ReleaseHoldDto) {
    return this.holds.release(dto);
  }
}
