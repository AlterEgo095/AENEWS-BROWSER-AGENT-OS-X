import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ─── Circuit Breaker Types (standalone-usable, no NestJS deps) ────────

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit (default: 5) */
  failureThreshold: number;
  /** Number of consecutive successes in half-open to close the circuit (default: 3) */
  successThreshold: number;
  /** Milliseconds before transitioning from OPEN to HALF_OPEN (default: 30000) */
  timeout: number;
  /** Milliseconds between automatic health-check probes (default: 10000) */
  monitorInterval: number;
}

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  lastStateChange: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export interface CircuitStateChangeEvent {
  key: string;
  fromState: CircuitState;
  toState: CircuitState;
  timestamp: Date;
  reason: string;
}

/** Default configuration for a circuit breaker instance */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30_000,
  monitorInterval: 10_000,
};

// ─── Internal Circuit Instance ────────────────────────────────────────

interface CircuitInstance {
  config: CircuitBreakerConfig;
  state: CircuitBreakerState;
  monitorTimer: ReturnType<typeof setInterval> | null;
}

// ─── Pre-registered Circuit Key Prefixes ──────────────────────────────

export const CIRCUIT_KEY_PREFIX = {
  LLM: 'llm',
  PIPELINE: 'pipeline',
  CONNECTOR: 'connector',
  CLUSTER: 'cluster',
  ORCHESTRATOR: 'orchestrator',
} as const;

// ─── Service ──────────────────────────────────────────────────────────

/**
 * CircuitBreakerService — manages per-key circuit breaker instances.
 *
 * Core logic is pure TypeScript (no NestJS-specific features) so the
 * circuit-breaking mechanism can be extracted and used standalone.
 *
 * State machine:
 *   CLOSED  → (failureThreshold reached) → OPEN
 *   OPEN    → (timeout elapsed)          → HALF_OPEN
 *   HALF_OPEN → (successThreshold reached) → CLOSED
 *   HALF_OPEN → (single failure)          → OPEN
 *
 * Events emitted on state changes:
 *   circuit.state.change  — { key, fromState, toState, timestamp, reason }
 */
@Injectable()
export class CircuitBreakerService implements OnModuleInit {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitInstance>();

