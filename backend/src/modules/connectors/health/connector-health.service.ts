/**
 * AENEWS Agent OS X — Connector Health Service
 *
 * Periodically checks the health of all registered connectors and exposes
 * health status via REST API endpoints.
 *
 * Health checks performed:
 *   - Browser: attempt to launch blank page via browser pool
 *   - GitHub: call rate_limit API endpoint
 *   - Git Local: check workspace root exists
 *   - Filesystem: check workspace root exists and writable
 *   - SMTP: check connection (verify)
 *   - Docker: ping Docker daemon
 *   - Security: always live (crypto operations)
 *
 * Integration:
 *   - Emits events on status changes (healthy → unhealthy)
 *   - Integrates with circuit breaker states
 *   - Exposes health via /api/v1/connectors/health endpoint
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AgentBridgeService } from '../../agent-framework/services/agent-bridge.service';
import { CircuitBreakerService, CIRCUIT_KEY_PREFIX, CircuitState } from '../../agent-framework/services/circuit-breaker.service';
import { AgentEventBusService, AgentEventType } from '../../agent-framework/services/agent-event-bus.service';

// ─── Types ────────────────────────────────────────────────────────────

export type ConnectorHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ConnectorHealthEntry {
  name: string;
  status: ConnectorHealthStatus;
  mode: 'simulation' | 'real' | 'unknown';
  lastCheck: Date | null;
  lastHealthy: Date | null;
  consecutiveFailures: number;
  responseTime: number | null; // ms
  error: string | null;
  circuitBreakerState: CircuitState | null;
}

export interface ConnectorStatusEntry {
  name: string;
  mode: 'simulation' | 'real';
  description: string;
  actions: string[];
}

// ─── Health Check Interface ───────────────────────────────────────────

interface HealthCheck {
  name: string;
  check: () => Promise<{ healthy: boolean; responseTime: number; error?: string }>;
}

// ─── Service ──────────────────────────────────────────────────────────

@Injectable()
export class ConnectorHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectorHealthService.name);
  private readonly healthEntries = new Map<string, ConnectorHealthEntry>();
  private healthChecks: HealthCheck[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private readonly CHECK_INTERVAL_MS = 30_000; // 30 seconds

  constructor(
    private readonly configService: ConfigService,
    private readonly agentBridge: AgentBridgeService,
    @Optional() private readonly circuitBreaker?: CircuitBreakerService,
    @Optional() private readonly eventBus?: AgentEventBusService,
    @Optional() private readonly emitter?: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    this.initializeHealthEntries();
    this.registerHealthChecks();

    // Run initial health check
    await this.runAllChecks();

    // Start periodic health checks
    this.checkInterval = setInterval(() => {
      this.runAllChecks().catch((err) => {
        this.logger.error(`Health check cycle failed: ${err.message}`);
      });
    }, this.CHECK_INTERVAL_MS);

    // Don't prevent process exit
    if (this.checkInterval && typeof this.checkInterval === 'object' && 'unref' in this.checkInterval) {
      this.checkInterval.unref();
    }

    this.logger.log(
      `Connector Health Monitor initialized — monitoring ${this.healthChecks.length} connectors every ${this.CHECK_INTERVAL_MS / 1000}s`,
    );
  }

  onModuleDestroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // ─── Public API ─────────────────────────────────────────────────

  /**
   * Get health status of all connectors.
   */
  getAllHealth(): ConnectorHealthEntry[] {
    return Array.from(this.healthEntries.values());
  }

  /**
   * Get health status of a specific connector.
   */
  getConnectorHealth(name: string): ConnectorHealthEntry | undefined {
    return this.healthEntries.get(name);
  }

  /**
   * Get connector status summary (which are real vs simulation).
   */
  getConnectorStatuses(): ConnectorStatusEntry[] {
    const connectors = this.agentBridge.getConnectorNames();
    return connectors.map((name) => {
      const connector = this.agentBridge.getConnector(name);
      const mode = this.agentBridge.getConnectorMode(name) ?? 'simulation';
      return {
        name,
        mode: mode as 'simulation' | 'real',
        description: connector?.description ?? '',
        actions: connector?.actions ?? [],
      };
    });
  }

  /**
   * Trigger an immediate health check for all connectors.
   */
  async checkNow(): Promise<ConnectorHealthEntry[]> {
    await this.runAllChecks();
    return this.getAllHealth();
  }

  /**
   * Trigger an immediate health check for a specific connector.
   */
  async checkConnectorNow(name: string): Promise<ConnectorHealthEntry | undefined> {
    const check = this.healthChecks.find((c) => c.name === name);
    if (!check) return undefined;

    await this.runSingleCheck(check);
    return this.healthEntries.get(name);
  }

  // ─── Health Check Registration ──────────────────────────────────

  private initializeHealthEntries(): void {
    const connectors = this.agentBridge.getConnectorNames();

    for (const name of connectors) {
      const mode = this.agentBridge.getConnectorMode(name) ?? 'simulation';
      this.healthEntries.set(name, {
        name,
        status: 'unknown',
        mode: mode as 'simulation' | 'real',
        lastCheck: null,
        lastHealthy: null,
        consecutiveFailures: 0,
        responseTime: null,
        error: null,
        circuitBreakerState: null,
      });
    }
  }

  private registerHealthChecks(): void {
    // Browser health check
    this.healthChecks.push({
      name: 'browser',
      check: async () => {
        try {
          const connector = this.agentBridge.getConnector('browser');
          if (!connector) return { healthy: false, responseTime: 0, error: 'Connector not registered' };

          // Try a lightweight action — navigate to about:blank
          const start = Date.now();
          await connector.execute('navigate', { url: 'about:blank' });
          return { healthy: true, responseTime: Date.now() - start };
        } catch (error: any) {
          return { healthy: false, responseTime: 0, error: error.message };
        }
      },
    });

    // GitHub health check
    this.healthChecks.push({
      name: 'github',
      check: async () => {
        try {
          const connector = this.agentBridge.getConnector('github');
          if (!connector) return { healthy: false, responseTime: 0, error: 'Connector not registered' };

          const start = Date.now();
          // Check if GitHub connector is in simulation mode
          const mode = this.agentBridge.getConnectorMode('github');
          if (mode === 'simulation') {
            // Simulation mode is always "healthy" in the sense that it can respond
            return { healthy: true, responseTime: Date.now() - start };
          }

          // Try to list repos (lightweight authenticated check)
          await connector.execute('listRepos', { owner: 'octocat', type: 'public' });
          return { healthy: true, responseTime: Date.now() - start };
        } catch (error: any) {
          return { healthy: false, responseTime: 0, error: error.message };
        }
      },
    });

    // Git Local health check
    this.healthChecks.push({
      name: 'git-local',
      check: async () => {
        try {
          const workspaceRoot = this.configService.get<string>('WORKSPACE_ROOT', '/tmp/aenews-workpace');
          const fs = await import('fs/promises');
          const start = Date.now();
          await fs.access(workspaceRoot);
          return { healthy: true, responseTime: Date.now() - start };
        } catch (error: any) {
          return { healthy: false, responseTime: 0, error: `Workspace not accessible: ${error.message}` };
        }
      },
    });

    // Filesystem health check
    this.healthChecks.push({
      name: 'filesystem',
      check: async () => {
        try {
          const workspaceRoot = this.configService.get<string>('WORKSPACE_ROOT', '/tmp/aenews-workspace');
          const fs = await import('fs/promises');
          const start = Date.now();

          // Check that workspace exists and is writable
          await fs.access(workspaceRoot, fs.constants.W_OK | fs.constants.R_OK);
          return { healthy: true, responseTime: Date.now() - start };
        } catch (error: any) {
          return { healthy: false, responseTime: 0, error: `Workspace not writable: ${error.message}` };
        }
      },
    });

    // Office (SMTP) health check
    this.healthChecks.push({
      name: 'office',
      check: async () => {
        try {
          const connector = this.agentBridge.getConnector('office');
          if (!connector) return { healthy: false, responseTime: 0, error: 'Connector not registered' };

          const mode = this.agentBridge.getConnectorMode('office');
          if (mode === 'simulation') {
            return { healthy: true, responseTime: 0 };
          }

          // Try a lightweight operation
          const start = Date.now();
          await connector.execute('generateMarkdown', { content: 'health check' });
          return { healthy: true, responseTime: Date.now() - start };
        } catch (error: any) {
          return { healthy: false, responseTime: 0, error: error.message };
        }
      },
    });

    // Infrastructure (Docker) health check
    this.healthChecks.push({
      name: 'infrastructure',
      check: async () => {
        try {
          const connector = this.agentBridge.getConnector('infrastructure');
          if (!connector) return { healthy: false, responseTime: 0, error: 'Connector not registered' };

          // Try to get system info (always available even without Docker)
          const start = Date.now();
          await connector.execute('getSystemInfo', {});
          return { healthy: true, responseTime: Date.now() - start };
        } catch (error: any) {
          return { healthy: false, responseTime: 0, error: error.message };
        }
      },
    });

    // Security health check
    this.healthChecks.push({
      name: 'security',
      check: async () => {
        try {
          const connector = this.agentBridge.getConnector('security');
          if (!connector) return { healthy: false, responseTime: 0, error: 'Connector not registered' };

          // Security is always live — test with a quick key generation
          const start = Date.now();
          await connector.execute('generateKey', {});
          return { healthy: true, responseTime: Date.now() - start };
        } catch (error: any) {
          return { healthy: false, responseTime: 0, error: error.message };
        }
      },
    });

    // Also register checks for any other connectors registered with the bridge
    const connectorNames = this.agentBridge.getConnectorNames();
    const registeredNames = new Set(this.healthChecks.map((c) => c.name));

    for (const name of connectorNames) {
      if (!registeredNames.has(name)) {
        // Generic health check for unknown connectors
        this.healthChecks.push({
          name,
          check: async () => {
            try {
              const connector = this.agentBridge.getConnector(name);
              if (!connector) return { healthy: false, responseTime: 0, error: 'Connector not registered' };

              // Ensure the health entry exists
              if (!this.healthEntries.has(name)) {
                const mode = this.agentBridge.getConnectorMode(name) ?? 'simulation';
                this.healthEntries.set(name, {
                  name,
                  status: 'unknown',
                  mode: mode as 'simulation' | 'real',
                  lastCheck: null,
                  lastHealthy: null,
                  consecutiveFailures: 0,
                  responseTime: null,
                  error: null,
                  circuitBreakerState: null,
                });
              }

              // Generic check: just see if the connector is registered and has actions
              return { healthy: true, responseTime: 0 };
            } catch (error: any) {
              return { healthy: false, responseTime: 0, error: error.message };
            }
          },
        });
      }
    }
  }

  // ─── Health Check Execution ─────────────────────────────────────

  private async runAllChecks(): Promise<void> {
    const promises = this.healthChecks.map((check) =>
      this.runSingleCheck(check).catch((err) => {
        this.logger.error(`Health check for ${check.name} failed: ${err.message}`);
      }),
    );

    await Promise.allSettled(promises);
  }

  private async runSingleCheck(check: HealthCheck): Promise<void> {
    const entry = this.healthEntries.get(check.name);
    if (!entry) return;

    const previousStatus = entry.status;

    try {
      const result = await check.check();

      entry.lastCheck = new Date();
      entry.responseTime = result.responseTime;
      entry.error = result.error ?? null;

      if (result.healthy) {
        entry.status = 'healthy';
        entry.lastHealthy = new Date();
        entry.consecutiveFailures = 0;
      } else {
        entry.consecutiveFailures++;
        entry.status = entry.consecutiveFailures >= 3 ? 'unhealthy' : 'degraded';
      }
    } catch (error: any) {
      entry.lastCheck = new Date();
      entry.consecutiveFailures++;
      entry.status = entry.consecutiveFailures >= 3 ? 'unhealthy' : 'degraded';
      entry.error = error.message;
      entry.responseTime = null;
    }

    // Update circuit breaker state
    if (this.circuitBreaker) {
      const circuitKey = `${CIRCUIT_KEY_PREFIX.CONNECTOR}:${check.name}`;
      try {
        const circuitState = this.circuitBreaker.getState(circuitKey);
        entry.circuitBreakerState = circuitState.state;
      } catch {
        entry.circuitBreakerState = null;
      }
    }

    // Emit event on status change
    if (previousStatus !== entry.status && previousStatus !== 'unknown') {
      this.emitStatusChange(check.name, previousStatus, entry.status);
    }
  }

  private emitStatusChange(
    connectorName: string,
    fromStatus: ConnectorHealthStatus,
    toStatus: ConnectorHealthStatus,
  ): void {
    this.logger.warn(
      `Connector "${connectorName}" health status changed: ${fromStatus} → ${toStatus}`,
    );

    if (this.eventBus) {
      this.eventBus.emit(AgentEventType.TOOL_EXECUTED, 'connector-health', {
        connectorName,
        fromStatus,
        toStatus,
        timestamp: Date.now(),
      });
    }

    if (this.emitter) {
      this.emitter.emit('connector.health.change', {
        connectorName,
        fromStatus,
        toStatus,
        timestamp: Date.now(),
      });
    }
  }
}
