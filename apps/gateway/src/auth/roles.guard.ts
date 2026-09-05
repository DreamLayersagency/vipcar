import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@vipcar/contracts';
import { ROLES_KEY } from './roles.decorator';
import type { RequestUser } from './jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const role = request.user?.role;
    if (role && required.includes(role)) return true;

    throw new ForbiddenException({
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient role',
        details: [],
      },
    });
  }
}
