import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  LoginDto,
  LogoutDto,
  NATS_PATTERNS,
  RefreshDto,
  RegisterDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { IDENTITY_SERVICE } from '../identity.constants';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { RequestUser } from './jwt.strategy';

@ApiTags('auth')
@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthController {
  constructor(@Inject(IDENTITY_SERVICE) private readonly identity: ClientProxy) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await this.send(NATS_PATTERNS.identity.register, dto);
    return { data: result };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.send(NATS_PATTERNS.identity.login, dto);
    return { data: result };
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    const result = await this.send(NATS_PATTERNS.identity.refresh, dto);
    return { data: result };
  }

  @Post('logout')
  async logout(@Body() dto: LogoutDto) {
    const result = await this.send(NATS_PATTERNS.identity.logout, dto);
    return { data: result };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async me(@CurrentUser() user: RequestUser) {
    const result = await this.send(NATS_PATTERNS.identity.me, { userId: user.userId });
    return { data: result };
  }

  private async send<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        this.identity.send<T>(pattern, payload).pipe(timeout(5000)),
      );
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
