import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { DeliveryModule } from './delivery/delivery.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env'), join(process.cwd(), '.env')],
    }),
    ScheduleModule.forRoot(),
    DeliveryModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
