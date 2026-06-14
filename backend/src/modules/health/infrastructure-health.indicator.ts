import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import {
  CircuitBreakerService,
  CircuitState,
} from '../agent-framework/services/circuit-breaker.service';
import {
  RateLimiterService,
} from '../agent-framework/services/rate-limiter.service';

/**
 * InfrastructureHealthIndicator — checks circuit breaker and rate limiter
 * states for the health endpoint.
 *
 * Health checks:
 *   - Circuit Breakers: All circuits should be CLOSED or HALF_OPEN
 *     (OPEN circuits indicate degraded/unavailable services)
 *   - Rate Limiters: Reports which keys are currently blocked
 *
 * Combined system health:
 *   - Liveness: Application responds (handled by main health endpoint)
 *   - Readiness: All circuits are CLOSED or HALF_OPEN (no OPEN circuits)
 */
@Injectable()
export class InfrastructureHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(InfrastructureHealthIndicator.name);

  constructor(
    @Optional() private readonly circuitBreakerService: CircuitBreakerService,
    @Optional() private readonly rateLimiterService: RateLimiterService,
  ) {
    super();
  }

  /**
   * Check circuit breaker health.
   * Healthy when all circuits are CLOSED or HALF_OPEN.
   * Degraded when any circuit is OPEN.
   */
  async checkCircuitBreakers(key: string): Promise<HealthIndicatorResult> {
    if (!this.circuitBreakerService) {
      return this.getStatus(key, true, { available: false, message: 'Circuit breaker service not loaded' });
    }

    const summary = this.circuitBreakerService.getSummary();
    const openCircuits = this.circuitBreakerService.getOpenCircuits();
    const allStates: Record<string, any> = {};

    for (const [circuitKey, state] of this.circuitBreakerService.getAllStates()) {
      allStates[circuitKey] = {
        state: state.state,
        failures: state.failures,
        totalFailures: state.totalFailures,
        totalSuccesses: state.totalSuccesses,
        lastStateChange: state.lastStateChange,
      };
    }

    const details = {
      summary,
      openCircuits: openCircuits.map((c) => ({
        key: c.key,
        failures: c.state.failures,
        totalFailures: c.state.totalFailures,
        lastFailure: c.state.lastFailure,
      })),
      circuits: allStates,
    };

    if (summary.open === 0) {
      return this.getStatus(key, true, details);
    }

    // Some circuits are OPEN — system is degraded
    throw new HealthCheckError(
      'CircuitBreakerHealthCheck',
      this.getStatus(key, false, {
        ...details,
        alert: `${summary.open} circuit(s) are OPEN — affected services are unavailable`,
      }),
    );
  }

  /**
   * Check rate limiter health.
   * Reports the number of currently blocked keys and their details.
   * This is informational — blocked keys don't make the system unhealthy
   * (they protect it), but it's useful for monitoring.
   */
  async checkRateLimiters(key: string): Promise<HealthIndicatorResult> {
    if (!this.rateLimiterService) {
      return this.getStatus(key, true, { available: false, message: 'Rate limiter service not loaded' });
    }

    const blockedKeys = this.rateLimiterService.getBlockedKeys();
    const configs = this.rateLimiterService.getAllConfigs();

    // Build configured limits object safely
    const configuredLimits: Record<string, any> = {};
    let count = 0;
    for (const [k, v] of configs) {
      if (count >= 20) break;
      configuredLimits[k] = v;
      count++;
    }

    const details = {
      blockedKeyCount: blockedKeys.length,
      blockedKeys: blockedKeys.slice(0, 20),
      configuredLimits,
    };

    // Rate limiting being active is NOT a health problem — it's working as intended
    return this.getStatus(key, true, details);
  }

  /**
   * Check combined system readiness.
   * The system is "ready" when all circuits are CLOSED or HALF_OPEN
   * (no OPEN circuits blocking requests).
   *
   * This is suitable for Kubernetes readiness probes:
   *   - Ready: all circuits closed or half-open (system can handle requests)
   *   - Not Ready: any circuit is open (some requests will be rejected)
   */
  async checkReadiness(key: string): Promise<HealthIndicatorResult> {
    const circuitDetails = this.circuitBreakerService
      ? this.circuitBreakerService.getSummary()
      : null;

    const rateLimitDetails = this.rateLimiterService
      ? { blockedKeyCount: this.rateLimiterService.getBlockedKeys().length }
      : null;

    const isReady = !circuitDetails || circuitDetails.open === 0;

    const details = {
      circuitBreakers: circuitDetails || { available: false },
      rateLimiters: rateLimitDetails || { available: false },
      readiness: isReady ? 'ready' : 'degraded',
    };

    if (isReady) {
      return this.getStatus(key, true, details);
    }

    throw new HealthCheckError(
      'SystemReadinessCheck',
      this.getStatus(key, false, {
        ...details,
        alert: `${circuitDetails!.open} circuit(s) are OPEN — system is not fully ready`,
      }),
    );
  }
}
