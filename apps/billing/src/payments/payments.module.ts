import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PAYMENT_PROVIDERS, type PaymentProviderLabel } from '@vipcar/contracts';
import {
  BILLING_NATS,
  PAYMENT_PROVIDER,
  PAYMENT_PROVIDERS_MAP,
} from '../billing.constants';
import { FlouciProvider } from '../providers/flouci.provider';
import { KonnectProvider } from '../providers/konnect.provider';
import { ManualProvider } from '../providers/manual.provider';
import type { PaymentProvider } from '../providers/payment-provider';
import { StripeStubProvider } from '../providers/stripe-stub.provider';
import { PrismaService } from '../prisma.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: BILLING_NATS,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [config.get<string>('NATS_URL', 'nats://localhost:4222')],
          },
        }),
      },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [
    PrismaService,
    PaymentsService,
    ManualProvider,
    KonnectProvider,
    FlouciProvider,
    StripeStubProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [
        ConfigService,
        ManualProvider,
        KonnectProvider,
        FlouciProvider,
        StripeStubProvider,
      ],
      useFactory: (
        config: ConfigService,
        manual: ManualProvider,
        konnect: KonnectProvider,
        flouci: FlouciProvider,
        stripe: StripeStubProvider,
      ): PaymentProvider => {
        const configured = (config.get<string>('BILLING_DEFAULT_PROVIDER') ?? 'manual')
          .trim()
          .toLowerCase();
        const name: PaymentProviderLabel = isPaymentProvider(configured)
          ? configured
          : 'manual';

        switch (name) {
          case 'konnect':
            return konnect;
          case 'flouci':
            return flouci;
          case 'stripe':
            return stripe;
          case 'manual':
          default:
            return manual;
        }
      },
    },
    {
      provide: PAYMENT_PROVIDERS_MAP,
      inject: [ManualProvider, KonnectProvider, FlouciProvider, StripeStubProvider],
      useFactory: (
        manual: ManualProvider,
        konnect: KonnectProvider,
        flouci: FlouciProvider,
        stripe: StripeStubProvider,
      ): Record<PaymentProviderLabel, PaymentProvider> => ({
        manual,
        konnect,
        flouci,
        stripe,
      }),
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}

function isPaymentProvider(value: string): value is PaymentProviderLabel {
  return (PAYMENT_PROVIDERS as readonly string[]).includes(value);
}
