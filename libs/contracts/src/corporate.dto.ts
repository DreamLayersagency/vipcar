import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type { Role } from './roles';

export class CreateCorporateAccountDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  billingEmail!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/** Staff `GET /v1/ops/corporate-accounts` query. */
export class ListCorporateAccountsDto {
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

export class CorporateAccountDto {
  id!: string;
  name!: string;
  billingEmail!: string;
  notes!: string | null;
  isActive!: boolean;
  createdAt!: string;
  updatedAt!: string;
}

/**
 * Admin invite (create) or link an existing user as `corporate_manager`.
 * Provide `userId` and/or `email` to link; omit password when linking.
 * For invite: `email` + `name` + `password` (user must not exist yet).
 */
export class LinkCorporateManagerDto {
  @IsUUID()
  corporateAccountId!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @ValidateIf((o: LinkCorporateManagerDto) => !o.userId)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['en', 'fr', 'ar'])
  locale?: 'en' | 'fr' | 'ar';
}

/** HTTP body for invite/link (account id comes from the path). */
export class LinkCorporateManagerHttpDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ValidateIf((o: LinkCorporateManagerHttpDto) => !o.userId)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['en', 'fr', 'ar'])
  locale?: 'en' | 'fr' | 'ar';
}

export class CorporateManagerDto {
  id!: string;
  email!: string;
  name!: string;
  phone!: string | null;
  locale!: string;
  role!: Role;
  corporateAccountId!: string | null;
  isActive!: boolean;
}
