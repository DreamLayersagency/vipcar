import { SetMetadata } from '@nestjs/common';
import type { Role } from '@vipcar/contracts';

export const ROLES_KEY = 'roles';

/** Restrict a route to one or more JWT roles (use with RolesGuard). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