  /** Global default config, overridable via environment variables */
  private readonly globalConfig: CircuitBreakerConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly emitter: EventEmitter2,
  ) {
    this.globalConfig = {
      failureThreshold:
        this.configService.get<number>('CIRCUIT_BREAKER_FAILURE_THRESHOLD') ??
        DEFAULT_CONFIG.failureThreshold,
      successThreshold:
        this.configService.get<number>('CIRCUIT_BREAKER_SUCCESS_THRESHOLD') ??
        DEFAULT_CONFIG.successThreshold,
      timeout:
        this.configService.get<number>('CIRCUIT_BREAKER_TIMEOUT') ??
        DEFAULT_CONFIG.timeout,
      monitorInterval:
        this.configService.get<number>('CIRCUIT_BREAKER_MONITOR_INTERVAL') ??
        DEFAULT_CONFIG.monitorInterval,
    };

    this.logger.log(
      `Circuit Breaker initialized — defaults: failureThreshold=${this.globalConfig.failureThreshold}, ` +
        `successThreshold=${this.globalConfig.successThreshold}, timeout=${this.globalConfig.timeout}ms, ` +
        `monitorInterval=${this.globalConfig.monitorInterval}ms`,
    );
  }

  // ─── Lifecycle ──────────────────────────────────────────────────

  onModuleInit(): void {
    this.registerDefaultCircuits();
  }

  /**
   * Pre-register circuits for each known domain.
   * These can be re-configured later via registerCircuit().
   */
  private registerDefaultCircuits(): void {
    // LLM providers
    this.registerCircuit(`${CIRCUIT_KEY_PREFIX.LLM}:openai`, {
      failureThreshold: 3,
      timeout: 60_000,
    });
    this.registerCircuit(`${CIRCUIT_KEY_PREFIX.LLM}:anthropic`, {
      failureThreshold: 3,
      timeout: 60_000,
    });

    // Pipeline steps
    for (const step of ['decompose', 'plan', 'execute', 'critique', 'repair', 'validate', 'deliver']) {
      this.registerCircuit(`${CIRCUIT_KEY_PREFIX.PIPELINE}:${step}`);
    }

    // Connectors
    for (const connector of ['browser', 'computer', 'coding', 'office', 'marketing', 'business']) {
      this.registerCircuit(`${CIRCUIT_KEY_PREFIX.CONNECTOR}:${connector}`);
    }

    // Clusters
    for (const cluster of [
      'browser', 'computer', 'coding', 'office', 'marketing', 'business',
      'infrastructure', 'security', 'meta-intelligence',
      'llm-intelligence', 'intelligent-orchestration', 'watchdog',
      'self-evolution', 'certification',
    ]) {
      this.registerCircuit(`${CIRCUIT_KEY_PREFIX.CLUSTER}:${cluster}`);
    }

    // Orchestrator-level
    this.registerCircuit(`${CIRCUIT_KEY_PREFIX.ORCHESTRATOR}:pipeline`);

    this.logger.log(`Pre-registered ${this.circuits.size} circuit breaker instances`);
  }

  // ─── Public API ─────────────────────────────────────────────────

  /**
   * Register (or reconfigure) a circuit breaker for a given key.
   * If the circuit already exists, its config is updated but state is preserved.
   */
  registerCircuit(key: string, config?: Partial<CircuitBreakerConfig>): void {
    const existing = this.circuits.get(key);
    const mergedConfig: CircuitBreakerConfig = {
      ...this.globalConfig,
      ...config,
    };

    if (existing) {
      existing.config = mergedConfig;
      this.logger.debug(`Circuit "${key}" reconfigured`);
      return;
    }

    const now = new Date();
    const state: CircuitBreakerState = {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      lastFailure: null,
      lastSuccess: null,
      lastStateChange: now,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
    };

    const instance: CircuitInstance = {
      config: mergedConfig,
      state,
      monitorTimer: null,
    };

    this.circuits.set(key, instance);
    this.logger.debug(`Circuit "${key}" registered`);
  }

  /**
   * Execute an async operation through the circuit breaker.
   *
   * - If CLOSED: execute normally, track success/failure
   * - If OPEN: reject immediately (or call fallback if provided)
   * - If HALF_OPEN: allow one request through as a probe; if it succeeds,
   *   increment success counter; if it fails, re-open immediately
   *
   * @param key       Circuit breaker key
   * @param fn        The async operation to wrap
   * @param fallback  Optional fallback called when the circuit is OPEN
   */
  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const instance = this.getOrCreateCircuit(key);
    const { state, config } = instance;

    state.totalRequests++;

    switch (state.state) {
      case CircuitState.OPEN: {
        // Check if timeout has elapsed → transition to HALF_OPEN
        if (this.shouldAttemptHalfOpen(instance)) {
          this.transitionState(instance, key, CircuitState.HALF_OPEN, 'timeout elapsed');
        } else {
          // Still open — reject or fallback
          if (fallback) {
            this.logger.debug(`Circuit "${key}" is OPEN — executing fallback`);
            return fallback();
          }
          throw new CircuitBreakerOpenError(key);
        }
      }

      // intentional fall-through: OPEN may have just transitioned to HALF_OPEN
      case CircuitState.HALF_OPEN: {
        try {
          const result = await fn();
          this.recordSuccess(instance, key);
          return result;
        } catch (error) {
          this.recordFailure(instance, key);
          if (fallback) {
            this.logger.debug(`Circuit "${key}" HALF_OPEN probe failed — executing fallback`);
            return fallback();
          }
          throw error;
        }
      }

      case CircuitState.CLOSED: {
        try {
          const result = await fn();
          this.recordSuccess(instance, key);
          return result;
        } catch (error) {
          this.recordFailure(instance, key);

          // Check if we should open the circuit
          if (state.failures >= config.failureThreshold) {
            this.transitionState(instance, key, CircuitState.OPEN, 'failure threshold reached');
            this.startMonitorTimer(instance, key);
          }

          if (fallback && (state.state as CircuitState) === CircuitState.OPEN) {
            return fallback();
          }
          throw error;
        }
      }
    }
  }

  /**
   * Get the current state of a circuit.
   */
  getState(key: string): CircuitBreakerState {
    const instance = this.getOrCreateCircuit(key);
    return { ...instance.state };
  }

  /**
   * Manually reset a circuit to CLOSED state.
   */
  reset(key: string): void {
    const instance = this.circuits.get(key);
    if (!instance) {
      this.logger.warn(`Cannot reset unknown circuit "${key}"`);
      return;
    }

    const previousState = instance.state.state;
    instance.state.failures = 0;
    instance.state.successes = 0;
    instance.state.state = CircuitState.CLOSED;
    instance.state.lastStateChange = new Date();

    this.stopMonitorTimer(instance);

    if (previousState !== CircuitState.CLOSED) {
      this.emitStateChange(key, previousState, CircuitState.CLOSED, 'manual reset');
      this.logger.log(`Circuit "${key}" manually reset to CLOSED`);
    }
  }

  /**
   * Get all circuit states for monitoring dashboards.
   */
  getAllStates(): Map<string, CircuitBreakerState> {
    const result = new Map<string, CircuitBreakerState>();
    for (const [key, instance] of this.circuits) {
      result.set(key, { ...instance.state });
    }
    return result;
  }

  /**
   * Check whether a circuit is currently OPEN (rejecting requests).
   */
  isOpen(key: string): boolean {
    const instance = this.circuits.get(key);
    if (!instance) return false;
    return instance.state.state === CircuitState.OPEN;
  }

  /**
   * Get summary counts for quick health checks.
   */
  getSummary(): { total: number; closed: number; open: number; halfOpen: number } {
    let closed = 0;
    let open = 0;
    let halfOpen = 0;

    for (const instance of this.circuits.values()) {
      switch (instance.state.state) {
        case CircuitState.CLOSED:
          closed++;
          break;
        case CircuitState.OPEN:
          open++;
          break;
        case CircuitState.HALF_OPEN:
          halfOpen++;
          break;
      }
    }

    return { total: this.circuits.size, closed, open, halfOpen };
  }

  /**
   * Get all circuits that are currently in OPEN state.
   */
  getOpenCircuits(): Array<{ key: string; state: CircuitBreakerState }> {
    const result: Array<{ key: string; state: CircuitBreakerState }> = [];
    for (const [key, instance] of this.circuits) {
      if (instance.state.state === CircuitState.OPEN) {
        result.push({ key, state: { ...instance.state } });
      }
    }
    return result;
  }

  // ─── Private Helpers ────────────────────────────────────────────

  private getOrCreateCircuit(key: string): CircuitInstance {
    let instance = this.circuits.get(key);
    if (!instance) {
      this.registerCircuit(key);
      instance = this.circuits.get(key)!;
    }
    return instance;
  }

  private recordSuccess(instance: CircuitInstance, key: string): void {
    const { state, config } = instance;
    state.successes++;
    state.totalSuccesses++;
    state.failures = 0; // reset consecutive failures
    state.lastSuccess = new Date();

    if (state.state === CircuitState.HALF_OPEN) {
      if (state.successes >= config.successThreshold) {
        this.transitionState(instance, key, CircuitState.CLOSED, 'success threshold reached in half-open');
        this.stopMonitorTimer(instance);
      }
    }
  }

  private recordFailure(instance: CircuitInstance, key: string): void {
    const { state } = instance;
    state.failures++;
    state.totalFailures++;
    state.lastFailure = new Date();
    state.successes = 0; // reset consecutive successes

    if (state.state === CircuitState.HALF_OPEN) {
      // Single failure in half-open → back to OPEN
      this.transitionState(instance, key, CircuitState.OPEN, 'failure during half-open probe');
      this.startMonitorTimer(instance, key);
    }
  }

  private shouldAttemptHalfOpen(instance: CircuitInstance): boolean {
    const { state, config } = instance;
    if (state.state !== CircuitState.OPEN) return false;
    const elapsed = Date.now() - state.lastStateChange.getTime();
    return elapsed >= config.timeout;
  }

  private transitionState(
    instance: CircuitInstance,
    key: string,
    newState: CircuitState,
    reason: string,
  ): void {
    const oldState = instance.state.state;
    if (oldState === newState) return;

    instance.state.state = newState;
    instance.state.lastStateChange = new Date();
    instance.state.failures = 0;
    instance.state.successes = 0;

    this.emitStateChange(key, oldState, newState, reason);

    this.logger.warn(
      `Circuit "${key}" state change: ${oldState} → ${newState} (${reason})`,
    );
  }

  private emitStateChange(
    key: string,
    fromState: CircuitState,
    toState: CircuitState,
    reason: string,
  ): void {
    const event: CircuitStateChangeEvent = {
      key,
      fromState,
      toState,
      timestamp: new Date(),
      reason,
    };

    try {
      this.emitter.emit('circuit.state.change', event);
      // Also emit a key-specific event for targeted listeners
      this.emitter.emit(`circuit.${key}.state.change`, event);
    } catch {
      // Never let event emission failures affect circuit breaker logic
    }
  }

  /**
   * Start a monitor timer that periodically checks if the circuit
   * should transition from OPEN to HALF_OPEN.
   */
  private startMonitorTimer(instance: CircuitInstance, key: string): void {
    this.stopMonitorTimer(instance);

    instance.monitorTimer = setInterval(() => {
      if (this.shouldAttemptHalfOpen(instance)) {
        this.transitionState(instance, key, CircuitState.HALF_OPEN, 'monitor timer: timeout elapsed');
        this.stopMonitorTimer(instance);
      }
    }, instance.config.monitorInterval);

    // Don't prevent process exit
    if (instance.monitorTimer && typeof instance.monitorTimer === 'object' && 'unref' in instance.monitorTimer) {
      instance.monitorTimer.unref();
    }
  }

  private stopMonitorTimer(instance: CircuitInstance): void {
    if (instance.monitorTimer) {
      clearInterval(instance.monitorTimer);
      instance.monitorTimer = null;
    }
  }
}

// ─── Custom Error ─────────────────────────────────────────────────────

export class CircuitBreakerOpenError extends Error {
  public readonly circuitKey: string;

  constructor(key: string) {
    super(`Circuit breaker "${key}" is OPEN — requests are being rejected`);
    this.name = 'CircuitBreakerOpenError';
    this.circuitKey = key;
  }
}
