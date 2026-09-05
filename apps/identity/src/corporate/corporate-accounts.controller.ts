import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateCorporateAccountDto,
  LinkCorporateManagerDto,
  ListCorporateAccountsDto,
  NATS_PATTERNS,
} from '@vipcar/contracts';
import { CorporateAccountsService } from './corporate-accounts.service';

@Controller()
export class CorporateAccountsController {
  constructor(private readonly corporate: CorporateAccountsService) {}

  @MessagePattern(NATS_PATTERNS.identity.admin.corporateAccountList)
  list(@Payload() dto: ListCorporateAccountsDto) {
    return this.corporate.list(dto);
  }

  @MessagePattern(NATS_PATTERNS.identity.admin.corporateAccountCreate)
  create(@Payload() dto: CreateCorporateAccountDto) {
    return this.corporate.create(dto);
  }

  @MessagePattern(NATS_PATTERNS.identity.admin.corporateAccountLinkManager)
  linkManager(@Payload() dto: LinkCorporateManagerDto) {
    return this.corporate.linkManager(dto);
  }
}
