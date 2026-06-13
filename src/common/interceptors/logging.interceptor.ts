import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const correlationId = request.headers['x-correlation-id'] as string | undefined;
    const startTime = Date.now();

    this.logger.log(
      `→ ${method} ${url} - ${userAgent} ${ip}${correlationId ? ` [${correlationId}]` : ''}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          this.logger.log(
            `← ${method} ${url} - ${statusCode} - ${duration}ms${correlationId ? ` [${correlationId}]` : ''}`,
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `✗ ${method} ${url} - ERROR - ${duration}ms - ${error.message}${correlationId ? ` [${correlationId}]` : ''}`,
          );
        },
      }),
    );
  }
}
