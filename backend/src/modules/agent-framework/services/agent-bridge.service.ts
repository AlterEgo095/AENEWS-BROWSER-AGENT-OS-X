import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import {
  CircuitBreakerService,
  CIRCUIT_KEY_PREFIX,
} from './circuit-breaker.service';

/**
 * Connector interface — each Software Factory connector implements this.
 */
export interface SoftwareFactoryConnector {
  /** Unique connector name */
  name: string;
  /** Human-readable description */
  description: string;
  /** List of actions this connector supports */
  actions: string[];
  /** Execute an action with the given parameters */
  execute(action: string, params: Record<string, any>): Promise<any>;
}

/**
 * Registry of connectors bridging the agent framework to the
 * Software Factory.
 *
 * Pre-registers simulation connectors for the six core domains:
 *   browser, computer, coding, office, marketing, business
 *
 * Circuit Breaker Integration:
 *   - Each connector call is wrapped in a circuit breaker
 *   - Circuit key: `connector:{connectorName}`
 *   - On OPEN: returns a cached/simulated result
 *   - On HALF_OPEN: test with a health check
 */
@Injectable()
export class AgentBridgeService implements OnModuleInit {
  private readonly logger = new Logger(AgentBridgeService.name);
  private readonly connectors = new Map<string, SoftwareFactoryConnector>();

