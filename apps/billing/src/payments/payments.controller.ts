import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateCheckoutDto,
  DOMAIN_EVENTS,
  GetPaymentDto,
  HandleWebhookDto,
  NATS_PATTERNS,
  type BookingStatusChangedEventDto,
} from '@vipcar/contracts';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @MessagePattern(NATS_PATTERNS.billing.checkout.create)
  createCheckout(@Payload() dto: CreateCheckoutDto) {
    return this.payments.createCheckout(dto);
  }

  @MessagePattern(NATS_PATTERNS.billing.payment.get)
  getPayment(@Payload() dto: GetPaymentDto) {
    return this.payments.getByBooking(dto);
  }

  @MessagePattern(NATS_PATTERNS.billing.webhook.handle)
  handleWebhook(@Payload() dto: HandleWebhookDto) {
    return this.payments.handleWebhook(dto);
  }

  @EventPattern(DOMAIN_EVENTS.bookingCompleted)
  async onBookingCompleted(
    @Payload() event: BookingStatusChangedEventDto,
  ): Promise<void> {
    await this.payments.onBookingCompleted(event);
  }
}
