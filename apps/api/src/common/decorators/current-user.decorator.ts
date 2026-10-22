import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContextUser } from '@smartlight/shared-types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthContextUser | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.user || null;
  },
);
