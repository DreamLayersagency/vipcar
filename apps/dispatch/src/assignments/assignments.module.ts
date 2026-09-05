import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DISPATCH_NATS } from '../dispatch.constants';
import { PrismaService } from '../prisma.service';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: DISPATCH_NATS,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [config.get<string>('NATS_URL', 'nats://localhost:4222')],
          },
        }),
      },
    ]),
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, PrismaService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
