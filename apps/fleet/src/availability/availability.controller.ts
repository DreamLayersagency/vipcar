import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NATS_PATTERNS, SearchAvailabilityDto } from '@vipcar/contracts';
import { AvailabilityService } from './availability.service';

@Controller()
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @MessagePattern(NATS_PATTERNS.fleet.availability.search)
  search(@Payload() dto: SearchAvailabilityDto) {
    return this.availability.search(dto);
  }
}
