import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AvailabilityModule } from './availability/availability.module';
import { CalendarModule } from './calendar/calendar.module';
import { HealthController } from './health.controller';
import { HoldModule } from './holds/hold.module';
import { PrismaService } from './prisma.service';
import { RedisModule } from './redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env'), join(process.cwd(), '.env')],
    }),
    RedisModule,
    HoldModule,
    AvailabilityModule,
    CalendarModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
