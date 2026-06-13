import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  correlationId?: string;
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>)?.message ||
          (exception instanceof Error ? exception.message : 'Internal server error');

    const error =
      typeof exceptionResponse === 'object' && (exceptionResponse as Record<string, unknown>)?.error
        ? (exceptionResponse as Record<string, unknown>).error
        : HttpStatus[statusCode] || 'Internal Server Error';

    const errorResponse: ErrorResponse = {
      statusCode,
      message: Array.isArray(message) ? message.join('; ') : String(message),
      error: String(error),
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: request.headers['x-correlation-id'] as string | undefined,
    };

    if (exception instanceof HttpException && typeof exceptionResponse === 'object') {
      const details = (exceptionResponse as Record<string, unknown>).details;
      if (details) {
        errorResponse.details = details;
      }
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} - ${statusCode}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${statusCode}: ${errorResponse.message}`,
      );
    }

    response.status(statusCode).json(errorResponse);
  }
}
