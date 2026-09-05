import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';

function resolveNotifyDatabaseUrl() {
  if (process.env.NOTIFY_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.NOTIFY_DATABASE_URL;
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) return;
  if (/schema=\w+\b/.test(url) && !/schema=notify\b/.test(url)) {
    process.env.DATABASE_URL = url.replace(/schema=\w+\b/, 'schema=notify');
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    resolveNotifyDatabaseUrl();
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }
}
