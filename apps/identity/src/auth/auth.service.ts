import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import type { User } from '@prisma/client';
import type { AuthResultDto, LoginDto, PublicUserDto, RegisterDto } from '@vipcar/contracts';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResultDto> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new RpcException({ code: 'EMAIL_TAKEN', message: 'Email already registered', status: 409 });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name.trim(),
        phone: dto.phone?.trim() || null,
        locale: dto.locale ?? 'en',
      },
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResultDto> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new RpcException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', status: 401 });
    }

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new RpcException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', status: 401 });
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResultDto> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!stored || !stored.user.isActive) {
      throw new RpcException({ code: 'INVALID_REFRESH', message: 'Refresh token is invalid', status: 401 });
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async me(userId: string): Promise<PublicUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new RpcException({ code: 'USER_NOT_FOUND', message: 'User not found', status: 404 });
    }
    return toPublicUser(user);
  }

  private async issueTokens(user: User): Promise<AuthResultDto> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = randomBytes(32).toString('hex');
    const days = Number(this.config.get('JWT_REFRESH_EXPIRES_DAYS') ?? 7);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        expiresAt,
        userId: user.id,
      },
    });

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toPublicUser(user: User): PublicUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    locale: user.locale,
    role: user.role,
  };
}
