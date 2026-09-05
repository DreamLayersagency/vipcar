import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';

function resolveBillingDatabaseUrl() {
  if (process.env.BILLING_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.BILLING_DATABASE_URL;
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) return;
  if (/schema=\w+\b/.test(url) && !/schema=billing\b/.test(url)) {
    process.env.DATABASE_URL = url.replace(/schema=\w+\b/, 'schema=billing');
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    resolveBillingDatabaseUrl();
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }
}
