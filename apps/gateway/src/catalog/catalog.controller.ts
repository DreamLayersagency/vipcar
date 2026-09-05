import {
  Controller,
  Get,
  Headers,
  HttpException,
  Inject,
  Param,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import {
  GetVehicleDto,
  ListLocationsDto,
  ListVehiclesDto,
  NATS_PATTERNS,
  type LocaleLabel,
  type LocationDto,
  type PaginationMetaDto,
  type VehicleModelDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { CATALOG_SERVICE } from '../catalog.constants';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(@Inject(CATALOG_SERVICE) private readonly catalog: ClientProxy) {}

  @Get('vehicles')
  async listVehicles(@Query() query: ListVehiclesDto) {
    return this.send<{ data: VehicleModelDto[]; meta: PaginationMetaDto }>(
      NATS_PATTERNS.catalog.vehicles.list,
      query,
    );
  }

  @Get('vehicles/:slug')
  async getVehicle(@Param('slug') slug: string) {
    const dto: GetVehicleDto = { slug };
    const vehicle = await this.send<VehicleModelDto>(
      NATS_PATTERNS.catalog.vehicles.get,
      dto,
    );
    return { data: vehicle };
  }

  @Get('locations')
  async listLocations(@Headers('accept-language') acceptLanguage?: string) {
    const dto: ListLocationsDto = { locale: resolveLocale(acceptLanguage) };
    return this.send<{ data: LocationDto[]; meta: PaginationMetaDto }>(
      NATS_PATTERNS.catalog.locations.list,
      dto,
    );
  }

  private async send<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        this.catalog.send<T>(pattern, payload).pipe(timeout(5000)),
      );
    } catch (error: unknown) {
      throw mapCatalogError(error);
    }
  }
}

/** Accept-Language: en | fr (default en). Honors primary tag only. */
function resolveLocale(header?: string): LocaleLabel {
  if (!header) return 'en';
  const primary = header.split(',')[0]?.trim().toLowerCase() ?? '';
  return primary.startsWith('fr') ? 'fr' : 'en';
}

function mapCatalogError(error: unknown): HttpException {
  const rpc = unwrapRpc(error);
  const status = typeof rpc.status === 'number' ? rpc.status : 502;
  const code = typeof rpc.code === 'string' ? rpc.code : 'CATALOG_ERROR';
  const message = typeof rpc.message === 'string' ? rpc.message : 'Catalog service error';
  return new HttpException({ error: { code, message, details: [] } }, status);
}

function unwrapRpc(error: unknown): { status?: number; code?: string; message?: string } {
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.error === 'object' && record.error !== null) {
      return record.error as { status?: number; code?: string; message?: string };
    }
    return record as { status?: number; code?: string; message?: string };
  }
  return {};
}
