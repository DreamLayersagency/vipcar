import { Module } from '@nestjs/common';
import { CorporateProfilesModule } from '../corporate-profiles/corporate-profiles.module';
import { PrismaService } from '../prisma.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [CorporateProfilesModule],
  controllers: [InvoicesController],
  providers: [PrismaService, InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
