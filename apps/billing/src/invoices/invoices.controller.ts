import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateInvoiceDto, NATS_PATTERNS } from '@vipcar/contracts';
import { InvoicesService } from './invoices.service';

@Controller()
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @MessagePattern(NATS_PATTERNS.billing.invoice.create)
  create(@Payload() dto: CreateInvoiceDto) {
    return this.invoices.create(dto);
  }
}
