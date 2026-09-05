import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';

function resolveCatalogDatabaseUrl() {
  if (process.env.CATALOG_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.CATALOG_DATABASE_URL;
    return;
  }
  const url = process.env.DATABASE_URL;
  if (url && /schema=identity\b/.test(url)) {
    process.env.DATABASE_URL = url.replace(/schema=identity\b/, 'schema=catalog');
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    resolveCatalogDatabaseUrl();
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }
}
