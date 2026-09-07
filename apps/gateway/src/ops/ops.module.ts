import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OpsBookingsController } from './ops-bookings.controller';
import { OpsCatalogController } from './ops-catalog.controller';
import { OpsCmsController } from './ops-cms.controller';
import { OpsCorporateController } from './ops-corporate.controller';
import { OpsDispatchController } from './ops-dispatch.controller';
import { OpsFleetController } from './ops-fleet.controller';
import { OpsQuotesController } from './ops-quotes.controller';
import { OpsReservationsController } from './ops-reservations.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    OpsBookingsController,
    OpsCatalogController,
    OpsCmsController,
    OpsCorporateController,
    OpsDispatchController,
    OpsFleetController,
    OpsQuotesController,
    OpsReservationsController,
  ],
})
export class OpsModule {}
