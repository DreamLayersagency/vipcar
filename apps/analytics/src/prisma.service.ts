import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { resolve } from 'node:path';

function resolveAnalyticsDatabaseUrl() {
  if (process.env.DATABASE_PROVIDER === 'sqlite') {
    const dbPath = resolve(process.cwd(), '../../.local-data/analytics.db').replace(/\\/g, '/');
    process.env.DATABASE_URL = `file:${dbPath}`;
    return;
  }
  if (process.env.ANALYTICS_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.ANALYTICS_DATABASE_URL;
    return;
  }
  const url = process.env.DATABASE_URL;
  if (url && /schema=\w+\b/.test(url) && !/schema=analytics\b/.test(url)) {
    process.env.DATABASE_URL = url.replace(/schema=\w+\b/, 'schema=analytics');
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    resolveAnalyticsDatabaseUrl();
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }
}
