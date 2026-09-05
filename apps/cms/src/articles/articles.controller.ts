import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  GetArticleDto,
  ListArticlesAdminDto,
  ListArticlesDto,
  NATS_PATTERNS,
  UpsertArticleDto,
} from '@vipcar/contracts';
import { ArticlesService } from './articles.service';

@Controller()
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @MessagePattern(NATS_PATTERNS.cms.health)
  health() {
    return { status: 'ok', service: 'cms' };
  }

  @MessagePattern(NATS_PATTERNS.cms.articles.list)
  list(@Payload() dto: ListArticlesDto) {
    return this.articles.list(dto);
  }

  @MessagePattern(NATS_PATTERNS.cms.articles.get)
  get(@Payload() dto: GetArticleDto) {
    return this.articles.getBySlug(dto);
  }

  @MessagePattern(NATS_PATTERNS.cms.admin.articlesList)
  listAdmin(@Payload() dto: ListArticlesAdminDto) {
    return this.articles.listAdmin(dto);
  }

  @MessagePattern(NATS_PATTERNS.cms.admin.articleGet)
  getAdmin(@Payload() dto: GetArticleDto) {
    return this.articles.getAdminBySlug(dto);
  }

  @MessagePattern(NATS_PATTERNS.cms.admin.articleUpsert)
  upsert(@Payload() dto: UpsertArticleDto) {
    return this.articles.upsert(dto);
  }
}
