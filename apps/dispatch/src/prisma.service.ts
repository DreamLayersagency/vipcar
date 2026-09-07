import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { resolve } from 'node:path';

function resolveDispatchDatabaseUrl() {
  if (process.env.DATABASE_PROVIDER === 'sqlite') {
    const dbPath = resolve(process.cwd(), '../../.local-data/dispatch.db').replace(/\\/g, '/');
    process.env.DATABASE_URL = `file:${dbPath}`;
    return;
  }
  if (process.env.DISPATCH_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DISPATCH_DATABASE_URL;
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) return;
  if (/schema=\w+\b/.test(url) && !/schema=dispatch\b/.test(url)) {
    process.env.DATABASE_URL = url.replace(/schema=\w+\b/, 'schema=dispatch');
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    resolveDispatchDatabaseUrl();
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }
}
