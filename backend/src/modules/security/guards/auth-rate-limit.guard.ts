/**
 * AENEWS Agent OS X — Auth Rate Limit Middleware
 *
 * Stricter rate limiting for authentication endpoints.
 * Limits: 5 attempts per minute per IP address.
 *
 * Applied specifically to auth routes (login, register, refresh)
 * to prevent brute-force attacks.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private readonly windowMs = 60_000; // 1 minute
  private readonly maxRequests = 5; // per window — strict for auth

  use(req: Request, res: Response, next: NextFunction) {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + this.windowMs });

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
        message: 'Too many authentication attempts',
        error: 'Auth rate limit exceeded',
        retryAfter,
      });
      return;
    }

    record.count++;

    res.setHeader('X-RateLimit-Limit', String(this.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(this.maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(record.resetTime / 1000)));

    next();
  }
}
