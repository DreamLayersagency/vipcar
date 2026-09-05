import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  CreateInvoiceDto,
  INVOICE_STATUSES,
  InvoiceDto,
  InvoiceLineDto,
  type InvoiceStatusLabel,
} from '@vipcar/contracts';
import { randomUUID } from 'crypto';
import type { Invoice, Prisma } from '../../generated/prisma';
import { Prisma as PrismaNS } from '../../generated/prisma';
import { CorporateProfilesService } from '../corporate-profiles/corporate-profiles.service';
import { PrismaService } from '../prisma.service';

const MONEY_SCALE = 3;

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly corporateProfiles: CorporateProfilesService,
  ) {}

  /**
   * Corporate / post-paid invoice: persist line items, tax, status, optional PDF key.
   * Requires a CorporateBillingProfile (H4) and snapshots buyer fields onto the invoice.
   * NATS `billing.invoice.create`.
   */
  async create(dto: CreateInvoiceDto): Promise<{ data: InvoiceDto }> {
    this.validateCreate(dto);

    const profile = await this.corporateProfiles.findByAccountId(
      dto.corporateAccountId,
    );
    if (!profile) {
      throw new RpcException({
        code: 'CORPORATE_BILLING_PROFILE_NOT_FOUND',
        message:
          'Corporate billing profile is required before creating an invoice',
        status: 404,
        details: [{ corporateAccountId: dto.corporateAccountId }],
      });
    }

    const lines = dto.lines.map((line) => {
      const quantity = roundMoney(line.quantity);
      const unitAmountTnd = roundMoney(line.unitAmountTnd);
      const totalTnd = roundMoney(quantity * unitAmountTnd);
      return {
        description: line.description.trim(),
        quantity,
        unitAmountTnd,
        totalTnd,
      } satisfies InvoiceLineDto;
    });

    const subtotalTnd = roundMoney(
      lines.reduce((sum, line) => sum + line.totalTnd, 0),
    );
    const taxTnd = roundMoney(dto.taxTnd);
    const totalTnd = roundMoney(subtotalTnd + taxTnd);
    const status: InvoiceStatusLabel = dto.status ?? 'draft';
    const number = dto.number?.trim() || this.generateNumber();

    let invoice: Invoice;
    try {
      invoice = await this.prisma.invoice.create({
        data: {
          id: randomUUID(),
          number,
          bookingId: dto.bookingId ?? null,
          customerId: dto.customerId ?? null,
          corporateAccountId: dto.corporateAccountId,
          companyName: profile.companyName,
          billingEmail: profile.billingEmail,
          taxId: profile.taxId,
          lines: lines as unknown as Prisma.InputJsonValue,
          subtotalTnd: new PrismaNS.Decimal(subtotalTnd.toFixed(MONEY_SCALE)),
          taxTnd: new PrismaNS.Decimal(taxTnd.toFixed(MONEY_SCALE)),
          totalTnd: new PrismaNS.Decimal(totalTnd.toFixed(MONEY_SCALE)),
          pdfKey: dto.pdfKey?.trim() || null,
          status,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof PrismaNS.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new RpcException({
          code: 'INVOICE_NUMBER_CONFLICT',
          message: `Invoice number "${number}" already exists`,
          status: 409,
          details: [{ number }],
        });
      }
      throw error;
    }

    this.logger.log(
      `invoice created id=${invoice.id} number=${invoice.number} corporateAccountId=${invoice.corporateAccountId}`,
    );

    return { data: toInvoiceDto(invoice) };
  }

  private validateCreate(dto: CreateInvoiceDto): void {
    if (!dto.corporateAccountId?.trim()) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'corporateAccountId is required for corporate invoices',
        status: 400,
      });
    }

    if (!Array.isArray(dto.lines) || dto.lines.length === 0) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'At least one invoice line is required',
        status: 400,
      });
    }

    for (const [index, line] of dto.lines.entries()) {
      if (!line.description?.trim()) {
        throw new RpcException({
          code: 'VALIDATION_ERROR',
          message: `lines[${index}].description is required`,
          status: 400,
        });
      }
      if (
        typeof line.quantity !== 'number' ||
        !Number.isFinite(line.quantity) ||
        line.quantity <= 0
      ) {
        throw new RpcException({
          code: 'VALIDATION_ERROR',
          message: `lines[${index}].quantity must be a positive number`,
          status: 400,
        });
      }
      if (
        typeof line.unitAmountTnd !== 'number' ||
        !Number.isFinite(line.unitAmountTnd) ||
        line.unitAmountTnd < 0
      ) {
        throw new RpcException({
          code: 'VALIDATION_ERROR',
          message: `lines[${index}].unitAmountTnd must be a non-negative number`,
          status: 400,
        });
      }
    }

    if (
      typeof dto.taxTnd !== 'number' ||
      !Number.isFinite(dto.taxTnd) ||
      dto.taxTnd < 0
    ) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'taxTnd must be a non-negative number',
        status: 400,
      });
    }

    if (
      dto.status !== undefined &&
      !(INVOICE_STATUSES as readonly string[]).includes(dto.status)
    ) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: `Invalid invoice status "${dto.status}"`,
        status: 400,
      });
    }
  }

  /** INV-YYYYMMDD-XXXXXXXX (date + short uuid fragment). */
  private generateNumber(): string {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    return `INV-${day}-${suffix}`;
  }
}

function toInvoiceDto(row: Invoice): InvoiceDto {
  return {
    id: row.id,
    number: row.number,
    bookingId: row.bookingId,
    customerId: row.customerId,
    corporateAccountId: row.corporateAccountId,
    companyName: row.companyName,
    billingEmail: row.billingEmail,
    taxId: row.taxId,
    lines: parseLines(row.lines),
    subtotalTnd: decimalToNumber(row.subtotalTnd),
    taxTnd: decimalToNumber(row.taxTnd),
    totalTnd: decimalToNumber(row.totalTnd),
    pdfKey: row.pdfKey,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseLines(value: Prisma.JsonValue): InvoiceLineDto[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const line = (raw ?? {}) as Record<string, unknown>;
    return {
      description: String(line.description ?? ''),
      quantity: Number(line.quantity ?? 0),
      unitAmountTnd: Number(line.unitAmountTnd ?? 0),
      totalTnd: Number(line.totalTnd ?? 0),
    };
  });
}

function decimalToNumber(value: PrismaNS.Decimal | number): number {
  if (typeof value === 'number') return value;
  return Number(value.toString());
}

function roundMoney(value: number): number {
  const factor = 10 ** MONEY_SCALE;
  return Math.round(value * factor) / factor;
}
