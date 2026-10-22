import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ULB_SCOPED_KEY } from '../decorators/require-permissions.decorator';
import { AuthContextUser } from '@smartlight/shared-types';

@Injectable()
export class UlbScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isUlbScoped = this.reflector.getAllAndOverride<boolean>(
      ULB_SCOPED_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user: AuthContextUser = request.user;

    // Extract target ULB ID from query, params, or body
    const targetUlbId =
      request.query?.ulbId ||
      request.params?.ulbId ||
      request.body?.ulbId ||
      request.headers['x-ulb-id'];

    if (!isUlbScoped && !targetUlbId) {
      return true; // Endpoint does not require ULB scoping
    }

    if (!user) {
      return true; // Let AuthGuard handle missing user
    }

    // Global Platform Admin has unrestricted access to all ULBs
    if (user.isGlobalAdmin || user.allowedUlbIds?.includes('*')) {
      return true;
    }

    if (!targetUlbId) {
      // If endpoint requires ULB scoping but none provided, reject
      if (isUlbScoped) {
        throw new ForbiddenException(
          'Target ULB context (ulbId) is required for this operation',
        );
      }
      return true;
    }

    // Check if user is assigned to this ULB
    const hasAccess = user.allowedUlbIds?.includes(targetUlbId);
    if (!hasAccess) {
      throw new ForbiddenException(
        `Cross-ULB authorization violation: You are not authorized to view or mutate assets in ULB: ${targetUlbId}`,
      );
    }

    return true;
  }
}
