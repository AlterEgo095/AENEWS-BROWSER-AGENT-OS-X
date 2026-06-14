import { SetMetadata } from '@nestjs/common';
import { RateLimitConfig } from '../services/rate-limiter.service';

/**
 * Metadata key for rate limit configuration stored on route handlers.
 */
export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Metadata key for rate limit domain (e.g., 'user', 'tenant', 'cluster', 'llm', 'agent').
 */
export const RATE_LIMIT_DOMAIN_KEY = 'rateLimitDomain';

/**
 * @RateLimit(config) — Decorator to configure per-endpoint rate limiting.
 *
 * Usage:
 *   @RateLimit({ points: 10, duration: 60, blockDuration: 120 })
 *   @Post('expensive-operation')
 *   async expensiveOperation() { ... }
 *
 * This stores the config as metadata which is read by RateLimitGuard
 * at runtime to override the default rate limit for that endpoint.
 */
export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);

/**
 * @RateLimitDomain(domain) — Decorator to specify the rate limit domain
 * for a route handler. This determines the key prefix used for rate limiting.
 *
 * Available domains: 'tenant', 'user', 'cluster', 'agent', 'llm'
 *
 * Usage:
 *   @RateLimitDomain('llm')
 *   @RateLimit({ points: 20, duration: 60, blockDuration: 120 })
 *   @Post('chat')
 *   async chat() { ... }
 */
export const RateLimitDomain = (domain: string) =>
  SetMetadata(RATE_LIMIT_DOMAIN_KEY, domain);
