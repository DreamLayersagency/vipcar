import {
  Body,
  Controller,
  HttpException,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AssignDriverDto,
  DISPATCH_TRIP_ROLES,
  NATS_PATTERNS,
  STAFF_ROLES,
  UpdateTripStatusHttpDto,
  type AssignmentDto,
  type UpdateTripStatusDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISPATCH_SERVICE } from '../dispatch.constants';

@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops/dispatch')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OpsDispatchController {
  constructor(
    @Inject(DISPATCH_SERVICE) private readonly dispatch: ClientProxy,
  ) {}

  /**
   * Assign a driver to a booking's transfer/chauffeur Assignment.
   * Dispatches NATS `dispatch.assign` → emits `dispatch.assigned` for notify.
   */
  @Post('assign')
  @Roles(...STAFF_ROLES)
  @ApiOperation({
    summary: 'Assign driver to booking',
    description:
      'Assign a driver to a transfer/chauffeur assignment. Roles: ops_agent, admin.',
  })
  async assign(@Body() body: AssignDriverDto) {
    return this.send<{ data: AssignmentDto }>(
      NATS_PATTERNS.dispatch.assign,
      body,
    );
  }

  /**
   * Driver/ops trip progress: en_route | arrived | completed.
   * Emits trip status events for notify; completed also signals booking.
   */
  @Post('trip/status')
  @Roles(...DISPATCH_TRIP_ROLES)
  @ApiOperation({
    summary: 'Update trip status',
    description:
      'Driver/ops trip progress: en_route | arrived | completed. Roles: driver, ops_agent, admin.',
  })
  async updateTripStatus(
    @CurrentUser() user: RequestUser,
    @Body() body: UpdateTripStatusHttpDto,
  ) {
    const dto: UpdateTripStatusDto = {
      assignmentId: body.assignmentId,
      status: body.status,
      actorUserId: user.userId,
      actorRole: user.role,
    };
    return this.send<{ data: AssignmentDto }>(
      NATS_PATTERNS.dispatch.trip.status,
      dto,
    );
  }

  private async send<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        this.dispatch.send<T>(pattern, payload).pipe(timeout(5000)),
      );
    } catch (error: unknown) {
      throw mapDispatchError(error);
    }
  }
}

function mapDispatchError(error: unknown): HttpException {
  const rpc = unwrapRpc(error);
  const status = typeof rpc.status === 'number' ? rpc.status : 502;
  const code = typeof rpc.code === 'string' ? rpc.code : 'DISPATCH_ERROR';
  const message =
    typeof rpc.message === 'string' ? rpc.message : 'Dispatch service error';
  const details = Array.isArray(rpc.details) ? rpc.details : [];
  return new HttpException({ error: { code, message, details } }, status);
}

function unwrapRpc(error: unknown): {
  status?: number;
  code?: string;
  message?: string;
  details?: unknown[];
} {
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.error === 'object' && record.error !== null) {
      return record.error as {
        status?: number;
        code?: string;
        message?: string;
        details?: unknown[];
      };
    }
    return record as {
      status?: number;
      code?: string;
      message?: string;
      details?: unknown[];
    };
  }
  return {};
}
