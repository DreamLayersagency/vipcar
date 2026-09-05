import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';

function resolveBookingDatabaseUrl() {
  if (process.env.BOOKING_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.BOOKING_DATABASE_URL;
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) return;
  if (/schema=identity\b/.test(url)) {
    process.env.DATABASE_URL = url.replace(/schema=identity\b/, 'schema=booking');
  } else if (/schema=catalog\b/.test(url)) {
    process.env.DATABASE_URL = url.replace(/schema=catalog\b/, 'schema=booking');
  } else if (/schema=cms\b/.test(url)) {
    process.env.DATABASE_URL = url.replace(/schema=cms\b/, 'schema=booking');
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    resolveBookingDatabaseUrl();
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }
}
