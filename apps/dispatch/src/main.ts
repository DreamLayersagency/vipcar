import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [natsUrl],
      queue: 'dispatch',
    },
  });

  await app.startAllMicroservices();
  const port = Number(process.env.DISPATCH_HTTP_PORT ?? 3008);
  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
