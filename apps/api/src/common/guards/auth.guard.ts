import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/require-permissions.decorator';
import { AuthContextUser } from '@smartlight/shared-types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In development / testing mode, allow dev-token or default admin if configured
      if (process.env.NODE_ENV === 'test' && request.headers['x-test-user']) {
        try {
          request.user = JSON.parse(request.headers['x-test-user']);
          return true;
        } catch {
          // ignore
        }
      }
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const secret =
      process.env.JWT_SECRET ||
      'dev-jwt-secret-smartlight-os-do-not-use-in-production-2026';

    try {
      const decoded = jwt.verify(token, secret) as AuthContextUser;
      request.user = decoded;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }
}
