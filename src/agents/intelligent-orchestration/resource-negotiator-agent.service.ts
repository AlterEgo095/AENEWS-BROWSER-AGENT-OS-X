/**
 * AENEWS Agent OS X - Resource Negotiator Agent
 * Manages resource allocation between competing agents and missions.
 * Uses LLM to negotiate priorities when multiple missions compete for the
 * same capabilities (LLM tokens, browser instances, compute capacity).
 * Falls back to a priority-weighted proportional allocation when LLM is unavailable.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentCluster, AgentInput, AgentOutput } from '../interfaces/agent.interface';
import { AgentConnectorBridge } from '../bridge';

// ─── Agent Configuration ──────────────────────────────────────────

export const RESOURCE_NEGOTIATOR_AGENT_CONFIG: AgentConfig = {
  id: 'intelligent-resource-negotiator',
  name: 'ResourceNegotiator',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '2.0.0',
  description:
    'LLM-driven resource negotiator that manages allocation between competing agents and missions, resolves resource conflicts, and optimizes overall platform utilization',
  capabilities: [
    {
      name: 'negotiateAllocation',
      description: 'Negotiate resource allocation between competing missions',
      inputSchema: {
        type: 'object',
        properties: {
          missions: {
            type: 'array',
            items: { type: 'object' },
            description: 'Competing missions with their resource requirements',
          },
          availableResources: { type: 'object', description: 'Currently available resource pool' },
          constraints: { type: 'object', description: 'Allocation constraints and policies' },
        },
        required: ['missions', 'availableResources'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          allocationDecisions: { type: 'array', items: { type: 'object' } },
          deferredMissions: { type: 'array', items: { type: 'string' } },
          conflictResolutions: { type: 'array', items: { type: 'object' } },
          totalResourceUtilization: { type: 'number' },
        },
      },
    },
    {
      name: 'resolveConflict',
      description: 'Resolve a specific resource conflict between two or more missions',
      inputSchema: {
        type: 'object',
        properties: {
          conflictType: { type: 'string', description: 'Type of resource conflict' },
          competingMissions: { type: 'array', items: { type: 'object' } },
          resourceInDispute: { type: 'string', description: 'The contested resource' },
          availableAmount: { type: 'number', description: 'Amount of resource available' },
        },
        required: ['conflictType', 'competingMissions', 'resourceInDispute'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          resolution: { type: 'object' },
          winner: { type: 'string' },
          reasoning: { type: 'string' },
          compensation: { type: 'object' },
        },
      },
    },
    {
      name: 'rebalanceResources',
      description:
        'Rebalance resource allocation based on changing mission priorities and progress',
      inputSchema: {
        type: 'object',
        properties: {
          currentAllocation: { type: 'object' },
          missionUpdates: { type: 'array', items: { type: 'object' } },
          newResourceAvailability: { type: 'object' },
        },
        required: ['currentAllocation'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          rebalancedAllocation: { type: 'object' },
          transfers: { type: 'array', items: { type: 'object' } },
          utilizationImprovement: { type: 'number' },
        },
      },
    },
  ],
  permissions: [
    'read:resources',
    'write:resources',
    'manage:allocation',
    'read:mission',
    'write:negotiation',
  ],
  maxConcurrentTasks: 5,
  timeout: 90000,
  retryPolicy: { maxRetries: 2, backoffMs: 2500, exponentialBackoff: true },
};

// ─── Internal Types ───────────────────────────────────────────────

interface MissionRequest {
  missionId: string;
  requestedResources: Record<string, number>;
  priority: number;
  deadline?: number;
  estimatedDurationMs?: number;
  businessValue?: number;
}

interface AllocationDecision {
  missionId: string;
  allocatedResources: Record<string, number>;
  priority: number;
  reasoning: string;
}

interface NegotiationResult {
  allocationDecisions: AllocationDecision[];
  deferredMissions: string[];
  conflictResolutions: Array<{ resource: string; missions: string[]; resolution: string }>;
  totalResourceUtilization: number;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class ResourceNegotiatorAgentService extends BaseAgentService {
  constructor(
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super();
  }

  /** Tracks current resource allocations for rebalancing */
  private currentAllocations: Map<string, Record<string, number>> = new Map();

  protected defineConfig(): AgentConfig {
    return RESOURCE_NEGOTIATOR_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.logger.log('Resource Negotiator agent initialized');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const {
      missions,
      availableResources,
      constraints,
      conflictType,
      competingMissions,
      resourceInDispute,
      action,
    } = input.payload;

    // ── LLM-driven negotiation ────────────────────────────────────
    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: `You are a resource negotiator for an AI agent platform. When multiple missions compete for limited resources (LLM tokens, browser instances, compute capacity), you negotiate optimal allocation. Output JSON with: allocationDecisions (array of {missionId, allocatedResources, priority, reasoning}), deferredMissions, conflictResolutions, totalResourceUtilization.`,
          userPrompt: `Negotiate resource allocation:\nMissions: ${JSON.stringify(missions || competingMissions || [])}\nAvailable resources: ${JSON.stringify(availableResources || {})}\nConstraints: ${JSON.stringify(constraints || {})}\nConflict type: ${conflictType || 'general'}\nResource in dispute: ${resourceInDispute || 'N/A'}\nAction: ${action || 'negotiateAllocation'}`,
          temperature: 0.2,
          maxTokens: 4096,
        });

        const negotiation = this.parseNegotiation(llmResult.content);

        // Update tracked allocations
        for (const decision of negotiation.allocationDecisions) {
          this.currentAllocations.set(decision.missionId, decision.allocatedResources);
        }

        await this.storeInWorkingMemory(
          'resource-negotiator:last-negotiation',
          { missions, negotiation, timestamp: new Date() },
          300000,
        );

        return this.createAgentOutput(
          input.taskId,
          true,
          {
            negotiation,
            rawAnalysis: llmResult.content,
            costUsd: llmResult.costUsd,
          },
          undefined,
          startTime,
        );
      } catch (error) {
        this.logger.warn(`LLM negotiation failed: ${(error as Error).message}`);
      }
    }

    // ── Fallback: priority-weighted proportional allocation ───────
    const fallbackNegotiation = this.buildFallbackNegotiation(
      missions || competingMissions || [],
      availableResources || {},
    );

    for (const decision of fallbackNegotiation.allocationDecisions) {
      this.currentAllocations.set(decision.missionId, decision.allocatedResources);
    }

    return this.createAgentOutput(
      input.taskId,
      true,
      { negotiation: fallbackNegotiation },
      undefined,
      startTime,
    );
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private parseNegotiation(content: string): NegotiationResult {
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          allocationDecisions: parsed.allocationDecisions || [],
          deferredMissions: parsed.deferredMissions || [],
          conflictResolutions: parsed.conflictResolutions || [],
          totalResourceUtilization: parsed.totalResourceUtilization || 0,
        };
      }
      return {
        allocationDecisions: [],
        deferredMissions: [],
        conflictResolutions: [],
        totalResourceUtilization: 0,
        raw: content,
      } as any;
    } catch {
      return {
        allocationDecisions: [],
        deferredMissions: [],
        conflictResolutions: [],
        totalResourceUtilization: 0,
        raw: content,
      } as any;
    }
  }

  /**
   * Priority-weighted proportional allocation fallback.
   * Distributes resources proportionally based on mission priority and demand.
   */
  private buildFallbackNegotiation(
    missions: MissionRequest[],
    availableResources: Record<string, number>,
  ): NegotiationResult {
    const allocationDecisions: AllocationDecision[] = [];
    const deferredMissions: string[] = [];
    const conflictResolutions: Array<{ resource: string; missions: string[]; resolution: string }> =
      [];

    if (missions.length === 0) {
      return {
        allocationDecisions,
        deferredMissions,
        conflictResolutions,
        totalResourceUtilization: 0,
      };
    }

    // Sort missions by priority (descending)
    const sorted = [...missions].sort((a, b) => (b.priority || 1) - (a.priority || 1));

    // Total priority weight for proportional distribution
    const totalPriorityWeight = sorted.reduce((sum, m) => sum + (m.priority || 1), 0);

    // Track remaining resources
    const remaining: Record<string, number> = { ...availableResources };

    for (const mission of sorted) {
      const allocatedResources: Record<string, number> = {};
      let fullyAllocated = true;

      if (mission.requestedResources) {
        for (const [resource, requested] of Object.entries(mission.requestedResources)) {
          const available = remaining[resource] ?? 0;

          if (available >= requested) {
            // Full allocation
            allocatedResources[resource] = requested;
            remaining[resource] = available - requested;
          } else if (available > 0) {
            // Proportional allocation based on priority weight
            const weight = (mission.priority || 1) / totalPriorityWeight;
            const proportionalAmount = Math.floor(available * weight);
            const allocated = Math.min(proportionalAmount, requested);
            allocatedResources[resource] = allocated;
            remaining[resource] = available - allocated;
            fullyAllocated = false;

            conflictResolutions.push({
              resource,
              missions: sorted.map((m) => m.missionId),
              resolution: `Proportional allocation: ${allocated}/${requested} units to ${mission.missionId} (priority weight: ${(weight * 100).toFixed(1)}%)`,
            });
          } else {
            // No resources available
            fullyAllocated = false;
          }
        }
      }

      if (fullyAllocated && Object.keys(allocatedResources).length > 0) {
        allocationDecisions.push({
          missionId: mission.missionId,
          allocatedResources,
          priority: mission.priority || 1,
          reasoning: `Full allocation granted — priority ${mission.priority || 1}, sufficient resources available`,
        });
      } else if (Object.keys(allocatedResources).length > 0) {
        allocationDecisions.push({
          missionId: mission.missionId,
          allocatedResources,
          priority: mission.priority || 1,
          reasoning: `Partial allocation — some resources insufficient, allocated what was available`,
        });
      } else {
        deferredMissions.push(mission.missionId);
      }
    }

    // Calculate total utilization
    let totalAllocated = 0;
    let totalAvailable = 0;
    for (const [resource, amount] of Object.entries(availableResources)) {
      totalAvailable += amount;
      totalAllocated += amount - (remaining[resource] || 0);
    }
    const totalResourceUtilization = totalAvailable > 0 ? totalAllocated / totalAvailable : 0;

    return { allocationDecisions, deferredMissions, conflictResolutions, totalResourceUtilization };
  }

  protected async onDestroy(): Promise<void> {
    this.currentAllocations.clear();
    this.logger.log('Resource Negotiator agent destroyed, allocation tracking cleared');
  }
}
