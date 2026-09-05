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
  GetArticleDto,
  GetLegalPageDto,
  ListArticlesDto,
  ListFaqDto,
  NATS_PATTERNS,
  type ArticleDto,
  type FaqItemDto,
  type LegalPageDto,
  type LocaleLabel,
  type PaginationMetaDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { CMS_SERVICE } from '../cms.constants';

@ApiTags('cms')
@Controller('cms')
export class CmsController {
  constructor(@Inject(CMS_SERVICE) private readonly cms: ClientProxy) {}

  @Get('articles')
  async listArticles(
    @Query() query: ListArticlesDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const dto: ListArticlesDto = {
      ...query,
      locale: resolveLocale(query.locale, acceptLanguage),
    };
    return this.send<{ data: ArticleDto[]; meta: PaginationMetaDto }>(
      NATS_PATTERNS.cms.articles.list,
      dto,
    );
  }

  @Get('articles/:slug')
  async getArticle(
    @Param('slug') slug: string,
    @Query('locale') localeQuery?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const dto: GetArticleDto = {
      slug,
      locale: resolveLocale(localeQuery, acceptLanguage),
    };
    const article = await this.send<ArticleDto>(NATS_PATTERNS.cms.articles.get, dto);
    return { data: article };
  }

  @Get('faq')
  async listFaq(
    @Query() query: ListFaqDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const dto: ListFaqDto = {
      ...query,
      locale: resolveLocale(query.locale, acceptLanguage),
    };
    return this.send<{ data: FaqItemDto[] }>(NATS_PATTERNS.cms.faq.list, dto);
  }

  @Get('legal/:slug')
  async getLegal(
    @Param('slug') slug: string,
    @Query('locale') localeQuery?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const dto: GetLegalPageDto = {
      slug,
      locale: resolveLocale(localeQuery, acceptLanguage),
    };
    const page = await this.send<LegalPageDto>(NATS_PATTERNS.cms.legal.get, dto);
    return { data: page };
  }

  private async send<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(this.cms.send<T>(pattern, payload).pipe(timeout(5000)));
    } catch (error: unknown) {
      throw mapCmsError(error);
    }
  }
}

/** Prefer ?locale=; else Accept-Language primary tag; default en. */
function resolveLocale(
  queryLocale?: string,
  acceptLanguage?: string,
): LocaleLabel {
  if (queryLocale === 'fr' || queryLocale === 'en') return queryLocale;
  if (!acceptLanguage) return 'en';
  const primary = acceptLanguage.split(',')[0]?.trim().toLowerCase() ?? '';
  return primary.startsWith('fr') ? 'fr' : 'en';
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
