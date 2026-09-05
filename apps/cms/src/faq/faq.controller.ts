import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ListFaqDto, NATS_PATTERNS } from '@vipcar/contracts';
import { FaqService } from './faq.service';

@Controller()
export class FaqController {
  constructor(private readonly faq: FaqService) {}

  @MessagePattern(NATS_PATTERNS.cms.faq.list)
  list(@Payload() dto: ListFaqDto) {
    return this.faq.list(dto);
  }
}
