import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const { method, url, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const statusCode = res.statusCode;
        const duration = Date.now() - now;
        this.logger.log(
          JSON.stringify({
            level: 'info',
            timestamp: new Date().toISOString(),
            method,
            url,
            statusCode,
            durationMs: duration,
            clientIp: ip,
            userAgent,
            ulbContext: req.query?.ulbId || req.headers['x-ulb-id'] || 'GLOBAL',
          }),
        );
      }),
    );
  }
}
