import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  GetVehicleDto,
  ListVehiclesAdminDto,
  ListVehiclesDto,
  NATS_PATTERNS,
  UpsertVehicleDto,
} from '@vipcar/contracts';
import { VehiclesService } from './vehicles.service';

@Controller()
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @MessagePattern(NATS_PATTERNS.catalog.health)
  health() {
    return { status: 'ok', service: 'catalog' };
  }

  @MessagePattern(NATS_PATTERNS.catalog.vehicles.list)
  list(@Payload() dto: ListVehiclesDto) {
    return this.vehicles.list(dto);
  }

  @MessagePattern(NATS_PATTERNS.catalog.vehicles.get)
  get(@Payload() dto: GetVehicleDto) {
    return this.vehicles.getBySlug(dto);
  }

  @MessagePattern(NATS_PATTERNS.catalog.admin.vehiclesList)
  listAdmin(@Payload() dto: ListVehiclesAdminDto) {
    return this.vehicles.listAdmin(dto);
  }

  @MessagePattern(NATS_PATTERNS.catalog.admin.vehicleGet)
  getAdmin(@Payload() dto: GetVehicleDto) {
    return this.vehicles.getAdminBySlug(dto);
  }

  @MessagePattern(NATS_PATTERNS.catalog.admin.vehicleUpsert)
  upsert(@Payload() dto: UpsertVehicleDto) {
    return this.vehicles.upsert(dto);
  }
}
