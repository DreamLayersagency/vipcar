import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BOOKING_NATS } from '../booking.constants';
import { PrismaService } from '../prisma.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

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
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService],
})
export class BookingsModule {}
