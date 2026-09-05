import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import {
  BlockCalendarDto,
  DOMAIN_EVENTS,
  NATS_PATTERNS,
  ReleaseCalendarBlockDto,
  type BookingConfirmedEventDto,
  type BookingStatusChangedEventDto,
} from '@vipcar/contracts';
import { CalendarService } from './calendar.service';

@Controller()
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @MessagePattern(NATS_PATTERNS.fleet.calendar.block)
  block(@Payload() dto: BlockCalendarDto) {
    return this.calendar.block(dto);
  }

  @MessagePattern(NATS_PATTERNS.fleet.calendar.release)
  release(@Payload() dto: ReleaseCalendarBlockDto) {
    return this.calendar.release(dto);
  }

  @EventPattern(DOMAIN_EVENTS.bookingConfirmed)
  async onBookingConfirmed(
    @Payload() event: BookingConfirmedEventDto,
  ): Promise<void> {
    await this.calendar.onBookingConfirmed(event);
  }

  @EventPattern(DOMAIN_EVENTS.bookingCancelled)
  async onBookingCancelled(
    @Payload() event: BookingStatusChangedEventDto,
  ): Promise<void> {
    await this.calendar.onBookingCancelled(event);
  }
}
