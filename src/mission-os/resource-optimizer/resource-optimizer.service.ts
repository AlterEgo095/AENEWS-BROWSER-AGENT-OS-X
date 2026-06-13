import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Local type definitions (to be migrated to ../interfaces/mission-os.interfaces.ts)
// ---------------------------------------------------------------------------

export enum ResourceType {
  LLM = 'llm',
  BROWSER = 'browser',
  GPU = 'gpu',
  WORKER = 'worker',
  DATABASE = 'database',
  CACHE = 'cache',
  QUEUE = 'queue',
  STORAGE = 'storage',
}

export interface ResourceCandidate {
  id: string;
  resourceType: ResourceType;
  provider: string;
  config: Record<string, any>;
  costPerUnit: number; // Cost per execution/hour
  latencyMs: number; // Average latency
  availability: number; // 0-1, current availability
  quality: number; // 0-1, quality score
  maxConcurrency: number;
  currentLoad: number; // 0-1
  region: string;
  capabilities: string[]; // e.g., for LLM: 'code', 'chat', 'vision'
  metadata: Record<string, any>;
}

export interface ResourceAllocation {
  id: string;
  taskId: string;
  agentId: string;
  resourceType: ResourceType;
  provider: string;
  resourceId: string;
  config: Record<string, any>;
  costEstimate: number;
  allocatedAt: Date;
  releasedAt: Date | null;
  status: 'allocated' | 'released' | 'failed';
}

export interface OptimizationCriteria {
  prioritize: 'cost' | 'latency' | 'quality' | 'balanced';
  maxCost?: number;
  maxLatencyMs?: number;
  minQuality?: number;
  minAvailability?: number;
  preferredProvider?: string;
  preferredRegion?: string;
  requiredCapabilities?: string[];
  excludeResources?: string[];
}

export interface OptimizationResult {
  selected: ResourceCandidate;
  score: number;
  alternatives: Array<{ candidate: ResourceCandidate; score: number; reason: string }>;
  estimatedCost: number;
  estimatedLatencyMs: number;
  reasoning: string;
}

export interface ResourcePool {
  resourceType: ResourceType;
  candidates: ResourceCandidate[];
  totalCapacity: number;
  currentUtilization: number;
}

// ---------------------------------------------------------------------------
// Internal helper interfaces
// ---------------------------------------------------------------------------

interface WeightProfile {
  cost: number;
  latency: number;
  quality: number;
  availability: number;
}

interface CostReportEntry {
  allocationId: string;
  taskId: string;
  agentId: string;
  resourceType: ResourceType;
  provider: string;
  resourceId: string;
  costEstimate: number;
  allocatedAt: Date;
  releasedAt: Date | null;
  status: ResourceAllocation['status'];
}

interface CostReport {
  totalCost: number;
  entries: CostReportEntry[];
  costByResourceType: Record<string, number>;
  costByProvider: Record<string, number>;
}

interface ResourceStats {
  totalPools: number;
  totalCandidates: number;
  totalAllocations: number;
  activeAllocations: number;
  totalCapacity: number;
  overallUtilization: number;
  poolsByType: Record<string, { candidates: number; utilization: number; capacity: number }>;
  allocationsByType: Record<string, number>;
}

interface ScalingSuggestion {
  resourceType: ResourceType;
  currentUtilization: number;
  targetUtilization: number;
  action: 'add' | 'redistribute' | 'scale_down';
  estimatedResourcesNeeded: number;
  reason: string;
}

interface DemandForecast {
  resourceType: ResourceType;
  currentUtilization: number;
  predictedPeakUtilization: number;
  predictedAvgUtilization: number;
  confidence: number;
  demandByHour: Array<{ hour: number; predictedUtilization: number }>;
}

// ---------------------------------------------------------------------------
// Weight profiles for different optimization priorities
// ---------------------------------------------------------------------------

