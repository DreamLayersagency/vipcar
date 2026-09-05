import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateQuoteDto,
  ListQuotesDto,
  NATS_PATTERNS,
  SetQuotePriceDto,
} from '@vipcar/contracts';
import { QuotesService } from './quotes.service';

@Controller()
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @MessagePattern(NATS_PATTERNS.booking.health)
  health() {
    return { status: 'ok', service: 'booking' };
  }

  @MessagePattern(NATS_PATTERNS.booking.quote.create)
  create(@Payload() dto: CreateQuoteDto) {
    return this.quotes.create(dto);
  }

  @MessagePattern(NATS_PATTERNS.booking.quote.list)
  list(@Payload() dto: ListQuotesDto) {
    return this.quotes.list(dto);
  }

  @MessagePattern(NATS_PATTERNS.booking.quote.price)
  setPrice(@Payload() dto: SetQuotePriceDto) {
    return this.quotes.setPrice(dto);
  }
}
