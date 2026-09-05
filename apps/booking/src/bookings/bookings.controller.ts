import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import {
  CancelBookingDto,
  ConfirmBookingDto,
  DOMAIN_EVENTS,
  GetBookingDto,
  ListMyBookingsDto,
  NATS_PATTERNS,
  UpdateBookingStatusDto,
  type DispatchTripCompletedEventDto,
  type PaymentCapturedEventDto,
} from '@vipcar/contracts';
import { BookingsService } from './bookings.service';

@Controller()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @MessagePattern(NATS_PATTERNS.booking.get)
  get(@Payload() dto: GetBookingDto) {
    return this.bookings.get(dto);
  }

  @MessagePattern(NATS_PATTERNS.booking.list)
  listMine(@Payload() dto: ListMyBookingsDto) {
    return this.bookings.listMine(dto);
  }

  @MessagePattern(NATS_PATTERNS.booking.confirm)
  confirm(@Payload() dto: ConfirmBookingDto) {
    return this.bookings.confirm(dto);
  }

  @MessagePattern(NATS_PATTERNS.booking.cancel)
  cancel(@Payload() dto: CancelBookingDto) {
    return this.bookings.cancel(dto);
  }

  @MessagePattern(NATS_PATTERNS.booking.status.update)
  updateStatus(@Payload() dto: UpdateBookingStatusDto) {
    return this.bookings.updateStatus(dto);
  }

  /** Capture → awaiting_payment → confirmed (+ fleet calendar block). Idempotent. */
  @EventPattern(DOMAIN_EVENTS.billingPaymentCaptured)
  async onPaymentCaptured(
    @Payload() event: PaymentCapturedEventDto,
  ): Promise<void> {
    await this.bookings.onPaymentCaptured(event);
  }

  /** Trip done → booking.started then booking.completed as needed. Idempotent. */
  @EventPattern(DOMAIN_EVENTS.dispatchTripCompleted)
  async onTripCompleted(
    @Payload() event: DispatchTripCompletedEventDto,
  ): Promise<void> {
    await this.bookings.onTripCompleted(event);
  }
}
