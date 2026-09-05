import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  GetCorporateBillingProfileDto,
  NATS_PATTERNS,
  UpsertCorporateBillingProfileDto,
} from '@vipcar/contracts';
import { CorporateProfilesService } from './corporate-profiles.service';

@Controller()
export class CorporateProfilesController {
  constructor(private readonly profiles: CorporateProfilesService) {}

  @MessagePattern(NATS_PATTERNS.billing.corporateProfile.upsert)
  upsert(@Payload() dto: UpsertCorporateBillingProfileDto) {
    return this.profiles.upsert(dto);
  }

  @MessagePattern(NATS_PATTERNS.billing.corporateProfile.get)
  get(@Payload() dto: GetCorporateBillingProfileDto) {
    return this.profiles.get(dto);
  }
}
