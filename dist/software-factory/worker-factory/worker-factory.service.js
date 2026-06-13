"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WorkerFactoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerFactoryService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
const capability_registry_service_1 = require("../capability-registry/capability-registry.service");
const uuid_1 = require("uuid");
let WorkerFactoryService = WorkerFactoryService_1 = class WorkerFactoryService {
    constructor(capabilityRegistry) {
        this.capabilityRegistry = capabilityRegistry;
        this.logger = new common_1.Logger(WorkerFactoryService_1.name);
        this.workers = new Map();
        this.archive = [];
        this.constraints = { ...interfaces_1.DEFAULT_WORKER_CONSTRAINTS };
    }
    async spawn(request) {
        const activeCount = this.getActiveCount();
        if (activeCount >= this.constraints.maxConcurrentWorkers) {
            this.logger.warn(`Worker pool full: ${activeCount}/${this.constraints.maxConcurrentWorkers}`);
            return {
                workerId: '',
                capabilities: request.capabilities,
                status: interfaces_1.WorkerStatus.FAILED,
                ready: false,
            };
        }
        const capabilityDefinitions = [];
        for (const capId of request.capabilities) {
            const def = this.capabilityRegistry.getCapability(capId);
            if (def)
                capabilityDefinitions.push(def);
        }
        const workerId = `worker-${(0, uuid_1.v4)().slice(0, 8)}`;
        const worker = {
            id: workerId,
            missionId: request.missionId,
            capabilities: request.capabilities,
            capabilityDefinitions,
            status: interfaces_1.WorkerStatus.SPAWNING,
            spawnedAt: new Date(),
            tasksCompleted: 0,
            tasksFailed: 0,
            totalCostUsd: 0,
            totalDurationMs: 0,
            maxLifetimeMs: request.maxLifetimeMs || this.constraints.defaultLifetimeMs,
            maxTasks: request.maxTasks || this.constraints.defaultMaxTasksPerWorker,
            assignedNodeIds: request.assignedNodeIds,
            results: [],
        };
        this.workers.set(workerId, worker);
        await this.initializeWorker(worker);
        this.logger.log(`Worker spawned: ${workerId} [${request.capabilities.join(', ')}] for mission ${request.missionId}`);
        return {
            workerId,
            capabilities: request.capabilities,
            status: worker.status,
            ready: worker.status === interfaces_1.WorkerStatus.READY,
        };
    }
    async terminate(request) {
        const worker = this.workers.get(request.workerId);
        if (!worker) {
            return {
                workerId: request.workerId,
                terminated: false,
                finalStatus: interfaces_1.WorkerStatus.FAILED,
                tasksCompleted: 0,
                tasksFailed: 0,
                totalCostUsd: 0,
                totalDurationMs: 0,
                results: [],
            };
        }
        worker.status = interfaces_1.WorkerStatus.TERMINATING;
        worker.terminatedAt = new Date();
        worker.totalDurationMs = worker.terminatedAt.getTime() - worker.spawnedAt.getTime();
        worker.status = interfaces_1.WorkerStatus.TERMINATED;
        const totalCost = worker.results.reduce((sum, r) => sum + r.costUsd, 0);
        worker.totalCostUsd = totalCost;
        const result = {
            workerId: request.workerId,
            terminated: true,
            finalStatus: interfaces_1.WorkerStatus.TERMINATED,
            tasksCompleted: worker.tasksCompleted,
            tasksFailed: worker.tasksFailed,
            totalCostUsd: worker.totalCostUsd,
            totalDurationMs: worker.totalDurationMs,
            results: worker.results,
        };
        if (request.archiveResults) {
            this.archive.push({ ...worker });
            result.archivedPath = `archive/${worker.missionId}/${worker.id}`;
        }
        this.workers.delete(request.workerId);
        this.logger.log(`Worker terminated: ${request.workerId} [${request.reason}] — ${worker.tasksCompleted} tasks, $${worker.totalCostUsd.toFixed(2)}, ${worker.totalDurationMs}ms`);
        return result;
    }
    async terminateMissionWorkers(missionId, reason) {
        const missionWorkers = this.getWorkersByMission(missionId);
        const results = [];
        for (const worker of missionWorkers) {
            const result = await this.terminate({
                workerId: worker.id,
                reason,
                archiveResults: true,
            });
            results.push(result);
        }
        this.logger.log(`Terminated ${results.length} workers for mission ${missionId}`);
        return results;
    }
    async execute(execRequest) {
        const worker = this.workers.get(execRequest.workerId);
        if (!worker || worker.status !== interfaces_1.WorkerStatus.READY) {
            return {
                workerId: execRequest.workerId,
                nodeId: execRequest.nodeId,
                success: false,
                output: null,
                artifacts: [],
                durationMs: 0,
                costUsd: 0,
                error: `Worker not ready: ${execRequest.workerId}`,
            };
        }
        worker.status = interfaces_1.WorkerStatus.EXECUTING;
        const startTime = Date.now();
        try {
            const results = [];
            for (const capId of worker.capabilities) {
                const capDef = this.capabilityRegistry.getCapability(capId);
                const capResult = await this.executeCapability(capId, capDef, execRequest.input);
                results.push(capResult);
                worker.results.push(capResult);
            }
            const totalDuration = Date.now() - startTime;
            const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0);
            worker.tasksCompleted++;
            worker.totalCostUsd += totalCost;
            worker.totalDurationMs += totalDuration;
            worker.status = interfaces_1.WorkerStatus.READY;
            if (worker.tasksCompleted + worker.tasksFailed >= worker.maxTasks) {
                this.logger.log(`Worker ${execRequest.workerId} reached task limit, auto-terminating`);
                this.terminate({ workerId: execRequest.workerId, reason: 'mission_complete', archiveResults: true });
            }
            const allArtifacts = results.flatMap(r => r.artifacts);
            const anyFailed = results.some(r => !r.success);
            return {
                workerId: execRequest.workerId,
                nodeId: execRequest.nodeId,
                success: !anyFailed,
                output: results.map(r => r.output),
                artifacts: allArtifacts,
                durationMs: totalDuration,
                costUsd: totalCost,
                error: anyFailed ? results.find(r => !r.success)?.error : undefined,
            };
        }
        catch (error) {
            worker.tasksFailed++;
            worker.status = interfaces_1.WorkerStatus.READY;
            return {
                workerId: execRequest.workerId,
                nodeId: execRequest.nodeId,
                success: false,
                output: null,
                artifacts: [],
                durationMs: Date.now() - startTime,
                costUsd: 0,
                error: error.message,
            };
        }
    }
    getWorker(workerId) {
        return this.workers.get(workerId);
    }
    getWorkersByMission(missionId) {
        const result = [];
        for (const worker of this.workers.values()) {
            if (worker.missionId === missionId) {
                result.push(worker);
            }
        }
        return result;
    }
    getStatistics() {
        const active = this.getActiveWorkers();
        const byCapability = {};
        for (const worker of active) {
            for (const capId of worker.capabilities) {
                byCapability[capId] = (byCapability[capId] || 0) + 1;
            }
        }
        const allWorkers = [...this.archive];
        const totalLifetime = allWorkers.reduce((sum, w) => sum + w.totalDurationMs, 0);
        const missionIds = new Set(allWorkers.map(w => w.missionId));
        return {
            totalSpawned: this.archive.length + active.length,
            totalTerminated: this.archive.length,
            currentlyActive: active.length,
            byCapability,
            totalCostUsd: [...active, ...this.archive].reduce((sum, w) => sum + w.totalCostUsd, 0),
            averageLifetimeMs: allWorkers.length > 0 ? totalLifetime / allWorkers.length : 0,
            averageTasksPerWorker: allWorkers.length > 0
                ? allWorkers.reduce((sum, w) => sum + w.tasksCompleted, 0) / allWorkers.length
                : 0,
            missionsServed: missionIds.size,
        };
    }
    getConstraints() {
        return { ...this.constraints };
    }
    updateConstraints(constraints) {
        this.constraints = { ...this.constraints, ...constraints };
    }
    async initializeWorker(worker) {
        worker.status = interfaces_1.WorkerStatus.READY;
        this.workers.set(worker.id, worker);
    }
    async executeCapability(capId, definition, input) {
        const startTime = Date.now();
        const result = {
            capabilityId: capId,
            success: true,
            output: {
                capabilityId: capId,
                message: `Executed ${capId}`,
                input,
                timestamp: new Date().toISOString(),
            },
            artifacts: [`/artifacts/${capId.replace(/\./g, '/')}/output`],
            durationMs: Date.now() - startTime,
            costUsd: definition?.cost.estimatedUsdPerExecution || 0.01,
            metadata: {
                tools: definition?.tools || [],
                pack: definition?.pack || 'unknown',
            },
        };
        return result;
    }
    getActiveCount() {
        let count = 0;
        for (const worker of this.workers.values()) {
            if (worker.status !== interfaces_1.WorkerStatus.TERMINATED && worker.status !== interfaces_1.WorkerStatus.FAILED) {
                count++;
            }
        }
        return count;
    }
    getActiveWorkers() {
        const result = [];
        for (const worker of this.workers.values()) {
            if (worker.status !== interfaces_1.WorkerStatus.TERMINATED && worker.status !== interfaces_1.WorkerStatus.FAILED) {
                result.push(worker);
            }
        }
        return result;
    }
};
exports.WorkerFactoryService = WorkerFactoryService;
exports.WorkerFactoryService = WorkerFactoryService = WorkerFactoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [capability_registry_service_1.CapabilityRegistryService])
], WorkerFactoryService);
//# sourceMappingURL=worker-factory.service.js.map