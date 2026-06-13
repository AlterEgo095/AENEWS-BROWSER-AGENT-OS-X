"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerAgentService = exports.CONTAINER_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.CONTAINER_AGENT_CONFIG = {
    id: 'infrastructure-container',
    name: 'Container',
    cluster: agent_interface_1.AgentCluster.INFRASTRUCTURE,
    version: '1.0.0',
    description: 'Container orchestration, Docker, and Kubernetes management. Creates and manages containers, pods, replica sets, services, checks cluster health, and manages namespaces.',
    capabilities: [
        {
            name: 'createContainer',
            description: 'Create and run a container',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    image: { type: 'string', description: 'Container image (e.g., "nginx:latest")' },
                    namespace: { type: 'string', default: 'default' },
                    ports: { type: 'array', items: { type: 'object' } },
                    env: { type: 'array', items: { type: 'object' } },
                    resources: { type: 'object', description: 'CPU/memory limits and requests' },
                    restartPolicy: { type: 'string', enum: ['Always', 'OnFailure', 'Never'], default: 'Always' },
                    labels: { type: 'object' },
                },
                required: ['name', 'image'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    containerId: { type: 'string' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'managePod',
            description: 'Manage Kubernetes pods',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    namespace: { type: 'string', default: 'default' },
                    action: { type: 'string', enum: ['get', 'list', 'delete', 'logs', 'exec'] },
                    container: { type: 'string', description: 'Container name for logs/exec' },
                    command: { type: 'array', items: { type: 'string' }, description: 'Command for exec' },
                    tailLines: { type: 'number', default: 100 },
                },
                required: ['name', 'action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    podName: { type: 'string' },
                },
            },
        },
        {
            name: 'scaleReplicaSet',
            description: 'Scale a Kubernetes replica set or deployment',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    namespace: { type: 'string', default: 'default' },
                    replicas: { type: 'number' },
                    reason: { type: 'string' },
                },
                required: ['name', 'replicas'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    previousReplicas: { type: 'number' },
                    newReplicas: { type: 'number' },
                },
            },
        },
        {
            name: 'configureService',
            description: 'Configure a Kubernetes service',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    namespace: { type: 'string', default: 'default' },
                    action: { type: 'string', enum: ['create', 'update', 'delete', 'get'] },
                    type: { type: 'string', enum: ['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'] },
                    selector: { type: 'object' },
                    ports: { type: 'array', items: { type: 'object' } },
                },
                required: ['name', 'action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    serviceName: { type: 'string' },
                },
            },
        },
        {
            name: 'checkClusterHealth',
            description: 'Check the health of a Kubernetes cluster',
            inputSchema: {
                type: 'object',
                properties: {
                    namespace: { type: 'string', description: 'Specific namespace (or all)' },
                    checks: { type: 'array', items: { type: 'string', enum: ['nodes', 'pods', 'services', 'events', 'resources'] }, default: ['nodes', 'pods'] },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    healthy: { type: 'boolean' },
                    nodeCount: { type: 'number' },
                    podCount: { type: 'number' },
                },
            },
        },
        {
            name: 'manageNamespace',
            description: 'Manage Kubernetes namespaces',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    action: { type: 'string', enum: ['create', 'delete', 'list', 'get'] },
                    labels: { type: 'object' },
                    resourceQuota: { type: 'object' },
                },
                required: ['name', 'action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    name: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'create:container',
        'manage:pod',
        'scale:replicaset',
        'configure:service',
        'check:cluster',
        'manage:namespace',
    ],
    maxConcurrentTasks: 4,
    timeout: 120000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 2000,
        exponentialBackoff: true,
    },
};
let ContainerAgentService = class ContainerAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.containers = new Map();
        this.pods = new Map();
        this.services = new Map();
        this.namespaces = new Map();
        this.containerCounter = 0;
    }
    defineConfig() {
        return exports.CONTAINER_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'createContainer',
            description: 'Create and run a container',
            execute: async (params) => this.createContainer(params),
        });
        this.registerTool({
            name: 'managePod',
            description: 'Manage Kubernetes pods',
            execute: async (params) => this.managePod(params),
        });
        this.registerTool({
            name: 'scaleReplicaSet',
            description: 'Scale a replica set or deployment',
            execute: async (params) => this.scaleReplicaSet(params),
        });
        this.registerTool({
            name: 'configureService',
            description: 'Configure a Kubernetes service',
            execute: async (params) => this.configureService(params),
        });
        this.registerTool({
            name: 'checkClusterHealth',
            description: 'Check Kubernetes cluster health',
            execute: async (params) => this.checkClusterHealth(params),
        });
        this.registerTool({
            name: 'manageNamespace',
            description: 'Manage Kubernetes namespaces',
            execute: async (params) => this.manageNamespace(params),
        });
        this.seedInitialData();
        await this.storeInWorkingMemory('container:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Container agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'createContainer', 'managePod', 'scaleReplicaSet',
            'configureService', 'checkClusterHealth', 'manageNamespace',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown container action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`container:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Container execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.containers.clear();
        this.pods.clear();
        this.services.clear();
        this.namespaces.clear();
        this.logger.log('Container agent destroyed, state cleared');
    }
    async createContainer(params) {
        const { name, image, namespace = 'default', ports = [], env = [], resources = {}, restartPolicy = 'Always', labels = {}, } = params;
        if (!name || typeof name !== 'string') {
            throw new Error('Container name is required');
        }
        if (!image || typeof image !== 'string') {
            throw new Error('Container image is required');
        }
        if (!this.namespaces.has(namespace) && namespace !== 'default') {
            throw new Error(`Namespace not found: ${namespace}`);
        }
        const validPolicies = ['Always', 'OnFailure', 'Never'];
        if (!validPolicies.includes(restartPolicy)) {
            throw new Error(`Invalid restart policy: ${restartPolicy}. Valid: ${validPolicies.join(', ')}`);
        }
        this.containerCounter++;
        const containerId = `container-${this.containerCounter}-${Date.now()}`;
        const podName = `${name}-${this.generatePodSuffix()}`;
        const record = {
            id: containerId,
            name,
            image,
            namespace,
            status: 'running',
            ports: ports.length > 0 ? ports : [{ containerPort: 8080, protocol: 'TCP' }],
            env,
            resources: {
                cpuRequest: resources.cpuRequest || '100m',
                cpuLimit: resources.cpuLimit || '500m',
                memoryRequest: resources.memoryRequest || '128Mi',
                memoryLimit: resources.memoryLimit || '512Mi',
            },
            restartPolicy,
            labels,
            createdAt: new Date(),
            podName,
        };
        this.containers.set(containerId, record);
        this.pods.set(podName, {
            name: podName,
            namespace,
            status: 'Running',
            containers: [name],
            nodeName: `node-${Math.floor(Math.random() * 5) + 1}`,
            restarts: 0,
            createdAt: new Date(),
        });
        this.logger.log(`Created container: ${name} (${image}) in ${namespace}, pod=${podName}, status=running`);
        return {
            containerId,
            name,
            image,
            namespace,
            status: 'running',
            podName,
            createdAt: new Date().toISOString(),
        };
    }
    async managePod(params) {
        const { name, namespace = 'default', action, container, command, tailLines = 100 } = params;
        if (!name || typeof name !== 'string') {
            throw new Error('Pod name is required');
        }
        const validActions = ['get', 'list', 'delete', 'logs', 'exec'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid action: ${action}. Valid: ${validActions.join(', ')}`);
        }
        if (action === 'list') {
            const podList = Array.from(this.pods.values())
                .filter((p) => namespace === 'default' || p.namespace === namespace)
                .map((p) => ({ name: p.name, namespace: p.namespace, status: p.status, containers: p.containers, nodeName: p.nodeName }));
            this.logger.log(`Listed ${podList.length} pods in ${namespace}`);
            return {
                success: true,
                podName: name,
                namespace,
                action,
                message: `${podList.length} pod(s) found in namespace ${namespace}`,
            };
        }
        const pod = this.pods.get(name);
        if (!pod) {
            throw new Error(`Pod not found: ${name} in namespace ${namespace}`);
        }
        if (action === 'get') {
            return {
                success: true,
                podName: name,
                namespace: pod.namespace,
                action,
                status: pod.status,
                containers: pod.containers,
                nodeName: pod.nodeName,
                message: `Pod ${name}: status=${pod.status}, node=${pod.nodeName}, containers=${pod.containers.join(',')}`,
            };
        }
        if (action === 'delete') {
            this.pods.delete(name);
            this.logger.log(`Deleted pod: ${name}`);
            return { success: true, podName: name, namespace: pod.namespace, action, message: `Pod ${name} deleted` };
        }
        if (action === 'logs') {
            const targetContainer = container || pod.containers[0];
            const logLines = [];
            const logMessages = [
                'Server started on port 8080',
                'Connected to database successfully',
                'Health check passed',
                'Request processed: GET /api/v1/users (200 OK, 45ms)',
                'Cache hit for key: session:abc123',
                'Background job completed: cleanup-temp-files',
                'Metrics exported to Prometheus endpoint',
                'Graceful shutdown signal received',
            ];
            for (let i = 0; i < Math.min(tailLines, 50); i++) {
                const timestamp = new Date(Date.now() - Math.random() * 3600000).toISOString();
                const msg = logMessages[Math.floor(Math.random() * logMessages.length)];
                logLines.push(`${timestamp} [${targetContainer}] ${msg}`);
            }
            this.logger.log(`Retrieved ${logLines.length} log lines from pod ${name}/${targetContainer}`);
            return {
                success: true,
                podName: name,
                namespace: pod.namespace,
                action,
                status: pod.status,
                logs: logLines,
                message: `${logLines.length} log lines from ${name}/${targetContainer}`,
            };
        }
        if (action === 'exec') {
            if (!command || command.length === 0) {
                throw new Error('Command is required for exec action');
            }
            const targetContainer = container || pod.containers[0];
            const simulatedOutput = `Executing: ${command.join(' ')}\nCommand completed with exit code 0`;
            this.logger.log(`Exec in pod ${name}/${targetContainer}: ${command.join(' ')}`);
            return {
                success: true,
                podName: name,
                namespace: pod.namespace,
                action,
                output: simulatedOutput,
                message: `Command executed in ${name}/${targetContainer}`,
            };
        }
        return { success: true, podName: name, namespace, action, message: `Action ${action} completed` };
    }
    async scaleReplicaSet(params) {
        const { name, namespace = 'default', replicas, reason } = params;
        if (!name || typeof name !== 'string') {
            throw new Error('Deployment/ReplicaSet name is required');
        }
        if (replicas < 0 || replicas > 100) {
            throw new Error('Replicas must be between 0 and 100');
        }
        const relatedPods = Array.from(this.pods.values())
            .filter((p) => p.name.startsWith(name) && p.namespace === namespace);
        const previousReplicas = relatedPods.length || 3;
        if (replicas > previousReplicas) {
            for (let i = previousReplicas; i < replicas; i++) {
                const podName = `${name}-${this.generatePodSuffix()}`;
                this.pods.set(podName, {
                    name: podName,
                    namespace,
                    status: 'Running',
                    containers: [name],
                    nodeName: `node-${Math.floor(Math.random() * 5) + 1}`,
                    restarts: 0,
                    createdAt: new Date(),
                });
            }
        }
        else if (replicas < previousReplicas) {
            const podsToRemove = relatedPods.slice(0, previousReplicas - replicas);
            for (const pod of podsToRemove) {
                this.pods.delete(pod.name);
            }
        }
        this.logger.log(`Scaled ${name} in ${namespace}: ${previousReplicas} → ${replicas} replicas, reason: ${reason || 'N/A'}`);
        return {
            name,
            namespace,
            previousReplicas,
            newReplicas: replicas,
            success: true,
            reason,
            message: `Scaled ${name} from ${previousReplicas} to ${replicas} replicas`,
        };
    }
    async configureService(params) {
        const { name, namespace = 'default', action, type = 'ClusterIP', selector = {}, ports = [] } = params;
        if (!name || typeof name !== 'string') {
            throw new Error('Service name is required');
        }
        const validActions = ['create', 'update', 'delete', 'get'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid action: ${action}. Valid: ${validActions.join(', ')}`);
        }
        const validTypes = ['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid service type: ${type}. Valid: ${validTypes.join(', ')}`);
        }
        if (action === 'delete') {
            if (!this.services.has(name)) {
                throw new Error(`Service not found: ${name}`);
            }
            this.services.delete(name);
            this.logger.log(`Deleted service: ${name}`);
            return { success: true, serviceName: name, namespace, action, message: `Service "${name}" deleted` };
        }
        if (action === 'get') {
            const svc = this.services.get(name);
            if (!svc) {
                throw new Error(`Service not found: ${name}`);
            }
            return {
                success: true,
                serviceName: name,
                namespace: svc.namespace,
                action,
                type: svc.type,
                clusterIp: svc.clusterIp,
                externalIp: svc.externalIp,
                message: `Service "${name}": type=${svc.type}, clusterIP=${svc.clusterIp}`,
            };
        }
        const clusterIp = `10.96.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
        const externalIp = type === 'LoadBalancer' ? `${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` : undefined;
        const record = {
            name,
            namespace,
            type,
            selector: Object.keys(selector).length > 0 ? selector : { app: name },
            ports: ports.length > 0 ? ports : [{ port: 80, targetPort: 8080, protocol: 'TCP' }],
            clusterIp,
            externalIp,
            createdAt: new Date(),
        };
        this.services.set(name, record);
        this.logger.log(`${action === 'create' ? 'Created' : 'Updated'} service: ${name} (${type}), clusterIP=${clusterIp}`);
        return {
            success: true,
            serviceName: name,
            namespace,
            action,
            type,
            clusterIp,
            externalIp,
            message: `Service "${name}" ${action === 'create' ? 'created' : 'updated'}: type=${type}, clusterIP=${clusterIp}`,
        };
    }
    async checkClusterHealth(params) {
        const { namespace = 'all', checks = ['nodes', 'pods'] } = params;
        const nodeCount = 5;
        const readyNodes = Math.random() > 0.1 ? nodeCount : nodeCount - 1;
        const nodes = [];
        for (let i = 1; i <= nodeCount; i++) {
            nodes.push({
                name: `node-${i}`,
                status: i <= readyNodes ? 'Ready' : 'NotReady',
                cpuPercent: Math.round((20 + Math.random() * 60) * 100) / 100,
                memoryPercent: Math.round((30 + Math.random() * 50) * 100) / 100,
            });
        }
        const allPods = Array.from(this.pods.values())
            .filter((p) => namespace === 'all' || p.namespace === namespace);
        const runningPods = allPods.filter((p) => p.status === 'Running').length;
        const events = [
            { type: 'Normal', message: 'Pod api-gateway-7d8f9 started', count: 3, lastSeen: new Date(Date.now() - 300000).toISOString() },
            { type: 'Warning', message: 'Pod worker-service-3a2b failed liveness probe', count: 5, lastSeen: new Date(Date.now() - 600000).toISOString() },
            { type: 'Normal', message: 'Deployment auth-service scaled to 5 replicas', count: 1, lastSeen: new Date(Date.now() - 900000).toISOString() },
        ];
        const healthy = readyNodes === nodeCount && (runningPods / (allPods.length || 1)) > 0.8;
        const result = {
            healthy,
            namespace,
            nodes: {
                total: nodeCount,
                ready: readyNodes,
                notReady: nodeCount - readyNodes,
                details: nodes,
            },
            pods: {
                total: allPods.length,
                running: runningPods,
                pending: allPods.filter((p) => p.status === 'Pending').length,
                failed: allPods.filter((p) => p.status === 'Failed').length,
            },
            services: {
                total: this.services.size,
            },
            events: checks.includes('events') ? events : [],
            resourceUsage: {
                cpuTotalCores: nodeCount * 8,
                cpuUsedPercent: Math.round(nodes.reduce((sum, n) => sum + n.cpuPercent, 0) / nodeCount * 100) / 100,
                memoryTotalGb: nodeCount * 32,
                memoryUsedPercent: Math.round(nodes.reduce((sum, n) => sum + n.memoryPercent, 0) / nodeCount * 100) / 100,
            },
            checkedAt: new Date().toISOString(),
        };
        this.logger.log(`Cluster health: ${healthy ? 'HEALTHY' : 'UNHEALTHY'}, ${readyNodes}/${nodeCount} nodes ready, ${runningPods}/${allPods.length} pods running`);
        return result;
    }
    async manageNamespace(params) {
        const { name, action, labels = {}, resourceQuota } = params;
        if (!name || typeof name !== 'string') {
            throw new Error('Namespace name is required');
        }
        const validActions = ['create', 'delete', 'list', 'get'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid action: ${action}. Valid: ${validActions.join(', ')}`);
        }
        if (action === 'list') {
            const nsList = Array.from(this.namespaces.values()).map((ns) => ({
                name: ns.name,
                status: ns.status,
            }));
            this.logger.log(`Listed ${nsList.length} namespaces`);
            return { success: true, name, action, message: `${nsList.length} namespace(s): ${nsList.map((n) => n.name).join(', ')}` };
        }
        if (action === 'delete') {
            const existing = this.namespaces.get(name);
            if (!existing) {
                throw new Error(`Namespace not found: ${name}`);
            }
            existing.status = 'Terminating';
            this.namespaces.delete(name);
            this.logger.log(`Deleted namespace: ${name}`);
            return { success: true, name, action, message: `Namespace "${name}" deleted` };
        }
        if (action === 'get') {
            const existing = this.namespaces.get(name);
            if (!existing) {
                throw new Error(`Namespace not found: ${name}`);
            }
            return { success: true, name, action, status: existing.status, message: `Namespace "${name}": status=${existing.status}` };
        }
        if (this.namespaces.has(name)) {
            throw new Error(`Namespace already exists: ${name}`);
        }
        this.namespaces.set(name, {
            name,
            status: 'Active',
            labels: Object.keys(labels).length > 0 ? labels : { name },
            resourceQuota,
            createdAt: new Date(),
        });
        this.logger.log(`Created namespace: ${name}`);
        return { success: true, name, action, status: 'Active', message: `Namespace "${name}" created successfully` };
    }
    generatePodSuffix() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let suffix = '';
        for (let i = 0; i < 5; i++) {
            suffix += chars[Math.floor(Math.random() * chars.length)];
        }
        return suffix;
    }
    seedInitialData() {
        const namespaces = ['default', 'kube-system', 'production', 'staging'];
        for (const ns of namespaces) {
            this.namespaces.set(ns, {
                name: ns,
                status: 'Active',
                labels: { name: ns },
                createdAt: new Date(),
            });
        }
        const seedPods = [
            { name: 'api-gateway-7d8f9c', namespace: 'production', containers: ['api-gateway'], node: 'node-1' },
            { name: 'auth-service-5a2b1d', namespace: 'production', containers: ['auth-service'], node: 'node-2' },
            { name: 'worker-service-3e4f6g', namespace: 'production', containers: ['worker-service'], node: 'node-3' },
            { name: 'coredns-8h9j0k', namespace: 'kube-system', containers: ['coredns'], node: 'node-1' },
        ];
        for (const pod of seedPods) {
            this.pods.set(pod.name, {
                name: pod.name,
                namespace: pod.namespace,
                status: 'Running',
                containers: pod.containers,
                nodeName: pod.node,
                restarts: Math.floor(Math.random() * 3),
                createdAt: new Date(Date.now() - Math.random() * 86400000),
            });
        }
        this.services.set('api-gateway', {
            name: 'api-gateway',
            namespace: 'production',
            type: 'LoadBalancer',
            selector: { app: 'api-gateway' },
            ports: [{ port: 443, targetPort: 8080, protocol: 'TCP' }],
            clusterIp: '10.96.0.10',
            externalIp: '34.120.45.67',
            createdAt: new Date(),
        });
    }
};
exports.ContainerAgentService = ContainerAgentService;
exports.ContainerAgentService = ContainerAgentService = __decorate([
    (0, common_1.Injectable)()
], ContainerAgentService);
//# sourceMappingURL=container-agent.service.js.map