import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import type { GetLegalPageDto, LegalPageDto, LocaleLabel } from '@vipcar/contracts';
import type { LegalPage } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  async getBySlug(dto: GetLegalPageDto): Promise<LegalPageDto> {
    const locale = dto.locale ?? 'en';
    const row = await this.prisma.legalPage.findFirst({
      where: { slug: dto.slug, isPublished: true },
    });

    if (!row) {
      throw new RpcException({
        code: 'LEGAL_PAGE_NOT_FOUND',
        message: 'Legal page not found',
        status: 404,
      });
    }

    return toLegalDto(row, locale);
  }
}

function toLegalDto(row: LegalPage, locale: LocaleLabel): LegalPageDto {
  const fr = locale === 'fr';
  return {
    id: row.id,
    slug: row.slug,
    title: fr ? row.titleFr : row.titleEn,
    body: fr ? row.bodyFr : row.bodyEn,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    isPublished: row.isPublished,
  };
}
