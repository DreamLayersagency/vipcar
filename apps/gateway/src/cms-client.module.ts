import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CMS_SERVICE } from './cms.constants';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: CMS_SERVICE,
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
export class CmsClientModule {}
