import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AssignmentsModule } from './assignments/assignments.module';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env'), join(process.cwd(), '.env')],
    }),
    AssignmentsModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
