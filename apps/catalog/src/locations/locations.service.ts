import { Injectable } from '@nestjs/common';
import type {
  ListLocationsDto,
  LocaleLabel,
  LocationDto,
  PaginationMetaDto,
} from '@vipcar/contracts';
import type { Location } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    dto: ListLocationsDto = {},
  ): Promise<{ data: LocationDto[]; meta: PaginationMetaDto }> {
    const locale: LocaleLabel = dto.locale === 'fr' ? 'fr' : 'en';

    const locations = await this.prisma.location.findMany({
      where: { isPublished: true },
      orderBy: [{ type: 'asc' }, { slug: 'asc' }],
    });

    const data = locations.map((row) => toLocationDto(row, locale));
    return {
      data,
      meta: { page: 1, limit: data.length, total: data.length },
    };
  }
}

function toLocationDto(row: Location, locale: LocaleLabel): LocationDto {
  return {
    id: row.id,
    slug: row.slug,
    name: locale === 'fr' ? row.nameFr : row.nameEn,
    type: row.type,
    airportName: row.airportName,
    hubId: row.hubId,
    supportsRental: row.supportsRental,
    supportsTransfer: row.supportsTransfer,
    supportsChauffeur: row.supportsChauffeur,
    isPublished: row.isPublished,
  };
}
