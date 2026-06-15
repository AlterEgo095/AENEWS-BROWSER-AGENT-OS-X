/**
 * AENEWS Agent OS X — Unified Connector Registry Service
 *
 * Phase 8 — Merges the dual connector systems (AgentBridgeService +
 * ConnectorRegistryService) into a single, coherent registry.
 *
 * Architecture:
 *   - AgentBridgeService handles simple action-based connectors (name, actions, execute)
 *   - ConnectorRegistryService handles capability-pack connectors (ICapabilityConnector)
 *   - This service unifies both under a single interface with smart routing
 *
 * Routing logic:
 *   1. For action-based calls (connectorName + action): uses Bridge connectors
 *   2. For capability-based calls (capabilityId): uses Capability connectors
 *   3. Auto-bridges: when a Bridge connector exists but no Capability connector,
 *      creates an adapter so capability packs can route through Bridge connectors
 *   4. Health-aware: tracks connector health, routes away from degraded connectors
 *
 * Connector priority:
 *   - Real connectors always take priority over simulation
 *   - Health status affects routing (degraded connectors get lower priority)
 *   - Circuit breaker integration for fault tolerance
 */

import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import {
  AgentBridgeService,
  SoftwareFactoryConnector,
} from './agent-bridge.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import {
  CircuitBreakerService,
  CIRCUIT_KEY_PREFIX,
} from './circuit-breaker.service';
import {
  ICapabilityConnector,
  ConnectorInfo,
  ConnectorOutput,
  ConnectorInput,
} from '../../software-factory/interfaces/connector.interface';
import {
  CapabilityId,
  CapabilityPack,
} from '../../software-factory/interfaces/mission.interface';

// ─── Unified Connector Types ─────────────────────────────────────

export type ConnectorMode = 'simulation' | 'real';

export interface UnifiedConnectorInfo {
  name: string;
  mode: ConnectorMode;
  health: 'healthy' | 'degraded' | 'offline';
  actions?: string[];
  supportedPack?: CapabilityPack;
  lastHealthCheck?: number;
  executionCount: number;
  failureCount: number;
  avgDurationMs: number;
}

export interface UnifiedExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  source: 'bridge' | 'capability' | 'fallback';
  connectorName: string;
  mode: ConnectorMode;
  durationMs: number;
  costUsd?: number;
}

// ─── Bridge-to-Capability Adapter ────────────────────────────────

/**
 * Adapter that wraps a Bridge connector (SoftwareFactoryConnector)
 * as an ICapabilityConnector, enabling unified routing.
 */
class BridgeCapabilityAdapter implements ICapabilityConnector {
  readonly name: string;
  readonly supportedPack: CapabilityPack;

  private readonly actionToCapabilityMap = new Map<string, CapabilityId>();

  constructor(
    bridgeConnector: SoftwareFactoryConnector,
    pack: CapabilityPack,
    private readonly bridgeService: AgentBridgeService,
  ) {
    this.name = bridgeConnector.name;
    this.supportedPack = pack;

    // Map actions to capability IDs based on pack
    for (const action of bridgeConnector.actions) {
      const capId = `${pack.toLowerCase()}.${action}` as CapabilityId;
      this.actionToCapabilityMap.set(capId, capId);
    }
  }

  supports(capabilityId: CapabilityId): boolean {
    // Check if this capability can be routed through our bridge connector
    const parts = (capabilityId as string).split('.');
    if (parts.length >= 2) {
      const action = parts.slice(1).join('.');
      // Check if the bridge connector supports this action
      const connector = this.bridgeService.getConnector(this.name);
      return connector ? connector.actions.includes(action) : false;
    }
    return this.actionToCapabilityMap.has(capabilityId);
  }

