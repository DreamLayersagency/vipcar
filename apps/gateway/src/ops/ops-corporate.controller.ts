import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateCorporateAccountDto,
  LinkCorporateManagerHttpDto,
  ListCorporateAccountsDto,
  NATS_PATTERNS,
  type CorporateAccountDto,
  type CorporateManagerDto,
  type PaginationMetaDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { IDENTITY_SERVICE } from '../identity.constants';

@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops/corporate-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class OpsCorporateController {
  constructor(@Inject(IDENTITY_SERVICE) private readonly identity: ClientProxy) {}

  @Get()
  @ApiOperation({
    summary: 'List corporate accounts',
    description: 'Admin-only: paginated corporate accounts for the ops backoffice.',
  })
  async list(@Query() query: ListCorporateAccountsDto) {
    return this.send<{ data: CorporateAccountDto[]; meta: PaginationMetaDto }>(
      NATS_PATTERNS.identity.admin.corporateAccountList,
      query,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Create corporate account',
    description: 'Admin-only: create a corporate billing/account profile.',
  })
  async create(@Body() body: CreateCorporateAccountDto) {
    const account = await this.send<CorporateAccountDto>(
      NATS_PATTERNS.identity.admin.corporateAccountCreate,
      body,
    );
    return { data: account };
  }

  @Post(':id/managers')
  @ApiOperation({
    summary: 'Link corporate manager',
    description: 'Admin-only: link a user as corporate_manager on an account.',
  })
  async linkManager(
    @Param('id') corporateAccountId: string,
    @Body() body: LinkCorporateManagerHttpDto,
  ) {
    const manager = await this.send<CorporateManagerDto>(
      NATS_PATTERNS.identity.admin.corporateAccountLinkManager,
      { ...body, corporateAccountId },
    );
    return { data: manager };
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
