import {
  Controller,
  HttpException,
  Inject,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  NATS_PATTERNS,
  OpsFleetAvailabilityQueryDto,
  STAFF_ROLES,
  type SearchAvailabilityDto,
  type VehicleUnitDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { FLEET_SERVICE } from '../fleet.constants';

@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops/fleet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class OpsFleetController {
  constructor(@Inject(FLEET_SERVICE) private readonly fleet: ClientProxy) {}

  @Get('availability')
  @ApiOperation({
    summary: 'Search fleet availability',
    description:
      'List available units for a model/hub and half-open [start, end) window. Roles: ops_agent, admin.',
  })
  async availability(@Query() query: OpsFleetAvailabilityQueryDto) {
    const payload: SearchAvailabilityDto = {
      modelId: query.modelId,
      hubId: query.hubId,
      startAt: query.start,
      endAt: query.end,
    };
    return this.send<{ data: VehicleUnitDto[] }>(
      NATS_PATTERNS.fleet.availability.search,
      payload,
    );
  }

  private async send<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        this.fleet.send<T>(pattern, payload).pipe(timeout(5000)),
      );
    } catch (error: unknown) {
      throw mapFleetError(error);
    }
  }
}

function mapFleetError(error: unknown): HttpException {
  const rpc = unwrapRpc(error);
  const status = typeof rpc.status === 'number' ? rpc.status : 502;
  const code = typeof rpc.code === 'string' ? rpc.code : 'FLEET_ERROR';
  const message = typeof rpc.message === 'string' ? rpc.message : 'Fleet service error';
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
