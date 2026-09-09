import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const VEHICLE_CATEGORIES = [
  'Luxury',
  'SUV',
  'Sedan',
  'Van & Group',
  'Compact',
  'Economy',
  'Pick-up',
] as const;

export type VehicleCategoryLabel = (typeof VEHICLE_CATEGORIES)[number];

export const VEHICLE_TIERS = ['Luxury', 'Premium', 'Standard', 'Economy'] as const;
export type VehicleTierLabel = (typeof VEHICLE_TIERS)[number];

export const TRANSMISSIONS = ['Automatic', 'Manual'] as const;
export type TransmissionLabel = (typeof TRANSMISSIONS)[number];

export class ListVehiclesDto {
  @IsOptional()
  @IsString()
  @IsIn([...VEHICLE_CATEGORIES])
  category?: VehicleCategoryLabel;

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

export class GetVehicleDto {
  @IsString()
  slug!: string;
}

/** Staff list — includes drafts unless filtered. */
export class ListVehiclesAdminDto {
  @IsOptional()
  @IsString()
  @IsIn([...VEHICLE_CATEGORIES])
  category?: VehicleCategoryLabel;

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

/** Staff create/update (ops_agent|admin). Upserts by slug; drafts allowed. */
export class UpsertVehicleDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @IsIn([...VEHICLE_CATEGORIES])
  category!: VehicleCategoryLabel;

  @IsString()
  @IsIn([...VEHICLE_TIERS])
  tier!: VehicleTierLabel;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  seats!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  bags!: number;

  @IsString()
  @IsIn([...TRANSMISSIONS])
  transmission!: TransmissionLabel;

  @IsString()
  @MinLength(1)
  imageKey!: string;

  /** Indicative TND daily price until booking + billing confirm a quote. */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  baseDailyPriceTnd!: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  defaultHubId?: string | null;

  @IsBoolean()
  isPublished!: boolean;
}

export class PaginationMetaDto {
  page!: number;
  limit!: number;
  total!: number;
}

export class VehicleModelDto {
  id!: string;
  slug!: string;
  name!: string;
  category!: VehicleCategoryLabel;
  tier!: VehicleTierLabel;
  seats!: number;
  bags!: number;
  transmission!: TransmissionLabel;
  imageKey!: string;
  /** Indicative TND daily price until booking + billing confirm a quote. */
  baseDailyPriceTnd!: number;
  defaultHubId!: string | null;
  isPublished!: boolean;
}

export const LOCALES = ['en', 'fr', 'ar'] as const;
export type LocaleLabel = (typeof LOCALES)[number];

export const LOCATION_TYPES = ['city', 'airport', 'hotel', 'other'] as const;
export type LocationTypeLabel = (typeof LOCATION_TYPES)[number];

export class ListLocationsDto {
  @IsOptional()
  @IsString()
  @IsIn([...LOCALES])
  locale?: LocaleLabel = 'en';
}

export class LocationDto {
  id!: string;
  slug!: string;
  /** Localized via Accept-Language (en|fr|ar). */
  name!: string;
  type!: LocationTypeLabel;
  airportName!: string | null;
  hubId!: string | null;
  supportsRental!: boolean;
  supportsTransfer!: boolean;
  supportsChauffeur!: boolean;
  isPublished!: boolean;
}
