import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { resolve } from 'node:path';

function resolveIdentityDatabaseUrl() {
  if (process.env.DATABASE_PROVIDER !== 'sqlite') return;
  const dbPath = resolve(process.cwd(), '../../.local-data/identity.db').replace(/\\/g, '/');
  process.env.DATABASE_URL = `file:${dbPath}`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    resolveIdentityDatabaseUrl();
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }
}