  /** Cache of last successful results per connector+action for fallback */
  private readonly resultCache = new Map<string, { result: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly eventBus: AgentEventBusService,
    @Optional() private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  /**
   * On module init, register the built-in simulation connectors.
   */
  async onModuleInit(): Promise<void> {
    this.registerSimulationConnectors();
    this.logger.log(
      `Bridge initialized with ${this.connectors.size} connector(s), ` +
        `circuit breaker: ${this.circuitBreakerService ? 'enabled' : 'disabled'}`,
    );
  }

  // ─── Public API ─────────────────────────────────────────────

  /**
   * Register a connector in the bridge.
   */
  registerConnector(name: string, connector: SoftwareFactoryConnector): void {
    if (this.connectors.has(name)) {
      this.logger.warn(
        `Connector "${name}" is already registered. Overwriting.`,
      );
    }
    this.connectors.set(name, connector);
    this.logger.debug(`Registered connector: ${name}`);
  }

  /**
   * Retrieve a connector by name.
   */
  getConnector(name: string): SoftwareFactoryConnector | undefined {
    return this.connectors.get(name);
  }

  /**
   * Get all registered connector names.
   */
  getConnectorNames(): string[] {
    return Array.from(this.connectors.keys());
  }

  /**
   * Execute an action through a named connector.
   * Wrapped in a circuit breaker when available.
   *
   * Circuit key: `connector:{connectorName}`
   * On OPEN: returns the last cached result for that connector+action, or a simulated result
   * On HALF_OPEN: allows the request through as a probe
   */
  async executeViaConnector(
    connectorName: string,
    action: string,
    params: Record<string, any>,
  ): Promise<any> {
    const connector = this.connectors.get(connectorName);

    if (!connector) {
      throw new Error(`Connector not found: ${connectorName}`);
    }

    if (!connector.actions.includes(action)) {
      throw new Error(
        `Action "${action}" not supported by connector "${connectorName}". ` +
          `Available actions: ${connector.actions.join(', ')}`,
      );
    }

    // Wrap in circuit breaker if available
    if (this.circuitBreakerService) {
      const circuitKey = `${CIRCUIT_KEY_PREFIX.CONNECTOR}:${connectorName}`;
      const cacheKey = `${connectorName}:${action}`;

      return this.circuitBreakerService.execute(
        circuitKey,
        () => this.executeConnectorInternal(connector, connectorName, action, params),
        // Fallback: return cached or simulated result when circuit is OPEN
        async () => this.getFallbackResult(connectorName, action, params, cacheKey),
      );
    }

    // No circuit breaker — direct execution
    return this.executeConnectorInternal(connector, connectorName, action, params);
  }

  // ─── Internal Execution ────────────────────────────────────────

  private async executeConnectorInternal(
    connector: SoftwareFactoryConnector,
    connectorName: string,
    action: string,
    params: Record<string, any>,
  ): Promise<any> {
    const startTime = Date.now();
    try {
      const result = await connector.execute(action, params);

      // Cache successful result
      const cacheKey = `${connectorName}:${action}`;
      this.resultCache.set(cacheKey, { result, timestamp: Date.now() });
      this.cleanupCache();

      this.eventBus.emit(AgentEventType.TOOL_EXECUTED, connectorName, {
        action,
        success: true,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error: any) {
      this.eventBus.emit(AgentEventType.TOOL_EXECUTED, connectorName, {
        action,
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get a fallback result when the circuit breaker is OPEN.
   * Tries cached result first, then falls back to a simulated result.
   */
  private async getFallbackResult(
    connectorName: string,
    action: string,
    params: Record<string, any>,
    cacheKey: string,
  ): Promise<any> {
    // Try cache first
    const cached = this.resultCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(
        `Circuit OPEN for connector "${connectorName}" — returning cached result for ${action}`,
      );
      return {
        ...cached.result,
        _meta: { source: 'circuit-breaker-cache', cachedAt: cached.timestamp },
      };
    }

    // Fallback to simulated result
    this.logger.debug(
      `Circuit OPEN for connector "${connectorName}" — returning simulated result for ${action}`,
    );
    return {
      action,
      params,
      result: `[circuit-breaker-fallback] ${connectorName}.${action} — connector unavailable, using simulated result`,
      timestamp: Date.now(),
      _meta: { source: 'circuit-breaker-fallback' },
    };
  }

  /**
   * Clean up expired cache entries.
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.resultCache) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.resultCache.delete(key);
      }
    }
  }

  // ─── Simulation Connectors ──────────────────────────────────

  private registerSimulationConnectors(): void {
    // Browser connector
    this.registerConnector('browser', {
      name: 'browser',
      description: 'Browser automation — navigate, scrape, interact with web pages',
      actions: ['navigate', 'scrape', 'click', 'type', 'screenshot', 'evaluate'],
      execute: async (action, params) => ({
        action,
        params,
        result: `[simulation] browser.${action} executed`,
        timestamp: Date.now(),
      }),
    });

    // Computer connector
    this.registerConnector('computer', {
      name: 'computer',
      description: 'Computer control — file system, processes, system operations',
      actions: ['execute', 'readFile', 'writeFile', 'listDir', 'processList', 'screenshot'],
      execute: async (action, params) => ({
        action,
        params,
        result: `[simulation] computer.${action} executed`,
        timestamp: Date.now(),
      }),
    });

    // Coding connector
    this.registerConnector('coding', {
      name: 'coding',
      description: 'Code generation, analysis, and manipulation',
      actions: ['generate', 'analyze', 'refactor', 'test', 'debug', 'document'],
      execute: async (action, params) => ({
        action,
        params,
        result: `[simulation] coding.${action} executed`,
        timestamp: Date.now(),
      }),
    });

    // Office connector
    this.registerConnector('office', {
      name: 'office',
      description: 'Office automation — documents, spreadsheets, presentations, email',
      actions: ['createDoc', 'editDoc', 'createSheet', 'sendEmail', 'schedule', 'convert'],
      execute: async (action, params) => ({
        action,
        params,
        result: `[simulation] office.${action} executed`,
        timestamp: Date.now(),
      }),
    });

    // Marketing connector
    this.registerConnector('marketing', {
      name: 'marketing',
      description: 'Marketing automation — content creation, SEO, social media, analytics',
      actions: ['createContent', 'analyzeSEO', 'postSocial', 'runCampaign', 'getAnalytics'],
      execute: async (action, params) => ({
        action,
        params,
        result: `[simulation] marketing.${action} executed`,
        timestamp: Date.now(),
      }),
    });

    // Business connector
    this.registerConnector('business', {
      name: 'business',
      description: 'Business intelligence — reports, dashboards, data analysis, forecasting',
      actions: ['generateReport', 'createDashboard', 'analyzeData', 'forecast', 'kpiTrack'],
      execute: async (action, params) => ({
        action,
        params,
        result: `[simulation] business.${action} executed`,
        timestamp: Date.now(),
      }),
    });
  }
}
