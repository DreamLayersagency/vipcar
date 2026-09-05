import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import type { AcquireHoldDto, ReleaseHoldDto, UnitHoldDto } from '@vipcar/contracts';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis.service';
import {
  holdKey,
  resolveHoldTtlSeconds,
  type HoldPayload,
} from './hold.constants';

@Injectable()
export class HoldService {
  private readonly ttlSeconds: number;

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.ttlSeconds = resolveHoldTtlSeconds(config.get<string>('FLEET_HOLD_TTL_SECONDS'));
  }

  async acquire(dto: AcquireHoldDto): Promise<{ data: UnitHoldDto }> {
    const startAt = parseDate(dto.startAt, 'startAt');
    const endAt = parseDate(dto.endAt, 'endAt');

    if (!(startAt < endAt)) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'startAt must be before endAt (exclusive end)',
        status: 400,
      });
    }

    const unit = await this.prisma.vehicleUnit.findUnique({ where: { id: dto.unitId } });
    if (!unit) {
      throw new RpcException({
        code: 'UNIT_NOT_FOUND',
        message: 'Vehicle unit not found',
        status: 404,
      });
    }
    if (unit.status === 'maintenance' || unit.status === 'inactive') {
      throw new RpcException({
        code: 'UNIT_UNAVAILABLE',
        message: 'Unit is not available for checkout hold',
        status: 409,
      });
    }

    const overlap = await this.prisma.calendarBlock.findFirst({
      where: {
        unitId: dto.unitId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });
    if (overlap) {
      throw new RpcException({
        code: 'UNIT_BLOCKED',
        message: 'Unit has an overlapping calendar block',
        status: 409,
      });
    }

    const key = holdKey(dto.unitId);
    const holdId = randomUUID();
    const acquiredAt = new Date().toISOString();
    const payload: HoldPayload = {
      holdId,
      unitId: dto.unitId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      acquiredAt,
      ...(dto.bookingId ? { bookingId: dto.bookingId } : {}),
    };

    // SET NX EX — atomic; concurrent checkout on the same unit fails.
    const result = await this.redis.redis.set(
      key,
      JSON.stringify(payload),
      'EX',
      this.ttlSeconds,
      'NX',
    );

    if (result !== 'OK') {
      throw new RpcException({
        code: 'HOLD_CONFLICT',
        message: 'Unit is already held for checkout',
        status: 409,
      });
    }

    return { data: toHoldDto(payload, this.ttlSeconds) };
  }

  async release(dto: ReleaseHoldDto): Promise<{ data: { released: boolean } }> {
    const key = holdKey(dto.unitId);
    const raw = await this.redis.redis.get(key);
    if (!raw) {
      // Already gone (TTL or prior release) — idempotent success.
      return { data: { released: false } };
    }

    let existing: HoldPayload;
    try {
      existing = JSON.parse(raw) as HoldPayload;
    } catch {
      await this.redis.redis.del(key);
      return { data: { released: true } };
    }

    if (existing.holdId !== dto.holdId) {
      throw new RpcException({
        code: 'HOLD_MISMATCH',
        message: 'holdId does not match the active hold for this unit',
        status: 409,
      });
    }

    // Compare-and-delete: only remove if value still matches (avoid racing a new hold).
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const deleted = await this.redis.redis.eval(script, 1, key, raw);
    return { data: { released: Number(deleted) > 0 } };
  }

  /**
   * Returns unitIds that have an active Redis hold overlapping `[startAt, endAt)`.
   */
  async findHeldUnitIds(
    unitIds: string[],
    startAt: Date,
    endAt: Date,
  ): Promise<Set<string>> {
    const held = new Set<string>();
    if (unitIds.length === 0) {
      return held;
    }

    const keys = unitIds.map(holdKey);
    const values = await this.redis.redis.mget(...keys);

    for (let i = 0; i < unitIds.length; i++) {
      const raw = values[i];
      if (!raw) continue;
      let payload: HoldPayload;
      try {
        payload = JSON.parse(raw) as HoldPayload;
      } catch {
        continue;
      }
      const holdStart = new Date(payload.startAt);
      const holdEnd = new Date(payload.endAt);
      if (Number.isNaN(holdStart.getTime()) || Number.isNaN(holdEnd.getTime())) {
        continue;
      }
      // Exclusive-end overlap: a.start < b.end && b.start < a.end
      if (holdStart < endAt && startAt < holdEnd) {
        held.add(unitIds[i]!);
      }
    }

    return held;
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

function toHoldDto(payload: HoldPayload, ttlSeconds: number): UnitHoldDto {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  return {
    holdId: payload.holdId,
    unitId: payload.unitId,
    startAt: payload.startAt,
    endAt: payload.endAt,
    expiresAt,
    ttlSeconds,
    ...(payload.bookingId ? { bookingId: payload.bookingId } : {}),
  };
}
