import { Module } from '@nestjs/common';
import { HoldModule } from '../holds/hold.module';
import { PrismaService } from '../prisma.service';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [HoldModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, PrismaService],
})
export class AvailabilityModule {}
