import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface AgentRegistryStatus {
  initialized: boolean;
  agentCount: number;
  lastSyncAt: string | null;
}

export interface QueueSystemStatus {
  connected: boolean;
  pendingJobs: number;
  activeWorkers: number;
}

@Injectable()
export class AgentHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(AgentHealthIndicator.name);
  private agentRegistryInitialized = false;
  private registeredAgentCount = 0;
  private lastRegistrySyncAt: Date | null = null;
  private queueConnected = false;
  private pendingJobs = 0;
  private activeWorkers = 0;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  /**
   * Update the agent registry status from external systems.
   * Called by the agent module when agents are registered/deregistered.
   */
  updateRegistryStatus(status: Partial<AgentRegistryStatus>): void {
    if (status.initialized !== undefined) {
      this.agentRegistryInitialized = status.initialized;
    }
    if (status.agentCount !== undefined) {
      this.registeredAgentCount = status.agentCount;
    }
    if (status.lastSyncAt !== undefined) {
      this.lastRegistrySyncAt = status.lastSyncAt ? new Date(status.lastSyncAt) : null;
    }
    this.logger.debug(
      `Registry status updated: initialized=${this.agentRegistryInitialized}, agents=${this.registeredAgentCount}`,
    );
  }

  /**
   * Update the queue system status from external systems.
   * Called by the queue module when connection state changes.
   */
  updateQueueStatus(status: Partial<QueueSystemStatus>): void {
    if (status.connected !== undefined) {
      this.queueConnected = status.connected;
    }
    if (status.pendingJobs !== undefined) {
      this.pendingJobs = status.pendingJobs;
    }
    if (status.activeWorkers !== undefined) {
      this.activeWorkers = status.activeWorkers;
    }
    this.logger.debug(
      `Queue status updated: connected=${this.queueConnected}, pending=${this.pendingJobs}, workers=${this.activeWorkers}`,
    );
  }

  /**
   * Mark the agent registry as initialized.
   * Convenience method called during application bootstrap.
   */
  markRegistryInitialized(agentCount: number = 0): void {
    this.agentRegistryInitialized = true;
    this.registeredAgentCount = agentCount;
    this.lastRegistrySyncAt = new Date();
    this.logger.log(`Agent registry marked as initialized with ${agentCount} agents`);
  }

  /**
   * Mark the queue system as connected.
   * Convenience method called when the message broker connection is established.
   */
  markQueueConnected(pendingJobs: number = 0, activeWorkers: number = 0): void {
    this.queueConnected = true;
    this.pendingJobs = pendingJobs;
    this.activeWorkers = activeWorkers;
    this.logger.log(
      `Queue system marked as connected: ${pendingJobs} pending jobs, ${activeWorkers} active workers`,
    );
  }

  /**
   * Mark the queue system as disconnected.
   * Called when the message broker connection is lost.
   */
  markQueueDisconnected(): void {
    this.queueConnected = false;
    this.logger.warn('Queue system marked as disconnected');
  }

  /**
   * Check if the agent system is fully ready.
   * The agent system is healthy when:
   * - The agent registry is initialized
   * - The queue system is connected
   */
  async isAgentSystemReady(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = this.agentRegistryInitialized && this.queueConnected;

    const details = {
      agentRegistry: {
        initialized: this.agentRegistryInitialized,
        registeredAgents: this.registeredAgentCount,
        lastSyncAt: this.lastRegistrySyncAt?.toISOString() ?? null,
      },
      queueSystem: {
        connected: this.queueConnected,
        pendingJobs: this.pendingJobs,
        activeWorkers: this.activeWorkers,
      },
    };

    if (isHealthy) {
      return this.getStatus(key, true, details);
    }

    throw new HealthCheckError(
      'AgentSystemHealthCheck',
      this.getStatus(key, false, details),
    );
  }

  /**
   * Check agent registry readiness specifically.
   */
  async isAgentRegistryReady(key: string): Promise<HealthIndicatorResult> {
    const details = {
      initialized: this.agentRegistryInitialized,
      registeredAgents: this.registeredAgentCount,
      lastSyncAt: this.lastRegistrySyncAt?.toISOString() ?? null,
    };

    if (this.agentRegistryInitialized) {
      return this.getStatus(key, true, details);
    }

    throw new HealthCheckError(
      'AgentRegistryHealthCheck',
      this.getStatus(key, false, details),
    );
  }

  /**
   * Check queue system connectivity specifically.
   */
  async isQueueSystemReady(key: string): Promise<HealthIndicatorResult> {
    const details = {
      connected: this.queueConnected,
      pendingJobs: this.pendingJobs,
      activeWorkers: this.activeWorkers,
    };

    if (this.queueConnected) {
      return this.getStatus(key, true, details);
    }

    throw new HealthCheckError(
      'QueueSystemHealthCheck',
      this.getStatus(key, false, details),
    );
  }

  /**
   * Perform a direct Redis ping check to verify message broker connectivity.
   * This is a live check that actually attempts a connection and retrieves
   * server metadata (memory usage, connected clients) for diagnostics.
   */
  async checkRedisConnectivity(key: string): Promise<HealthIndicatorResult> {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password') || undefined;
    const db = this.configService.get<number>('redis.db', 0);

    let redis: Redis | null = null;

    try {
      redis = new Redis({
        host,
        port,
        password,
        db,
        connectTimeout: 5000,
        commandTimeout: 5000,
        retryStrategy: () => null, // Disable retry for health check — fail fast
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });

      await redis.connect();

      const pingResult = await redis.ping();

      // Gather diagnostic information from the Redis instance
      const info = await redis.info('memory');
      const usedMemory = this.parseRedisMemoryInfo(info);

      const serverInfo = await redis.info('server');
      const redisVersion = this.parseRedisVersion(serverInfo);

      const clientListRaw = await redis.client('LIST');
      const clientListStr = typeof clientListRaw === 'string'
        ? clientListRaw
        : String(clientListRaw);
      const connectedClients = clientListStr
        .split('\n')
        .filter((line) => line.length > 0).length;

      const dbSize = await redis.dbsize();

      await redis.quit();

      return this.getStatus(key, true, {
        host,
        port,
        db,
        ping: pingResult,
        version: redisVersion,
        usedMemoryHuman: usedMemory,
        connectedClients,
        keyCount: dbSize,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown Redis connection error';

      this.logger.warn(`Redis connectivity check failed: ${errorMessage}`);

      if (redis) {
        try {
          redis.disconnect();
        } catch {
          // Ignore disconnect errors during cleanup
        }
      }

      throw new HealthCheckError(
        'RedisConnectivityCheck',
        this.getStatus(key, false, {
          host,
          port,
          db,
          error: errorMessage,
        }),
      );
    }
  }

  /**
   * Parse Redis INFO memory section for human-readable memory usage.
   */
  private parseRedisMemoryInfo(info: string): string {
    const match = info.match(/used_memory_human:(\S+)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Parse Redis INFO server section for the Redis version number.
   */
  private parseRedisVersion(info: string): string {
    const match = info.match(/redis_version:(\S+)/);
    return match ? match[1] : 'unknown';
  }
}
