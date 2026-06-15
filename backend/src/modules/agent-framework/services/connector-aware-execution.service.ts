/**
 * AENEWS Agent OS X — Connector-Aware Execution Service
 *
 * Phase 8 — Utility service that enables Tier 3 agents to leverage
 * real connectors with graceful fallback to LLM then simulation.
 *
 * Execution priority:
 *   1. Real Connector (via UnifiedConnectorRegistry)
 *   2. LLM (via LLMService)
 *   3. Simulation/Heuristic (agent's own logic)
 *
 * This service provides a single `executeWithConnectors()` method that
 * agents can call instead of manually checking connector availability.
 * It automatically:
 *   - Tries the real connector first
 *   - Falls back to LLM if connector is unavailable
 *   - Tracks which source produced the result
 *   - Emits observability events
 *   - Handles circuit breaker states
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { LLMService } from '../../llm/llm.service';
import {
  UnifiedConnectorRegistryService,
  UnifiedExecutionResult,
} from './unified-connector-registry.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';

// ─── Types ──────────────────────────────────────────────────────

export type ExecutionSource = 'connector' | 'llm' | 'fallback' | 'capability';

export interface ConnectorAwareResult {
  success: boolean;
  data?: any;
  error?: string;
  source: ExecutionSource;
  connectorName?: string;
  durationMs: number;
  costUsd?: number;
  metadata?: Record<string, any>;
}

export interface ConnectorAwareOptions {
  /** Connector name to try first (e.g., 'office', 'business', 'infrastructure') */
  connectorName: string;
  /** Action to execute on the connector */
  connectorAction: string;
  /** Parameters for the connector action */
  connectorParams?: Record<string, any>;
  /** System prompt for LLM fallback */
  llmSystemPrompt?: string;
  /** User prompt for LLM fallback */
  llmUserPrompt?: string;
  /** LLM options */
  llmOptions?: { temperature?: number; maxTokens?: number; responseFormat?: 'text' | 'json' };
  /** Whether to try LLM if connector fails (default: true) */
  tryLLMOnConnectorFailure?: boolean;
  /** Whether to store result in agent memory (default: false) */
  storeInMemory?: boolean;
  /** Memory key for storing result */
  memoryKey?: string;
  /** Mission ID for memory context */
  missionId?: string;
  /** Fallback data to return if both connector and LLM fail */
  fallbackData?: any;
}

// ─── Service ─────────────────────────────────────────────────────

@Injectable()
export class ConnectorAwareExecutionService {
  private readonly logger = new Logger(ConnectorAwareExecutionService.name);

  /** Execution statistics */
  private readonly stats = {
    connectorHits: 0,
    llmHits: 0,
    fallbackHits: 0,
    totalExecutions: 0,
  };

  constructor(
    private readonly connectorRegistry: UnifiedConnectorRegistryService,
    private readonly eventBus: AgentEventBusService,
    private readonly memory: AgentMemoryService,
    @Optional() private readonly llmService: LLMService,
  ) {}

  // ─── Public API ───────────────────────────────────────────────

  /**
   * Execute with connector awareness.
   *
   * Priority: Connector → LLM → Fallback
   *
   * This is the primary method that Tier 3 agents should use
   * to leverage real connectors.
   */
  async execute(options: ConnectorAwareOptions): Promise<ConnectorAwareResult> {
    const startTime = Date.now();
    this.stats.totalExecutions++;

    // 1. Try real connector first
    const connectorResult = await this.tryConnector(options);
    if (connectorResult) {
      this.stats.connectorHits++;
      this.emitSourceEvent('connector', options.connectorName, connectorResult.durationMs);

      if (options.storeInMemory && options.missionId && options.memoryKey) {
        await this.memory.store(options.missionId, MemoryTier.WORKING, options.memoryKey, connectorResult);
      }

      return connectorResult;
    }

    // 2. Try LLM fallback
    if (options.tryLLMOnConnectorFailure !== false) {
      const llmResult = await this.tryLLM(options);
      if (llmResult) {
        this.stats.llmHits++;
        this.emitSourceEvent('llm', options.connectorName, llmResult.durationMs);

        if (options.storeInMemory && options.missionId && options.memoryKey) {
          await this.memory.store(options.missionId, MemoryTier.WORKING, options.memoryKey, llmResult);
        }

        return llmResult;
      }
    }

    // 3. Fallback to simulation/heuristic data
    this.stats.fallbackHits++;
    const fallbackResult: ConnectorAwareResult = {
      success: true,
      data: options.fallbackData ?? {
        message: `No connector or LLM available for ${options.connectorName}.${options.connectorAction}`,
        connector: options.connectorName,
        action: options.connectorAction,
      },
      source: 'fallback',
      durationMs: Date.now() - startTime,
    };

    this.emitSourceEvent('fallback', options.connectorName, fallbackResult.durationMs);

    return fallbackResult;
  }

