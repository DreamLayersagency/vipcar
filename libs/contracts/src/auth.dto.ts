import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { Role } from './roles';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['en', 'fr', 'ar'])
  locale?: 'en' | 'fr' | 'ar';
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}

export class LogoutDto {
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}

export class PublicUserDto {
  id!: string;
  email!: string;
  name!: string;
  phone!: string | null;
  locale!: string;
  role!: Role;
  corporateAccountId!: string | null;
}

export class TokenPairDto {
  accessToken!: string;
  refreshToken!: string;
}

export class AuthResultDto {
  user!: PublicUserDto;
  accessToken!: string;
  refreshToken!: string;
}

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

export type IdentityHealth = {
  status: 'ok';
  service: 'identity';
};
