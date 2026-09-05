import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BOOKING_NATS } from '../booking.constants';
import { PrismaService } from '../prisma.service';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: BOOKING_NATS,
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
  controllers: [QuotesController],
  providers: [QuotesService, PrismaService],
})
export class QuotesModule {}
