import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterService, RateLimitConfig, RateLimitResult } from '../services/rate-limiter.service';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';

/**
 * RateLimitGuard — NestJS guard that enforces fine-grained rate limiting
 * using the RateLimiterService.
 *
 * Rate limit key is composed from:
 *   tenant + user + cluster + endpoint
 *
 * If a @RateLimit() decorator is present on the handler, its config
 * overrides the default for that endpoint.
 *
 * Returns 429 Too Many Requests with rate limit headers when exceeded:
 *   - X-RateLimit-Limit: Maximum requests allowed
 *   - X-RateLimit-Remaining: Remaining requests in current window
 *   - X-RateLimit-Reset: Seconds until the limit resets
 *   - Retry-After: Seconds until the client can retry (when blocked)
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly rateLimiterService: RateLimiterService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Build the rate limit key
    const key = this.buildRateLimitKey(request, context);

    // Check for @RateLimit() decorator config
    const decoratorConfig = this.reflector.get<RateLimitConfig | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    // If decorator has custom config, apply it
    if (decoratorConfig) {
      this.rateLimiterService.setLimit(key, decoratorConfig);
    }

    // Consume one point
    const result = await this.rateLimiterService.consume(key);

    // Set rate limit headers on response
    this.setRateLimitHeaders(response, result);

    if (!result.allowed) {
      this.logger.warn(
        `Rate limit exceeded for key "${key}" — ${result.limit} req/${result.retryAfter > 0 ? `blocked for ${result.retryAfter}s` : 'window exceeded'}`,
      );

      throw new HttpException(
        {
          statusCode: 429,
          message: 'Too Many Requests',
          error: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
        },
        429,
      );
    }

    return true;
  }

  /**
   * Build a rate limit key from the request context.
   * Format: {domain}:{tenantId}:{userId}:{cluster}:{endpoint}
   */
  private buildRateLimitKey(request: any, context: ExecutionContext): string {
    const parts: string[] = [];

    // Determine the domain (tenant, user, cluster, agent, llm)
    // Default to 'user' for general API endpoints
    const domain = this.reflector.get<string>('rateLimitDomain', context.getHandler()) || 'user';
    parts.push(domain);

    // Tenant ID (from auth/JWT)
    const tenantId = request.user?.tenantId || request.headers['x-tenant-id'] || 'anonymous';
    parts.push(String(tenantId));

    // User ID (from auth/JWT)
    const userId = request.user?.sub || request.user?.id || request.headers['x-user-id'] || 'anonymous';
    parts.push(String(userId));

    // Cluster (if present in request)
    const cluster = request.body?.cluster || request.query?.cluster || request.params?.cluster;
    if (cluster) {
      parts.push(String(cluster));
    }

    // Endpoint path for further granularity
    const path = request.route?.path || request.url || 'unknown';
    parts.push(path);

    return parts.join(':');
  }

  /**
   * Set standard rate limit headers on the HTTP response.
   */
  private setRateLimitHeaders(response: any, result: RateLimitResult): void {
    try {
      response.setHeader('X-RateLimit-Limit', String(result.limit));
      response.setHeader('X-RateLimit-Remaining', String(result.remaining));
      response.setHeader('X-RateLimit-Reset', String(result.resetInSeconds));

      if (result.retryAfter > 0) {
        response.setHeader('Retry-After', String(result.retryAfter));
      }
    } catch {
      // Some response objects may not support setHeader
    }
  }
}
