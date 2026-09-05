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
  GetArticleDto,
  ListArticlesAdminDto,
  NATS_PATTERNS,
  STAFF_ROLES,
  UpsertArticleDto,
  type AdminArticleDto,
  type PaginationMetaDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CMS_SERVICE } from '../cms.constants';

@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops/cms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class OpsCmsController {
  constructor(@Inject(CMS_SERVICE) private readonly cms: ClientProxy) {}

  @Get('articles')
  @ApiOperation({
    summary: 'List CMS articles (staff)',
    description:
      'Includes unpublished drafts. Optional filters: isPublished, page, limit. Roles: ops_agent, admin.',
  })
  async listArticles(@Query() query: ListArticlesAdminDto) {
    return this.send<{ data: AdminArticleDto[]; meta: PaginationMetaDto }>(
      NATS_PATTERNS.cms.admin.articlesList,
      query,
    );
  }

  @Get('articles/:slug')
  @ApiOperation({
    summary: 'Get CMS article by slug (staff)',
    description: 'Includes unpublished drafts. Bilingual EN/FR fields. Roles: ops_agent, admin.',
  })
  async getArticle(@Param('slug') slug: string) {
    const dto: GetArticleDto = { slug };
    const article = await this.send<AdminArticleDto>(
      NATS_PATTERNS.cms.admin.articleGet,
      dto,
    );
    return { data: article };
  }

  @Put('articles/:slug')
  @ApiOperation({
    summary: 'Upsert CMS article',
    description:
      'Create or update a CMS article by slug (including unpublished drafts). Roles: ops_agent, admin.',
  })
  async upsertArticle(@Param('slug') slug: string, @Body() body: UpsertArticleDto) {
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
    const article = await this.send<AdminArticleDto>(
      NATS_PATTERNS.cms.admin.articleUpsert,
      body,
    );
    return { data: article };
  }

  private async send<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(this.cms.send<T>(pattern, payload).pipe(timeout(5000)));
    } catch (error: unknown) {
      throw mapCmsError(error);
    }
  }
}

function mapCmsError(error: unknown): HttpException {
  const rpc = unwrapRpc(error);
  const status = typeof rpc.status === 'number' ? rpc.status : 502;
  const code = typeof rpc.code === 'string' ? rpc.code : 'CMS_ERROR';
  const message = typeof rpc.message === 'string' ? rpc.message : 'CMS service error';
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
