import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

@Module({
  controllers: [LegalController],
  providers: [LegalService, PrismaService],
})
export class LegalModule {}
