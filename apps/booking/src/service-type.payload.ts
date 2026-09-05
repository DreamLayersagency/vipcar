import { RpcException } from '@nestjs/microservices';
import {
  CHAUFFEUR_DURATIONS,
  type ChauffeurDurationLabel,
  type ServiceTypeLabel,
} from '@vipcar/contracts';

const PRISMA_DURATION_TO_LABEL: Record<string, ChauffeurDurationLabel> = {
  hourly: 'hourly',
  half_day: 'half-day',
  full_day: 'full-day',
};

export type ServiceTypePayloadFields = {
  service: ServiceTypeLabel | string;
  /** Rental return date/datetime (API `endDate` / domain `endAt`). */
  endAt?: string | Date | null;
  /** Chauffeur duration — API label (`hourly`) or Prisma enum (`half_day`). */
  duration?: string | null;
  flightNumber?: string | null;
};

/**
 * Service-type field rules (docs/api/conventions.md, Phase E2):
 * - rental → requires endAt; rejects duration / flightNumber
 * - chauffeur → requires duration hourly|half-day|full-day; rejects flightNumber
 * - transfer → optional flightNumber; rejects duration
 */
export function assertServiceTypePayload(fields: ServiceTypePayloadFields): void {
  const service = fields.service as ServiceTypeLabel;
  const endAt = present(fields.endAt);
  const durationRaw = presentString(fields.duration);
  const flightNumber = presentString(fields.flightNumber);

  if (service === 'rental') {
    if (!endAt) {
      throw validationError('endAt is required for rental');
    }
    if (durationRaw) {
      throw validationError('duration is only allowed for chauffeur');
    }
    if (flightNumber) {
      throw validationError('flightNumber is only allowed for transfer');
    }
    return;
  }

  if (service === 'chauffeur') {
    if (!durationRaw) {
      throw validationError('duration is required for chauffeur');
    }
    const duration = normalizeDuration(durationRaw);
    if (!duration) {
      throw validationError(
        'duration must be hourly, half-day, or full-day',
      );
    }
    if (flightNumber) {
      throw validationError('flightNumber is only allowed for transfer');
    }
    return;
  }

  if (service === 'transfer') {
    if (durationRaw) {
      throw validationError('duration is only allowed for chauffeur');
    }
    // flightNumber is optional and supported
    return;
  }

  throw validationError(`Unknown service type: ${String(fields.service)}`);
}

export function normalizeDuration(
  value: string,
): ChauffeurDurationLabel | null {
  if ((CHAUFFEUR_DURATIONS as readonly string[]).includes(value)) {
    return value as ChauffeurDurationLabel;
  }
  return PRISMA_DURATION_TO_LABEL[value] ?? null;
}

function present(value: string | Date | null | undefined): boolean {
  if (value == null) return false;
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return value.trim().length > 0;
}

function presentString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validationError(message: string): RpcException {
  return new RpcException({
    code: 'VALIDATION_ERROR',
    message,
    status: 400,
  });
}
