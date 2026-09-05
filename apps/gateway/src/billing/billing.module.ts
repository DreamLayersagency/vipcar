import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingWebhooksController } from './billing-webhooks.controller';
import { BillingController } from './billing.controller';

@Module({
  imports: [AuthModule],
  controllers: [BillingController, BillingWebhooksController],
})
export class BillingModule {}
