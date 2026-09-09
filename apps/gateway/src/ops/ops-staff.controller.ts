import { Body, Controller, Get, HttpException, Inject, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateStaffUserDto, NATS_PATTERNS, type PublicUserDto } from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { IDENTITY_SERVICE } from '../identity.constants';

@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class OpsStaffController {
  constructor(@Inject(IDENTITY_SERVICE) private readonly identity: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'List staff accounts', description: 'Admin-only list of ops and admin accounts.' })
  async list() {
    const users = await this.send<PublicUserDto[]>(NATS_PATTERNS.identity.admin.staffUserList, {});
    return { data: users };
  }

  @Post()
  @ApiOperation({ summary: 'Create an operations account', description: 'Admin-only. New accounts are created with the ops_agent role.' })
  async create(@Body() body: CreateStaffUserDto) {
    const user = await this.send<PublicUserDto>(NATS_PATTERNS.identity.admin.staffUserCreate, body);
    return { data: user };
  }

  private async send<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(this.identity.send<T>(pattern, payload).pipe(timeout(5000)));
    } catch (error: unknown) {
      throw mapIdentityError(error);
    }
  }
}

function mapIdentityError(error: unknown): HttpException {
  const rpc = unwrapRpc(error);
  const status = typeof rpc.status === 'number' ? rpc.status : 502;
  const code = typeof rpc.code === 'string' ? rpc.code : 'IDENTITY_ERROR';
  const message = typeof rpc.message === 'string' ? rpc.message : 'Identity service error';
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
