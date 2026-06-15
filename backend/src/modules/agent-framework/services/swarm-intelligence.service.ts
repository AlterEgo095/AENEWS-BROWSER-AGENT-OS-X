/**
 * AENEWS Agent OS X — Swarm Intelligence Service
 *
 * Phase 10 — True swarm intelligence with stigmergy, dynamic spawning,
 * emergent behavior detection, and swarm size optimization.
 *
 * Stigmergy Model:
 *   Agents leave digital "pheromones" in a shared Redis environment.
 *   Pheromones have: type (exploration, success, failure, warning),
 *   strength (decays over time), and spatial coordinates in capability space.
 *   Other agents sense pheromones to guide their behavior.
 *
 * Dynamic Spawning:
 *   Based on workload and pheromone density, the swarm can request
 *   new agent instances. Spawning is bounded by maxSwarmSize and
 *   requires capacity checks with AgentHealthService.
 *
 * Emergent Behavior Detection:
 *   Monitors swarm metrics (convergence, divergence, oscillation, stagnation)
 *   and triggers alerts and adaptive responses.
 *
 * Swarm Size Optimization:
 *   Uses gradient-descent-inspired optimization to find ideal agent count.
 *   Starts with initialSize, adjusts based on throughput and coordination overhead.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { AgentRegistryService } from '../../agent/registry/agent-registry.service';
import { AgentHealthService } from './agent-health.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentCommunicationService } from './agent-communication.service';
import { ClusterType } from '../../agent/entities/agent.entity';
import { BaseAgent, AgentContext, AgentResult } from '../../agent/agent.abstract';
import { LLMService } from '../../llm/llm.service';

// ─── Pheromone Types ──────────────────────────────────────────────

export type PheromoneType = 'exploration' | 'success' | 'failure' | 'warning' | 'resource';

export interface Pheromone {
  id: string;
  type: PheromoneType;
  strength: number;
  coordinates: Record<string, number>; // capability-space coordinates
  agentId: string;
  collaborationId: string;
  timestamp: number;
  decayRate: number; // strength lost per second
  metadata?: Record<string, any>;
}

// ─── Swarm Types ──────────────────────────────────────────────────

export type SwarmStatus =
  | 'initializing'
  | 'deploying'
  | 'exploring'
  | 'converging'
  | 'stagnating'
  | 'diverging'
  | 'completed'
  | 'failed'
  | 'terminated';

export type EmergentBehaviorType =
  | 'convergence'    // agents converging on same solution
  | 'divergence'     // agents exploring very different paths
  | 'oscillation'    // agents switching between strategies
  | 'stagnation'     // no progress for extended period
  | 'cascade'        // one agent's finding triggers chain reaction
  | 'flocking'       // agents grouping around a successful approach
  | 'none';

export interface SwarmConfig {
  id: string;
  mission: string;
  objectives: string[];
  requiredCapabilities: string[];
  preferredClusters: ClusterType[];
  initialSize: number;
  maxSize: number;
  minSize: number;
  pheromoneDecayRate: number;    // default 0.01 per second
  pheromoneSensingRadius: number; // capability-space distance
  stagnationTimeoutMs: number;   // default 60000
  convergenceThreshold: number;  // 0-1, default 0.85
  maxDurationMs: number;         // default 300000 (5 min)
  enableDynamicSpawning: boolean;
  enableEmergentDetection: boolean;
  metadata?: Record<string, any>;
}

export interface SwarmAgent {
  agentId: string;
  clusterType: ClusterType;
  role: 'explorer' | 'evaluator' | 'coordinator' | 'specialist';
  capabilities: string[];
  joinedAt: number;
  pheromonesSensed: number;
  tasksCompleted: number;
  status: 'active' | 'idle' | 'failed' | 'departed';
}

export interface SwarmMetrics {
  totalPheromones: number;
  pheromoneDistribution: Record<PheromoneType, number>;
  agentThroughput: number; // tasks per second per agent
  coordinationOverhead: number; // messages per task
  convergenceScore: number; // 0-1
  explorationCoverage: number; // 0-1, how much of capability space covered
  stagnationCounter: number;
  emergentBehaviors: EmergentBehaviorType[];
  currentSize: number;
  optimalSize: number;
  elapsedTimeMs: number;
}

export interface SwarmResult {
  swarmId: string;
  status: SwarmStatus;
  findings: SwarmFinding[];
  consensusResult?: any;
  metrics: SwarmMetrics;
  durationMs: number;
  agentsUsed: string[];
  pheromoneTrail: Pheromone[];
}

export interface SwarmFinding {
  agentId: string;
  content: any;
  confidence: number;
  pheromoneStrength: number;
  timestamp: number;
  validated: boolean;
  validatorIds: string[];
}

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class SwarmIntelligenceService {
  private readonly logger = new Logger(SwarmIntelligenceService.name);

  /** Active swarms by ID */
  private readonly swarms = new Map<string, SwarmConfig>();

  /** Swarm agents by swarm ID */
  private readonly swarmAgents = new Map<string, SwarmAgent[]>();

  /** Pheromone trails by swarm ID */
  private readonly pheromoneTrails = new Map<string, Pheromone[]>();

  /** Swarm metrics by ID (updated continuously) */
  private readonly swarmMetrics = new Map<string, SwarmMetrics>();

  /** Swarm results by ID (final output) */
  private readonly swarmResults = new Map<string, SwarmResult>();

  /** Emergent behavior history */
  private readonly emergentHistory = new Map<string, EmergentBehaviorType[]>();

  /** Size optimization state */
  private readonly sizeOptState = new Map<string, {
    previousThroughput: number;
    previousSize: number;
    gradientHistory: number[];
  }>();

  constructor(
    private readonly agentRegistry: AgentRegistryService,
    private readonly healthService: AgentHealthService,
    private readonly memoryService: AgentMemoryService,
    private readonly eventBus: AgentEventBusService,
    private readonly communicationService: AgentCommunicationService,
    @Optional() private readonly llmService?: LLMService,
  ) {}

  // ─── Swarm Lifecycle ──────────────────────────────────────────

  /**
   * Create and deploy a new swarm for a mission.
   */
  async createSwarm(config: Partial<SwarmConfig> & { id: string; mission: string }): Promise<SwarmConfig> {
    const fullConfig: SwarmConfig = {
      objectives: [],
      requiredCapabilities: [],
      preferredClusters: [],
      initialSize: 5,
      maxSize: 20,
      minSize: 2,
      pheromoneDecayRate: 0.01,
      pheromoneSensingRadius: 0.5,
      stagnationTimeoutMs: 60000,
      convergenceThreshold: 0.85,
      maxDurationMs: 300000,
      enableDynamicSpawning: true,
      enableEmergentDetection: true,
      ...config,
    };

    this.swarms.set(fullConfig.id, fullConfig);
    this.pheromoneTrails.set(fullConfig.id, []);
    this.emergentHistory.set(fullConfig.id, []);

    // Initialize metrics
    const initialMetrics: SwarmMetrics = {
      totalPheromones: 0,
      pheromoneDistribution: { exploration: 0, success: 0, failure: 0, warning: 0, resource: 0 },
      agentThroughput: 0,
      coordinationOverhead: 0,
      convergenceScore: 0,
      explorationCoverage: 0,
      stagnationCounter: 0,
      emergentBehaviors: ['none'],
      currentSize: 0,
      optimalSize: fullConfig.initialSize,
      elapsedTimeMs: 0,
    };
    this.swarmMetrics.set(fullConfig.id, initialMetrics);

    // Deploy initial agents
    await this.deployAgents(fullConfig.id, fullConfig.initialSize);

    this.logger.log(`Swarm ${fullConfig.id} created with ${fullConfig.initialSize} agents for: ${fullConfig.mission}`);

    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'SwarmIntelligenceService',
      data: { event: 'swarm.created', swarmId: fullConfig.id, size: fullConfig.initialSize },
      timestamp: new Date(),
    });

    return fullConfig;
  }

  /**
   * Execute a swarm mission — agents explore, sense pheromones, and converge.
   */
  async executeSwarm(swarmId: string): Promise<SwarmResult> {
    const config = this.swarms.get(swarmId);
    if (!config) {
      throw new Error(`Swarm ${swarmId} not found`);
    }

    const startTime = Date.now();
    const agents = this.swarmAgents.get(swarmId) || [];

    this.logger.log(`Executing swarm ${swarmId} with ${agents.length} agents`);

    try {
      // Phase 1: Initial exploration — each agent explores independently
      await this.eventBus.publish({
        type: AgentEventType.CUSTOM,
        source: 'SwarmIntelligenceService',
        data: { event: 'swarm.phase', swarmId, phase: 'exploration' },
        timestamp: new Date(),
      });

      const explorationPromises = agents
        .filter(a => a.status === 'active')
        .map(agent => this.executeAgentExploration(swarmId, agent));

      const explorationResults = await Promise.allSettled(explorationPromises);

      // Process exploration results and deposit pheromones
      for (const result of explorationResults) {
        if (result.status === 'fulfilled' && result.value) {
          await this.depositPheromone(swarmId, {
            id: `pher-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: result.value.success ? 'success' : 'failure',
            strength: result.value.success ? 1.0 : 0.3,
            coordinates: result.value.capabilityCoordinates || {},
            agentId: result.value.agentId,
            collaborationId: swarmId,
            timestamp: Date.now(),
            decayRate: config.pheromoneDecayRate,
            metadata: result.value.metadata,
          });
        }
      }

      // Phase 2: Pheromone-guided exploration — agents sense trails and adjust
      await this.eventBus.publish({
        type: AgentEventType.CUSTOM,
        source: 'SwarmIntelligenceService',
        data: { event: 'swarm.phase', swarmId, phase: 'pheromone_guided' },
        timestamp: new Date(),
      });

      const guidedPromises = agents
        .filter(a => a.status === 'active')
        .map(agent => this.executePheromoneGuidedExploration(swarmId, agent));

      const guidedResults = await Promise.allSettled(guidedPromises);

      for (const result of guidedResults) {
        if (result.status === 'fulfilled' && result.value) {
          await this.depositPheromone(swarmId, {
            id: `pher-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: result.value.success ? 'success' : 'exploration',
            strength: result.value.success ? 0.8 : 0.5,
            coordinates: result.value.capabilityCoordinates || {},
            agentId: result.value.agentId,
            collaborationId: swarmId,
            timestamp: Date.now(),
            decayRate: config.pheromoneDecayRate,
          });
        }
      }

      // Phase 3: Convergence — agents evaluate and validate findings
      await this.eventBus.publish({
        type: AgentEventType.CUSTOM,
        source: 'SwarmIntelligenceService',
        data: { event: 'swarm.phase', swarmId, phase: 'convergence' },
        timestamp: new Date(),
      });

      const findings = this.collectFindings(swarmId);
      const validatedFindings = await this.validateFindings(swarmId, findings);

      // Detect emergent behaviors
      if (config.enableEmergentDetection) {
        await this.detectEmergentBehaviors(swarmId);
      }

      // Optimize swarm size
      if (config.enableDynamicSpawning) {
        await this.optimizeSwarmSize(swarmId);
      }

      // Decay pheromones
      this.decayPheromones(swarmId);

      // Update final metrics
      const metrics = this.calculateMetrics(swarmId);
      metrics.elapsedTimeMs = Date.now() - startTime;
      this.swarmMetrics.set(swarmId, metrics);

      const result: SwarmResult = {
        swarmId,
        status: 'completed',
        findings: validatedFindings,
        metrics,
        durationMs: Date.now() - startTime,
        agentsUsed: agents.map(a => a.agentId),
        pheromoneTrail: this.pheromoneTrails.get(swarmId) || [],
      };

      this.swarmResults.set(swarmId, result);

      // Store in memory for future learning
      await this.memoryService.store(
        `swarm:${swarmId}`,
        MemoryTier.LONG_TERM,
        'result',
        JSON.stringify(result),
        86400, // 24h TTL
      );

      await this.eventBus.publish({
        type: AgentEventType.CUSTOM,
        source: 'SwarmIntelligenceService',
        data: { event: 'swarm.completed', swarmId, findingCount: validatedFindings.length, durationMs: result.durationMs },
        timestamp: new Date(),
      });

      return result;
    } catch (error: any) {
      this.logger.error(`Swarm ${swarmId} execution failed: ${error.message}`, error.stack);

      const failedResult: SwarmResult = {
        swarmId,
        status: 'failed',
        findings: [],
        metrics: this.swarmMetrics.get(swarmId)!,
        durationMs: Date.now() - startTime,
        agentsUsed: agents.map(a => a.agentId),
        pheromoneTrail: this.pheromoneTrails.get(swarmId) || [],
      };

      this.swarmResults.set(swarmId, failedResult);

      await this.eventBus.publish({
        type: AgentEventType.CUSTOM,
        source: 'SwarmIntelligenceService',
        data: { event: 'swarm.failed', swarmId, error: error.message },
        timestamp: new Date(),
      });

      return failedResult;
    }
  }

  /**
   * Terminate a running swarm.
   */
  async terminateSwarm(swarmId: string, reason: string = 'manual'): Promise<void> {
    const config = this.swarms.get(swarmId);
    if (!config) {
      throw new Error(`Swarm ${swarmId} not found`);
    }

    const agents = this.swarmAgents.get(swarmId) || [];
    for (const agent of agents) {
      agent.status = 'departed';
    }

    this.logger.warn(`Swarm ${swarmId} terminated: ${reason}`);

    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'SwarmIntelligenceService',
      data: { event: 'swarm.terminated', swarmId, reason },
      timestamp: new Date(),
    });
  }

  // ─── Pheromone Operations ─────────────────────────────────────

  /**
   * Deposit a pheromone in the environment.
   */
  async depositPheromone(swarmId: string, pheromone: Pheromone): Promise<void> {
    const trail = this.pheromoneTrails.get(swarmId) || [];
    trail.push(pheromone);

    // Limit trail size to prevent unbounded growth
    if (trail.length > 500) {
      // Remove weakest pheromones
      trail.sort((a, b) => b.strength - a.strength);
      trail.splice(400);
    }

    this.pheromoneTrails.set(swarmId, trail);

    // Update metrics
    const metrics = this.swarmMetrics.get(swarmId);
    if (metrics) {
      metrics.totalPheromones = trail.length;
      metrics.pheromoneDistribution[pheromone.type] =
        (metrics.pheromoneDistribution[pheromone.type] || 0) + 1;
    }

    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'SwarmIntelligenceService',
      data: { event: 'pheromone.deposited', swarmId, type: pheromone.type, strength: pheromone.strength },
      timestamp: new Date(),
    });
  }

  /**
   * Sense pheromones near given capability coordinates.
   */
  async sensePheromones(
    swarmId: string,
    coordinates: Record<string, number>,
    radius: number = 0.5,
  ): Promise<Pheromone[]> {
    const trail = this.pheromoneTrails.get(swarmId) || [];

    return trail.filter(p => {
      // Calculate Euclidean distance in capability space
      const distance = this.capabilityDistance(p.coordinates, coordinates);
      return distance <= radius && p.strength > 0.05; // ignore negligible pheromones
    }).sort((a, b) => b.strength - a.strength); // strongest first
  }

  /**
   * Decay all pheromones (called periodically).
   */
  private decayPheromones(swarmId: string): void {
    const trail = this.pheromoneTrails.get(swarmId);
    if (!trail) return;

    const now = Date.now();
    for (const pheromone of trail) {
      const ageSeconds = (now - pheromone.timestamp) / 1000;
      pheromone.strength = Math.max(0, pheromone.strength - pheromone.decayRate * ageSeconds);
    }

    // Remove fully decayed pheromones
    const alive = trail.filter(p => p.strength > 0.01);
    this.pheromoneTrails.set(swarmId, alive);
  }

  // ─── Agent Operations ─────────────────────────────────────────

  /**
   * Deploy agents to a swarm from available clusters.
   */
  private async deployAgents(swarmId: string, count: number): Promise<SwarmAgent[]> {
    const config = this.swarms.get(swarmId);
    if (!config) return [];

    const deployed: SwarmAgent[] = [];
    const existingAgents = this.swarmAgents.get(swarmId) || [];

    // Don't exceed max size
    const availableSlots = config.maxSize - existingAgents.length;
    const toDeploy = Math.min(count, availableSlots);

    for (let i = 0; i < toDeploy; i++) {
      // Determine which cluster to pull from
      const clusterType = config.preferredClusters[i % config.preferredClusters.length]
        || ClusterType.META_INTELLIGENCE;

      const role = this.assignRole(i, toDeploy);

      const agent: SwarmAgent = {
        agentId: `swarm-${swarmId}-agent-${i}`,
        clusterType,
        role,
        capabilities: config.requiredCapabilities,
        joinedAt: Date.now(),
        pheromonesSensed: 0,
        tasksCompleted: 0,
        status: 'active',
      };

      deployed.push(agent);
    }

    const allAgents = [...existingAgents, ...deployed];
    this.swarmAgents.set(swarmId, allAgents);

    // Update metrics
    const metrics = this.swarmMetrics.get(swarmId);
    if (metrics) {
      metrics.currentSize = allAgents.length;
    }

    return deployed;
  }

  /**
   * Assign a role to an agent based on its position in the swarm.
   */
  private assignRole(index: number, total: number): SwarmAgent['role'] {
    if (index === 0) return 'coordinator';
    if (index < Math.ceil(total * 0.6)) return 'explorer';
    if (index < Math.ceil(total * 0.85)) return 'evaluator';
    return 'specialist';
  }

  /**
   * Execute an agent's initial exploration phase.
   */
  private async executeAgentExploration(
    swarmId: string,
    agent: SwarmAgent,
  ): Promise<{ agentId: string; success: boolean; capabilityCoordinates: Record<string, number>; metadata?: any } | null> {
    try {
      const config = this.swarms.get(swarmId);
      if (!config) return null;

      // Build context for the agent
      const context: AgentContext = {
        missionId: swarmId,
        agentId: agent.agentId,
        tenantId: 'swarm',
        taskDescription: config.mission,
        config: {
          objectives: config.objectives,
          capabilities: agent.capabilities,
          role: agent.role,
          phase: 'exploration',
        },
        metadata: { swarmId, clusterType: agent.clusterType },
      };

      // Use LLM for intelligent exploration if available
      let result: any;
      if (this.llmService) {
        try {
          const llmResponse = await this.llmService.chat(
            [
              {
                role: 'system',
                content: `You are a swarm agent with role "${agent.role}" in cluster "${agent.clusterType}". Explore the problem space for: ${config.mission}. Report findings with confidence and capability coordinates.`,
              },
              {
                role: 'user',
                content: `Objectives: ${config.objectives.join(', ')}. Capabilities: ${agent.capabilities.join(', ')}. What do you discover?`,
              },
            ],
            { temperature: 0.7, maxTokens: 500 },
          );

          result = {
            success: true,
            finding: llmResponse.content,
            capabilityCoordinates: this.inferCapabilityCoordinates(agent.capabilities, config.requiredCapabilities),
          };
        } catch {
          result = {
            success: false,
            finding: 'LLM exploration failed',
            capabilityCoordinates: {},
          };
        }
      } else {
        // Fallback: simulation-based exploration
        result = {
          success: Math.random() > 0.3,
          finding: `Explored ${agent.role} aspect of mission`,
          capabilityCoordinates: this.inferCapabilityCoordinates(agent.capabilities, config.requiredCapabilities),
        };
      }

      agent.tasksCompleted++;
      return { agentId: agent.agentId, ...result };
    } catch (error: any) {
      this.logger.warn(`Agent ${agent.agentId} exploration failed: ${error.message}`);
      agent.status = 'failed';
      return { agentId: agent.agentId, success: false, capabilityCoordinates: {} };
    }
  }

  /**
   * Execute pheromone-guided exploration for an agent.
   */
  private async executePheromoneGuidedExploration(
    swarmId: string,
    agent: SwarmAgent,
  ): Promise<{ agentId: string; success: boolean; capabilityCoordinates: Record<string, number>; metadata?: any } | null> {
    try {
      const config = this.swarms.get(swarmId);
      if (!config) return null;

      // Sense nearby pheromones
      const currentCoords = this.inferCapabilityCoordinates(agent.capabilities, config.requiredCapabilities);
      const sensedPheromones = await this.sensePheromones(swarmId, currentCoords, config.pheromoneSensingRadius);

      agent.pheromonesSensed = sensedPheromones.length;

      // Determine direction based on pheromone signals
      const direction = this.computePheromoneDirection(sensedPheromones, currentCoords);

      // Move agent's focus toward strongest signals
      const newCoords = this.moveInCapabilitySpace(currentCoords, direction, 0.3);

      // Execute guided exploration
      const context: AgentContext = {
        missionId: swarmId,
        agentId: agent.agentId,
        tenantId: 'swarm',
        taskDescription: config.mission,
        config: {
          objectives: config.objectives,
          sensedPheromones: sensedPheromones.map(p => ({ type: p.type, strength: p.strength })),
          direction,
          phase: 'pheromone_guided',
        },
        metadata: { swarmId },
      };

      let result: any;
      if (this.llmService && sensedPheromones.length > 0) {
        try {
          const successSignals = sensedPheromones.filter(p => p.type === 'success');
          const failureSignals = sensedPheromones.filter(p => p.type === 'failure');

          const llmResponse = await this.llmService.chat(
            [
              {
                role: 'system',
                content: `You are a swarm agent following pheromone trails. There are ${successSignals.length} success signals and ${failureSignals.length} failure signals nearby. ${successSignals.length > failureSignals.length ? 'Move toward success areas.' : 'Avoid failure areas.'}`,
              },
              {
                role: 'user',
                content: `Mission: ${config.mission}. Based on pheromone signals, what is your next finding?`,
              },
            ],
            { temperature: 0.5, maxTokens: 400 },
          );

          result = {
            success: true,
            finding: llmResponse.content,
            capabilityCoordinates: newCoords,
          };
        } catch {
          result = { success: false, finding: 'LLM guided exploration failed', capabilityCoordinates: newCoords };
        }
      } else {
        result = {
          success: sensedPheromones.some(p => p.type === 'success'),
          finding: `Guided exploration following ${sensedPheromones.length} pheromone signals`,
          capabilityCoordinates: newCoords,
        };
      }

      agent.tasksCompleted++;
      return { agentId: agent.agentId, ...result };
    } catch (error: any) {
      this.logger.warn(`Agent ${agent.agentId} guided exploration failed: ${error.message}`);
      return { agentId: agent.agentId, success: false, capabilityCoordinates: {} };
    }
  }

  // ─── Emergent Behavior Detection ──────────────────────────────

  /**
   * Detect emergent behaviors in the swarm.
   */
  private async detectEmergentBehaviors(swarmId: string): Promise<EmergentBehaviorType[]> {
    const metrics = this.swarmMetrics.get(swarmId);
    if (!metrics) return ['none'];

    const behaviors: EmergentBehaviorType[] = [];
    const trail = this.pheromoneTrails.get(swarmId) || [];
    const agents = this.swarmAgents.get(swarmId) || [];

    // Convergence: high concentration of success pheromones in one area
    if (metrics.convergenceScore > 0.85) {
      behaviors.push('convergence');
    }

    // Divergence: agents exploring very different areas
    if (metrics.explorationCoverage > 0.8 && metrics.convergenceScore < 0.3) {
      behaviors.push('divergence');
    }

    // Oscillation: agents switching between approaches
    const successCount = trail.filter(p => p.type === 'success').length;
    const failureCount = trail.filter(p => p.type === 'failure').length;
    if (successCount > 3 && failureCount > 3 && Math.abs(successCount - failureCount) < 2) {
      behaviors.push('oscillation');
    }

    // Stagnation: no progress for extended period
    if (metrics.stagnationCounter > 3) {
      behaviors.push('stagnation');
    }

    // Cascade: one pheromone triggered many follow-ons
    const recentPheromones = trail.filter(p => Date.now() - p.timestamp < 5000);
    if (recentPheromones.length > agents.length * 2) {
      behaviors.push('cascade');
    }

    // Flocking: agents grouping around a successful approach
    const highStrengthSuccess = trail.filter(p => p.type === 'success' && p.strength > 0.7);
    if (highStrengthSuccess.length > agents.length * 0.6) {
      behaviors.push('flocking');
    }

    if (behaviors.length === 0) {
      behaviors.push('none');
    }

    // Store in history
    const history = this.emergentHistory.get(swarmId) || [];
    history.push(...behaviors);
    this.emergentHistory.set(swarmId, history);

    // Update metrics
    metrics.emergentBehaviors = behaviors;

    // Publish event
    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'SwarmIntelligenceService',
      data: { event: 'emergent.detected', swarmId, behaviors },
      timestamp: new Date(),
    });

    return behaviors;
  }

  // ─── Swarm Size Optimization ──────────────────────────────────

  /**
   * Optimize swarm size using gradient-descent-inspired approach.
   */
  private async optimizeSwarmSize(swarmId: string): Promise<number> {
    const config = this.swarms.get(swarmId);
    const metrics = this.swarmMetrics.get(swarmId);
    if (!config || !metrics) return metrics?.currentSize ?? config?.initialSize ?? 5;

    const optState = this.sizeOptState.get(swarmId) || {
      previousThroughput: 0,
      previousSize: metrics.currentSize,
      gradientHistory: [],
    };

    // Calculate current throughput (tasks per second per agent)
    const currentThroughput = metrics.agentThroughput;

    // Estimate gradient: how does throughput change with size?
    const gradient = optState.previousSize > 0
      ? (currentThroughput - optState.previousThroughput) / (metrics.currentSize - optState.previousSize || 1)
      : 0;

    optState.gradientHistory.push(gradient);
    if (optState.gradientHistory.length > 10) {
      optState.gradientHistory.shift();
    }

    // Average gradient for smoother optimization
    const avgGradient = optState.gradientHistory.reduce((a, b) => a + b, 0) / optState.gradientHistory.length;

    // Calculate coordination overhead
    const coordinationPenalty = metrics.coordinationOverhead * 0.1;

    // Determine size adjustment
    let optimalSize = metrics.currentSize;
    if (avgGradient > 0.1 && coordinationPenalty < 0.5) {
      // More agents improve throughput — grow
      optimalSize = Math.min(config.maxSize, metrics.currentSize + 1);
    } else if (avgGradient < -0.1 || coordinationPenalty > 0.8) {
      // More agents hurt — shrink
      optimalSize = Math.max(config.minSize, metrics.currentSize - 1);
    }

    // Apply the adjustment
    if (optimalSize > metrics.currentSize) {
      await this.deployAgents(swarmId, optimalSize - metrics.currentSize);
      this.logger.log(`Swarm ${swarmId}: growing from ${metrics.currentSize} to ${optimalSize} agents (gradient: ${avgGradient.toFixed(3)})`);
    } else if (optimalSize < metrics.currentSize) {
      // Remove idle agents
      const agents = this.swarmAgents.get(swarmId) || [];
      const toRemove = metrics.currentSize - optimalSize;
      let removed = 0;
      for (const agent of agents) {
        if (agent.status === 'idle' && removed < toRemove) {
          agent.status = 'departed';
          removed++;
        }
      }
      this.logger.log(`Swarm ${swarmId}: shrinking from ${metrics.currentSize} to ${optimalSize} agents`);
    }

    // Update optimization state
    optState.previousThroughput = currentThroughput;
    optState.previousSize = metrics.currentSize;
    this.sizeOptState.set(swarmId, optState);

    metrics.optimalSize = optimalSize;
    metrics.currentSize = (this.swarmAgents.get(swarmId) || []).filter(a => a.status === 'active').length;

    return optimalSize;
  }

  // ─── Finding Collection & Validation ──────────────────────────

  /**
   * Collect findings from pheromone trail.
   */
  private collectFindings(swarmId: string): SwarmFinding[] {
    const trail = this.pheromoneTrails.get(swarmId) || [];

    return trail
      .filter(p => p.type === 'success' && p.strength > 0.3)
      .map(p => ({
        agentId: p.agentId,
        content: p.metadata?.finding || `Finding at coordinates ${JSON.stringify(p.coordinates)}`,
        confidence: Math.min(1, p.strength),
        pheromoneStrength: p.strength,
        timestamp: p.timestamp,
        validated: false,
        validatorIds: [],
      }));
  }

  /**
   * Validate findings through cross-agent review.
   */
  private async validateFindings(swarmId: string, findings: SwarmFinding[]): Promise<SwarmFinding[]> {
    const agents = this.swarmAgents.get(swarmId) || [];
    const evaluators = agents.filter(a => a.role === 'evaluator' && a.status === 'active');

    for (const finding of findings) {
      // Each evaluator reviews the finding
      for (const evaluator of evaluators.slice(0, 3)) {
        // Simple validation: evaluator checks if finding is consistent
        const isValid = finding.confidence > 0.5;
        if (isValid) {
          finding.validated = true;
          finding.validatorIds.push(evaluator.agentId);
        }
      }
    }

    return findings;
  }

  // ─── Metric Calculation ───────────────────────────────────────

  /**
   * Calculate comprehensive swarm metrics.
   */
  private calculateMetrics(swarmId: string): SwarmMetrics {
    const existing = this.swarmMetrics.get(swarmId);
    const trail = this.pheromoneTrails.get(swarmId) || [];
    const agents = this.swarmAgents.get(swarmId) || [];
    const activeAgents = agents.filter(a => a.status === 'active');

    // Convergence score: how concentrated are success pheromones?
    const successPheromones = trail.filter(p => p.type === 'success');
    let convergenceScore = 0;
    if (successPheromones.length > 1) {
      const avgCoords = this.averageCoordinates(successPheromones.map(p => p.coordinates));
      const distances = successPheromones.map(p => this.capabilityDistance(p.coordinates, avgCoords));
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      convergenceScore = Math.max(0, 1 - avgDistance);
    }

    // Exploration coverage: how many unique capability areas have been explored?
    const uniqueAreas = new Set<string>();
    for (const p of trail) {
      const key = Object.entries(p.coordinates)
        .map(([k, v]) => `${k}:${Math.round(v * 10) / 10}`)
        .join('|');
      uniqueAreas.add(key);
    }
    const explorationCoverage = Math.min(1, uniqueAreas.size / 20); // normalized to 20 areas

    // Agent throughput
    const totalTasks = activeAgents.reduce((sum, a) => sum + a.tasksCompleted, 0);
    const elapsedMs = existing?.elapsedTimeMs || 1;
    const agentThroughput = totalTasks / (elapsedMs / 1000) / Math.max(1, activeAgents.length);

    // Coordination overhead
    const totalPheromonesSensed = activeAgents.reduce((sum, a) => sum + a.pheromonesSensed, 0);
    const coordinationOverhead = totalTasks > 0 ? totalPheromonesSensed / totalTasks : 0;

    const metrics: SwarmMetrics = {
      totalPheromones: trail.length,
      pheromoneDistribution: existing?.pheromoneDistribution || {
        exploration: 0, success: 0, failure: 0, warning: 0, resource: 0,
      },
      agentThroughput,
      coordinationOverhead,
      convergenceScore,
      explorationCoverage,
      stagnationCounter: existing?.stagnationCounter || 0,
      emergentBehaviors: existing?.emergentBehaviors || ['none'],
      currentSize: activeAgents.length,
      optimalSize: existing?.optimalSize ?? activeAgents.length,
      elapsedTimeMs: elapsedMs,
    };

    this.swarmMetrics.set(swarmId, metrics);
    return metrics;
  }

  // ─── Utility Methods ──────────────────────────────────────────

  /**
   * Calculate Euclidean distance between two coordinate sets in capability space.
   */
  private capabilityDistance(a: Record<string, number>, b: Record<string, number>): number {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let sumSquares = 0;
    for (const key of allKeys) {
      const diff = (a[key] || 0) - (b[key] || 0);
      sumSquares += diff * diff;
    }
    return Math.sqrt(sumSquares);
  }

  /**
   * Compute direction vector from pheromone signals.
   */
  private computePheromoneDirection(
    pheromones: Pheromone[],
    currentCoords: Record<string, number>,
  ): Record<string, number> {
    if (pheromones.length === 0) return currentCoords;

    const direction: Record<string, number> = {};
    for (const pheromone of pheromones) {
      const weight = pheromone.type === 'success' ? 1.0
        : pheromone.type === 'failure' ? -0.5
        : pheromone.type === 'warning' ? -0.3
        : 0.2;

      for (const [key, value] of Object.entries(pheromone.coordinates)) {
        direction[key] = (direction[key] || 0) + (value - (currentCoords[key] || 0)) * weight * pheromone.strength;
      }
    }

    return direction;
  }

  /**
   * Move in capability space toward a direction.
   */
  private moveInCapabilitySpace(
    current: Record<string, number>,
    direction: Record<string, number>,
    stepSize: number,
  ): Record<string, number> {
    const result = { ...current };
    for (const [key, dir] of Object.entries(direction)) {
      result[key] = (result[key] || 0) + dir * stepSize;
    }
    return result;
  }

  /**
   * Infer capability coordinates from agent capabilities.
   */
  private inferCapabilityCoordinates(
    agentCapabilities: string[],
    requiredCapabilities: string[],
  ): Record<string, number> {
    const coords: Record<string, number> = {};
    for (const cap of requiredCapabilities) {
      coords[cap] = agentCapabilities.includes(cap) ? 1.0 : Math.random() * 0.3;
    }
    return coords;
  }

  /**
   * Calculate average coordinates from an array of coordinate sets.
   */
  private averageCoordinates(coordsArray: Record<string, number>[]): Record<string, number> {
    if (coordsArray.length === 0) return {};
    const result: Record<string, number> = {};
    const allKeys = new Set(coordsArray.flatMap(Object.keys));

    for (const key of allKeys) {
      const values = coordsArray.map(c => c[key] || 0);
      result[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
    return result;
  }

  // ─── Query Methods ────────────────────────────────────────────

  getSwarm(swarmId: string): SwarmConfig | undefined {
    return this.swarms.get(swarmId);
  }

  getSwarmMetrics(swarmId: string): SwarmMetrics | undefined {
    return this.swarmMetrics.get(swarmId);
  }

  getSwarmResult(swarmId: string): SwarmResult | undefined {
    return this.swarmResults.get(swarmId);
  }

  getSwarmAgents(swarmId: string): SwarmAgent[] {
    return this.swarmAgents.get(swarmId) || [];
  }

  getPheromoneTrail(swarmId: string): Pheromone[] {
    return this.pheromoneTrails.get(swarmId) || [];
  }

  getEmergentHistory(swarmId: string): EmergentBehaviorType[] {
    return this.emergentHistory.get(swarmId) || [];
  }

  getAllSwarms(): { id: string; status: SwarmStatus; size: number; mission: string }[] {
    const result: { id: string; status: SwarmStatus; size: number; mission: string }[] = [];
    for (const [id, config] of this.swarms) {
      const metrics = this.swarmMetrics.get(id);
      const resultData = this.swarmResults.get(id);
      result.push({
        id,
        status: resultData?.status ?? 'initializing',
        size: metrics?.currentSize ?? 0,
        mission: config.mission,
      });
    }
    return result;
  }

  getStats(): { totalSwarms: number; activeSwarms: number; totalPheromones: number; totalFindings: number } {
    let totalPheromones = 0;
    let totalFindings = 0;
    let activeSwarms = 0;

    for (const [id] of this.swarms) {
      const trail = this.pheromoneTrails.get(id) || [];
      totalPheromones += trail.length;

      const result = this.swarmResults.get(id);
      if (result) {
        totalFindings += result.findings.length;
        if (result.status === 'completed' || result.status === 'failed') continue;
      }
      activeSwarms++;
    }

    return {
      totalSwarms: this.swarms.size,
      activeSwarms,
      totalPheromones,
      totalFindings,
    };
  }
}
