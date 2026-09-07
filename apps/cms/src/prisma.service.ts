import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { resolve } from 'node:path';

function resolveCmsDatabaseUrl() {
  if (process.env.DATABASE_PROVIDER === 'sqlite') {
    const dbPath = resolve(process.cwd(), '../../.local-data/cms.db').replace(/\\/g, '/');
    process.env.DATABASE_URL = `file:${dbPath}`;
    return;
  }
  if (process.env.CMS_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.CMS_DATABASE_URL;
    return;
  }
  const url = process.env.DATABASE_URL;
  if (url && /schema=identity\b/.test(url)) {
    process.env.DATABASE_URL = url.replace(/schema=identity\b/, 'schema=cms');
  } else if (url && /schema=catalog\b/.test(url)) {
    process.env.DATABASE_URL = url.replace(/schema=catalog\b/, 'schema=cms');
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    resolveCmsDatabaseUrl();
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }
}
