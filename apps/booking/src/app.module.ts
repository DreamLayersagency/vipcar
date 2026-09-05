import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { BookingsModule } from './bookings/bookings.module';
import { HealthController } from './health.controller';
import { QuotesModule } from './quotes/quotes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env'), join(process.cwd(), '.env')],
    }),
    QuotesModule,
    BookingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
