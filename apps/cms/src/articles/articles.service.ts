import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import type {
  AdminArticleDto,
  ArticleDto,
  ArticleSectionDto,
  GetArticleDto,
  ListArticlesAdminDto,
  ListArticlesDto,
  LocaleLabel,
  PaginationMetaDto,
  UpsertArticleDto,
} from '@vipcar/contracts';
import type { Article, Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    dto: ListArticlesDto = {},
  ): Promise<{ data: ArticleDto[]; meta: PaginationMetaDto }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const locale = dto.locale ?? 'en';
    const where = { isPublished: true };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { slug: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: rows.map((row) => toArticleDto(row, locale)),
      meta: { page, limit, total },
    };
  }

  async getBySlug(dto: GetArticleDto): Promise<ArticleDto> {
    const locale = dto.locale ?? 'en';
    const row = await this.prisma.article.findFirst({
      where: { slug: dto.slug, isPublished: true },
    });

    if (!row) {
      throw new RpcException({
        code: 'ARTICLE_NOT_FOUND',
        message: 'Article not found',
        status: 404,
      });
    }

    return toArticleDto(row, locale);
  }

  /** Staff list — includes unpublished drafts. */
  async listAdmin(
    dto: ListArticlesAdminDto = {},
  ): Promise<{ data: AdminArticleDto[]; meta: PaginationMetaDto }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const where = {
      ...(typeof dto.isPublished === 'boolean' ? { isPublished: dto.isPublished } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        orderBy: [{ isPublished: 'desc' }, { updatedAt: 'desc' }, { slug: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: rows.map(toAdminArticleDto),
      meta: { page, limit, total },
    };
  }

  /** Staff get by slug — includes unpublished drafts. */
  async getAdminBySlug(dto: GetArticleDto): Promise<AdminArticleDto> {
    const row = await this.prisma.article.findFirst({
      where: { slug: dto.slug },
    });

    if (!row) {
      throw new RpcException({
        code: 'ARTICLE_NOT_FOUND',
        message: 'Article not found',
        status: 404,
      });
    }

    return toAdminArticleDto(row);
  }

  async upsert(dto: UpsertArticleDto): Promise<AdminArticleDto> {
    const existing = await this.prisma.article.findUnique({
      where: { slug: dto.slug },
    });

    let publishedAt: Date | null = existing?.publishedAt ?? null;
    if (dto.isPublished) {
      publishedAt = publishedAt ?? new Date();
    } else {
      publishedAt = null;
    }

    const data = {
      titleEn: dto.titleEn,
      titleFr: dto.titleFr,
      summaryEn: dto.summaryEn,
      summaryFr: dto.summaryFr,
      sectionsEn: dto.sectionsEn as unknown as Prisma.InputJsonValue,
      sectionsFr: dto.sectionsFr as unknown as Prisma.InputJsonValue,
      imageKey: dto.imageKey,
      isPublished: dto.isPublished,
      publishedAt,
    };

    const row = await this.prisma.article.upsert({
      where: { slug: dto.slug },
      create: { slug: dto.slug, ...data },
      update: data,
    });

    return toAdminArticleDto(row);
  }
}

function parseSections(value: Prisma.JsonValue): ArticleSectionDto[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is { heading: string; text: string } =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { heading?: unknown }).heading === 'string' &&
        typeof (item as { text?: unknown }).text === 'string',
    )
    .map((item) => ({ heading: item.heading, text: item.text }));
}

function toArticleDto(row: Article, locale: LocaleLabel): ArticleDto {
  const fr = locale === 'fr';
  return {
    id: row.id,
    slug: row.slug,
    title: fr ? row.titleFr : row.titleEn,
    summary: fr ? row.summaryFr : row.summaryEn,
    sections: parseSections(fr ? row.sectionsFr : row.sectionsEn),
    imageKey: row.imageKey,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    isPublished: row.isPublished,
  };
}

function toAdminArticleDto(row: Article): AdminArticleDto {
  return {
    id: row.id,
    slug: row.slug,
    titleEn: row.titleEn,
    titleFr: row.titleFr,
    summaryEn: row.summaryEn,
    summaryFr: row.summaryFr,
    sectionsEn: parseSections(row.sectionsEn),
    sectionsFr: parseSections(row.sectionsFr),
    imageKey: row.imageKey,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    isPublished: row.isPublished,
  };
}
