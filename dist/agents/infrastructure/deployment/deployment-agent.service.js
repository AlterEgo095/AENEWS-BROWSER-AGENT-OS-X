"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentAgentService = exports.DEPLOYMENT_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.DEPLOYMENT_AGENT_CONFIG = {
    id: 'infrastructure-deployment',
    name: 'Deployment',
    cluster: agent_interface_1.AgentCluster.INFRASTRUCTURE,
    version: '1.0.0',
    description: 'Deploy applications, manage releases, and orchestrate blue-green and canary deployment strategies. Supports rollback, canary promotion, deployment status tracking, scaling, and deployment reporting.',
    capabilities: [
        {
            name: 'deploy',
            description: 'Deploy an application to a target environment',
            inputSchema: {
                type: 'object',
                properties: {
                    appName: { type: 'string', description: 'Application name' },
                    version: { type: 'string', description: 'Version or image tag to deploy' },
                    environment: { type: 'string', enum: ['development', 'staging', 'production'] },
                    strategy: { type: 'string', enum: ['rolling', 'blue-green', 'canary'], default: 'rolling' },
                    replicas: { type: 'number', default: 3 },
                    config: { type: 'object', description: 'Deployment configuration overrides' },
                },
                required: ['appName', 'version', 'environment'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    deploymentId: { type: 'string' },
                    status: { type: 'string' },
                    url: { type: 'string' },
                },
            },
        },
        {
            name: 'rollback',
            description: 'Roll back a deployment to a previous version',
            inputSchema: {
                type: 'object',
                properties: {
                    appName: { type: 'string' },
                    deploymentId: { type: 'string' },
                    targetVersion: { type: 'string', description: 'Version to roll back to' },
                    reason: { type: 'string' },
                },
                required: ['appName', 'deploymentId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    rollbackId: { type: 'string' },
                    previousVersion: { type: 'string' },
                    currentVersion: { type: 'string' },
                    success: { type: 'boolean' },
                },
            },
        },
        {
            name: 'promoteCanary',
            description: 'Promote a canary deployment to full production',
            inputSchema: {
                type: 'object',
                properties: {
                    appName: { type: 'string' },
                    deploymentId: { type: 'string' },
                    canaryWeight: { type: 'number', description: 'Current canary traffic weight percent' },
                },
                required: ['appName', 'deploymentId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    promoted: { type: 'boolean' },
                    previousWeight: { type: 'number' },
                    newWeight: { type: 'number' },
                },
            },
        },
        {
            name: 'getDeploymentStatus',
            description: 'Get the status of a deployment',
            inputSchema: {
                type: 'object',
                properties: {
                    appName: { type: 'string' },
                    deploymentId: { type: 'string' },
                    environment: { type: 'string' },
                },
                required: ['appName'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    deploymentId: { type: 'string' },
                    status: { type: 'string' },
                    replicas: { type: 'number' },
                    availableReplicas: { type: 'number' },
                },
            },
        },
        {
            name: 'scaleDeployment',
            description: 'Scale a deployment to a specified number of replicas',
            inputSchema: {
                type: 'object',
                properties: {
                    appName: { type: 'string' },
                    environment: { type: 'string' },
                    replicas: { type: 'number' },
                    reason: { type: 'string' },
                },
                required: ['appName', 'environment', 'replicas'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    previousReplicas: { type: 'number' },
                    newReplicas: { type: 'number' },
                    success: { type: 'boolean' },
                },
            },
        },
        {
            name: 'generateDeploymentReport',
            description: 'Generate a deployment report for an application or environment',
            inputSchema: {
                type: 'object',
                properties: {
                    appName: { type: 'string' },
                    environment: { type: 'string' },
                    timeRange: { type: 'string', enum: ['1h', '24h', '7d', '30d'], default: '24h' },
                },
                required: ['appName'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    totalDeployments: { type: 'number' },
                    successRate: { type: 'number' },
                    averageDuration: { type: 'number' },
                    deployments: { type: 'array' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'deploy:application',
        'rollback:deployment',
        'scale:deployment',
        'read:deployment',
        'write:deployment',
    ],
    maxConcurrentTasks: 3,
    timeout: 180000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 2000,
        exponentialBackoff: true,
    },
};
let DeploymentAgentService = class DeploymentAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.deployments = new Map();
        this.deploymentCounter = 0;
    }
    defineConfig() {
        return exports.DEPLOYMENT_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'deploy',
            description: 'Deploy an application to a target environment',
            execute: async (params) => this.deploy(params),
        });
        this.registerTool({
            name: 'rollback',
            description: 'Roll back a deployment to a previous version',
            execute: async (params) => this.rollback(params),
        });
        this.registerTool({
            name: 'promoteCanary',
            description: 'Promote a canary deployment to full production',
            execute: async (params) => this.promoteCanary(params),
        });
        this.registerTool({
            name: 'getDeploymentStatus',
            description: 'Get the status of a deployment',
            execute: async (params) => this.getDeploymentStatus(params),
        });
        this.registerTool({
            name: 'scaleDeployment',
            description: 'Scale a deployment to a specified number of replicas',
            execute: async (params) => this.scaleDeployment(params),
        });
        this.registerTool({
            name: 'generateDeploymentReport',
            description: 'Generate a deployment report',
            execute: async (params) => this.generateDeploymentReport(params),
        });
        await this.storeInWorkingMemory('deployment:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Deployment agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'deploy', 'rollback', 'promoteCanary', 'getDeploymentStatus',
            'scaleDeployment', 'generateDeploymentReport',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown deployment action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`deployment:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Deployment execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.deployments.clear();
        this.deploymentCounter = 0;
        this.logger.log('Deployment agent destroyed, state cleared');
    }
    async deploy(params) {
        const { appName, version, environment, strategy = 'rolling', replicas = 3, config, } = params;
        if (!appName || typeof appName !== 'string') {
            throw new Error('Application name is required');
        }
        if (!version || typeof version !== 'string') {
            throw new Error('Version is required');
        }
        const validEnvs = ['development', 'staging', 'production'];
        if (!validEnvs.includes(environment)) {
            throw new Error(`Invalid environment: ${environment}. Valid: ${validEnvs.join(', ')}`);
        }
        const validStrategies = ['rolling', 'blue-green', 'canary'];
        if (!validStrategies.includes(strategy)) {
            throw new Error(`Invalid strategy: ${strategy}. Valid: ${validStrategies.join(', ')}`);
        }
        if (replicas < 1 || replicas > 100) {
            throw new Error('Replicas must be between 1 and 100');
        }
        this.deploymentCounter++;
        const deploymentId = `deploy-${this.deploymentCounter}-${Date.now()}`;
        const domainBase = environment === 'production' ? 'app' : environment === 'staging' ? 'staging' : 'dev';
        const url = `https://${appName}.${domainBase}.example.com`;
        const record = {
            id: deploymentId,
            appName,
            version,
            environment,
            strategy,
            status: 'running',
            replicas,
            availableReplicas: replicas,
            url,
            createdAt: new Date(),
            updatedAt: new Date(),
            durationMs: Math.floor(Math.random() * 120000) + 30000,
        };
        if (strategy === 'canary') {
            record.canaryWeight = 10;
            record.status = 'canary';
        }
        this.deployments.set(deploymentId, record);
        this.logger.log(`Deployed ${appName} v${version} to ${environment} via ${strategy} strategy [${deploymentId}]`);
        return {
            deploymentId,
            appName,
            version,
            environment,
            strategy,
            status: record.status,
            replicas,
            url,
            canaryWeight: record.canaryWeight,
        };
    }
    async rollback(params) {
        const { appName, deploymentId, targetVersion, reason } = params;
        if (!appName || typeof appName !== 'string') {
            throw new Error('Application name is required');
        }
        if (!deploymentId || typeof deploymentId !== 'string') {
            throw new Error('Deployment ID is required');
        }
        const existing = this.deployments.get(deploymentId);
        if (!existing) {
            throw new Error(`Deployment not found: ${deploymentId}`);
        }
        if (existing.appName !== appName) {
            throw new Error(`Deployment ${deploymentId} does not belong to app ${appName}`);
        }
        const previousVersion = existing.version;
        const rollbackVersion = targetVersion || this.findPreviousVersion(appName, existing.version);
        if (!rollbackVersion) {
            throw new Error(`No previous version found to roll back to for ${appName}`);
        }
        existing.status = 'rolled_back';
        existing.updatedAt = new Date();
        this.deploymentCounter++;
        const rollbackId = `rollback-${this.deploymentCounter}-${Date.now()}`;
        const newRecord = {
            id: rollbackId,
            appName,
            version: rollbackVersion,
            environment: existing.environment,
            strategy: 'rolling',
            status: 'running',
            replicas: existing.replicas,
            availableReplicas: existing.replicas,
            url: existing.url,
            createdAt: new Date(),
            updatedAt: new Date(),
            durationMs: Math.floor(Math.random() * 60000) + 15000,
        };
        this.deployments.set(rollbackId, newRecord);
        this.logger.log(`Rolled back ${appName} from v${previousVersion} to v${rollbackVersion} [${rollbackId}], reason: ${reason || 'N/A'}`);
        return {
            rollbackId,
            appName,
            previousVersion,
            currentVersion: rollbackVersion,
            success: true,
            reason,
        };
    }
    async promoteCanary(params) {
        const { appName, deploymentId, canaryWeight } = params;
        if (!appName || typeof appName !== 'string') {
            throw new Error('Application name is required');
        }
        if (!deploymentId || typeof deploymentId !== 'string') {
            throw new Error('Deployment ID is required');
        }
        const existing = this.deployments.get(deploymentId);
        if (!existing) {
            throw new Error(`Deployment not found: ${deploymentId}`);
        }
        if (existing.appName !== appName) {
            throw new Error(`Deployment ${deploymentId} does not belong to app ${appName}`);
        }
        if (existing.strategy !== 'canary' && existing.status !== 'canary') {
            throw new Error(`Deployment ${deploymentId} is not a canary deployment`);
        }
        const previousWeight = existing.canaryWeight || 10;
        const targetWeight = canaryWeight ?? 100;
        if (targetWeight < 0 || targetWeight > 100) {
            throw new Error('Canary weight must be between 0 and 100');
        }
        existing.canaryWeight = targetWeight;
        existing.updatedAt = new Date();
        if (targetWeight === 100) {
            existing.status = 'running';
            existing.strategy = 'rolling';
        }
        this.logger.log(`Promoted canary for ${appName} [${deploymentId}]: ${previousWeight}% → ${targetWeight}%`);
        return {
            promoted: targetWeight === 100,
            deploymentId,
            previousWeight,
            newWeight: targetWeight,
            message: targetWeight === 100
                ? `Canary fully promoted to production for ${appName}`
                : `Canary weight adjusted to ${targetWeight}% for ${appName}`,
        };
    }
    async getDeploymentStatus(params) {
        const { appName, deploymentId, environment } = params;
        if (!appName || typeof appName !== 'string') {
            throw new Error('Application name is required');
        }
        let results = [];
        if (deploymentId) {
            const record = this.deployments.get(deploymentId);
            if (!record) {
                throw new Error(`Deployment not found: ${deploymentId}`);
            }
            if (record.appName !== appName) {
                throw new Error(`Deployment ${deploymentId} does not belong to app ${appName}`);
            }
            results = [record];
        }
        else {
            results = Array.from(this.deployments.values()).filter((d) => d.appName === appName);
            if (environment) {
                results = results.filter((d) => d.environment === environment);
            }
        }
        const mapped = results.map((d) => ({
            deploymentId: d.id,
            version: d.version,
            environment: d.environment,
            status: d.status,
            replicas: d.replicas,
            availableReplicas: d.availableReplicas,
            url: d.url,
            canaryWeight: d.canaryWeight,
            updatedAt: d.updatedAt.toISOString(),
        }));
        this.logger.log(`getDeploymentStatus: ${appName} → ${mapped.length} deployment(s)`);
        return { appName, deployments: mapped, total: mapped.length };
    }
    async scaleDeployment(params) {
        const { appName, environment, replicas, reason } = params;
        if (!appName || typeof appName !== 'string') {
            throw new Error('Application name is required');
        }
        const validEnvs = ['development', 'staging', 'production'];
        if (!validEnvs.includes(environment)) {
            throw new Error(`Invalid environment: ${environment}. Valid: ${validEnvs.join(', ')}`);
        }
        if (replicas < 1 || replicas > 100) {
            throw new Error('Replicas must be between 1 and 100');
        }
        const appDeployments = Array.from(this.deployments.values())
            .filter((d) => d.appName === appName && d.environment === environment && d.status === 'running')
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        if (appDeployments.length === 0) {
            throw new Error(`No running deployment found for ${appName} in ${environment}`);
        }
        const latest = appDeployments[0];
        const previousReplicas = latest.replicas;
        latest.replicas = replicas;
        latest.availableReplicas = replicas;
        latest.updatedAt = new Date();
        this.logger.log(`Scaled ${appName} in ${environment}: ${previousReplicas} → ${replicas} replicas, reason: ${reason || 'N/A'}`);
        return {
            appName,
            environment,
            previousReplicas,
            newReplicas: replicas,
            success: true,
            reason,
        };
    }
    async generateDeploymentReport(params) {
        const { appName, environment, timeRange = '24h' } = params;
        if (!appName || typeof appName !== 'string') {
            throw new Error('Application name is required');
        }
        const validRanges = ['1h', '24h', '7d', '30d'];
        if (!validRanges.includes(timeRange)) {
            throw new Error(`Invalid time range: ${timeRange}. Valid: ${validRanges.join(', ')}`);
        }
        const rangeMs = {
            '1h': 3600000,
            '24h': 86400000,
            '7d': 604800000,
            '30d': 2592000000,
        };
        const cutoff = new Date(Date.now() - rangeMs[timeRange]);
        let records = Array.from(this.deployments.values())
            .filter((d) => d.appName === appName && d.createdAt >= cutoff);
        if (environment) {
            records = records.filter((d) => d.environment === environment);
        }
        if (records.length === 0) {
            records = this.generateSimulatedHistory(appName, environment, timeRange);
        }
        const successful = records.filter((d) => d.status === 'running' || d.status === 'canary').length;
        const failed = records.filter((d) => d.status === 'failed').length;
        const avgDuration = records.length > 0
            ? Math.round(records.reduce((sum, d) => sum + (d.durationMs || 0), 0) / records.length)
            : 0;
        const report = {
            totalDeployments: records.length,
            successfulDeployments: successful,
            failedDeployments: failed,
            successRate: records.length > 0 ? Math.round((successful / records.length) * 10000) / 100 : 0,
            averageDurationMs: avgDuration,
            deployments: records,
        };
        this.logger.log(`Deployment report: ${appName}, ${timeRange}, ${report.totalDeployments} deployments, ${report.successRate}% success`);
        return report;
    }
    findPreviousVersion(appName, currentVersion) {
        const appDeployments = Array.from(this.deployments.values())
            .filter((d) => d.appName === appName && d.version !== currentVersion && d.status === 'running')
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return appDeployments.length > 0 ? appDeployments[0].version : null;
    }
    generateSimulatedHistory(appName, environment, timeRange) {
        const records = [];
        const count = timeRange === '1h' ? 2 : timeRange === '24h' ? 5 : timeRange === '7d' ? 12 : 25;
        const envs = environment ? [environment] : ['development', 'staging', 'production'];
        const strategies = ['rolling', 'blue-green', 'canary'];
        for (let i = 0; i < count; i++) {
            this.deploymentCounter++;
            const env = envs[Math.floor(Math.random() * envs.length)];
            const strategy = strategies[Math.floor(Math.random() * strategies.length)];
            const version = `1.${Math.floor(Math.random() * 20)}.${Math.floor(Math.random() * 50)}`;
            const isSuccess = Math.random() > 0.15;
            const replicas = 2 + Math.floor(Math.random() * 6);
            records.push({
                id: `deploy-sim-${this.deploymentCounter}`,
                appName,
                version,
                environment: env,
                strategy,
                status: isSuccess ? (strategy === 'canary' ? 'canary' : 'running') : 'failed',
                replicas,
                availableReplicas: isSuccess ? replicas : Math.floor(replicas * 0.3),
                url: `https://${appName}.${env === 'production' ? 'app' : env}.example.com`,
                canaryWeight: strategy === 'canary' && isSuccess ? Math.floor(Math.random() * 40) + 10 : undefined,
                createdAt: new Date(Date.now() - Math.random() * 2592000000),
                updatedAt: new Date(),
                durationMs: Math.floor(Math.random() * 180000) + 20000,
            });
        }
        return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
};
exports.DeploymentAgentService = DeploymentAgentService;
exports.DeploymentAgentService = DeploymentAgentService = __decorate([
    (0, common_1.Injectable)()
], DeploymentAgentService);
//# sourceMappingURL=deployment-agent.service.js.map