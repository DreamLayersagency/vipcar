import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  CorporateBillingProfileDto,
  GetCorporateBillingProfileDto,
  UpsertCorporateBillingProfileDto,
} from '@vipcar/contracts';
import { randomUUID } from 'crypto';
import type { CorporateBillingProfile } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CorporateProfilesService {
  private readonly logger = new Logger(CorporateProfilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create or update invoicing profile for a corporate account.
   * NATS `billing.corporateProfile.upsert`.
   */
  async upsert(
    dto: UpsertCorporateBillingProfileDto,
  ): Promise<{ data: CorporateBillingProfileDto }> {
    this.validateUpsert(dto);

    const companyName = dto.companyName.trim();
    const billingEmail = dto.billingEmail.trim().toLowerCase();
    const taxId = dto.taxId?.trim() || null;
    const notes = dto.notes?.trim() || null;

    const profile = await this.prisma.corporateBillingProfile.upsert({
      where: { corporateAccountId: dto.corporateAccountId },
      create: {
        id: randomUUID(),
        corporateAccountId: dto.corporateAccountId,
        companyName,
        billingEmail,
        taxId,
        notes,
      },
      update: {
        companyName,
        billingEmail,
        taxId,
        notes,
      },
    });

    this.logger.log(
      `corporate billing profile upserted corporateAccountId=${profile.corporateAccountId}`,
    );

    return { data: toProfileDto(profile) };
  }

  /**
   * Load invoicing profile by corporate account id.
   * NATS `billing.corporateProfile.get`.
   */
  async get(
    dto: GetCorporateBillingProfileDto,
  ): Promise<{ data: CorporateBillingProfileDto }> {
    if (!dto.corporateAccountId?.trim()) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'corporateAccountId is required',
        status: 400,
      });
    }

    const profile = await this.findByAccountId(dto.corporateAccountId);
    if (!profile) {
      throw new RpcException({
        code: 'CORPORATE_BILLING_PROFILE_NOT_FOUND',
        message: 'Corporate billing profile not found',
        status: 404,
        details: [{ corporateAccountId: dto.corporateAccountId }],
      });
    }

    return { data: toProfileDto(profile) };
  }

  /** Used by invoice.create — returns null when missing. */
  async findByAccountId(
    corporateAccountId: string,
  ): Promise<CorporateBillingProfile | null> {
    return this.prisma.corporateBillingProfile.findUnique({
      where: { corporateAccountId },
    });
  }

  private validateUpsert(dto: UpsertCorporateBillingProfileDto): void {
    if (!dto.corporateAccountId?.trim()) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'corporateAccountId is required',
        status: 400,
      });
    }
    if (!dto.companyName?.trim()) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'companyName is required',
        status: 400,
      });
    }
    if (!dto.billingEmail?.trim()) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'billingEmail is required',
        status: 400,
      });
    }
  }
}

function toProfileDto(row: CorporateBillingProfile): CorporateBillingProfileDto {
  return {
    id: row.id,
    corporateAccountId: row.corporateAccountId,
    companyName: row.companyName,
    billingEmail: row.billingEmail,
    taxId: row.taxId,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
