import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import {
  DOMAIN_EVENTS,
  NATS_PATTERNS,
  type DepositReleasedEventDto,
  type DispatchAssignedEventDto,
  type DispatchTripStatusEventDto,
  type QuoteCreatedEventDto,
} from '@vipcar/contracts';
import { DeliveryService } from './delivery.service';

@Controller()
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @MessagePattern(NATS_PATTERNS.notify.health)
  health() {
    return { data: { status: 'ok', service: 'notify' } };
  }

  @EventPattern(DOMAIN_EVENTS.bookingQuoteCreated)
  async onQuoteCreated(@Payload() event: QuoteCreatedEventDto): Promise<void> {
    await this.delivery.onQuoteCreated(event);
  }

  @EventPattern(DOMAIN_EVENTS.billingDepositReleased)
  async onDepositReleased(
    @Payload() event: DepositReleasedEventDto,
  ): Promise<void> {
    await this.delivery.onDepositReleased(event);
  }

  @EventPattern(DOMAIN_EVENTS.dispatchAssigned)
  async onDispatchAssigned(
    @Payload() event: DispatchAssignedEventDto,
  ): Promise<void> {
    await this.delivery.onDispatchAssigned(event);
  }

  @EventPattern(DOMAIN_EVENTS.dispatchTripStatus)
  async onTripStatusChanged(
    @Payload() event: DispatchTripStatusEventDto,
  ): Promise<void> {
    await this.delivery.onTripStatusChanged(event);
  }
}
