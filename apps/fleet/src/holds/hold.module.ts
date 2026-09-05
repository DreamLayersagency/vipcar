import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { HoldController } from './hold.controller';
import { HoldService } from './hold.service';

@Module({
  controllers: [HoldController],
  providers: [HoldService, PrismaService],
  exports: [HoldService],
})
export class HoldModule {}
