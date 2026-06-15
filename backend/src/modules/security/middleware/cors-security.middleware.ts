/**
 * AENEWS Agent OS X — CORS Security Middleware
 *
 * Replaces the wildcard `cors: true` with explicit origin validation.
 * Supports:
 *   - Static origin whitelist
 *   - Dynamic origin validation (regex patterns)
 *   - Tenant-specific subdomain matching
 *   - Credential support for same-origin requests
 *   - Preflight caching
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CorsConfig {
  allowedOrigins: string[];         // Exact matches
  allowedPatterns: RegExp[];        // Regex patterns (e.g., *.aenews.ai)
  allowCredentials: boolean;
  maxAge: number;                   // Preflight cache duration in seconds
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
}

@Injectable()
export class CorsSecurityMiddleware {
  private readonly logger = new Logger(CorsSecurityMiddleware.name);
  private readonly config: CorsConfig;

  constructor(private readonly configService: ConfigService) {
    const envOrigins = this.configService.get<string>('security.cors.origins') || '';
    const origins = envOrigins
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    // Default development origins
    const defaultOrigins = this.configService.get<string>('app.env') === 'development'
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4200']
      : [];

    // Default production patterns
    const defaultPatterns = [
      /^https?:\/\/[a-z0-9-]+\.aenews\.ai$/,      // *.aenews.ai
      /^https?:\/\/aenews\.ai$/,                     // aenews.ai
    ];

    this.config = {
      allowedOrigins: [...defaultOrigins, ...origins],
      allowedPatterns: defaultPatterns,
      allowCredentials: true,
      maxAge: 86400, // 24h
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Tenant-ID',
        'X-Correlation-ID',
        'X-Request-ID',
        'Accept',
        'Origin',
        'Cache-Control',
      ],
      exposedHeaders: [
        'X-Correlation-ID',
        'X-Request-ID',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ],
    };

    this.logger.log(`CORS configured: ${this.config.allowedOrigins.length} origins, ${this.config.allowedPatterns.length} patterns`);
  }

  /**
   * Get the NestJS CORS options object.
   */
  getCorsOptions(): Record<string, any> {
    return {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests without origin (server-to-server, Postman, etc.)
        if (!origin) {
          callback(null, true);
          return;
        }

        if (this.isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          this.logger.warn(`CORS blocked origin: ${origin}`);
          callback(null, false);
        }
      },
      credentials: this.config.allowCredentials,
      methods: this.config.allowedMethods,
      allowedHeaders: this.config.allowedHeaders,
      exposedHeaders: this.config.exposedHeaders,
      maxAge: this.config.maxAge,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
  }

  /**
   * Check if a specific origin is allowed.
   */
  isOriginAllowed(origin: string): boolean {
    // Check exact matches
    if (this.config.allowedOrigins.includes(origin)) {
      return true;
    }

    // Check patterns
    for (const pattern of this.config.allowedPatterns) {
      if (pattern.test(origin)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add an origin to the whitelist dynamically.
   */
  addOrigin(origin: string): void {
    if (!this.config.allowedOrigins.includes(origin)) {
      this.config.allowedOrigins.push(origin);
      this.logger.log(`Added CORS origin: ${origin}`);
    }
  }

  /**
   * Remove an origin from the whitelist.
   */
  removeOrigin(origin: string): boolean {
    const index = this.config.allowedOrigins.indexOf(origin);
    if (index > -1) {
      this.config.allowedOrigins.splice(index, 1);
      this.logger.log(`Removed CORS origin: ${origin}`);
      return true;
    }
    return false;
  }

  /**
   * Get current CORS configuration (for admin dashboard).
   */
  getConfig(): CorsConfig {
    return { ...this.config };
  }
}
