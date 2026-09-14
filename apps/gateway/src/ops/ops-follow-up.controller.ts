import { Body, Controller, Get, HttpException, Inject, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GetOpsFollowUpDto,
  NATS_PATTERNS,
  STAFF_ROLES,
  UpdateOpsFollowUpDto,
  UpdateOpsFollowUpHttpDto,
  type OpsFollowUpDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BOOKING_SERVICE } from '../booking.constants';

@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops/follow-up')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class OpsFollowUpController {
  constructor(@Inject(BOOKING_SERVICE) private readonly booking: ClientProxy) {}

  @Get(':recordId')
  @ApiOperation({ summary: 'Get complementary staff follow-up state' })
  async get(@Param('recordId', ParseUUIDPipe) recordId: string) {
    return this.send<{ data: OpsFollowUpDto }>(NATS_PATTERNS.booking.ops.followUpGet, {
      recordId,
    } satisfies GetOpsFollowUpDto);
  }

  @Patch(':recordId')
  @ApiOperation({ summary: 'Update complementary staff follow-up state' })
  async update(
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() body: UpdateOpsFollowUpHttpDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.send<{ data: OpsFollowUpDto }>(NATS_PATTERNS.booking.ops.followUpUpdate, {
      recordId,
      status: body.status,
      updatedByUserId: user.userId,
    } satisfies UpdateOpsFollowUpDto);
  }

  private async send<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(this.booking.send<T>(pattern, payload).pipe(timeout(10_000)));
    } catch (error: unknown) {
      throw mapFollowUpError(error);
    }
  }
}

function mapFollowUpError(error: unknown): HttpException {
  const rpc = unwrapRpc(error);
  const status = typeof rpc.status === 'number' ? rpc.status : 502;
  const code = typeof rpc.code === 'string' ? rpc.code : 'OPS_FOLLOW_UP_ERROR';
  const message = typeof rpc.message === 'string' ? rpc.message : 'Follow-up service error';
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
