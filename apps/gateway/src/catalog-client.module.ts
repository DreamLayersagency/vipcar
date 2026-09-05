import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CATALOG_SERVICE } from './catalog.constants';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: CATALOG_SERVICE,
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
export class CatalogClientModule {}
