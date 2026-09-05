import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CorporateProfilesController } from './corporate-profiles.controller';
import { CorporateProfilesService } from './corporate-profiles.service';

@Module({
  controllers: [CorporateProfilesController],
  providers: [PrismaService, CorporateProfilesService],
  exports: [CorporateProfilesService],
})
export class CorporateProfilesModule {}
