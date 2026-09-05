import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LOCALES, type LocaleLabel } from './catalog.dto';

export class ListArticlesDto {
  @IsOptional()
  @IsString()
  @IsIn([...LOCALES])
  locale?: LocaleLabel = 'en';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/** Staff list — includes unpublished drafts. */
export class ListArticlesAdminDto {
  /** When set, filter by publish state; omit for all. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class GetArticleDto {
  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  @IsIn([...LOCALES])
  locale?: LocaleLabel = 'en';
}

export class ListFaqDto {
  @IsOptional()
  @IsString()
  @IsIn([...LOCALES])
  locale?: LocaleLabel = 'en';
}

export class GetLegalPageDto {
  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  @IsIn([...LOCALES])
  locale?: LocaleLabel = 'en';
}

export class ArticleSectionDto {
  heading!: string;
  text!: string;
}

export class ArticleSectionInputDto {
  @IsString()
  @MinLength(1)
  heading!: string;

  @IsString()
  @MinLength(1)
  text!: string;
}

export class ArticleDto {
  id!: string;
  slug!: string;
  /** Localized via locale / Accept-Language (en|fr). */
  title!: string;
  summary!: string;
  sections!: ArticleSectionDto[];
  imageKey!: string;
  publishedAt!: string | null;
  isPublished!: boolean;
}

/** Staff create/update (ops_agent|admin). Upserts by slug; drafts allowed. */
export class UpsertArticleDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString()
  @MinLength(1)
  titleEn!: string;

  @IsString()
  @MinLength(1)
  titleFr!: string;

  @IsString()
  @MinLength(1)
  summaryEn!: string;

  @IsString()
  @MinLength(1)
  summaryFr!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleSectionInputDto)
  sectionsEn!: ArticleSectionInputDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleSectionInputDto)
  sectionsFr!: ArticleSectionInputDto[];

  @IsString()
  @MinLength(1)
  imageKey!: string;

  @IsBoolean()
  isPublished!: boolean;
}

/** Bilingual article payload for staff responses. */
export class AdminArticleDto {
  id!: string;
  slug!: string;
  titleEn!: string;
  titleFr!: string;
  summaryEn!: string;
  summaryFr!: string;
  sectionsEn!: ArticleSectionDto[];
  sectionsFr!: ArticleSectionDto[];
  imageKey!: string;
  publishedAt!: string | null;
  isPublished!: boolean;
}

export class FaqItemDto {
  id!: string;
  slug!: string;
  question!: string;
  answer!: string;
  sortOrder!: number;
  isPublished!: boolean;
}

export class LegalPageDto {
  id!: string;
  slug!: string;
  title!: string;
  body!: string;
  publishedAt!: string | null;
  isPublished!: boolean;
}
