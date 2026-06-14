/**
 * AENEWS Agent OS X - Circuit Breaker Manager Agent
 * Watchdog/Self-Healing Cluster — Agent 3 of 3
 *
 * Manages circuit breakers across the platform. Monitors agent health,
 * opens/closes circuit breakers, and coordinates recovery when agents
 * are in failure states. Uses LLM to make intelligent decisions about
 * when to open/close circuit breakers instead of simple threshold-based
 * decisions.
 *
 * Circuit breaker states:
 *   CLOSED  — Normal operation, requests flow through
 *   OPEN    — Blocking requests, agent is in failure state
 *   HALF_OPEN — Testing recovery, limited requests allowed
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentCluster, AgentInput, AgentOutput } from '../interfaces/agent.interface';
import { AgentConnectorBridge } from '../bridge';

// ─── Circuit Breaker State ────────────────────────────────────────

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

// ─── Agent Health State (Circuit Breaker Context) ─────────────────

export interface AgentCircuitState {
  agentId: string;
  currentState: CircuitBreakerState;
  failureCount: number;
  lastFailureTime: string | null;
  lastSuccessTime: string | null;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  recommendedAction: string;
  failureHistory: AgentFailureRecord[];
}

// ─── Failure Record ───────────────────────────────────────────────

export interface AgentFailureRecord {
  timestamp: string;
  errorCategory: string;
  errorMessage: string;
  taskId: string;
}

// ─── Global Health Assessment ─────────────────────────────────────

export enum GlobalHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  CRITICAL = 'critical',
}

// ─── Recovery Plan ────────────────────────────────────────────────

export interface RecoveryPlan {
  immediateActions: string[];
  phasedRecovery: {
    phase: number;
    description: string;
    agentsToRecover: string[];
    estimatedDurationMs: number;
  }[];
  monitoringStrategy: string;
  rollbackTriggers: string[];
}

// ─── Circuit Breaker Assessment ───────────────────────────────────

export interface CircuitBreakerAssessment {
  agentStates: Record<string, AgentCircuitState>;
  globalHealth: GlobalHealthStatus;
  recoveryPlan: RecoveryPlan;
  timestamp: string;
}

// ─── In-Memory State Store ────────────────────────────────────────

interface InternalCircuitState {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  failureHistory: AgentFailureRecord[];
  halfOpenTestCount: number;
  halfOpenSuccessThreshold: number;
  openedAt: Date | null;
}

// ─── Agent Configuration ──────────────────────────────────────────

export const WATCHDOG_CIRCUIT_BREAKER_MANAGER_CONFIG: AgentConfig = {
  id: 'watchdog-circuit-breaker-manager',
  name: 'CircuitBreakerManager',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '2.0.0',
  description:
    'Manages circuit breakers across the platform — monitors agent health, opens/closes circuit breakers, and coordinates recovery using LLM-powered intelligent decisions',
  capabilities: [
    {
      name: 'assessHealth',
      description: 'Assess the health of all agents and determine circuit breaker states',
      inputSchema: {
        type: 'object',
        properties: {
          agentIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific agents to assess (optional)',
          },
          includeHistory: {
            type: 'boolean',
            description: 'Include failure history in the assessment',
          },
        },
        required: [],
      },
      outputSchema: {
        type: 'object',
        properties: {
          agentStates: { type: 'object', description: 'Map of agentId to circuit state' },
          globalHealth: { type: 'string', description: 'Overall platform health' },
          recoveryPlan: { type: 'object', description: 'Recovery plan if needed' },
        },
      },
    },
    {
      name: 'updateCircuitState',
      description:
        'Update the circuit breaker state for a specific agent based on failure or success',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'The agent to update' },
          eventType: { type: 'string', enum: ['failure', 'success'], description: 'Type of event' },
          errorCategory: { type: 'string', description: 'Error category if failure' },
          errorMessage: { type: 'string', description: 'Error message if failure' },
          taskId: { type: 'string', description: 'Related task ID' },
        },
        required: ['agentId', 'eventType'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          previousState: { type: 'string' },
          newState: { type: 'string' },
          action: { type: 'string' },
        },
      },
    },
    {
      name: 'planRecovery',
      description: 'Plan a recovery strategy for agents in OPEN or HALF_OPEN circuit states',
      inputSchema: {
        type: 'object',
        properties: {
          agentIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Agents needing recovery',
          },
          strategy: { type: 'string', description: 'Recovery strategy hint' },
        },
        required: [],
      },
      outputSchema: {
        type: 'object',
        properties: {
          recoveryPlan: { type: 'object', description: 'Detailed recovery plan' },
          globalHealth: { type: 'string', description: 'Current global health status' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:agent',
    'write:circuit-breaker',
    'read:health',
    'write:recovery',
  ],
  maxConcurrentTasks: 5,
  timeout: 30000,
  retryPolicy: { maxRetries: 2, backoffMs: 1500, exponentialBackoff: true },
};

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class CircuitBreakerManagerAgentService extends BaseAgentService {
  /** In-memory circuit breaker state for all known agents */
  private readonly circuitStates: Map<string, InternalCircuitState> = new Map();

  /** Default thresholds — can be overridden via LLM recommendations */
  private readonly defaultThresholds = {
    failureThreshold: 5,
    successThreshold: 3,
    resetTimeoutMs: 60000,
    maxHistorySize: 100,
  };

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) @Optional() private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return WATCHDOG_CIRCUIT_BREAKER_MANAGER_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.logger.log('Circuit Breaker Manager agent initialized');

    // Restore circuit states from memory if available
    await this.restoreCircuitStates();
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const capability = input.payload.capability || 'assessHealth';

    switch (capability) {
      case 'assessHealth':
        return this.assessHealth(input.taskId, input.payload, startTime);
      case 'updateCircuitState':
        return this.updateCircuitState(input.taskId, input.payload, startTime);
      case 'planRecovery':
        return this.planRecovery(input.taskId, input.payload, startTime);
      default:
        return this.assessHealth(input.taskId, input.payload, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    // Persist circuit states to memory before shutdown
    await this.persistCircuitStates();
    this.logger.log('Circuit Breaker Manager agent destroyed');
  }

  // ─── Assess Health ───────────────────────────────────────────────

  private async assessHealth(
    taskId: string,
    payload: any,
    startTime: number,
  ): Promise<AgentOutput> {
    const { agentIds, includeHistory = true } = payload;

    // Collect current state of requested agents (or all known agents)
    const targetAgentIds = agentIds?.length > 0 ? agentIds : Array.from(this.circuitStates.keys());

    const agentStates: Record<string, AgentCircuitState> = {};

    for (const agentId of targetAgentIds) {
      const state = this.getOrCreateCircuitState(agentId);
      agentStates[agentId] = {
        agentId,
        currentState: state.state,
        failureCount: state.failureCount,
        lastFailureTime: state.lastFailureTime?.toISOString() || null,
        lastSuccessTime: state.lastSuccessTime?.toISOString() || null,
        consecutiveFailures: state.consecutiveFailures,
        consecutiveSuccesses: state.consecutiveSuccesses,
        recommendedAction: this.getRecommendedAction(state),
        failureHistory: includeHistory ? state.failureHistory : [],
      };
    }

    // Determine global health from agent states
    const globalHealth = this.calculateGlobalHealth(agentStates);

    if (this.bridge && Object.keys(agentStates).length > 0) {
      try {
        // Use LLM for intelligent health assessment and recovery planning
        const llmResult = await this.bridge.callLLM({
          systemPrompt: `You are a circuit breaker manager for a distributed AI agent platform. Given the current health states of agents and their failure history, determine circuit breaker actions.

Circuit breaker states:
- CLOSED: Normal operation, requests flow through
- OPEN: Blocking requests, agent is in failure state
- HALF_OPEN: Testing recovery, limited requests allowed

Output JSON:
{
  "agentStates": { "<agentId>": { "currentState": "CLOSED|OPEN|HALF_OPEN", "failureCount": number, "lastFailureTime": "ISO string", "recommendedAction": "string describing what to do" } },
  "globalHealth": "healthy|degraded|critical",
  "recoveryPlan": {
    "immediateActions": ["actions to take now"],
    "phasedRecovery": [
      { "phase": 1, "description": "string", "agentsToRecover": ["agentIds"], "estimatedDurationMs": number }
    ],
    "monitoringStrategy": "string",
    "rollbackTriggers": ["conditions that should trigger rollback"]
  }
}`,
          userPrompt: `Assess the health of these agents and determine circuit breaker actions:
${JSON.stringify(agentStates, null, 2)}

Global health pre-assessment: ${globalHealth}`,
          temperature: 0.1,
          maxTokens: 4096,
        });

        const assessment = this.parseAssessment(llmResult.content, agentStates, globalHealth);

        // Apply LLM-recommended state changes
        await this.applyRecommendedStateChanges(assessment.agentStates);

        // Store assessment in memory
        await this.storeInWorkingMemory('circuit-breaker:latest-assessment', assessment, 300000);

        return this.createAgentOutput(
          taskId,
          true,
          {
            ...assessment,
            costUsd: llmResult.costUsd,
          },
          undefined,
          startTime,
        );
      } catch (err) {
        this.logger.warn(`LLM health assessment failed: ${(err as Error).message}`);
      }
    }

    // Fallback: rule-based assessment without LLM
    const fallbackAssessment: CircuitBreakerAssessment = {
      agentStates,
      globalHealth,
      recoveryPlan: this.generateFallbackRecoveryPlan(agentStates, globalHealth),
      timestamp: new Date().toISOString(),
    };

    await this.storeInWorkingMemory(
      'circuit-breaker:latest-assessment',
      fallbackAssessment,
      300000,
    );

    return this.createAgentOutput(taskId, true, fallbackAssessment, undefined, startTime);
  }

  // ─── Update Circuit State ────────────────────────────────────────

  private async updateCircuitState(
    taskId: string,
    payload: any,
    startTime: number,
  ): Promise<AgentOutput> {
    const { agentId, eventType, errorCategory, errorMessage, taskId: eventTaskId } = payload;

    if (!agentId) {
      return this.createAgentOutput(
        taskId,
        false,
        null,
        'agentId is required for circuit state update',
        startTime,
      );
    }

    const state = this.getOrCreateCircuitState(agentId);
    const previousState = state.state;

    if (eventType === 'failure') {
      state.failureCount++;
      state.consecutiveFailures++;
      state.consecutiveSuccesses = 0;
      state.lastFailureTime = new Date();

      // Record the failure
      state.failureHistory.push({
        timestamp: new Date().toISOString(),
        errorCategory: errorCategory || 'UNKNOWN',
        errorMessage: errorMessage || 'Unknown error',
        taskId: eventTaskId || '',
      });

      // Trim history if too long
      if (state.failureHistory.length > this.defaultThresholds.maxHistorySize) {
        state.failureHistory = state.failureHistory.slice(-this.defaultThresholds.maxHistorySize);
      }

      // State transitions on failure
      if (state.state === CircuitBreakerState.CLOSED) {
        if (state.consecutiveFailures >= this.defaultThresholds.failureThreshold) {
          state.state = CircuitBreakerState.OPEN;
          state.openedAt = new Date();
          this.logger.warn(
            `Circuit breaker OPENED for agent ${agentId} after ${state.consecutiveFailures} consecutive failures`,
          );
        }
      } else if (state.state === CircuitBreakerState.HALF_OPEN) {
        // Failed during half-open test — go back to OPEN
        state.state = CircuitBreakerState.OPEN;
        state.openedAt = new Date();
        state.halfOpenTestCount = 0;
        this.logger.warn(`Circuit breaker re-OPENED for agent ${agentId} — half-open test failed`);
      }
    } else if (eventType === 'success') {
      state.consecutiveSuccesses++;
      state.consecutiveFailures = 0;
      state.lastSuccessTime = new Date();

      // State transitions on success
      if (state.state === CircuitBreakerState.HALF_OPEN) {
        state.halfOpenTestCount++;
        if (state.halfOpenTestCount >= state.halfOpenSuccessThreshold) {
          state.state = CircuitBreakerState.CLOSED;
          state.halfOpenTestCount = 0;
          state.openedAt = null;
          this.logger.log(`Circuit breaker CLOSED for agent ${agentId} — recovery successful`);
        }
      }
    }

    // Check for automatic half-open transition (timeout-based)
    if (state.state === CircuitBreakerState.OPEN && state.openedAt) {
      const elapsed = Date.now() - state.openedAt.getTime();
      if (elapsed >= this.defaultThresholds.resetTimeoutMs) {
        state.state = CircuitBreakerState.HALF_OPEN;
        state.halfOpenTestCount = 0;
        this.logger.log(
          `Circuit breaker transitioned to HALF_OPEN for agent ${agentId} after timeout`,
        );
      }
    }

    // Persist updated state
    await this.persistCircuitStates();

    const action = this.describeAction(previousState, state.state, eventType);

    return this.createAgentOutput(
      taskId,
      true,
      {
        agentId,
        previousState,
        newState: state.state,
        action,
        failureCount: state.failureCount,
        consecutiveFailures: state.consecutiveFailures,
        consecutiveSuccesses: state.consecutiveSuccesses,
      },
      undefined,
      startTime,
    );
  }

  // ─── Plan Recovery ───────────────────────────────────────────────

  private async planRecovery(
    taskId: string,
    payload: any,
    startTime: number,
  ): Promise<AgentOutput> {
    const { agentIds, strategy } = payload;

    // Find agents that need recovery
    const agentsNeedingRecovery = (
      agentIds?.length > 0 ? agentIds : Array.from(this.circuitStates.keys())
    ).filter((id: string) => {
      const state = this.circuitStates.get(id);
      return (
        state &&
        (state.state === CircuitBreakerState.OPEN || state.state === CircuitBreakerState.HALF_OPEN)
      );
    });

    if (agentsNeedingRecovery.length === 0) {
      return this.createAgentOutput(
        taskId,
        true,
        {
          recoveryPlan: {
            immediateActions: ['No agents currently in failure state — no recovery needed'],
            phasedRecovery: [],
            monitoringStrategy: 'Continue regular health monitoring',
            rollbackTriggers: [],
          },
          globalHealth: GlobalHealthStatus.HEALTHY,
        },
        undefined,
        startTime,
      );
    }

    // Build agent states for LLM analysis
    const agentStates: Record<string, AgentCircuitState> = {};
    for (const agentId of agentsNeedingRecovery) {
      const state = this.circuitStates.get(agentId)!;
      agentStates[agentId] = {
        agentId,
        currentState: state.state,
        failureCount: state.failureCount,
        lastFailureTime: state.lastFailureTime?.toISOString() || null,
        lastSuccessTime: state.lastSuccessTime?.toISOString() || null,
        consecutiveFailures: state.consecutiveFailures,
        consecutiveSuccesses: state.consecutiveSuccesses,
        recommendedAction: this.getRecommendedAction(state),
        failureHistory: state.failureHistory.slice(-10), // Last 10 failures for context
      };
    }

    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: `You are a circuit breaker recovery planner for a distributed AI agent platform. Design a phased recovery plan for agents in failure states.

Consider:
- Prioritize recovery by criticality and dependency
- Use gradual traffic increase (canary approach)
- Include monitoring checkpoints between phases
- Define clear rollback triggers

Output JSON:
{
  "recoveryPlan": {
    "immediateActions": ["actions to take now"],
    "phasedRecovery": [
      { "phase": 1, "description": "string", "agentsToRecover": ["agentIds"], "estimatedDurationMs": number }
    ],
    "monitoringStrategy": "string describing how to monitor during recovery",
    "rollbackTriggers": ["conditions that trigger rollback"]
  },
  "globalHealth": "degraded|critical"
}`,
          userPrompt: `Plan recovery for these agents in failure states:
${JSON.stringify(agentStates, null, 2)}

Strategy hint: ${strategy || 'auto'}
Current time: ${new Date().toISOString()}`,
          temperature: 0.2,
          maxTokens: 3072,
        });

        const parsed = this.parseRecoveryPlan(llmResult.content, agentStates);
        return this.createAgentOutput(
          taskId,
          true,
          {
            ...parsed,
            costUsd: llmResult.costUsd,
          },
          undefined,
          startTime,
        );
      } catch (err) {
        this.logger.warn(`LLM recovery planning failed: ${(err as Error).message}`);
      }
    }

    // Fallback recovery plan
    const globalHealth = this.calculateGlobalHealth(agentStates);
    const fallbackPlan = this.generateFallbackRecoveryPlan(agentStates, globalHealth);

    return this.createAgentOutput(
      taskId,
      true,
      {
        recoveryPlan: fallbackPlan,
        globalHealth,
      },
      undefined,
      startTime,
    );
  }

  // ─── Private Helpers ─────────────────────────────────────────────

  private getOrCreateCircuitState(agentId: string): InternalCircuitState {
    if (!this.circuitStates.has(agentId)) {
      this.circuitStates.set(agentId, {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        failureHistory: [],
        halfOpenTestCount: 0,
        halfOpenSuccessThreshold: this.defaultThresholds.successThreshold,
        openedAt: null,
      });
    }
    return this.circuitStates.get(agentId)!;
  }

  private getRecommendedAction(state: InternalCircuitState): string {
    switch (state.state) {
      case CircuitBreakerState.CLOSED:
        if (state.consecutiveFailures > 0) {
          return `Monitor closely — ${state.consecutiveFailures} consecutive failures observed`;
        }
        return 'Normal operation — no action needed';
      case CircuitBreakerState.OPEN:
        return `Block all requests — agent has ${state.consecutiveFailures} consecutive failures. Wait for reset timeout before attempting half-open test.`;
      case CircuitBreakerState.HALF_OPEN:
        return `Allow limited test requests — ${state.halfOpenTestCount}/${state.halfOpenSuccessThreshold} successful tests completed`;
      default:
        return 'Unknown state';
    }
  }

  private calculateGlobalHealth(
    agentStates: Record<string, AgentCircuitState>,
  ): GlobalHealthStatus {
    const states = Object.values(agentStates);
    if (states.length === 0) return GlobalHealthStatus.HEALTHY;

    const openCount = states.filter((s) => s.currentState === CircuitBreakerState.OPEN).length;
    const halfOpenCount = states.filter(
      (s) => s.currentState === CircuitBreakerState.HALF_OPEN,
    ).length;
    const total = states.length;

    const openRatio = openCount / total;
    const degradedRatio = (openCount + halfOpenCount) / total;

    if (openRatio > 0.5 || openCount >= 5) {
      return GlobalHealthStatus.CRITICAL;
    }
    if (degradedRatio > 0.3 || openCount >= 2) {
      return GlobalHealthStatus.DEGRADED;
    }
    return GlobalHealthStatus.HEALTHY;
  }

  private describeAction(
    previousState: CircuitBreakerState,
    newState: CircuitBreakerState,
    eventType: string,
  ): string {
    if (previousState === newState) {
      return `${eventType} recorded — circuit remains ${newState}`;
    }
    return `Circuit transitioned from ${previousState} to ${newState} on ${eventType}`;
  }

  private parseAssessment(
    content: string,
    originalStates: Record<string, AgentCircuitState>,
    fallbackGlobalHealth: GlobalHealthStatus,
  ): CircuitBreakerAssessment {
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);

        // Merge LLM-recommended states with original states
        const agentStates = { ...originalStates };
        if (parsed.agentStates && typeof parsed.agentStates === 'object') {
          for (const [agentId, recommended] of Object.entries(parsed.agentStates)) {
            if (agentStates[agentId] && (recommended as any).currentState) {
              const validStates = Object.values(CircuitBreakerState);
              const recommendedState = (recommended as any).currentState;
              if (validStates.includes(recommendedState)) {
                agentStates[agentId] = {
                  ...agentStates[agentId],
                  ...((recommended as any).recommendedAction
                    ? { recommendedAction: (recommended as any).recommendedAction }
                    : {}),
                };
              }
            }
          }
        }

        const globalHealth = Object.values(GlobalHealthStatus).includes(parsed.globalHealth)
          ? parsed.globalHealth
          : fallbackGlobalHealth;

        return {
          agentStates,
          globalHealth,
          recoveryPlan:
            parsed.recoveryPlan || this.generateFallbackRecoveryPlan(agentStates, globalHealth),
          timestamp: new Date().toISOString(),
        };
      }
    } catch {
      // Parsing failed
    }

    return {
      agentStates: originalStates,
      globalHealth: fallbackGlobalHealth,
      recoveryPlan: this.generateFallbackRecoveryPlan(originalStates, fallbackGlobalHealth),
      timestamp: new Date().toISOString(),
    };
  }

  private parseRecoveryPlan(
    content: string,
    agentStates: Record<string, AgentCircuitState>,
  ): { recoveryPlan: RecoveryPlan; globalHealth: GlobalHealthStatus } {
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);

        const globalHealth = Object.values(GlobalHealthStatus).includes(parsed.globalHealth)
          ? parsed.globalHealth
          : GlobalHealthStatus.DEGRADED;

        const plan = parsed.recoveryPlan;
        if (plan) {
          return {
            recoveryPlan: {
              immediateActions: Array.isArray(plan.immediateActions) ? plan.immediateActions : [],
              phasedRecovery: Array.isArray(plan.phasedRecovery)
                ? plan.phasedRecovery.map((p: any, i: number) => ({
                    phase: p.phase || i + 1,
                    description: p.description || `Phase ${i + 1}`,
                    agentsToRecover: Array.isArray(p.agentsToRecover) ? p.agentsToRecover : [],
                    estimatedDurationMs: p.estimatedDurationMs || 30000,
                  }))
                : [],
              monitoringStrategy:
                plan.monitoringStrategy || 'Monitor agent health every 30 seconds during recovery',
              rollbackTriggers: Array.isArray(plan.rollbackTriggers) ? plan.rollbackTriggers : [],
            },
            globalHealth,
          };
        }
      }
    } catch {
      // Parsing failed
    }

    return {
      recoveryPlan: this.generateFallbackRecoveryPlan(agentStates, GlobalHealthStatus.DEGRADED),
      globalHealth: GlobalHealthStatus.DEGRADED,
    };
  }

  /**
   * Apply LLM-recommended state changes to the internal circuit state store.
   */
  private async applyRecommendedStateChanges(
    recommendedStates: Record<string, any>,
  ): Promise<void> {
    for (const [agentId, recommendation] of Object.entries(recommendedStates)) {
      const state = this.circuitStates.get(agentId);
      if (!state) continue;

      const recommendedState = (recommendation as any).currentState;
      if (Object.values(CircuitBreakerState).includes(recommendedState)) {
        if (state.state !== recommendedState) {
          const previousState = state.state;
          state.state = recommendedState;

          if (recommendedState === CircuitBreakerState.HALF_OPEN) {
            state.halfOpenTestCount = 0;
          } else if (recommendedState === CircuitBreakerState.CLOSED) {
            state.consecutiveFailures = 0;
            state.openedAt = null;
          } else if (recommendedState === CircuitBreakerState.OPEN) {
            state.openedAt = new Date();
          }

          this.logger.log(
            `Circuit breaker for ${agentId} changed from ${previousState} to ${recommendedState} (LLM recommended)`,
          );
        }
      }
    }
  }

  /**
   * Generate a simple fallback recovery plan without LLM.
   */
  private generateFallbackRecoveryPlan(
    agentStates: Record<string, AgentCircuitState>,
    globalHealth: GlobalHealthStatus,
  ): RecoveryPlan {
    const openAgents = Object.values(agentStates).filter(
      (s) => s.currentState === CircuitBreakerState.OPEN,
    );
    const halfOpenAgents = Object.values(agentStates).filter(
      (s) => s.currentState === CircuitBreakerState.HALF_OPEN,
    );

    const immediateActions: string[] = [];
    const phasedRecovery: RecoveryPlan['phasedRecovery'] = [];

    if (openAgents.length > 0) {
      immediateActions.push(
        `Block all traffic to ${openAgents.length} agents in OPEN state`,
        'Initiate health check probes for all OPEN agents',
      );

      phasedRecovery.push({
        phase: 1,
        description: 'Transition OPEN agents to HALF_OPEN for recovery testing',
        agentsToRecover: openAgents.map((a) => a.agentId),
        estimatedDurationMs: this.defaultThresholds.resetTimeoutMs,
      });
    }

    if (halfOpenAgents.length > 0) {
      immediateActions.push(
        `Allow limited test traffic to ${halfOpenAgents.length} agents in HALF_OPEN state`,
      );

      phasedRecovery.push({
        phase: openAgents.length > 0 ? 2 : 1,
        description: 'Monitor HALF_OPEN agents and transition to CLOSED on success',
        agentsToRecover: halfOpenAgents.map((a) => a.agentId),
        estimatedDurationMs: 30000,
      });
    }

    if (globalHealth === GlobalHealthStatus.HEALTHY) {
      immediateActions.push('Continue regular health monitoring');
    }

    return {
      immediateActions:
        immediateActions.length > 0
          ? immediateActions
          : ['No immediate actions required — all agents healthy'],
      phasedRecovery,
      monitoringStrategy:
        'Monitor circuit breaker states every 30 seconds; alert on OPEN transitions',
      rollbackTriggers: [
        'Any agent exceeds 10 consecutive failures during recovery',
        'Global health degrades to CRITICAL during recovery',
        'Recovery phase takes 3x longer than estimated',
      ],
    };
  }

  /**
   * Persist circuit states to working memory for crash recovery.
   */
  private async persistCircuitStates(): Promise<void> {
    const serializable: Record<string, any> = {};
    for (const [agentId, state] of this.circuitStates.entries()) {
      serializable[agentId] = {
        ...state,
        lastFailureTime: state.lastFailureTime?.toISOString() || null,
        lastSuccessTime: state.lastSuccessTime?.toISOString() || null,
        openedAt: state.openedAt?.toISOString() || null,
      };
    }
    await this.storeInWorkingMemory('circuit-breaker:states', serializable, 86400000);
  }

  /**
   * Restore circuit states from working memory.
   */
  private async restoreCircuitStates(): Promise<void> {
    const stored =
      await this.retrieveFromWorkingMemory<Record<string, any>>('circuit-breaker:states');
    if (stored && typeof stored === 'object') {
      for (const [agentId, state] of Object.entries(stored)) {
        this.circuitStates.set(agentId, {
          ...(state as any),
          lastFailureTime: (state as any).lastFailureTime
            ? new Date((state as any).lastFailureTime)
            : null,
          lastSuccessTime: (state as any).lastSuccessTime
            ? new Date((state as any).lastSuccessTime)
            : null,
          openedAt: (state as any).openedAt ? new Date((state as any).openedAt) : null,
        });
      }
      this.logger.log(`Restored circuit states for ${this.circuitStates.size} agents`);
    }
  }
}
