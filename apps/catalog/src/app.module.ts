import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { HealthController } from './health.controller';
import { LocationsModule } from './locations/locations.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env'), join(process.cwd(), '.env')],
    }),
    VehiclesModule,
    LocationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
