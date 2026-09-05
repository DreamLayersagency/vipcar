import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Allows anonymous access when no Bearer token is present.
 * When Authorization: Bearer is sent, validates the JWT (401 if invalid).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers?: { authorization?: string };
    }>();
    const authorization = request.headers?.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
