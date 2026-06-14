"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ResourceOptimizerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceOptimizerService = exports.ResourceType = void 0;
const common_1 = require("@nestjs/common");
var ResourceType;
(function (ResourceType) {
    ResourceType["LLM"] = "llm";
    ResourceType["BROWSER"] = "browser";
    ResourceType["GPU"] = "gpu";
    ResourceType["WORKER"] = "worker";
    ResourceType["DATABASE"] = "database";
    ResourceType["CACHE"] = "cache";
    ResourceType["QUEUE"] = "queue";
    ResourceType["STORAGE"] = "storage";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
const WEIGHT_PROFILES = {
    cost: { cost: 0.5, latency: 0.2, quality: 0.2, availability: 0.1 },
    latency: { cost: 0.2, latency: 0.5, quality: 0.2, availability: 0.1 },
    quality: { cost: 0.2, latency: 0.2, quality: 0.5, availability: 0.1 },
    balanced: { cost: 0.25, latency: 0.25, quality: 0.25, availability: 0.25 },
};
let ResourceOptimizerService = ResourceOptimizerService_1 = class ResourceOptimizerService {
    constructor() {
        this.logger = new common_1.Logger(ResourceOptimizerService_1.name);
        this.pools = new Map();
        this.allocations = new Map();
        this.resourceIndex = new Map();
        this.allocationCounter = 0;
    }
    onModuleInit() {
        this.logger.log('ResourceOptimizerService initialised');
        for (const rt of Object.values(ResourceType)) {
            this.pools.set(rt, {
                resourceType: rt,
                candidates: [],
                totalCapacity: 0,
                currentUtilization: 0,
            });
        }
    }
    registerResource(candidate) {
        const { id, resourceType } = candidate;
        if (this.resourceIndex.has(id)) {
            this.logger.warn(`Resource "${id}" is already registered — replacing with new candidate`);
            this.unregisterResource(id);
        }
        if (!this.pools.has(resourceType)) {
            this.pools.set(resourceType, {
                resourceType,
                candidates: [],
                totalCapacity: 0,
                currentUtilization: 0,
            });
        }
        const pool = this.pools.get(resourceType);
        pool.candidates.push(candidate);
        this.resourceIndex.set(id, candidate);
        this.recalculatePoolMetrics(pool);
        this.logger.log(`Registered resource "${id}" (type=${resourceType}, provider=${candidate.provider}, region=${candidate.region})`);
    }
    unregisterResource(resourceId) {
        const candidate = this.resourceIndex.get(resourceId);
        if (!candidate) {
            this.logger.warn(`Cannot unregister unknown resource "${resourceId}"`);
            return false;
        }
        for (const allocation of this.allocations.values()) {
            if (allocation.resourceId === resourceId && allocation.status === 'allocated') {
                this.logger.warn(`Cannot unregister resource "${resourceId}" — it has active allocation "${allocation.id}"`);
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
    updateResourceMetrics(resourceId, metrics) {
        const candidate = this.resourceIndex.get(resourceId);
        if (!candidate) {
            this.logger.warn(`Cannot update metrics for unknown resource "${resourceId}"`);
            return false;
        }
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
    optimize(resourceType, criteria = { prioritize: 'balanced' }) {
        const pool = this.pools.get(resourceType);
        if (!pool || pool.candidates.length === 0) {
            this.logger.warn(`No resource candidates available for type "${resourceType}"`);
            return null;
        }
        const weights = WEIGHT_PROFILES[criteria.prioritize];
        const excludeSet = new Set(criteria.excludeResources ?? []);
        const eligible = pool.candidates.filter((c) => {
            if (excludeSet.has(c.id))
                return false;
            if (criteria.maxCost !== undefined && c.costPerUnit > criteria.maxCost)
                return false;
            if (criteria.maxLatencyMs !== undefined && c.latencyMs > criteria.maxLatencyMs)
                return false;
            if (criteria.minQuality !== undefined && c.quality < criteria.minQuality)
                return false;
            if (criteria.minAvailability !== undefined && c.availability < criteria.minAvailability)
                return false;
            if (criteria.requiredCapabilities && criteria.requiredCapabilities.length > 0) {
                const capSet = new Set(c.capabilities);
                for (const req of criteria.requiredCapabilities) {
                    if (!capSet.has(req))
                        return false;
                }
            }
            return true;
        });
        if (eligible.length === 0) {
            this.logger.warn(`No eligible candidates for type "${resourceType}" after applying hard filters`);
            return null;
        }
        const maxCost = Math.max(...eligible.map((c) => c.costPerUnit), 1);
        const maxLatency = Math.max(...eligible.map((c) => c.latencyMs), 1);
        const scored = eligible.map((candidate) => {
            const costNorm = 1 - candidate.costPerUnit / maxCost;
            const latencyNorm = 1 - candidate.latencyMs / maxLatency;
            const qualityNorm = candidate.quality;
            const availabilityNorm = candidate.availability;
            const loadPenalty = candidate.currentLoad;
            let score = weights.cost * costNorm +
                weights.latency * latencyNorm +
                weights.quality * qualityNorm +
                weights.availability * availabilityNorm;
            score *= 1 - loadPenalty * 0.5;
            if (criteria.preferredProvider && candidate.provider === criteria.preferredProvider) {
                score += 0.1;
            }
            if (criteria.preferredRegion && candidate.region === criteria.preferredRegion) {
                score += 0.1;
            }
            return { candidate, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const top = scored[0];
        const alternatives = scored.slice(1, 6).map((s) => ({
            candidate: s.candidate,
            score: s.score,
            reason: this.buildAlternativeReason(s.candidate, s.score, top.score, criteria.prioritize),
        }));
        const reasoning = this.buildReasoning(top.candidate, top.score, criteria, eligible.length);
        this.logger.log(`Optimize(${resourceType}, ${criteria.prioritize}): selected "${top.candidate.id}" ` +
            `(score=${top.score.toFixed(4)}, provider=${top.candidate.provider}, ` +
            `cost=${top.candidate.costPerUnit}, latency=${top.candidate.latencyMs}ms, ` +
            `quality=${top.candidate.quality}, availability=${top.candidate.availability})`);
        return {
            selected: top.candidate,
            score: top.score,
            alternatives,
            estimatedCost: top.candidate.costPerUnit,
            estimatedLatencyMs: top.candidate.latencyMs,
            reasoning,
        };
    }
    allocate(taskId, agentId, resourceType, criteria) {
        const defaultCriteria = criteria ?? { prioritize: 'balanced' };
        const result = this.optimize(resourceType, defaultCriteria);
        if (!result) {
            this.logger.warn(`Cannot allocate ${resourceType} for task "${taskId}" — no suitable resource found`);
            const failedAllocation = {
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
        const allocation = {
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
        candidate.currentLoad = Math.min(1, candidate.currentLoad + 1 / candidate.maxConcurrency);
        const pool = this.pools.get(resourceType);
        if (pool) {
            this.recalculatePoolMetrics(pool);
        }
        this.logger.log(`Allocated resource "${candidate.id}" (type=${resourceType}) for task "${taskId}" ` +
            `by agent "${agentId}" — allocation=${allocationId}`);
        return allocation;
    }
    release(allocationId) {
        const allocation = this.allocations.get(allocationId);
        if (!allocation) {
            this.logger.warn(`Cannot release unknown allocation "${allocationId}"`);
            return false;
        }
        if (allocation.status !== 'allocated') {
            this.logger.warn(`Allocation "${allocationId}" is already ${allocation.status} — cannot release`);
            return false;
        }
        allocation.status = 'released';
        allocation.releasedAt = new Date();
        const candidate = this.resourceIndex.get(allocation.resourceId);
        if (candidate) {
            candidate.currentLoad = Math.max(0, candidate.currentLoad - 1 / candidate.maxConcurrency);
            const pool = this.pools.get(allocation.resourceType);
            if (pool) {
                this.recalculatePoolMetrics(pool);
            }
        }
        this.logger.log(`Released allocation "${allocationId}" (resource="${allocation.resourceId}", task="${allocation.taskId}")`);
        return true;
    }
    getResourcePool(resourceType) {
        const pool = this.pools.get(resourceType);
        if (!pool)
            return null;
        return {
            ...pool,
            candidates: pool.candidates.map((c) => ({ ...c })),
        };
    }
    getResourceUtilization(resourceType) {
        if (resourceType) {
            const pool = this.pools.get(resourceType);
            if (!pool) {
                return { utilization: 0, activeAllocations: 0, totalCapacity: 0, candidates: 0 };
            }
            const activeAllocations = [...this.allocations.values()].filter((a) => a.resourceType === resourceType && a.status === 'allocated').length;
            return {
                utilization: pool.currentUtilization,
                activeAllocations,
                totalCapacity: pool.totalCapacity,
                candidates: pool.candidates.length,
            };
        }
        let totalCapacity = 0;
        let totalLoad = 0;
        let totalCandidates = 0;
        for (const pool of this.pools.values()) {
            totalCapacity += pool.totalCapacity;
            totalLoad += pool.candidates.reduce((sum, c) => sum + c.currentLoad * c.maxConcurrency, 0);
            totalCandidates += pool.candidates.length;
        }
        const activeAllocations = [...this.allocations.values()].filter((a) => a.status === 'allocated').length;
        return {
            utilization: totalCapacity > 0 ? totalLoad / totalCapacity : 0,
            activeAllocations,
            totalCapacity,
            candidates: totalCandidates,
        };
    }
    forecastDemand(resourceType, upcomingTasks) {
        const pool = this.pools.get(resourceType);
        const currentUtilization = pool?.currentUtilization ?? 0;
        const totalCapacity = pool?.totalCapacity ?? 0;
        const now = Date.now();
        const hourBuckets = new Map();
        for (const task of upcomingTasks) {
            const scheduledTime = task.scheduledAt ? task.scheduledAt.getTime() : now;
            const hourOffset = Math.max(0, Math.floor((scheduledTime - now) / (1000 * 60 * 60)));
            const duration = task.estimatedDurationHours ?? 1;
            const demandUnits = totalCapacity > 0 ? duration / totalCapacity : duration * 0.1;
            for (let h = hourOffset; h < hourOffset + Math.ceil(duration); h++) {
                hourBuckets.set(h, (hourBuckets.get(h) ?? 0) + demandUnits);
            }
        }
        const maxHour = Math.max(24, ...hourBuckets.keys());
        const demandByHour = [];
        for (let h = 0; h <= maxHour; h++) {
            const baseUtil = currentUtilization;
            const additionalDemand = hourBuckets.get(h) ?? 0;
            const predictedUtil = Math.min(1, baseUtil + additionalDemand);
            demandByHour.push({ hour: h, predictedUtilization: predictedUtil });
        }
        const peakUtil = Math.max(...demandByHour.map((d) => d.predictedUtilization));
        const avgUtil = demandByHour.length > 0
            ? demandByHour.reduce((s, d) => s + d.predictedUtilization, 0) / demandByHour.length
            : currentUtilization;
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
    scaleIfNeeded(resourceType, targetUtilization = 0.7) {
        const pool = this.pools.get(resourceType);
        const currentUtilization = pool?.currentUtilization ?? 0;
        const totalCapacity = pool?.totalCapacity ?? 0;
        if (currentUtilization > targetUtilization + 0.15) {
            const overloadRatio = currentUtilization / targetUtilization;
            const estimatedResourcesNeeded = Math.ceil((overloadRatio - 1) * (pool?.candidates.length ?? 1));
            return {
                resourceType,
                currentUtilization,
                targetUtilization,
                action: 'add',
                estimatedResourcesNeeded,
                reason: `Utilization at ${(currentUtilization * 100).toFixed(1)}% exceeds target ` +
                    `${(targetUtilization * 100).toFixed(1)}% by a significant margin. ` +
                    `Recommend adding ${estimatedResourcesNeeded} additional ${resourceType} resource(s) ` +
                    `to bring utilization back to target.`,
            };
        }
        if (currentUtilization < targetUtilization - 0.2 && (pool?.candidates.length ?? 0) > 1) {
            const excessCapacity = (targetUtilization - currentUtilization) * totalCapacity;
            const estimatedResourcesNeeded = Math.max(1, Math.floor(excessCapacity / (totalCapacity / (pool?.candidates.length ?? 1))));
            return {
                resourceType,
                currentUtilization,
                targetUtilization,
                action: 'scale_down',
                estimatedResourcesNeeded,
                reason: `Utilization at ${(currentUtilization * 100).toFixed(1)}% is well below target ` +
                    `${(targetUtilization * 100).toFixed(1)}%. Consider scaling down by ` +
                    `${estimatedResourcesNeeded} ${resourceType} resource(s) to optimise cost.`,
            };
        }
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
                    reason: `Load imbalance detected: max load ${(maxLoad * 100).toFixed(1)}% vs ` +
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
            reason: `Utilization at ${(currentUtilization * 100).toFixed(1)}% is within acceptable ` +
                `range of target ${(targetUtilization * 100).toFixed(1)}%. No scaling action needed.`,
        };
    }
    getCostReport(from, to) {
        const entries = [];
        for (const allocation of this.allocations.values()) {
            if (from && allocation.allocatedAt < from)
                continue;
            if (to && allocation.allocatedAt > to)
                continue;
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
        const costByResourceType = {};
        const costByProvider = {};
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
    getResourceStats() {
        let totalCapacity = 0;
        let overallUtilization = 0;
        const poolsByType = {};
        const allocationsByType = {};
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
    recalculatePoolMetrics(pool) {
        const { candidates } = pool;
        pool.totalCapacity = candidates.reduce((sum, c) => sum + c.maxConcurrency, 0);
        const currentLoad = candidates.reduce((sum, c) => sum + c.currentLoad * c.maxConcurrency, 0);
        pool.currentUtilization = pool.totalCapacity > 0 ? currentLoad / pool.totalCapacity : 0;
    }
    nextAllocationId() {
        this.allocationCounter++;
        return `alloc-${this.allocationCounter}`;
    }
    buildReasoning(selected, score, criteria, eligibleCount) {
        const parts = [];
        parts.push(`Selected "${selected.id}" (${selected.provider}, ${selected.region}) ` +
            `from ${eligibleCount} eligible candidate(s) with score ${score.toFixed(4)}.`);
        switch (criteria.prioritize) {
            case 'cost':
                parts.push(`Cost-prioritised: cost=${selected.costPerUnit}/unit, ` +
                    `quality=${selected.quality}, latency=${selected.latencyMs}ms, ` +
                    `availability=${selected.availability}.`);
                break;
            case 'latency':
                parts.push(`Latency-prioritised: latency=${selected.latencyMs}ms, ` +
                    `cost=${selected.costPerUnit}/unit, quality=${selected.quality}, ` +
                    `availability=${selected.availability}.`);
                break;
            case 'quality':
                parts.push(`Quality-prioritised: quality=${selected.quality}, ` +
                    `cost=${selected.costPerUnit}/unit, latency=${selected.latencyMs}ms, ` +
                    `availability=${selected.availability}.`);
                break;
            case 'balanced':
                parts.push(`Balanced selection: cost=${selected.costPerUnit}/unit, ` +
                    `latency=${selected.latencyMs}ms, quality=${selected.quality}, ` +
                    `availability=${selected.availability}.`);
                break;
        }
        if (selected.currentLoad > 0.7) {
            parts.push(`Warning: selected resource is under high load (${(selected.currentLoad * 100).toFixed(0)}%).`);
        }
        return parts.join(' ');
    }
    buildAlternativeReason(candidate, score, topScore, priority) {
        const gap = ((topScore - score) / topScore) * 100;
        let dominant;
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
        return (`Score ${score.toFixed(4)} (${gap.toFixed(1)}% below top). ` +
            `${dominant}, load=${(candidate.currentLoad * 100).toFixed(0)}%.`);
    }
};
exports.ResourceOptimizerService = ResourceOptimizerService;
exports.ResourceOptimizerService = ResourceOptimizerService = ResourceOptimizerService_1 = __decorate([
    (0, common_1.Injectable)()
], ResourceOptimizerService);
//# sourceMappingURL=resource-optimizer.service.js.map