import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GetVehicleDto,
  ListVehiclesAdminDto,
  NATS_PATTERNS,
  STAFF_ROLES,
  UpsertVehicleDto,
  type PaginationMetaDto,
  type VehicleModelDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CATALOG_SERVICE } from '../catalog.constants';

@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops/catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class OpsCatalogController {
  constructor(@Inject(CATALOG_SERVICE) private readonly catalog: ClientProxy) {}

  @Get('vehicles')
  @ApiOperation({
    summary: 'List catalog vehicles (staff)',
    description:
      'Includes unpublished drafts. Optional filters: category, isPublished, page, limit. Roles: ops_agent, admin.',
  })
  async listVehicles(@Query() query: ListVehiclesAdminDto) {
    return this.send<{ data: VehicleModelDto[]; meta: PaginationMetaDto }>(
      NATS_PATTERNS.catalog.admin.vehiclesList,
      query,
    );
  }

  @Get('vehicles/:slug')
  @ApiOperation({
    summary: 'Get catalog vehicle by slug (staff)',
    description: 'Includes unpublished drafts. Roles: ops_agent, admin.',
  })
  async getVehicle(@Param('slug') slug: string) {
    const dto: GetVehicleDto = { slug };
    const vehicle = await this.send<VehicleModelDto>(
      NATS_PATTERNS.catalog.admin.vehicleGet,
      dto,
    );
    return { data: vehicle };
  }

  @Put('vehicles/:slug')
  @ApiOperation({
    summary: 'Upsert catalog vehicle',
    description:
      'Create or update a vehicle by slug (including unpublished drafts). Roles: ops_agent, admin.',
  })
  async upsertVehicle(@Param('slug') slug: string, @Body() body: UpsertVehicleDto) {
    if (body.slug !== slug) {
      throw new HttpException(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Path slug must match body.slug',
            details: [{ field: 'slug' }],
          },
        },
        400,
      );
    }
    const vehicle = await this.send<VehicleModelDto>(
      NATS_PATTERNS.catalog.admin.vehicleUpsert,
      body,
    );
    return { data: vehicle };
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
