import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { BillingClientModule } from './billing-client.module';
import { BillingModule } from './billing/billing.module';
import { BookingClientModule } from './booking-client.module';
import { CatalogClientModule } from './catalog-client.module';
import { CatalogModule } from './catalog/catalog.module';
import { CmsClientModule } from './cms-client.module';
import { CmsModule } from './cms/cms.module';
import { DispatchClientModule } from './dispatch-client.module';
import { FleetClientModule } from './fleet-client.module';
import { HealthController } from './health.controller';
import { IdentityClientModule } from './identity-client.module';
import { OpsModule } from './ops/ops.module';
import { ContactModule } from './contact/contact.module';
import { QuotesModule } from './quotes/quotes.module';
import { BookingsModule } from './bookings/bookings.module';
import { MeModule } from './me/me.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env'), join(process.cwd(), '.env')],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-only-change-me'),
      }),
    }),
    IdentityClientModule,
    CatalogClientModule,
    CmsClientModule,
    BookingClientModule,
    FleetClientModule,
    BillingClientModule,
    DispatchClientModule,
    AuthModule,
    CatalogModule,
    CmsModule,
    QuotesModule,
    BookingsModule,
    MeModule,
    BillingModule,
    ContactModule,
    OpsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