  async execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput> {
    const startTime = Date.now();
    const parts = (capabilityId as string).split('.');
    const action = parts.length >= 2 ? parts.slice(1).join('.') : capabilityId as string;

    try {
      const result = await this.bridgeService.executeViaConnector(
        this.name,
        action,
        input.parameters,
      );

      return {
        success: true,
        artifacts: [],
        output: result,
        costUsd: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        artifacts: [],
        output: null,
        costUsd: 0,
        durationMs: Date.now() - startTime,
        error: error.message,
      };
    }
  }
}

// ─── Service ─────────────────────────────────────────────────────

@Injectable()
export class UnifiedConnectorRegistryService implements OnModuleInit {
  private readonly logger = new Logger(UnifiedConnectorRegistryService.name);

  /** Capability connectors (from ConnectorRegistryService pattern) */
  private readonly capabilityConnectors = new Map<string, ICapabilityConnector>();

  /** Pack-to-connector mapping */
  private readonly packConnectors = new Map<CapabilityPack, ICapabilityConnector>();

  /** Bridge-to-capability adapters (auto-created) */
  private readonly adapters = new Map<string, BridgeCapabilityAdapter>();

  /** Connector health tracking */
  private readonly connectorHealth = new Map<string, {
    status: 'healthy' | 'degraded' | 'offline';
    lastCheck: number;
    executionCount: number;
    failureCount: number;
    totalDurationMs: number;
  }>();

  /** Cache for bridge connector capabilities (refreshed periodically) */
  private bridgeCapabilitiesCache: Map<string, string[]> = new Map();
  private lastCacheRefresh = 0;
  private readonly CACHE_REFRESH_INTERVAL = 60_000; // 1 minute

  constructor(
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
    @Optional() private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Auto-bridge: create adapters for all Bridge connectors that don't have
    // corresponding Capability connectors
    this.syncBridgeAdapters();

    this.logger.log(
      `Unified Connector Registry initialized — ` +
      `Bridge: ${this.bridgeService.getConnectorNames().length} connectors, ` +
      `Capability: ${this.capabilityConnectors.size} connectors, ` +
      `Adapters: ${this.adapters.size} auto-bridged`,
    );
  }

  // ─── Unified Execution API ───────────────────────────────────

