/**
 * AENEWS Agent OS X — Rate Limit Middleware
 *
 * General-purpose IP-based rate limiting for all API routes.
 * Limits: 100 requests per minute per IP address.
 *
 * Applied globally via NestJS middleware consumer.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private readonly windowMs = 60_000; // 1 minute
  private readonly maxRequests = 100; // per window

  use(req: Request, res: Response, next: NextFunction) {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + this.windowMs });

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', String(this.maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(this.maxRequests - 1));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + this.windowMs) / 1000)));

      next();
      return;
    }

    if (record.count >= this.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Limit', String(this.maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(record.resetTime / 1000)));

      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests',
        error: 'Rate limit exceeded',
        retryAfter,
      });
      return;
    }

    record.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', String(this.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(this.maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(record.resetTime / 1000)));

    next();
  }
}
