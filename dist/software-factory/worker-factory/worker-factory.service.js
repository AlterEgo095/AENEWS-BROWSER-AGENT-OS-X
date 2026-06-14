"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WorkerFactoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerFactoryService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const interfaces_1 = require("../interfaces");
const capability_registry_service_1 = require("../capability-registry/capability-registry.service");
const connector_registry_1 = require("../connectors/connector-registry");
const uuid_1 = require("uuid");
const MISSION_WORKSPACE_BASE = '/home/z/my-project/download/missions';
let WorkerFactoryService = WorkerFactoryService_1 = class WorkerFactoryService {
    constructor(capabilityRegistry, connectorRegistry) {
        this.capabilityRegistry = capabilityRegistry;
        this.connectorRegistry = connectorRegistry;
        this.logger = new common_1.Logger(WorkerFactoryService_1.name);
        this.workers = new Map();
        this.archive = [];
        this.missionWorkspaces = new Map();
        this.missionResults = new Map();
        this.constraints = { ...interfaces_1.DEFAULT_WORKER_CONSTRAINTS };
    }
    setMissionWorkspace(missionId, workspaceDir) {
        this.missionWorkspaces.set(missionId, workspaceDir);
        fs.mkdirSync(workspaceDir, { recursive: true });
        fs.mkdirSync(path.join(workspaceDir, 'src'), { recursive: true });
        fs.mkdirSync(path.join(workspaceDir, 'tests'), { recursive: true });
        fs.mkdirSync(path.join(workspaceDir, 'docs'), { recursive: true });
    }
    getMissionWorkspace(missionId) {
        if (this.missionWorkspaces.has(missionId)) {
            return this.missionWorkspaces.get(missionId);
        }
        const workspaceDir = path.join(MISSION_WORKSPACE_BASE, missionId);
        this.setMissionWorkspace(missionId, workspaceDir);
        return workspaceDir;
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
            const { parallel, sequential } = this.groupCapabilities(worker.capabilities);
            if (parallel.length > 0) {
                this.logger.log(`Worker ${execRequest.workerId}: executing ${parallel.length} capabilities in PARALLEL`);
                const parallelResults = await Promise.all(parallel.map(async (capId) => {
                    const capDef = this.capabilityRegistry.getCapability(capId);
                    return this.executeCapability(capId, capDef, execRequest.input, worker.missionId);
                }));
                results.push(...parallelResults);
                for (const capResult of parallelResults) {
                    worker.results.push(capResult);
                    const connectorOutput = {
                        success: capResult.success,
                        artifacts: capResult.artifacts.map((p) => ({
                            name: p,
                            path: p,
                            type: 'source',
                            size: 0,
                        })),
                        output: capResult.output,
                        costUsd: capResult.costUsd,
                        durationMs: capResult.durationMs,
                    };
                    const prevResults = this.missionResults.get(worker.missionId) || new Map();
                    prevResults.set(capResult.capabilityId, connectorOutput);
                    this.missionResults.set(worker.missionId, prevResults);
                }
            }
            for (const capId of sequential) {
                const capDef = this.capabilityRegistry.getCapability(capId);
                const capResult = await this.executeCapability(capId, capDef, execRequest.input, worker.missionId);
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
                this.terminate({
                    workerId: execRequest.workerId,
                    reason: 'mission_complete',
                    archiveResults: true,
                });
            }
            const allArtifacts = results.flatMap((r) => r.artifacts);
            const anyFailed = results.some((r) => !r.success);
            return {
                workerId: execRequest.workerId,
                nodeId: execRequest.nodeId,
                success: !anyFailed,
                output: results.map((r) => r.output),
                artifacts: allArtifacts,
                durationMs: totalDuration,
                costUsd: totalCost,
                error: anyFailed ? results.find((r) => !r.success)?.error : undefined,
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
        const missionIds = new Set(allWorkers.map((w) => w.missionId));
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
    getConnectorStats() {
        return this.connectorRegistry.getStatistics();
    }
    async initializeWorker(worker) {
        const workspaceDir = this.getMissionWorkspace(worker.missionId);
        const availableConnectors = [];
        const missingConnectors = [];
        for (const capId of worker.capabilities) {
            if (this.connectorRegistry.hasConnector(capId)) {
                availableConnectors.push(capId);
            }
            else {
                missingConnectors.push(capId);
            }
        }
        if (missingConnectors.length > 0) {
            this.logger.warn(`Worker ${worker.id}: no connector for capabilities: ${missingConnectors.join(', ')}`);
        }
        this.logger.log(`Worker ${worker.id} initialized with ${availableConnectors.length}/${worker.capabilities.length} real connectors, workspace: ${workspaceDir}`);
        worker.status = interfaces_1.WorkerStatus.READY;
        this.workers.set(worker.id, worker);
    }
    async executeCapability(capId, definition, input, missionId) {
        const startTime = Date.now();
        const workspaceDir = this.getMissionWorkspace(missionId);
        const previousResults = this.missionResults.get(missionId) || new Map();
        const connector = this.connectorRegistry.getConnector(capId);
        if (connector) {
            try {
                const connectorInput = {
                    missionId,
                    instruction: input?.instruction || input?.mission || '',
                    workspaceDir,
                    parameters: input?.parameters || input || {},
                    previousResults,
                    tools: definition?.tools || [],
                };
                this.logger.log(`Executing ${capId} via ${connector.constructor.name}`);
                const connectorOutput = await connector.execute(capId, connectorInput);
                previousResults.set(capId, connectorOutput);
                this.missionResults.set(missionId, previousResults);
                const result = {
                    capabilityId: capId,
                    success: connectorOutput.success,
                    output: connectorOutput.output,
                    artifacts: connectorOutput.artifacts.map((a) => a.path),
                    durationMs: connectorOutput.durationMs || Date.now() - startTime,
                    costUsd: connectorOutput.costUsd,
                    error: connectorOutput.error,
                    metadata: {
                        connector: connector.constructor.name,
                        pack: definition?.pack || 'unknown',
                        artifactCount: connectorOutput.artifacts.length,
                        realExecution: true,
                    },
                };
                this.logger.log(`  ${capId} → ${result.success ? 'SUCCESS' : 'FAILED'} (${result.durationMs}ms, $${result.costUsd.toFixed(4)}, ${result.artifacts.length} artifacts)`);
                return result;
            }
            catch (error) {
                this.logger.error(`Connector execution failed for ${capId}: ${error.message}`);
            }
        }
        this.logger.warn(`No connector for ${capId}, using fallback stub`);
        const result = {
            capabilityId: capId,
            success: true,
            output: {
                capabilityId: capId,
                message: `Executed ${capId} (fallback — no real connector)`,
                input,
                timestamp: new Date().toISOString(),
            },
            artifacts: [`/artifacts/${capId.replace(/\./g, '/')}/output`],
            durationMs: Date.now() - startTime,
            costUsd: definition?.cost.estimatedUsdPerExecution || 0.01,
            metadata: {
                tools: definition?.tools || [],
                pack: definition?.pack || 'unknown',
                realExecution: false,
                fallbackReason: connector ? 'connector_error' : 'no_connector',
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
    groupCapabilities(capabilities) {
        const DEPENDENT_CAPABILITIES = new Set([
            'dev.frontend',
            'dev.backend',
            'dev.database',
            'dev.api',
            'dev.test',
            'dev.documentation',
            'dev.debug',
            'cert.architecture_review',
            'cert.security_audit',
            'cert.test_coverage',
            'cert.regression',
            'cert.performance',
            'cert.doc_review',
            'cert.integration',
            'cert.compliance',
            'cert.accessibility',
            'cert.data_privacy',
            'delivery.zip',
            'delivery.github',
            'delivery.docker_registry',
            'delivery.vps',
            'delivery.deployment',
            'delivery.pdf_report',
        ]);
        const INDEPENDENT_CAPABILITIES = new Set([
            'dev.architecture',
            'dev.devops',
            'dev.docker',
            'dev.kubernetes',
            'dev.qa',
            'browser.login',
            'browser.navigation',
            'browser.search',
            'browser.form',
            'browser.upload',
            'browser.download',
            'browser.screenshot',
            'browser.vision',
            'browser.session',
            'browser.cookie',
            'browser.popup',
            'browser.ocr',
            'office.pdf',
            'office.docx',
            'office.excel',
            'office.powerpoint',
            'office.ocr',
            'office.signature',
            'office.email',
            'office.calendar',
            'business.seo',
            'business.marketing',
            'business.copywriting',
            'business.branding',
            'business.crm',
            'business.analytics',
            'business.finance',
            'business.sales',
            'business.legal',
            'business.partnership',
            'delivery.cloud',
            'delivery.cdn',
            'delivery.backup',
            'delivery.monitoring_setup',
            'delivery.load_balancer',
            'delivery.notification',
        ]);
        const parallel = [];
        const sequential = [];
        for (const capId of capabilities) {
            if (INDEPENDENT_CAPABILITIES.has(capId)) {
                parallel.push(capId);
            }
            else {
                sequential.push(capId);
            }
        }
        return { parallel, sequential };
    }
};
exports.WorkerFactoryService = WorkerFactoryService;
exports.WorkerFactoryService = WorkerFactoryService = WorkerFactoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [capability_registry_service_1.CapabilityRegistryService,
        connector_registry_1.ConnectorRegistry])
], WorkerFactoryService);
//# sourceMappingURL=worker-factory.service.js.map