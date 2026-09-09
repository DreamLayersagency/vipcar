import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL ?? 'nats://localhost:4222'],
      queue: 'analytics',
    },
  });
  await app.startAllMicroservices();
  await app.listen(Number(process.env.ANALYTICS_HTTP_PORT ?? 3009));
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
