import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GetLegalPageDto, NATS_PATTERNS } from '@vipcar/contracts';
import { LegalService } from './legal.service';

@Controller()
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  @MessagePattern(NATS_PATTERNS.cms.legal.get)
  get(@Payload() dto: GetLegalPageDto) {
    return this.legal.getBySlug(dto);
  }
}
