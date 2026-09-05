import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { FLEET_SERVICE } from './fleet.constants';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: FLEET_SERVICE,
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
export class FleetClientModule {}
