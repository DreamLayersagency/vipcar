import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { CorporateProfilesModule } from './corporate-profiles/corporate-profiles.module';
import { HealthController } from './health.controller';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env'), join(process.cwd(), '.env')],
    }),
    PaymentsModule,
    InvoicesModule,
    CorporateProfilesModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
