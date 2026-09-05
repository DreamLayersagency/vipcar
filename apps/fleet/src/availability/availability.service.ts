import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import type { SearchAvailabilityDto, VehicleUnitDto } from '@vipcar/contracts';
import type { VehicleUnit } from '../../generated/prisma';
import { HoldService } from '../holds/hold.service';
import { PrismaService } from '../prisma.service';

/**
 * Half-open interval rule: ranges are `[startAt, endAt)`.
 * Two ranges overlap iff `a.startAt < b.endAt && b.startAt < a.endAt`.
 * Adjacent bookings that meet at the same instant do not conflict.
 */
@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly holds: HoldService,
  ) {}

  async search(dto: SearchAvailabilityDto): Promise<{ data: VehicleUnitDto[] }> {
    const startAt = parseDate(dto.startAt, 'startAt');
    const endAt = parseDate(dto.endAt, 'endAt');

    if (!(startAt < endAt)) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'startAt must be before endAt (exclusive end)',
        status: 400,
      });
    }

    const units = await this.prisma.vehicleUnit.findMany({
      where: {
        modelId: dto.modelId,
        hubId: dto.hubId,
        status: { notIn: ['maintenance', 'inactive'] },
        // Exclusive-end overlap: block.startAt < endAt AND block.endAt > startAt
        calendarBlocks: {
          none: {
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
        },
      },
      orderBy: { plate: 'asc' },
    });

    const heldIds = await this.holds.findHeldUnitIds(
      units.map((u) => u.id),
      startAt,
      endAt,
    );

    return {
      data: units.filter((u) => !heldIds.has(u.id)).map(toUnitDto),
    };
  }
}

function parseDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RpcException({
      code: 'VALIDATION_ERROR',
      message: `Invalid ${field}`,
      status: 400,
    });
  }
  return date;
}

function toUnitDto(unit: VehicleUnit): VehicleUnitDto {
  return {
    id: unit.id,
    modelId: unit.modelId,
    plate: unit.plate,
    hubId: unit.hubId,
    status: unit.status,
    depositAmountTnd: Number(unit.depositAmountTnd),
  };
}
