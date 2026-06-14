import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService, CircuitBreakerConfig } from '../services/circuit-breaker.service';
import { SetMetadata } from '@nestjs/common';

// ─── Decorator Metadata ──────────────────────────────────────────────

export const CIRCUIT_BREAKER_KEY = 'circuitBreaker';
export const CIRCUIT_BREAKER_CONFIG_KEY = 'circuitBreakerConfig';

export interface CircuitBreakerDecoratorConfig {
  key: string;
  config?: Partial<CircuitBreakerConfig>;
}

/**
 * @CircuitBreaker(key, config?) — Method decorator that wraps the
 * decorated method in a circuit breaker.
 *
 * Usage:
 *   @CircuitBreaker('llm:openai', { failureThreshold: 3 })
 *   async callOpenAI() { ... }
 *
 * The decorator stores metadata on the method which is then read
 * by a mixin or the CircuitBreakerAspect at runtime.
 *
 * For NestJS services, prefer injecting CircuitBreakerService directly
 * and using `execute()`. This decorator is useful for quick wrapping
 * without changing method internals.
 */
export function CircuitBreaker(
  key: string,
  config?: Partial<CircuitBreakerConfig>,
): MethodDecorator {
  return (
    _target: any,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;
    const decoratorConfig: CircuitBreakerDecoratorConfig = { key, config };

    Reflect.defineMetadata(CIRCUIT_BREAKER_KEY, decoratorConfig, descriptor.value);

    descriptor.value = async function (...args: any[]) {
      // Resolve CircuitBreakerService from the instance if available
      // This requires the class to have circuitBreakerService as a property
      const service: CircuitBreakerService | undefined = (this as any).circuitBreakerService;

      if (!service) {
        // No circuit breaker service — just call the original method
        return originalMethod.apply(this, args);
      }

      return service.execute(
        key,
        () => originalMethod.apply(this, args),
        // No fallback by default — can be configured via metadata
      );
    };

    // Preserve original method name and metadata
    Object.defineProperty(descriptor.value, 'name', {
      value: originalMethod.name || String(_propertyKey),
      writable: false,
    });

    Reflect.defineMetadata(CIRCUIT_BREAKER_CONFIG_KEY, decoratorConfig, descriptor.value);

    return descriptor;
  };
}

/**
 * Get the circuit breaker config stored by the @CircuitBreaker decorator.
 */
export function getCircuitBreakerConfig(
  target: any,
): CircuitBreakerDecoratorConfig | undefined {
  return Reflect.getMetadata(CIRCUIT_BREAKER_KEY, target);
}
