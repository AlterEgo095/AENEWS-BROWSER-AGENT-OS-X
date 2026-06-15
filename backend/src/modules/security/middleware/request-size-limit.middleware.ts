/**
 * AENEWS Agent OS X — Request Size Limiting Middleware
 *
 * Enforces request body size limits at the middleware level before
 * the request reaches route handlers. Provides defense against:
 *
 *   - Oversized payload attacks
 *   - Memory exhaustion from large uploads
 *   - Denial-of-service via large request bodies
 *
 * Configuration via environment variables:
 *   - REQUEST_MAX_BODY_SIZE_MB: Maximum JSON body size in MB (default: 10)
 *   - REQUEST_MAX_URL_ENCODED_SIZE_MB: Maximum URL-encoded body size in MB (default: 10)
 *
 * This middleware supplements the express.json/urlencoded limit settings
 * in main.ts by providing explicit error responses and audit logging.
 */

import { Injectable, NestMiddleware, Logger, PayloadTooLargeException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RequestSizeLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestSizeLimitMiddleware.name);
  private readonly maxBodyBytes: number;
  private readonly maxUrlEncodedBytes: number;

  constructor(private readonly configService: ConfigService) {
    // Default: 10MB for JSON bodies, 10MB for URL-encoded
    const maxBodyMb = this.configService.get<number>('security.requestMaxBodySizeMb') ?? 10;
    const maxUrlEncodedMb = this.configService.get<number>('security.requestMaxUrlEncodedSizeMb') ?? 10;

    this.maxBodyBytes = maxBodyMb * 1024 * 1024;
    this.maxUrlEncodedBytes = maxUrlEncodedMb * 1024 * 1024;

    this.logger.log(
      `Request size limits configured: JSON=${maxBodyMb}MB, URL-encoded=${maxUrlEncodedMb}MB`,
    );
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const contentType = req.headers['content-type'] || '';

    // Skip non-body requests
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      next();
      return;
    }

    // Check size based on content type
    if (contentType.includes('application/json')) {
      if (contentLength > this.maxBodyBytes) {
        this.logger.warn(
          `Request body too large: ${contentLength} bytes exceeds ${this.maxBodyBytes} bytes limit. ` +
            `IP=${req.ip}, Path=${req.originalUrl}`,
        );
        throw new PayloadTooLargeException(
          `Request body exceeds maximum size of ${this.maxBodyBytes / (1024 * 1024)}MB`,
        );
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      if (contentLength > this.maxUrlEncodedBytes) {
        this.logger.warn(
          `URL-encoded body too large: ${contentLength} bytes exceeds ${this.maxUrlEncodedBytes} bytes limit. ` +
            `IP=${req.ip}, Path=${req.originalUrl}`,
        );
        throw new PayloadTooLargeException(
          `URL-encoded body exceeds maximum size of ${this.maxUrlEncodedBytes / (1024 * 1024)}MB`,
        );
      }
    } else if (contentType.includes('multipart/form-data')) {
      // Multipart uploads have a separate limit (handled by Multer if configured)
      // Allow up to 50MB for multipart (matching nginx client_max_body_size)
      const maxMultipartBytes = 50 * 1024 * 1024;
      if (contentLength > maxMultipartBytes) {
        this.logger.warn(
          `Multipart body too large: ${contentLength} bytes exceeds 50MB limit. ` +
            `IP=${req.ip}, Path=${req.originalUrl}`,
        );
        throw new PayloadTooLargeException('Multipart body exceeds maximum size of 50MB');
      }
    }

    next();
  }
}