  /**
   * Execute via action-based interface (connectorName + action).
   * Routes through the Bridge connector system.
   */
  async executeAction(
    connectorName: string,
    action: string,
    params: Record<string, any>,
  ): Promise<UnifiedExecutionResult> {
    const startTime = Date.now();
    const mode = this.bridgeService.getConnectorMode(connectorName) ?? 'simulation';
    const health = this.getHealth(connectorName);

    // Check health — route to fallback if degraded
    if (health === 'offline') {
      return {
        success: false,
        error: `Connector "${connectorName}" is offline`,
        source: 'fallback',
        connectorName,
        mode,
        durationMs: Date.now() - startTime,
      };
    }

    try {
      const result = await this.executeWithCircuitBreaker(
        connectorName,
        () => this.bridgeService.executeViaConnector(connectorName, action, params),
      );

      this.recordSuccess(connectorName, Date.now() - startTime);

      return {
        success: true,
        data: result,
        source: 'bridge',
        connectorName,
        mode,
        durationMs: Date.now() - startTime,
      };
    } catch (error: any) {
      this.recordFailure(connectorName, Date.now() - startTime);

      // Try fallback via capability connector
      const fallbackResult = await this.tryCapabilityFallback(connectorName, action, params);
      if (fallbackResult) {
        return fallbackResult;
      }

      return {
        success: false,
        error: error.message,
        source: 'bridge',
        connectorName,
        mode,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute via capability-based interface (capabilityId).
   * Routes through the Capability connector system with Bridge fallback.
   */
  async executeCapability(
    capabilityId: CapabilityId,
    input: ConnectorInput,
  ): Promise<UnifiedExecutionResult> {
    const startTime = Date.now();

    // 1. Try capability connector first
    const capConnector = this.getConnectorForCapability(capabilityId);
    if (capConnector) {
      try {
        const result = await capConnector.execute(capabilityId, input);
        this.recordSuccess(capConnector.name, result.durationMs);

        return {
          success: result.success,
          data: result.output,
          error: result.error,
          source: 'capability',
          connectorName: capConnector.name,
          mode: this.bridgeService.getConnectorMode(capConnector.name) ?? 'simulation',
          durationMs: result.durationMs,
          costUsd: result.costUsd,
        };
      } catch (error: any) {
        this.recordFailure(capConnector.name, Date.now() - startTime);
      }
    }

    // 2. Try adapter (bridge → capability)
    const adapter = this.findAdapterForCapability(capabilityId);
    if (adapter) {
      try {
        const result = await adapter.execute(capabilityId, input);
        this.recordSuccess(adapter.name, result.durationMs);

        return {
          success: result.success,
          data: result.output,
          error: result.error,
          source: 'capability',
          connectorName: adapter.name,
          mode: this.bridgeService.getConnectorMode(adapter.name) ?? 'simulation',
          durationMs: result.durationMs,
          costUsd: result.costUsd,
        };
      } catch (error: any) {
        this.recordFailure(adapter.name, Date.now() - startTime);
      }
    }

    // 3. Try direct bridge routing (extract connector name from capability ID)
    const bridgeResult = await this.tryBridgeFromCapability(capabilityId, input);
    if (bridgeResult) {
      return bridgeResult;
    }

    return {
      success: false,
      error: `No connector found for capability: ${capabilityId}`,
      source: 'fallback',
      connectorName: 'none',
      mode: 'simulation',
      durationMs: Date.now() - startTime,
    };
  }

  // ─── Connector Registration ──────────────────────────────────

  /**
   * Register a capability connector.
   * This is the primary registration method for ICapabilityConnector implementations.
   */
  registerCapabilityConnector(connector: ICapabilityConnector): void {
    this.capabilityConnectors.set(connector.name, connector);
    this.packConnectors.set(connector.supportedPack, connector);

    // Initialize health tracking
    if (!this.connectorHealth.has(connector.name)) {
      this.connectorHealth.set(connector.name, {
        status: 'healthy',
        lastCheck: Date.now(),
        executionCount: 0,
        failureCount: 0,
        totalDurationMs: 0,
      });
    }

    this.logger.log(
      `Registered capability connector: ${connector.name} (pack: ${connector.supportedPack})`,
    );

    this.eventBus.emit(AgentEventType.TOOL_EXECUTED, 'unified-registry', {
      action: 'register',
      connectorName: connector.name,
      pack: connector.supportedPack,
    });
  }

  /**
   * Override a pack's connector. Used when a real connector should
   * replace a simulation one for a specific pack.
   */
  overridePackConnector(pack: CapabilityPack, connector: ICapabilityConnector): void {
    const previous = this.packConnectors.get(pack);
    this.packConnectors.set(pack, connector);

    this.logger.log(
      `Overridden pack connector for ${pack}: ` +
      `${previous?.name ?? 'none'} → ${connector.name}`,
    );
  }

  /**
   * Sync bridge adapters — create adapters for Bridge connectors that
   * don't have corresponding Capability connectors.
   */
  syncBridgeAdapters(): void {
    const bridgeNames = this.bridgeService.getConnectorNames();

    for (const name of bridgeNames) {
      // Skip if already have a capability connector for this name
      if (this.capabilityConnectors.has(name)) continue;
      // Skip if already have an adapter
      if (this.adapters.has(name)) continue;

      const bridgeConnector = this.bridgeService.getConnector(name);
      if (!bridgeConnector) continue;

      // Determine the pack from the connector name
      const pack = this.inferPackFromName(name);
      if (!pack) continue;

      // Create adapter
      const adapter = new BridgeCapabilityAdapter(
        bridgeConnector,
        pack,
        this.bridgeService,
      );
      this.adapters.set(name, adapter);

      // Also register as pack connector if none exists
      if (!this.packConnectors.has(pack)) {
        this.packConnectors.set(pack, adapter);
      }

      this.logger.debug(`Created bridge adapter: ${name} → ${pack}`);
    }
  }

  // ─── Query API ───────────────────────────────────────────────

  /**
   * Get a unified view of all connectors.
   */
  listAllConnectors(): UnifiedConnectorInfo[] {
    const result: UnifiedConnectorInfo[] = [];

    // Bridge connectors
    for (const name of this.bridgeService.getConnectorNames()) {
      const connector = this.bridgeService.getConnector(name);
      const health = this.connectorHealth.get(name);
      const mode = this.bridgeService.getConnectorMode(name) ?? 'simulation';

      result.push({
        name,
        mode: mode as ConnectorMode,
        health: health?.status ?? 'healthy',
        actions: connector?.actions,
        supportedPack: this.inferPackFromName(name),
        lastHealthCheck: health?.lastCheck,
        executionCount: health?.executionCount ?? 0,
        failureCount: health?.failureCount ?? 0,
        avgDurationMs: health
          ? (health.executionCount > 0
            ? Math.round(health.totalDurationMs / health.executionCount)
            : 0)
          : 0,
      });
    }

    // Capability-only connectors (not in bridge)
    for (const [name, connector] of this.capabilityConnectors) {
      if (!this.bridgeService.getConnector(name)) {
        const health = this.connectorHealth.get(name);
        result.push({
          name,
          mode: this.bridgeService.getConnectorMode(name) ?? 'simulation',
          health: health?.status ?? 'healthy',
          supportedPack: connector.supportedPack,
          lastHealthCheck: health?.lastCheck,
          executionCount: health?.executionCount ?? 0,
          failureCount: health?.failureCount ?? 0,
          avgDurationMs: health
            ? (health.executionCount > 0
              ? Math.round(health.totalDurationMs / health.executionCount)
              : 0)
            : 0,
        });
      }
    }

    return result;
  }

  /**
   * Get connector info by name.
   */
  getConnectorInfo(name: string): UnifiedConnectorInfo | undefined {
    return this.listAllConnectors().find((c) => c.name === name);
  }

  /**
   * Get the connector for a specific capability pack.
   */
  getConnectorForPack(pack: CapabilityPack): ICapabilityConnector | undefined {
    return this.packConnectors.get(pack);
  }

  /**
   * Check if a connector exists for a given action.
   */
  hasActionConnector(connectorName: string, action: string): boolean {
    const connector = this.bridgeService.getConnector(connectorName);
    return connector ? connector.actions.includes(action) : false;
  }

  /**
   * Check if a capability has a connector.
   */
  hasCapabilityConnector(capabilityId: CapabilityId): boolean {
    return this.getConnectorForCapability(capabilityId) !== undefined;
  }

  /**
   * Get registry statistics.
   */
  getStatistics(): {
    totalConnectors: number;
    bridgeConnectors: number;
    capabilityConnectors: number;
    adapters: number;
    packs: string[];
    realMode: number;
    simulationMode: number;
  } {
    const bridgeNames = this.bridgeService.getConnectorNames();
    let realCount = 0;
    let simCount = 0;

    for (const name of bridgeNames) {
      if (this.bridgeService.isRealConnector(name)) {
        realCount++;
      } else {
        simCount++;
      }
    }

    return {
      totalConnectors: bridgeNames.length + this.capabilityConnectors.size,
      bridgeConnectors: bridgeNames.length,
      capabilityConnectors: this.capabilityConnectors.size,
      adapters: this.adapters.size,
      packs: Array.from(this.packConnectors.keys()),
      realMode: realCount,
      simulationMode: simCount,
    };
  }

  // ─── Health Management ───────────────────────────────────────

  /**
   * Perform a health check on a specific connector.
   */
  async checkConnectorHealth(name: string): Promise<'healthy' | 'degraded' | 'offline'> {
    const bridgeConnector = this.bridgeService.getConnector(name);
    if (!bridgeConnector) {
      this.updateHealth(name, 'offline');
      return 'offline';
    }

    const health = this.connectorHealth.get(name);
    if (!health) {
      this.updateHealth(name, 'healthy');
      return 'healthy';
    }

    // Determine health based on failure rate
    const failureRate = health.executionCount > 0
      ? health.failureCount / health.executionCount
      : 0;

    let status: 'healthy' | 'degraded' | 'offline';
    if (failureRate > 0.5) {
      status = 'offline';
    } else if (failureRate > 0.2) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    this.updateHealth(name, status);
    return status;
  }

  /**
   * Run health checks on all connectors.
   */
  async checkAllHealth(): Promise<Record<string, 'healthy' | 'degraded' | 'offline'>> {
    const results: Record<string, 'healthy' | 'degraded' | 'offline'> = {};

    for (const name of this.bridgeService.getConnectorNames()) {
      results[name] = await this.checkConnectorHealth(name);
    }

    return results;
  }

  /**
   * Get the health status of a connector.
   */
  getHealth(name: string): 'healthy' | 'degraded' | 'offline' {
    return this.connectorHealth.get(name)?.status ?? 'healthy';
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private getConnectorForCapability(capabilityId: CapabilityId): ICapabilityConnector | undefined {
    // Direct lookup by checking which connector supports this capability
    for (const connector of this.capabilityConnectors.values()) {
      if (connector.supports(capabilityId)) {
        return connector;
      }
    }

    // Check adapters
    for (const adapter of this.adapters.values()) {
      if (adapter.supports(capabilityId)) {
        return adapter;
      }
    }

    // Fallback: find by pack prefix
    const prefix = (capabilityId as string).split('.')[0].toUpperCase();
    const packMap: Record<string, CapabilityPack> = {
      BROWSER: CapabilityPack.BROWSER,
      DEV: CapabilityPack.DEVELOPMENT,
      OFFICE: CapabilityPack.OFFICE,
      BUSINESS: CapabilityPack.BUSINESS,
      CERT: CapabilityPack.CERTIFICATION,
      DELIVERY: CapabilityPack.DELIVERY,
    };

    const pack = packMap[prefix];
    if (pack) {
      return this.packConnectors.get(pack);
    }

    return undefined;
  }

  private findAdapterForCapability(capabilityId: CapabilityId): ICapabilityConnector | undefined {
    for (const adapter of this.adapters.values()) {
      if (adapter.supports(capabilityId)) {
        return adapter;
      }
    }
    return undefined;
  }

  private async tryBridgeFromCapability(
    capabilityId: CapabilityId,
    input: ConnectorInput,
  ): Promise<UnifiedExecutionResult | null> {
    const parts = (capabilityId as string).split('.');
    if (parts.length < 2) return null;

    const connectorName = parts[0].toLowerCase();
    const action = parts.slice(1).join('.');

    // Map common prefixes to actual connector names
    const nameMap: Record<string, string> = {
      browser: 'browser',
      dev: 'coding',
      office: 'office',
      business: 'business',
      cert: 'coding', // certification uses coding tools
      delivery: 'coding', // delivery uses coding tools
    };

    const resolvedName = nameMap[connectorName] ?? connectorName;

    const bridgeConnector = this.bridgeService.getConnector(resolvedName);
    if (!bridgeConnector) return null;

    try {
      const result = await this.bridgeService.executeViaConnector(
        resolvedName,
        action,
        input.parameters,
      );

      return {
        success: true,
        data: result,
        source: 'bridge',
        connectorName: resolvedName,
        mode: this.bridgeService.getConnectorMode(resolvedName) ?? 'simulation',
        durationMs: 0,
      };
    } catch {
      return null;
    }
  }

  private async tryCapabilityFallback(
    connectorName: string,
    action: string,
    params: Record<string, any>,
  ): Promise<UnifiedExecutionResult | null> {
    // Try to find a capability connector that can handle this
    const capabilityId = `${connectorName}.${action}` as CapabilityId;
    const connector = this.capabilityConnectors.get(connectorName);

    if (!connector) return null;

    try {
      const result = await connector.execute(capabilityId, {
        missionId: params.missionId || 'unknown',
        instruction: params.instruction || '',
        workspaceDir: params.workspaceDir || '/tmp/workspace',
        parameters: params,
        previousResults: new Map(),
        tools: [],
      });

      return {
        success: result.success,
        data: result.output,
        error: result.error,
        source: 'capability',
        connectorName,
        mode: this.bridgeService.getConnectorMode(connectorName) ?? 'simulation',
        durationMs: result.durationMs,
        costUsd: result.costUsd,
      };
    } catch {
      return null;
    }
  }

  private async executeWithCircuitBreaker<T>(
    connectorName: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (!this.circuitBreakerService) {
      return fn();
    }

    const circuitKey = `${CIRCUIT_KEY_PREFIX.CONNECTOR}:${connectorName}`;
    return this.circuitBreakerService.execute(
      circuitKey,
      fn,
      async () => {
        throw new Error(`Circuit breaker OPEN for connector "${connectorName}"`);
      },
    );
  }

  private inferPackFromName(name: string): CapabilityPack | undefined {
    const map: Record<string, CapabilityPack> = {
      browser: CapabilityPack.BROWSER,
      coding: CapabilityPack.DEVELOPMENT,
      github: CapabilityPack.DEVELOPMENT,
      'git-local': CapabilityPack.DEVELOPMENT,
      filesystem: CapabilityPack.DEVELOPMENT,
      office: CapabilityPack.OFFICE,
      marketing: CapabilityPack.BUSINESS,
      business: CapabilityPack.BUSINESS,
      computer: CapabilityPack.CERTIFICATION,
      infrastructure: CapabilityPack.DELIVERY,
      security: CapabilityPack.CERTIFICATION,
    };
    return map[name];
  }

  private recordSuccess(connectorName: string, durationMs: number): void {
    const health = this.connectorHealth.get(connectorName);
    if (health) {
      health.executionCount++;
      health.totalDurationMs += durationMs;
      health.lastCheck = Date.now();
    } else {
      this.connectorHealth.set(connectorName, {
        status: 'healthy',
        lastCheck: Date.now(),
        executionCount: 1,
        failureCount: 0,
        totalDurationMs: durationMs,
      });
    }
  }

  private recordFailure(connectorName: string, durationMs: number): void {
    const health = this.connectorHealth.get(connectorName);
    if (health) {
      health.executionCount++;
      health.failureCount++;
      health.totalDurationMs += durationMs;
      health.lastCheck = Date.now();

      // Auto-degrade health based on failure rate
      const failureRate = health.failureCount / health.executionCount;
      if (failureRate > 0.5) {
        health.status = 'offline';
      } else if (failureRate > 0.2) {
        health.status = 'degraded';
      }
    } else {
      this.connectorHealth.set(connectorName, {
        status: 'degraded',
        lastCheck: Date.now(),
        executionCount: 1,
        failureCount: 1,
        totalDurationMs: durationMs,
      });
    }
  }

  private updateHealth(name: string, status: 'healthy' | 'degraded' | 'offline'): void {
    const health = this.connectorHealth.get(name);
    if (health) {
      health.status = status;
      health.lastCheck = Date.now();
    } else {
      this.connectorHealth.set(name, {
        status,
        lastCheck: Date.now(),
        executionCount: 0,
        failureCount: 0,
        totalDurationMs: 0,
      });
    }
  }

  /**
   * Refresh the bridge capabilities cache.
   */
  refreshCapabilitiesCache(): void {
    if (Date.now() - this.lastCacheRefresh < this.CACHE_REFRESH_INTERVAL) return;

    this.bridgeCapabilitiesCache.clear();
    for (const name of this.bridgeService.getConnectorNames()) {
      const connector = this.bridgeService.getConnector(name);
      if (connector) {
        this.bridgeCapabilitiesCache.set(name, [...connector.actions]);
      }
    }
    this.lastCacheRefresh = Date.now();
  }
}
