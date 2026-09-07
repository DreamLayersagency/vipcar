import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            details: errors.map((error) => ({
              field: error.property,
              constraints: error.constraints,
            })),
          },
        }),
    }),
  );

  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('VIPCAR API')
      .setDescription(
        [
          'HTTP gateway for VIPCAR microservices.',
          '',
          'Staff ops (`ops` tag, Bearer JWT, roles ops_agent|admin unless noted):',
          '- Quotes inbox: `GET /v1/ops/quotes`, `PATCH /v1/ops/quotes/:id` (price), `POST /v1/ops/quotes/:id/confirm`',
          '- Reservations: `GET /v1/ops/reservations`, `GET /v1/ops/reservations/:id`, plus price, confirm, status and fleet-unit assignment actions',
          '- Bookings: `POST /v1/ops/bookings/:id/confirm`',
          '- Catalog/CMS: `GET /v1/ops/catalog/vehicles`, `GET|PUT /v1/ops/catalog/vehicles/:slug`, `GET /v1/ops/cms/articles`, `GET|PUT /v1/ops/cms/articles/:slug`',
          '- Fleet: `GET /v1/ops/fleet/availability`',
          '- Dispatch: `POST /v1/ops/dispatch/assign`, `POST /v1/ops/dispatch/trip/status` (driver allowed)',
          '',
          'Visual admin UI is Phase J (`/admin` routes in `apps/web`, same port); use this OpenAPI as the staff contract.',
        ].join('\n'),
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });

  const port = Number(process.env.GATEWAY_PORT ?? 3000);
  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
