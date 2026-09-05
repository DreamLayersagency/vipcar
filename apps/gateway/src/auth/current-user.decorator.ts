import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestUser } from './jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    return request.user;
  },
);
