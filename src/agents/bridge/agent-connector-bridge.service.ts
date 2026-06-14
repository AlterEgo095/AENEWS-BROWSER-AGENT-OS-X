/**
 * AENEWS Agent OS X — Agent-Connector Bridge Service
 *
 * THE critical missing piece: connects 60+ agents to 6 real connectors.
 *
 * Before this bridge:
 *   Agents → simulated data (Math.random(), hardcoded strings)
 *
 * After this bridge:
 *   Agents → AgentConnectorBridge → ConnectorRegistry → Real tools
 *                                                 → LLM, Playwright, Shell, Git, Docker
 *
 * Usage from any agent:
 *   constructor(private readonly bridge: AgentConnectorBridge) {}
 *
 *   async execute() {
 *     const result = await this.bridge.executeCapability('dev.frontend', {
 *       missionId: 'mission-123',
 *       instruction: 'Build a React login page',
 *       workspaceDir: '/tmp/workspace',
 *       parameters: { framework: 'react' },
 *     });
 *     // result.success, result.artifacts, result.output, result.costUsd, result.durationMs
 *   }
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConnectorRegistry } from '../../software-factory/connectors/connector-registry';
import {
  ConnectorInput,
  ConnectorOutput,
  LLMCallOptions,
  LLMCallResult,
} from '../../software-factory/connectors/connector.interface';
import { LLMHelper } from '../../software-factory/connectors/llm-helper';
import { CapabilityId } from '../../software-factory/interfaces';

@Injectable()
export class AgentConnectorBridge {
  private readonly logger = new Logger(AgentConnectorBridge.name);

  /** LLMHelper is NOT a NestJS provider — instantiate directly like connectors do */
  private readonly llm: LLMHelper;

  constructor(private readonly connectorRegistry: ConnectorRegistry) {
    this.llm = new LLMHelper();
    this.logger.log('Agent-Connector Bridge initialized — agents can now use real connectors');
  }

  /**
   * Execute a capability through the real connector infrastructure.
   * This is THE main method agents should call instead of simulating.
   *
   * Flow:
   *   1. Look up the connector for the given capabilityId
   *   2. Build a ConnectorInput from the agent's parameters
   *   3. Execute via the connector (which calls real tools)
   *   4. Return real ConnectorOutput with actual artifacts, cost, duration
   *
   * @param capabilityId - e.g. 'dev.frontend', 'browser.screenshot', 'business.seo'
   * @param input - Mission context and parameters from the agent
   * @returns ConnectorOutput with real results (or error if no connector found)
   */
  async executeCapability(
    capabilityId: CapabilityId,
    input: {
      missionId: string;
      instruction: string;
      workspaceDir: string;
      parameters: Record<string, any>;
      previousResults?: Map<CapabilityId, ConnectorOutput>;
    },
  ): Promise<ConnectorOutput> {
    const connector = this.connectorRegistry.getConnector(capabilityId);

    if (!connector) {
      this.logger.warn(
        `No connector found for capability: ${capabilityId} — returning error output`,
      );
      return {
        success: false,
        artifacts: [],
        output: null,
        costUsd: 0,
        durationMs: 0,
        error: `No connector found for capability: ${capabilityId}`,
      };
    }

    const connectorInput: ConnectorInput = {
      missionId: input.missionId || `agent-${Date.now()}`,
      instruction: input.instruction,
      workspaceDir: input.workspaceDir || `/tmp/aenews-agent-workspace/${Date.now()}`,
      parameters: input.parameters,
      previousResults: input.previousResults || new Map(),
      tools: [],
    };

    this.logger.log(
      `Executing capability "${capabilityId}" for mission "${connectorInput.missionId}" via ${connector.constructor.name}`,
    );

    const startTime = Date.now();

    try {
      const result = await connector.execute(capabilityId, connectorInput);

      const totalMs = Date.now() - startTime;
      this.logger.log(
        `Capability "${capabilityId}" completed: success=${result.success}, cost=$${result.costUsd.toFixed(4)}, duration=${totalMs}ms, artifacts=${result.artifacts.length}`,
      );

      return result;
    } catch (error: any) {
      const totalMs = Date.now() - startTime;
      this.logger.error(
        `Capability "${capabilityId}" threw error after ${totalMs}ms: ${error.message}`,
      );

      return {
        success: false,
        artifacts: [],
        output: null,
        costUsd: 0,
        durationMs: totalMs,
        error: `Connector execution failed: ${error.message}`,
      };
    }
  }

  /**
   * Call LLM directly — for agents that need reasoning without a specific capability.
   *
   * Example: an orchestrator agent that needs to analyze a situation before
   * deciding which capability to invoke.
   *
   * @param options - LLM call options (system prompt, user prompt, temperature, etc.)
   * @returns LLM call result with content, cost, and retry count
   */
  async callLLM(options: LLMCallOptions): Promise<LLMCallResult> {
    this.logger.log(`Direct LLM call: systemPrompt=${options.systemPrompt.substring(0, 50)}...`);
    return this.llm.call(options);
  }

  /**
   * Check if a capability has a real connector registered.
   * Agents can use this to decide whether to delegate or fall back to simulation.
   *
   * @param capabilityId - The capability to check
   * @returns true if a real connector exists for this capability
   */
  hasConnector(capabilityId: CapabilityId): boolean {
    return this.connectorRegistry.hasConnector(capabilityId);
  }

  /**
   * Get all connectors currently registered.
   * Useful for agents that need to discover available capabilities at runtime.
   */
  getRegisteredConnectors() {
    return this.connectorRegistry.getAllConnectors();
  }

  /**
   * Get registry statistics.
   * Useful for monitoring and diagnostics.
   */
  getRegistryStatistics() {
    return this.connectorRegistry.getStatistics();
  }

  /**
   * Get LLM cache statistics.
   * Useful for performance monitoring and debugging.
   */
  getLLMCacheStats() {
    return this.llm.getCacheStats();
  }

  /**
   * Get LLM metrics (call count, cost, latency).
   * Useful for observability dashboards.
   */
  getLLMMetrics() {
    return this.llm.getMetrics();
  }
}
