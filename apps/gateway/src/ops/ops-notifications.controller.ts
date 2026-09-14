import { Body, Controller, Get, HttpException, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ListOpsNotificationsDto,
  ListOpsNotificationsQueryDto,
  MarkOpsNotificationsReadHttpDto,
  NATS_PATTERNS,
  STAFF_ROLES,
  type OpsNotificationDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { NOTIFY_SERVICE } from '../notify.constants';

@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class OpsNotificationsController {
  constructor(@Inject(NOTIFY_SERVICE) private readonly notify: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'List durable staff notifications' })
  async list(
    @Query() query: ListOpsNotificationsQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.send<{ data: OpsNotificationDto[] }>(
      NATS_PATTERNS.notify.notifications.list,
      { ...query, userId: user.userId } satisfies ListOpsNotificationsDto,
    );
  }

  @Post('read')
  @ApiOperation({ summary: 'Mark staff notifications as read' })
  async markRead(
    @Body() body: MarkOpsNotificationsReadHttpDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.send<{ ok: true; count: number }>(
      NATS_PATTERNS.notify.notifications.markRead,
      { notificationIds: body.notificationIds, userId: user.userId },
    );
  }

  private async send<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(this.notify.send<T>(pattern, payload).pipe(timeout(5000)));
    } catch (error: unknown) {
      throw mapNotificationError(error);
    }
  }
}

function mapNotificationError(error: unknown): HttpException {
  const rpc = unwrapRpc(error);
  const status = typeof rpc.status === 'number' ? rpc.status : 502;
  const code = typeof rpc.code === 'string' ? rpc.code : 'NOTIFICATION_ERROR';
  const message = typeof rpc.message === 'string' ? rpc.message : 'Notification service error';
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
