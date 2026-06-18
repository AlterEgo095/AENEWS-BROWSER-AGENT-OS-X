/**
 * PDEOS Phase 2 — Security Fix
 * File: backend/src/common/filters/all-exceptions.filter.ts
 * Fix M1: mask internal error messages for non-HttpException
 */
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = (request.headers['x-correlation-id'] as string) || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') message = resp;
      else if (typeof resp === 'object' && resp !== null) {
        const r = resp as any;
        message = r.message ?? message;
        error = r.error ?? error;
      }
    } else {
      // FIX M1: NEVER expose raw exception.message for non-HttpException
      this.logger.error(`[${correlationId}] Unhandled: ${exception instanceof Error ? exception.stack : exception}`);
      message = 'An internal error occurred. Contact support with correlation ID.';
    }

    response.status(status).json({
      success: false, error, message, correlationId,
      timestamp: new Date().toISOString(), path: request.url,
    });
  }
}