  /**
   * Execute with connector only (no LLM fallback).
   */
  async executeConnectorOnly(
    connectorName: string,
    action: string,
    params?: Record<string, any>,
  ): Promise<ConnectorAwareResult> {
    const startTime = Date.now();

    const result = await this.connectorRegistry.executeAction(connectorName, action, params ?? {});

    return {
      success: result.success,
      data: result.data,
      error: result.error,
      source: result.source === 'bridge' ? 'connector' : result.source,
      connectorName: result.connectorName,
      durationMs: Date.now() - startTime,
      costUsd: result.costUsd,
    };
  }

  /**
   * Check if a real connector is available for a given name and action.
   */
  isConnectorAvailable(connectorName: string, action?: string): boolean {
    if (action) {
      return this.connectorRegistry.hasActionConnector(connectorName, action);
    }
    return this.connectorRegistry.listAllConnectors().some((c) => c.name === connectorName);
  }

  /**
   * Get execution statistics.
   */
  getStatistics(): {
    totalExecutions: number;
    connectorHits: number;
    llmHits: number;
    fallbackHits: number;
    connectorHitRate: number;
  } {
    return {
      ...this.stats,
      connectorHitRate: this.stats.totalExecutions > 0
        ? this.stats.connectorHits / this.stats.totalExecutions
        : 0,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async tryConnector(options: ConnectorAwareOptions): Promise<ConnectorAwareResult | null> {
    try {
      const result = await this.connectorRegistry.executeAction(
        options.connectorName,
        options.connectorAction,
        options.connectorParams ?? {},
      );

      if (result.success) {
        return {
          success: true,
          data: result.data,
          source: 'connector',
          connectorName: result.connectorName,
          durationMs: result.durationMs,
          costUsd: result.costUsd,
          metadata: { mode: result.mode },
        };
      }

      // Connector returned but with failure — try LLM
      this.logger.debug(
        `Connector ${options.connectorName}.${options.connectorAction} returned failure: ${result.error}`,
      );
      return null;
    } catch (error: any) {
      this.logger.debug(
        `Connector ${options.connectorName}.${options.connectorAction} threw error: ${error.message}`,
      );
      return null;
    }
  }

  private async tryLLM(options: ConnectorAwareOptions): Promise<ConnectorAwareResult | null> {
    if (!this.llmService?.isAnyAvailable()) return null;
    if (!options.llmSystemPrompt || !options.llmUserPrompt) return null;

    try {
      const response = await this.llmService.chatWithSystem(
        options.llmSystemPrompt,
        options.llmUserPrompt,
        options.llmOptions ?? { temperature: 0.3, maxTokens: 2048, responseFormat: 'json' },
      );

      if (!response.content) return null;

      // Try to parse as JSON
      let data = response.content;
      try {
        data = JSON.parse(response.content);
      } catch {
        // Not JSON — return as text
      }

      return {
        success: true,
        data,
        source: 'llm',
        durationMs: 0, // LLM doesn't expose per-call duration
        costUsd: (response.usage?.totalTokens ?? 0) * 0.00001, // rough estimate
        metadata: {
          model: response.model,
          tokensUsed: response.usage?.totalTokens,
        },
      };
    } catch (error: any) {
      this.logger.debug(`LLM fallback failed: ${error.message}`);
      return null;
    }
  }

  private emitSourceEvent(source: ExecutionSource, connectorName: string, durationMs: number): void {
    this.eventBus.emit(AgentEventType.TOOL_EXECUTED, 'connector-aware-execution', {
      source,
      connectorName,
      durationMs,
    });
  }
}
