import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ListLocationsDto, NATS_PATTERNS } from '@vipcar/contracts';
import { LocationsService } from './locations.service';

@Controller()
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @MessagePattern(NATS_PATTERNS.catalog.locations.list)
  list(@Payload() dto: ListLocationsDto) {
    return this.locations.list(dto);
  }
}
