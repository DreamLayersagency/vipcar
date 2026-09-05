import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import type { Role, User } from '../../generated/prisma';
import type {
  CorporateAccountDto,
  CorporateManagerDto,
  CreateCorporateAccountDto,
  LinkCorporateManagerDto,
  ListCorporateAccountsDto,
  PaginationMetaDto,
} from '@vipcar/contracts';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';

const LINKABLE_ROLES: Role[] = ['customer', 'corporate_manager'];

@Injectable()
export class CorporateAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    dto: ListCorporateAccountsDto,
  ): Promise<{ data: CorporateAccountDto[]; meta: PaginationMetaDto }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.corporateAccount.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.corporateAccount.count(),
    ]);

    return {
      data: rows.map(toAccountDto),
      meta: { page, limit, total },
    };
  }

  async create(dto: CreateCorporateAccountDto): Promise<CorporateAccountDto> {
    const account = await this.prisma.corporateAccount.create({
      data: {
        name: dto.name.trim(),
        billingEmail: dto.billingEmail.trim().toLowerCase(),
        notes: dto.notes?.trim() || null,
      },
    });
    return toAccountDto(account);
  }

  async linkManager(dto: LinkCorporateManagerDto): Promise<CorporateManagerDto> {
    if (!dto.userId && !dto.email?.trim()) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'userId or email is required',
        status: 400,
      });
    }

    const account = await this.prisma.corporateAccount.findUnique({
      where: { id: dto.corporateAccountId },
    });
    if (!account || !account.isActive) {
      throw new RpcException({
        code: 'CORPORATE_ACCOUNT_NOT_FOUND',
        message: 'Corporate account not found',
        status: 404,
      });
    }

    const existing = await this.findExistingUser(dto);
    if (existing) {
      return this.linkExisting(existing, account.id);
    }

    return this.inviteNew(dto, account.id);
  }

  private async findExistingUser(dto: LinkCorporateManagerDto): Promise<User | null> {
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
      if (!user) {
        throw new RpcException({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          status: 404,
        });
      }
      return user;
    }

    const email = dto.email!.trim().toLowerCase();
    return this.prisma.user.findUnique({ where: { email } });
  }

  private async linkExisting(user: User, corporateAccountId: string): Promise<CorporateManagerDto> {
    if (!user.isActive) {
      throw new RpcException({
        code: 'USER_INACTIVE',
        message: 'User is inactive',
        status: 409,
      });
    }

    if (!LINKABLE_ROLES.includes(user.role)) {
      throw new RpcException({
        code: 'ROLE_NOT_LINKABLE',
        message: 'Only customer or corporate_manager users can be linked as managers',
        status: 409,
      });
    }

    if (user.corporateAccountId && user.corporateAccountId !== corporateAccountId) {
      throw new RpcException({
        code: 'ALREADY_MEMBER',
        message: 'User already belongs to another corporate account',
        status: 409,
      });
    }

    if (
      user.corporateAccountId === corporateAccountId &&
      user.role === 'corporate_manager'
    ) {
      return toManagerDto(user);
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        corporateAccountId,
        role: 'corporate_manager',
      },
    });
    return toManagerDto(updated);
  }

  private async inviteNew(
    dto: LinkCorporateManagerDto,
    corporateAccountId: string,
  ): Promise<CorporateManagerDto> {
    const email = dto.email?.trim().toLowerCase();
    if (!email) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'email is required to invite a new manager',
        status: 400,
      });
    }
    if (!dto.name?.trim()) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'name is required to invite a new manager',
        status: 400,
      });
    }
    if (!dto.password || dto.password.length < 8) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'password (min 8 chars) is required to invite a new manager',
        status: 400,
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name.trim(),
        phone: dto.phone?.trim() || null,
        locale: dto.locale ?? 'en',
        role: 'corporate_manager',
        corporateAccountId,
      },
    });
    return toManagerDto(user);
  }
}

function toAccountDto(row: {
  id: string;
  name: string;
  billingEmail: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CorporateAccountDto {
  return {
    id: row.id,
    name: row.name,
    billingEmail: row.billingEmail,
    notes: row.notes,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toManagerDto(user: User): CorporateManagerDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    locale: user.locale,
    role: user.role,
    corporateAccountId: user.corporateAccountId,
    isActive: user.isActive,
  };
}
