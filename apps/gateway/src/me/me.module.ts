import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MeBookingsController } from './me-bookings.controller';

@Module({
  imports: [AuthModule],
  controllers: [MeBookingsController],
})
export class MeModule {}
