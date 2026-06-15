/**
 * AENEWS Agent OS X — Security Headers Middleware
 *
 * Helmet-style security headers middleware that provides an
 * additional layer of security headers beyond what the helmet
 * library configures. This middleware is applied at the NestJS
 * middleware level, ensuring headers are set even if helmet
 * is not configured or is misconfigured.
 *
 * Headers applied:
 *   - X-Content-Type-Options: nosniff
 *   - X-Frame-Options: DENY
 *   - X-XSS-Protection: 1; mode=block
 *   - Referrer-Policy: strict-origin-when-cross-origin
 *   - Permissions-Policy: camera=(), microphone=(), geolocation=()
 *   - X-Permitted-Cross-Domain-Policies: none
 *   - Cross-Origin-Opener-Policy: same-origin
 *   - Cross-Origin-Resource-Policy: same-site
 *
 * Note: CSP and HSTS are handled by helmet in main.ts.
 * This middleware provides defense-in-depth.
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name);
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('security.headersEnabled') !== 'false';
    if (this.enabled) {
      this.logger.log('Security headers middleware enabled (defense-in-depth layer)');
    }
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.enabled) {
      next();
      return;
    }

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable XSS filter in browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Restrict browser features
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );

    // Prevent Flash/PDF cross-domain requests
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Cross-Origin policies
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

    // Cache control for API responses (prevent caching of sensitive data)
    if (req.originalUrl?.includes('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
    }

    next();
  }
}
