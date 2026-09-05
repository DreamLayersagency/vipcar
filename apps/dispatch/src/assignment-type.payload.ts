import { RpcException } from '@nestjs/microservices';
import {
  ASSIGNMENT_TYPES,
  CHAUFFEUR_DURATIONS,
  type AssignmentTypeLabel,
  type ChauffeurDurationLabel,
} from '@vipcar/contracts';

const PRISMA_DURATION_TO_LABEL: Record<string, ChauffeurDurationLabel> = {
  hourly: 'hourly',
  half_day: 'half-day',
  full_day: 'full-day',
};

export type AssignmentTypePayloadFields = {
  type: AssignmentTypeLabel | string;
  /** Transfer flight number — optional; only allowed when type=transfer (G2). */
  flightNumber?: string | null;
  /** Chauffeur duration — API label (`hourly`) or Prisma enum (`half_day`). */
  duration?: string | null;
};

export type NormalizedAssignmentPayload = {
  flightNumber: string | null;
  duration: ChauffeurDurationLabel | null;
};

/**
 * Assignment type-specific fields (G2 + G3):
 * - transfer → optional flightNumber; rejects duration
 * - chauffeur → duration hourly|half-day|full-day required; rejects flightNumber
 */
export function assertAssignmentTypePayload(
  fields: AssignmentTypePayloadFields,
): NormalizedAssignmentPayload {
  const type = fields.type;
  if (!(ASSIGNMENT_TYPES as readonly string[]).includes(type)) {
    throw validationError('type must be transfer or chauffeur');
  }

  const flightNumber = presentString(fields.flightNumber);
  const durationRaw = presentString(fields.duration);

  if (type === 'transfer') {
    if (durationRaw) {
      throw validationError('duration is only allowed for chauffeur assignments');
    }
    return { flightNumber, duration: null };
  }

  // chauffeur
  if (!durationRaw) {
    throw validationError(
      'duration is required for chauffeur assignments (hourly | half-day | full-day)',
    );
  }
  const duration = normalizeDuration(durationRaw);
  if (!duration) {
    throw validationError('duration must be hourly, half-day, or full-day');
  }
  if (flightNumber) {
    throw validationError('flightNumber is only allowed for transfer assignments');
  }
  return { flightNumber: null, duration };
}

export function normalizeDuration(
  raw: string,
): ChauffeurDurationLabel | null {
  const trimmed = raw.trim().toLowerCase();
  if ((CHAUFFEUR_DURATIONS as readonly string[]).includes(trimmed)) {
    return trimmed as ChauffeurDurationLabel;
  }
  return PRISMA_DURATION_TO_LABEL[trimmed] ?? null;
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
