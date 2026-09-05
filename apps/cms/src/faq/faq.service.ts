import { Injectable } from '@nestjs/common';
import type { FaqItemDto, ListFaqDto, LocaleLabel } from '@vipcar/contracts';
import type { FaqItem } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  async list(dto: ListFaqDto = {}): Promise<{ data: FaqItemDto[] }> {
    const locale = dto.locale ?? 'en';
    const rows = await this.prisma.faqItem.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
    });

    return { data: rows.map((row) => toFaqDto(row, locale)) };
  }
}

function toFaqDto(row: FaqItem, locale: LocaleLabel): FaqItemDto {
  const fr = locale === 'fr';
  return {
    id: row.id,
    slug: row.slug,
    question: fr ? row.questionFr : row.questionEn,
    answer: fr ? row.answerFr : row.answerEn,
    sortOrder: row.sortOrder,
    isPublished: row.isPublished,
  };
}