const WEIGHT_PROFILES: Record<OptimizationCriteria['prioritize'], WeightProfile> = {
  cost: { cost: 0.5, latency: 0.2, quality: 0.2, availability: 0.1 },
  latency: { cost: 0.2, latency: 0.5, quality: 0.2, availability: 0.1 },
  quality: { cost: 0.2, latency: 0.2, quality: 0.5, availability: 0.1 },
  balanced: { cost: 0.25, latency: 0.25, quality: 0.25, availability: 0.25 },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ResourceOptimizerService implements OnModuleInit {
  private readonly logger = new Logger(ResourceOptimizerService.name);

  /** resourceType string → ResourcePool */
  private readonly pools: Map<string, ResourcePool> = new Map();

  /** allocation ID → ResourceAllocation */
  private readonly allocations: Map<string, ResourceAllocation> = new Map();

  /** resource ID → resource candidate reference (for quick lookup) */
  private readonly resourceIndex: Map<string, ResourceCandidate> = new Map();

  /** Auto-incrementing allocation ID counter */
  private allocationCounter = 0;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  onModuleInit(): void {
    this.logger.log('ResourceOptimizerService initialised');

    // Seed an empty pool for every known resource type
    for (const rt of Object.values(ResourceType)) {
      this.pools.set(rt, {
        resourceType: rt as ResourceType,
        candidates: [],
        totalCapacity: 0,
        currentUtilization: 0,
      });
    }
  }

  // -----------------------------------------------------------------------
  // 1. registerResource
  // -----------------------------------------------------------------------

  /**
   * Register a resource candidate (LLM provider, browser instance, GPU, etc.).
   * Adds it to the appropriate pool and updates pool-level metrics.
   */
  registerResource(candidate: ResourceCandidate): void {
    const { id, resourceType } = candidate;

    if (this.resourceIndex.has(id)) {
      this.logger.warn(`Resource "${id}" is already registered — replacing with new candidate`);
      this.unregisterResource(id);
    }

    // Ensure the pool exists
    if (!this.pools.has(resourceType)) {
      this.pools.set(resourceType, {
        resourceType,
        candidates: [],
        totalCapacity: 0,
        currentUtilization: 0,
      });
    }

    const pool = this.pools.get(resourceType)!;
    pool.candidates.push(candidate);
    this.resourceIndex.set(id, candidate);

    this.recalculatePoolMetrics(pool);

    this.logger.log(
      `Registered resource "${id}" (type=${resourceType}, provider=${candidate.provider}, region=${candidate.region})`,
    );
  }

  // -----------------------------------------------------------------------
  // 2. unregisterResource
  // -----------------------------------------------------------------------

  /**
   * Remove a resource from the pool. Also removes it from the fast-lookup
   * index. Will NOT remove it if there are active allocations using it.
   */
  unregisterResource(resourceId: string): boolean {
    const candidate = this.resourceIndex.get(resourceId);
    if (!candidate) {
      this.logger.warn(`Cannot unregister unknown resource "${resourceId}"`);
      return false;
    }

    // Safety check: refuse to unregister if there are active allocations
    for (const allocation of this.allocations.values()) {
      if (allocation.resourceId === resourceId && allocation.status === 'allocated') {
        this.logger.warn(
          `Cannot unregister resource "${resourceId}" — it has active allocation "${allocation.id}"`,
        );
        return false;
      }
    }

    const pool = this.pools.get(candidate.resourceType);
    if (pool) {
      const idx = pool.candidates.findIndex((c) => c.id === resourceId);
      if (idx >= 0) {
        pool.candidates.splice(idx, 1);
      }
      this.recalculatePoolMetrics(pool);
    }

    this.resourceIndex.delete(resourceId);

    this.logger.log(`Unregistered resource "${resourceId}"`);
    return true;
  }

  // -----------------------------------------------------------------------
  // 3. updateResourceMetrics
  // -----------------------------------------------------------------------

  /**
   * Update live metrics (availability, load, latency, etc.) for a registered
   * resource candidate. Merges the partial metrics update into the existing
   * candidate and recalculates pool-level metrics.
   */
  updateResourceMetrics(
    resourceId: string,
    metrics: Partial<
      Pick<
        ResourceCandidate,
        'availability' | 'currentLoad' | 'latencyMs' | 'quality' | 'costPerUnit' | 'maxConcurrency'
      >
    >,
  ): boolean {
    const candidate = this.resourceIndex.get(resourceId);
    if (!candidate) {
      this.logger.warn(`Cannot update metrics for unknown resource "${resourceId}"`);
      return false;
    }

    // Merge metrics
    if (metrics.availability !== undefined) {
      candidate.availability = Math.max(0, Math.min(1, metrics.availability));
    }
    if (metrics.currentLoad !== undefined) {
      candidate.currentLoad = Math.max(0, Math.min(1, metrics.currentLoad));
    }
    if (metrics.latencyMs !== undefined) {
      candidate.latencyMs = metrics.latencyMs;
    }
    if (metrics.quality !== undefined) {
      candidate.quality = Math.max(0, Math.min(1, metrics.quality));
    }
    if (metrics.costPerUnit !== undefined) {
      candidate.costPerUnit = metrics.costPerUnit;
    }
    if (metrics.maxConcurrency !== undefined) {
      candidate.maxConcurrency = metrics.maxConcurrency;
    }

    const pool = this.pools.get(candidate.resourceType);
    if (pool) {
      this.recalculatePoolMetrics(pool);
    }

    this.logger.debug(`Updated metrics for resource "${resourceId}": ${JSON.stringify(metrics)}`);
    return true;
  }

  // -----------------------------------------------------------------------
  // 4. optimize — THE CORE METHOD
  // -----------------------------------------------------------------------

  /**
   * Select the best resource for a given type and criteria.
   *
   * Scoring weights by priority mode:
   *   cost     → cost: 50%, quality: 20%, latency: 20%, availability: 10%
   *   latency  → latency: 50%, cost: 20%, quality: 20%, availability: 10%
   *   quality  → quality: 50%, cost: 20%, latency: 20%, availability: 10%
   *   balanced → all 25%
   *
   * Hard filters: maxCost, maxLatencyMs, minQuality, minAvailability,
   *               requiredCapabilities, excludeResources.
   *
   * Returns OptimizationResult with the top candidate, score, alternatives,
   * and a human-readable reasoning string.
   */
  optimize(
    resourceType: ResourceType,
    criteria: OptimizationCriteria = { prioritize: 'balanced' },
  ): OptimizationResult | null {
    const pool = this.pools.get(resourceType);
    if (!pool || pool.candidates.length === 0) {
      this.logger.warn(`No resource candidates available for type "${resourceType}"`);
      return null;
    }

    const weights = WEIGHT_PROFILES[criteria.prioritize];
    const excludeSet = new Set(criteria.excludeResources ?? []);

    // -------------------------------------------------------------------
    // Phase 1: Hard filtering
    // -------------------------------------------------------------------
    const eligible = pool.candidates.filter((c) => {
      // Exclude explicitly blacklisted resources
      if (excludeSet.has(c.id)) return false;

      // Hard cost cap
      if (criteria.maxCost !== undefined && c.costPerUnit > criteria.maxCost) return false;

      // Hard latency cap
      if (criteria.maxLatencyMs !== undefined && c.latencyMs > criteria.maxLatencyMs) return false;

      // Hard quality floor
      if (criteria.minQuality !== undefined && c.quality < criteria.minQuality) return false;

      // Hard availability floor
      if (criteria.minAvailability !== undefined && c.availability < criteria.minAvailability)
        return false;

      // Required capabilities — candidate must possess ALL of them
      if (criteria.requiredCapabilities && criteria.requiredCapabilities.length > 0) {
        const capSet = new Set(c.capabilities);
        for (const req of criteria.requiredCapabilities) {
          if (!capSet.has(req)) return false;
        }
      }

      return true;
    });

    if (eligible.length === 0) {
      this.logger.warn(
        `No eligible candidates for type "${resourceType}" after applying hard filters`,
      );
      return null;
    }

    // -------------------------------------------------------------------
    // Phase 2: Score each eligible candidate
    // -------------------------------------------------------------------

    // Determine normalisation bounds from the eligible set
    const maxCost = Math.max(...eligible.map((c) => c.costPerUnit), 1);
    const maxLatency = Math.max(...eligible.map((c) => c.latencyMs), 1);

    const scored = eligible.map((candidate) => {
      // Normalise each dimension to 0-1 (higher is better)
      // Cost and latency are inverted — lower is better → (1 - normalised)
      const costNorm = 1 - candidate.costPerUnit / maxCost;
      const latencyNorm = 1 - candidate.latencyMs / maxLatency;
      const qualityNorm = candidate.quality;
      const availabilityNorm = candidate.availability;

      // Load penalty: penalise heavily loaded resources (reduces availability effective score)
      const loadPenalty = candidate.currentLoad;

      // Weighted score
      let score =
        weights.cost * costNorm +
        weights.latency * latencyNorm +
        weights.quality * qualityNorm +
        weights.availability * availabilityNorm;

      // Apply load penalty — scale down the score by (1 - load * 0.5)
      // A resource at 100% load still retains 50% of its score so it's
      // not completely eliminated (it might still be the best option).
      score *= 1 - loadPenalty * 0.5;

      // Preferred provider bonus
      if (criteria.preferredProvider && candidate.provider === criteria.preferredProvider) {
        score += 0.1;
      }

      // Preferred region bonus
      if (criteria.preferredRegion && candidate.region === criteria.preferredRegion) {
        score += 0.1;
      }

      return { candidate, score };
    });

    // Sort by descending score
    scored.sort((a, b) => b.score - a.score);

    const top = scored[0];
    const alternatives = scored.slice(1, 6).map((s) => ({
      candidate: s.candidate,
      score: s.score,
      reason: this.buildAlternativeReason(s.candidate, s.score, top.score, criteria.prioritize),
    }));

    // Build reasoning string
    const reasoning = this.buildReasoning(top.candidate, top.score, criteria, eligible.length);

    this.logger.log(
      `Optimize(${resourceType}, ${criteria.prioritize}): selected "${top.candidate.id}" ` +
        `(score=${top.score.toFixed(4)}, provider=${top.candidate.provider}, ` +
        `cost=${top.candidate.costPerUnit}, latency=${top.candidate.latencyMs}ms, ` +
        `quality=${top.candidate.quality}, availability=${top.candidate.availability})`,
    );

    return {
      selected: top.candidate,
      score: top.score,
      alternatives,
      estimatedCost: top.candidate.costPerUnit,
      estimatedLatencyMs: top.candidate.latencyMs,
      reasoning,
    };
  }

  // -----------------------------------------------------------------------
  // 5. allocate
  // -----------------------------------------------------------------------

  /**
   * Allocate a resource for a task. Calls optimize() to select the best
   * candidate, creates a ResourceAllocation record, and updates the
   * candidate's load.
   */
  allocate(
    taskId: string,
    agentId: string,
    resourceType: ResourceType,
    criteria?: OptimizationCriteria,
  ): ResourceAllocation | null {
    const defaultCriteria: OptimizationCriteria = criteria ?? { prioritize: 'balanced' };

    const result = this.optimize(resourceType, defaultCriteria);
    if (!result) {
      this.logger.warn(
        `Cannot allocate ${resourceType} for task "${taskId}" — no suitable resource found`,
      );

      // Record a failed allocation
      const failedAllocation: ResourceAllocation = {
        id: this.nextAllocationId(),
        taskId,
        agentId,
        resourceType,
        provider: 'none',
        resourceId: 'none',
        config: {},
        costEstimate: 0,
        allocatedAt: new Date(),
        releasedAt: new Date(),
        status: 'failed',
      };
      this.allocations.set(failedAllocation.id, failedAllocation);

      return failedAllocation;
    }

    const candidate = result.selected;
    const allocationId = this.nextAllocationId();

    const allocation: ResourceAllocation = {
      id: allocationId,
      taskId,
      agentId,
      resourceType,
      provider: candidate.provider,
      resourceId: candidate.id,
      config: { ...candidate.config },
      costEstimate: candidate.costPerUnit,
      allocatedAt: new Date(),
      releasedAt: null,
      status: 'allocated',
    };

    this.allocations.set(allocationId, allocation);

    // Increase the candidate's load
    candidate.currentLoad = Math.min(1, candidate.currentLoad + 1 / candidate.maxConcurrency);
    const pool = this.pools.get(resourceType);
    if (pool) {
      this.recalculatePoolMetrics(pool);
    }

    this.logger.log(
      `Allocated resource "${candidate.id}" (type=${resourceType}) for task "${taskId}" ` +
        `by agent "${agentId}" — allocation=${allocationId}`,
    );

    return allocation;
  }

  // -----------------------------------------------------------------------
  // 6. release
  // -----------------------------------------------------------------------

  /**
   * Release an allocated resource. Updates the candidate's load and marks
   * the allocation as released.
   */
  release(allocationId: string): boolean {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) {
      this.logger.warn(`Cannot release unknown allocation "${allocationId}"`);
      return false;
    }

    if (allocation.status !== 'allocated') {
      this.logger.warn(
        `Allocation "${allocationId}" is already ${allocation.status} — cannot release`,
      );
      return false;
    }

    // Mark as released
    allocation.status = 'released';
    allocation.releasedAt = new Date();

    // Decrease the candidate's load
    const candidate = this.resourceIndex.get(allocation.resourceId);
    if (candidate) {
      candidate.currentLoad = Math.max(0, candidate.currentLoad - 1 / candidate.maxConcurrency);
      const pool = this.pools.get(allocation.resourceType);
      if (pool) {
        this.recalculatePoolMetrics(pool);
      }
    }

    this.logger.log(
      `Released allocation "${allocationId}" (resource="${allocation.resourceId}", task="${allocation.taskId}")`,
    );

    return true;
  }

  // -----------------------------------------------------------------------
  // 7. getResourcePool
  // -----------------------------------------------------------------------

  /**
   * Get all candidates for a resource type. Returns a deep copy of the pool
   * to prevent external mutation.
   */
  getResourcePool(resourceType: ResourceType): ResourcePool | null {
    const pool = this.pools.get(resourceType);
    if (!pool) return null;

    return {
      ...pool,
      candidates: pool.candidates.map((c) => ({ ...c })),
    };
  }

  // -----------------------------------------------------------------------
  // 8. getResourceUtilization
  // -----------------------------------------------------------------------

  /**
   * Get current utilization stats. If resourceType is provided, returns the
   * utilization for that type. Otherwise, returns overall utilization.
   */
  getResourceUtilization(resourceType?: ResourceType): {
    utilization: number;
    activeAllocations: number;
    totalCapacity: number;
    candidates: number;
  } {
    if (resourceType) {
      const pool = this.pools.get(resourceType);
      if (!pool) {
        return { utilization: 0, activeAllocations: 0, totalCapacity: 0, candidates: 0 };
      }

      const activeAllocations = [...this.allocations.values()].filter(
        (a) => a.resourceType === resourceType && a.status === 'allocated',
      ).length;

      return {
        utilization: pool.currentUtilization,
        activeAllocations,
        totalCapacity: pool.totalCapacity,
        candidates: pool.candidates.length,
      };
    }

    // Overall utilization
    let totalCapacity = 0;
    let totalLoad = 0;
    let totalCandidates = 0;

    for (const pool of this.pools.values()) {
      totalCapacity += pool.totalCapacity;
      totalLoad += pool.candidates.reduce((sum, c) => sum + c.currentLoad * c.maxConcurrency, 0);
      totalCandidates += pool.candidates.length;
    }

    const activeAllocations = [...this.allocations.values()].filter(
      (a) => a.status === 'allocated',
    ).length;

    return {
      utilization: totalCapacity > 0 ? totalLoad / totalCapacity : 0,
      activeAllocations,
      totalCapacity,
      candidates: totalCandidates,
    };
  }

  // -----------------------------------------------------------------------
  // 9. forecastDemand
  // -----------------------------------------------------------------------

  /**
   * Predict resource demand based on upcoming tasks. Each upcoming task
   * should specify its resourceType and estimated cost/latency requirements.
   * Returns a demand forecast with predicted utilization by hour.
   */
  forecastDemand(
    resourceType: ResourceType,
    upcomingTasks: Array<{
      taskId: string;
      estimatedCost?: number;
      estimatedLatencyMs?: number;
      estimatedDurationHours?: number;
      scheduledAt?: Date;
    }>,
  ): DemandForecast {
    const pool = this.pools.get(resourceType);
    const currentUtilization = pool?.currentUtilization ?? 0;
    const totalCapacity = pool?.totalCapacity ?? 0;

    // Group tasks by hour from now
    const now = Date.now();
    const hourBuckets = new Map<number, number>(); // hourOffset → demand units

    for (const task of upcomingTasks) {
      const scheduledTime = task.scheduledAt ? task.scheduledAt.getTime() : now;
      const hourOffset = Math.max(0, Math.floor((scheduledTime - now) / (1000 * 60 * 60)));
      const duration = task.estimatedDurationHours ?? 1;
      const demandUnits = totalCapacity > 0 ? duration / totalCapacity : duration * 0.1;

      // Spread demand across the duration hours
      for (let h = hourOffset; h < hourOffset + Math.ceil(duration); h++) {
        hourBuckets.set(h, (hourBuckets.get(h) ?? 0) + demandUnits);
      }
    }

    // Build hourly predictions
    const maxHour = Math.max(24, ...hourBuckets.keys());
    const demandByHour: Array<{ hour: number; predictedUtilization: number }> = [];

    for (let h = 0; h <= maxHour; h++) {
      const baseUtil = currentUtilization;
      const additionalDemand = hourBuckets.get(h) ?? 0;
      const predictedUtil = Math.min(1, baseUtil + additionalDemand);
      demandByHour.push({ hour: h, predictedUtilization: predictedUtil });
    }

    // Compute peak & average
    const peakUtil = Math.max(...demandByHour.map((d) => d.predictedUtilization));
    const avgUtil =
      demandByHour.length > 0
        ? demandByHour.reduce((s, d) => s + d.predictedUtilization, 0) / demandByHour.length
        : currentUtilization;

    // Confidence decreases with more tasks and further-out predictions
    const confidence = Math.max(0.3, 1 - upcomingTasks.length * 0.02);

    return {
      resourceType,
      currentUtilization,
      predictedPeakUtilization: peakUtil,
      predictedAvgUtilization: avgUtil,
      confidence,
      demandByHour,
    };
  }

  // -----------------------------------------------------------------------
  // 10. scaleIfNeeded
  // -----------------------------------------------------------------------

  /**
   * If utilization exceeds the target threshold, suggest scaling actions
   * (add more resources, distribute load, or scale down).
   */
  scaleIfNeeded(resourceType: ResourceType, targetUtilization: number = 0.7): ScalingSuggestion {
    const pool = this.pools.get(resourceType);
    const currentUtilization = pool?.currentUtilization ?? 0;
    const totalCapacity = pool?.totalCapacity ?? 0;

    if (currentUtilization > targetUtilization + 0.15) {
      // Need to add resources
      const overloadRatio = currentUtilization / targetUtilization;
      const estimatedResourcesNeeded = Math.ceil(
        (overloadRatio - 1) * (pool?.candidates.length ?? 1),
      );

      return {
        resourceType,
        currentUtilization,
        targetUtilization,
        action: 'add',
        estimatedResourcesNeeded,
        reason:
          `Utilization at ${(currentUtilization * 100).toFixed(1)}% exceeds target ` +
          `${(targetUtilization * 100).toFixed(1)}% by a significant margin. ` +
          `Recommend adding ${estimatedResourcesNeeded} additional ${resourceType} resource(s) ` +
          `to bring utilization back to target.`,
      };
    }

    if (currentUtilization < targetUtilization - 0.2 && (pool?.candidates.length ?? 0) > 1) {
      // Under-utilised — consider scaling down or redistributing
      const excessCapacity = (targetUtilization - currentUtilization) * totalCapacity;
      const estimatedResourcesNeeded = Math.max(
        1,
        Math.floor(excessCapacity / (totalCapacity / (pool?.candidates.length ?? 1))),
      );

      return {
        resourceType,
        currentUtilization,
        targetUtilization,
        action: 'scale_down',
        estimatedResourcesNeeded,
        reason:
          `Utilization at ${(currentUtilization * 100).toFixed(1)}% is well below target ` +
          `${(targetUtilization * 100).toFixed(1)}%. Consider scaling down by ` +
          `${estimatedResourcesNeeded} ${resourceType} resource(s) to optimise cost.`,
      };
    }

    // Check for load imbalance — some resources heavily loaded, others not
    if (pool && pool.candidates.length > 1) {
      const loads = pool.candidates.map((c) => c.currentLoad);
      const maxLoad = Math.max(...loads);
      const minLoad = Math.min(...loads);
      const loadSpread = maxLoad - minLoad;

      if (loadSpread > 0.4) {
        return {
          resourceType,
          currentUtilization,
          targetUtilization,
          action: 'redistribute',
          estimatedResourcesNeeded: 0,
          reason:
            `Load imbalance detected: max load ${(maxLoad * 100).toFixed(1)}% vs ` +
            `min load ${(minLoad * 100).toFixed(1)}% (spread ${(loadSpread * 100).toFixed(1)}%). ` +
            `Consider redistributing tasks across ${resourceType} resources.`,
        };
      }
    }

    return {
      resourceType,
      currentUtilization,
      targetUtilization,
      action: 'add',
      estimatedResourcesNeeded: 0,
      reason:
        `Utilization at ${(currentUtilization * 100).toFixed(1)}% is within acceptable ` +
        `range of target ${(targetUtilization * 100).toFixed(1)}%. No scaling action needed.`,
    };
  }

  // -----------------------------------------------------------------------
  // 11. getCostReport
  // -----------------------------------------------------------------------

  /**
   * Generate cost report from allocation history. Optionally filter by
   * date range.
   */
  getCostReport(from?: Date, to?: Date): CostReport {
    const entries: CostReportEntry[] = [];

    for (const allocation of this.allocations.values()) {
      // Date filtering
      if (from && allocation.allocatedAt < from) continue;
      if (to && allocation.allocatedAt > to) continue;

      entries.push({
        allocationId: allocation.id,
        taskId: allocation.taskId,
        agentId: allocation.agentId,
        resourceType: allocation.resourceType,
        provider: allocation.provider,
        resourceId: allocation.resourceId,
        costEstimate: allocation.costEstimate,
        allocatedAt: allocation.allocatedAt,
        releasedAt: allocation.releasedAt,
        status: allocation.status,
      });
    }

    const totalCost = entries.reduce((sum, e) => sum + e.costEstimate, 0);

    const costByResourceType: Record<string, number> = {};
    const costByProvider: Record<string, number> = {};

    for (const entry of entries) {
      costByResourceType[entry.resourceType] =
        (costByResourceType[entry.resourceType] ?? 0) + entry.costEstimate;
      costByProvider[entry.provider] = (costByProvider[entry.provider] ?? 0) + entry.costEstimate;
    }

    return {
      totalCost,
      entries,
      costByResourceType,
      costByProvider,
    };
  }

  // -----------------------------------------------------------------------
  // 12. getResourceStats
  // -----------------------------------------------------------------------

  /**
   * Overall statistics about the resource optimizer's state.
   */
  getResourceStats(): ResourceStats {
    let totalCapacity = 0;
    let overallUtilization = 0;
    const poolsByType: ResourceStats['poolsByType'] = {};
    const allocationsByType: Record<string, number> = {};

    for (const [type, pool] of this.pools.entries()) {
      totalCapacity += pool.totalCapacity;
      poolsByType[type] = {
        candidates: pool.candidates.length,
        utilization: pool.currentUtilization,
        capacity: pool.totalCapacity,
      };
    }

    const allocationArray = [...this.allocations.values()];
    const activeAllocations = allocationArray.filter((a) => a.status === 'allocated').length;

    for (const allocation of allocationArray) {
      allocationsByType[allocation.resourceType] =
        (allocationsByType[allocation.resourceType] ?? 0) + 1;
    }

    // Weighted average utilization across pools
    if (totalCapacity > 0) {
      let weightedSum = 0;
      for (const pool of this.pools.values()) {
        weightedSum += pool.currentUtilization * pool.totalCapacity;
      }
      overallUtilization = weightedSum / totalCapacity;
    }

    return {
      totalPools: this.pools.size,
      totalCandidates: this.resourceIndex.size,
      totalAllocations: this.allocations.size,
      activeAllocations,
      totalCapacity,
      overallUtilization,
      poolsByType,
      allocationsByType,
    };
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Recalculate pool-level metrics from its candidates.
   */
  private recalculatePoolMetrics(pool: ResourcePool): void {
    const { candidates } = pool;

    pool.totalCapacity = candidates.reduce((sum, c) => sum + c.maxConcurrency, 0);

    const currentLoad = candidates.reduce((sum, c) => sum + c.currentLoad * c.maxConcurrency, 0);

    pool.currentUtilization = pool.totalCapacity > 0 ? currentLoad / pool.totalCapacity : 0;
  }

  /**
   * Generate the next allocation ID.
   */
  private nextAllocationId(): string {
    this.allocationCounter++;
    return `alloc-${this.allocationCounter}`;
  }

  /**
   * Build a human-readable reasoning string for why the selected candidate
   * was chosen.
   */
  private buildReasoning(
    selected: ResourceCandidate,
    score: number,
    criteria: OptimizationCriteria,
    eligibleCount: number,
  ): string {
    const parts: string[] = [];

    parts.push(
      `Selected "${selected.id}" (${selected.provider}, ${selected.region}) ` +
        `from ${eligibleCount} eligible candidate(s) with score ${score.toFixed(4)}.`,
    );

    switch (criteria.prioritize) {
      case 'cost':
        parts.push(
          `Cost-prioritised: cost=${selected.costPerUnit}/unit, ` +
            `quality=${selected.quality}, latency=${selected.latencyMs}ms, ` +
            `availability=${selected.availability}.`,
        );
        break;
      case 'latency':
        parts.push(
          `Latency-prioritised: latency=${selected.latencyMs}ms, ` +
            `cost=${selected.costPerUnit}/unit, quality=${selected.quality}, ` +
            `availability=${selected.availability}.`,
        );
        break;
      case 'quality':
        parts.push(
          `Quality-prioritised: quality=${selected.quality}, ` +
            `cost=${selected.costPerUnit}/unit, latency=${selected.latencyMs}ms, ` +
            `availability=${selected.availability}.`,
        );
        break;
      case 'balanced':
        parts.push(
          `Balanced selection: cost=${selected.costPerUnit}/unit, ` +
            `latency=${selected.latencyMs}ms, quality=${selected.quality}, ` +
            `availability=${selected.availability}.`,
        );
        break;
    }

    if (selected.currentLoad > 0.7) {
      parts.push(
        `Warning: selected resource is under high load (${(selected.currentLoad * 100).toFixed(0)}%).`,
      );
    }

    return parts.join(' ');
  }

  /**
   * Build a brief reason string for an alternative candidate.
   */
  private buildAlternativeReason(
    candidate: ResourceCandidate,
    score: number,
    topScore: number,
    priority: OptimizationCriteria['prioritize'],
  ): string {
    const gap = ((topScore - score) / topScore) * 100;
    let dominant: string;

    switch (priority) {
      case 'cost':
        dominant = `cost=${candidate.costPerUnit}`;
        break;
      case 'latency':
        dominant = `latency=${candidate.latencyMs}ms`;
        break;
      case 'quality':
        dominant = `quality=${candidate.quality}`;
        break;
      default:
        dominant = `cost=${candidate.costPerUnit}, latency=${candidate.latencyMs}ms`;
        break;
    }

    return (
      `Score ${score.toFixed(4)} (${gap.toFixed(1)}% below top). ` +
      `${dominant}, load=${(candidate.currentLoad * 100).toFixed(0)}%.`
    );
  }
}
