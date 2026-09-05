import { Module } from '@nestjs/common';
import { MockEmailAdapter } from '../adapters/mock-email.adapter';
import { MockWhatsAppAdapter } from '../adapters/mock-whatsapp.adapter';
import { PrismaService } from '../prisma.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryWorker } from './delivery.worker';

@Module({
  controllers: [DeliveryController],
  providers: [
    PrismaService,
    DeliveryService,
    DeliveryWorker,
    MockWhatsAppAdapter,
    MockEmailAdapter,
  ],
})
export class DeliveryModule {}
