import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import {
  DOMAIN_EVENTS,
  NATS_PATTERNS,
  UpdateTripStatusDto,
  type AssignDriverDto,
  type BookingConfirmedEventDto,
  type BookingStatusChangedEventDto,
} from '@vipcar/contracts';
import { AssignmentsService } from './assignments.service';

@Controller()
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @MessagePattern(NATS_PATTERNS.dispatch.assign)
  async assign(@Payload() dto: AssignDriverDto) {
    return this.assignments.assign(dto);
  }

  @MessagePattern(NATS_PATTERNS.dispatch.trip.status)
  async updateTripStatus(@Payload() dto: UpdateTripStatusDto) {
    return this.assignments.updateTripStatus(dto);
  }

  @EventPattern(DOMAIN_EVENTS.bookingConfirmed)
  async onBookingConfirmed(
    @Payload() event: BookingConfirmedEventDto,
  ): Promise<void> {
    await this.assignments.onBookingConfirmed(event);
  }

  @EventPattern(DOMAIN_EVENTS.bookingCancelled)
  async onBookingCancelled(
    @Payload() event: BookingStatusChangedEventDto,
  ): Promise<void> {
    await this.assignments.onBookingCancelled(event);
  }
}
