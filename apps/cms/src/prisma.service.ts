import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';

function resolveCmsDatabaseUrl() {
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
