import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { resolve } from 'node:path';

function resolveFleetDatabaseUrl() {
  if (process.env.DATABASE_PROVIDER === 'sqlite') {
    const dbPath = resolve(process.cwd(), '../../.local-data/fleet.db').replace(/\\/g, '/');
    process.env.DATABASE_URL = `file:${dbPath}`;
    return;
  }
  if (process.env.FLEET_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.FLEET_DATABASE_URL;
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) return;
  if (/schema=\w+\b/.test(url) && !/schema=fleet\b/.test(url)) {
    process.env.DATABASE_URL = url.replace(/schema=\w+\b/, 'schema=fleet');
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    resolveFleetDatabaseUrl();
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }
}
