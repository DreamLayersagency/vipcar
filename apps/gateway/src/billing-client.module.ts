import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BILLING_SERVICE } from './billing.constants';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: BILLING_SERVICE,
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
  exports: [ClientsModule],
})
export class BillingClientModule {}
