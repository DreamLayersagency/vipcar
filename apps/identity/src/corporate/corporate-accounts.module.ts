import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CorporateAccountsController } from './corporate-accounts.controller';
import { CorporateAccountsService } from './corporate-accounts.service';

@Module({
  controllers: [CorporateAccountsController],
  providers: [CorporateAccountsService, PrismaService],
})
export class CorporateAccountsModule {}
