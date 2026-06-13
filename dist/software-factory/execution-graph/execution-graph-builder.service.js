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
var ExecutionGraphBuilderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionGraphBuilderService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
const capability_registry_service_1 = require("../capability-registry/capability-registry.service");
const uuid_1 = require("uuid");
let ExecutionGraphBuilderService = ExecutionGraphBuilderService_1 = class ExecutionGraphBuilderService {
    constructor(capabilityRegistry) {
        this.capabilityRegistry = capabilityRegistry;
        this.logger = new common_1.Logger(ExecutionGraphBuilderService_1.name);
        this.graphs = new Map();
    }
    buildGraph(plan, options) {
        const opts = { ...interfaces_1.DEFAULT_GRAPH_OPTIONS, ...options };
        this.logger.log(`Building execution graph for mission ${plan.missionId} — ${plan.requiredCapabilities.length} capabilities`);
        const nodes = this.createNodes(plan, opts);
        const edges = this.createEdges(nodes);
        const entryNodes = this.findEntryNodes(nodes, edges);
        const exitNodes = this.findExitNodes(nodes, edges);
        const graph = {
            id: `graph-${(0, uuid_1.v4)().slice(0, 8)}`,
            missionId: plan.missionId,
            nodes,
            edges,
            createdAt: new Date(),
            status: interfaces_1.GraphStatus.READY,
            entryNodes,
            exitNodes,
        };
        const phases = this.generatePhases(graph, opts);
        const totalEstimatedCost = this.estimateTotalCost(nodes);
        const totalEstimatedDuration = this.estimateTotalDuration(phases);
        const workersNeeded = this.countWorkersNeeded(phases);
        const maxParallel = Math.min(opts.maxParallelism, this.maxParallelismInPhases(phases));
        const executionPlan = {
            graph,
            phases,
            totalEstimatedCostUsd: totalEstimatedCost,
            totalEstimatedDurationMs: totalEstimatedDuration,
            workersNeeded,
            maxParallelWorkers: maxParallel,
            packsRequired: plan.requiredPacks,
        };
        this.graphs.set(plan.missionId, graph);
        this.logger.log(`Graph built: ${nodes.length} nodes, ${edges.length} edges, ${phases.length} phases, ${workersNeeded} workers`);
        return executionPlan;
    }
    getGraph(missionId) {
        return this.graphs.get(missionId);
    }
    updateNodeStatus(missionId, nodeId, status, result) {
        const graph = this.graphs.get(missionId);
        if (!graph)
            return false;
        const node = graph.nodes.find((n) => n.id === nodeId);
        if (!node)
            return false;
        node.status = status;
        if (result) {
            node.result = result;
        }
        if (graph.nodes.every((n) => n.status === interfaces_1.GraphNodeStatus.COMPLETED)) {
            graph.status = interfaces_1.GraphStatus.COMPLETED;
        }
        else if (graph.nodes.some((n) => n.status === interfaces_1.GraphNodeStatus.FAILED) &&
            graph.nodes.filter((n) => n.status === interfaces_1.GraphNodeStatus.COMPLETED).length <
                graph.nodes.length * 0.5) {
            graph.status = interfaces_1.GraphStatus.FAILED;
        }
        else if (graph.nodes.some((n) => n.status === interfaces_1.GraphNodeStatus.RUNNING)) {
            graph.status = interfaces_1.GraphStatus.RUNNING;
        }
        return true;
    }
    getReadyNodes(missionId) {
        const graph = this.graphs.get(missionId);
        if (!graph)
            return [];
        return graph.nodes.filter((node) => {
            if (node.status !== interfaces_1.GraphNodeStatus.PENDING)
                return false;
            const dependencies = graph.edges
                .filter((e) => e.to === node.id && e.type === interfaces_1.EdgeType.DEPENDS_ON)
                .map((e) => e.from);
            return dependencies.every((depId) => {
                const depNode = graph.nodes.find((n) => n.id === depId);
                return depNode?.status === interfaces_1.GraphNodeStatus.COMPLETED;
            });
        });
    }
    createNodes(plan, opts) {
        const nodes = [];
        const researchCaps = plan.requiredCapabilities.filter((c) => this.isResearchCap(c));
        const buildCaps = plan.requiredCapabilities.filter((c) => this.isBuildCap(c));
        const testCaps = plan.requiredCapabilities.filter((c) => this.isTestCap(c));
        const certCaps = plan.requiredCapabilities.filter((c) => this.isCertCap(c));
        const deliverCaps = plan.requiredCapabilities.filter((c) => this.isDeliverCap(c));
        if (researchCaps.length > 0) {
            nodes.push(this.createNode('research', 'Research & Analysis', interfaces_1.GraphNodeType.RESEARCH, researchCaps, plan.requiredPacks, opts));
        }
        const buildGroups = this.groupBuildCapabilities(buildCaps, opts.maxParallelism);
        for (let i = 0; i < buildGroups.length; i++) {
            const group = buildGroups[i];
            const label = buildGroups.length > 1 ? `Build #${i + 1}` : 'Build';
            nodes.push(this.createNode(`build-${i + 1}`, label, interfaces_1.GraphNodeType.BUILD, group, plan.requiredPacks, opts));
        }
        if (testCaps.length > 0) {
            nodes.push(this.createNode('test', 'Testing', interfaces_1.GraphNodeType.TEST, testCaps, plan.requiredPacks, opts));
        }
        if (certCaps.length > 0) {
            nodes.push(this.createNode('certify', 'Certification', interfaces_1.GraphNodeType.CERTIFY, certCaps, plan.requiredPacks, opts));
        }
        if (deliverCaps.length > 0) {
            nodes.push(this.createNode('deliver', 'Delivery', interfaces_1.GraphNodeType.DELIVER, deliverCaps, plan.requiredPacks, opts));
        }
        if (nodes.length === 0) {
            nodes.push(this.createNode('build-1', 'Build', interfaces_1.GraphNodeType.BUILD, plan.requiredCapabilities, plan.requiredPacks, opts));
        }
        return nodes;
    }
    createNode(id, label, type, capabilities, packs, opts) {
        return {
            id,
            label,
            type,
            capabilities,
            packs,
            status: interfaces_1.GraphNodeStatus.PENDING,
            retryCount: 0,
            maxRetries: opts.maxRetriesPerNode,
        };
    }
    createEdges(nodes) {
        const edges = [];
        const typeOrder = [
            interfaces_1.GraphNodeType.RESEARCH,
            interfaces_1.GraphNodeType.BUILD,
            interfaces_1.GraphNodeType.TEST,
            interfaces_1.GraphNodeType.CERTIFY,
            interfaces_1.GraphNodeType.DELIVER,
        ];
        for (let i = 1; i < typeOrder.length; i++) {
            const currentTypeNodes = nodes.filter((n) => n.type === typeOrder[i]);
            const prevTypeNodes = nodes.filter((n) => n.type === typeOrder[i - 1]);
            for (const current of currentTypeNodes) {
                for (const prev of prevTypeNodes) {
                    edges.push({
                        from: prev.id,
                        to: current.id,
                        type: interfaces_1.EdgeType.DEPENDS_ON,
                    });
                }
            }
        }
        const buildNodes = nodes.filter((n) => n.type === interfaces_1.GraphNodeType.BUILD);
        for (let i = 1; i < buildNodes.length; i++) {
        }
        return edges;
    }
    generatePhases(graph, opts) {
        const phases = [];
        const typeOrder = [
            interfaces_1.GraphNodeType.RESEARCH,
            interfaces_1.GraphNodeType.BUILD,
            interfaces_1.GraphNodeType.TEST,
            interfaces_1.GraphNodeType.CERTIFY,
            interfaces_1.GraphNodeType.DELIVER,
        ];
        for (const type of typeOrder) {
            const nodesOfType = graph.nodes.filter((n) => n.type === type);
            if (nodesOfType.length === 0)
                continue;
            const isParallel = type === interfaces_1.GraphNodeType.BUILD && nodesOfType.length > 1;
            const estimatedDuration = this.estimatePhaseDuration(nodesOfType, isParallel);
            const estimatedCost = this.estimatePhaseCost(nodesOfType);
            phases.push({
                id: `phase-${type.toLowerCase()}`,
                name: this.getPhaseName(type),
                nodeIds: nodesOfType.map((n) => n.id),
                parallel: isParallel,
                estimatedDurationMs: estimatedDuration,
                estimatedCostUsd: estimatedCost,
            });
        }
        return phases;
    }
    isResearchCap(cap) {
        return (cap.startsWith('browser.') ||
            cap.startsWith('business.analytics') ||
            cap.startsWith('business.seo'));
    }
    isBuildCap(cap) {
        return cap.startsWith('dev.') || cap.startsWith('office.') || cap.startsWith('business.');
    }
    isTestCap(cap) {
        return (cap.startsWith('cert.test') ||
            cap.startsWith('cert.regression') ||
            cap.startsWith('cert.performance') ||
            cap.startsWith('cert.integration'));
    }
    isCertCap(cap) {
        return cap.startsWith('cert.') && !this.isTestCap(cap);
    }
    isDeliverCap(cap) {
        return cap.startsWith('delivery.');
    }
    groupBuildCapabilities(caps, maxParallelism) {
        if (caps.length === 0)
            return [[]];
        const devCaps = caps.filter((c) => c.startsWith('dev.'));
        const officeCaps = caps.filter((c) => c.startsWith('office.'));
        const businessCaps = caps.filter((c) => c.startsWith('business.'));
        const groups = [];
        if (devCaps.length > 0) {
            const frontendCaps = devCaps.filter((c) => c === 'dev.frontend' ||
                c === 'dev.architecture' ||
                c === 'dev.docker' ||
                c === 'dev.documentation');
            const backendCaps = devCaps.filter((c) => c === 'dev.backend' ||
                c === 'dev.database' ||
                c === 'dev.api' ||
                c === 'dev.kubernetes' ||
                c === 'dev.devops');
            const qaCaps = devCaps.filter((c) => c === 'dev.qa' || c === 'dev.test' || c === 'dev.debug');
            if (frontendCaps.length > 0)
                groups.push(frontendCaps);
            if (backendCaps.length > 0)
                groups.push(backendCaps);
            if (qaCaps.length > 0)
                groups.push(qaCaps);
            if (groups.length === 0)
                groups.push(devCaps);
        }
        if (officeCaps.length > 0)
            groups.push(officeCaps);
        if (businessCaps.length > 0)
            groups.push(businessCaps);
        if (groups.length > maxParallelism) {
            while (groups.length > maxParallelism) {
                const smallest = groups.pop();
                groups[groups.length - 1] = [...groups[groups.length - 1], ...smallest];
            }
        }
        return groups.length > 0 ? groups : [caps];
    }
    findEntryNodes(nodes, edges) {
        const targetIds = new Set(edges.map((e) => e.to));
        return nodes.filter((n) => !targetIds.has(n.id)).map((n) => n.id);
    }
    findExitNodes(nodes, edges) {
        const sourceIds = new Set(edges.map((e) => e.from));
        return nodes.filter((n) => !sourceIds.has(n.id)).map((n) => n.id);
    }
    estimateTotalCost(nodes) {
        let total = 0;
        for (const node of nodes) {
            for (const capId of node.capabilities) {
                const cap = this.capabilityRegistry.getCapability(capId);
                if (cap)
                    total += cap.cost.estimatedUsdPerExecution;
            }
        }
        return total;
    }
    estimateTotalDuration(phases) {
        return phases.reduce((sum, p) => sum + p.estimatedDurationMs, 0);
    }
    estimatePhaseDuration(nodes, parallel) {
        if (parallel) {
            return Math.max(...nodes.map((n) => this.estimateNodeDuration(n)));
        }
        return nodes.reduce((sum, n) => sum + this.estimateNodeDuration(n), 0);
    }
    estimateNodeDuration(node) {
        let maxMs = 0;
        for (const capId of node.capabilities) {
            const cap = this.capabilityRegistry.getCapability(capId);
            if (cap)
                maxMs = Math.max(maxMs, cap.latency.estimatedMs);
        }
        return maxMs || 10000;
    }
    estimatePhaseCost(nodes) {
        let total = 0;
        for (const node of nodes) {
            for (const capId of node.capabilities) {
                const cap = this.capabilityRegistry.getCapability(capId);
                if (cap)
                    total += cap.cost.estimatedUsdPerExecution;
            }
        }
        return total;
    }
    countWorkersNeeded(phases) {
        return Math.max(...phases.map((p) => (p.parallel ? p.nodeIds.length : 1)));
    }
    maxParallelismInPhases(phases) {
        return Math.max(...phases.map((p) => (p.parallel ? p.nodeIds.length : 1)));
    }
    getPhaseName(type) {
        const names = {
            [interfaces_1.GraphNodeType.RESEARCH]: 'Research & Analysis',
            [interfaces_1.GraphNodeType.BUILD]: 'Build & Development',
            [interfaces_1.GraphNodeType.TEST]: 'Testing & Validation',
            [interfaces_1.GraphNodeType.CERTIFY]: 'Certification & Audit',
            [interfaces_1.GraphNodeType.DELIVER]: 'Delivery & Packaging',
        };
        return names[type];
    }
};
exports.ExecutionGraphBuilderService = ExecutionGraphBuilderService;
exports.ExecutionGraphBuilderService = ExecutionGraphBuilderService = ExecutionGraphBuilderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [capability_registry_service_1.CapabilityRegistryService])
], ExecutionGraphBuilderService);
//# sourceMappingURL=execution-graph-builder.service.js.map