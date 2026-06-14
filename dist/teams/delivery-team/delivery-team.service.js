"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DeliveryTeamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryTeamService = void 0;
const common_1 = require("@nestjs/common");
let DeliveryTeamService = DeliveryTeamService_1 = class DeliveryTeamService {
    constructor() {
        this.logger = new common_1.Logger(DeliveryTeamService_1.name);
        this.contexts = new Map();
        this.taskLog = new Map();
        this.metrics = {
            totalTasks: 0,
            successfulTasks: 0,
            failedTasks: 0,
            totalDurationMs: 0,
            totalDeliverables: 0,
            totalBytesDelivered: 0,
        };
    }
    async execute(task) {
        const start = Date.now();
        this.logger.log(`Executing delivery task [${task.capability}] for mission ${task.missionId}`);
        this.ensureContext(task.missionId);
        try {
            let result;
            switch (task.capability) {
                case 'pdf':
                    result = await this.generatePDF(task.params.content, task.params.options, task.missionId);
                    break;
                case 'zip':
                    result = await this.createZip(task.params.files, task.params.options, task.missionId);
                    break;
                case 'github':
                    result = await this.pushToGitHub(task.params.repo, task.params.files, task.missionId);
                    break;
                case 'docker':
                    result = await this.buildDocker(task.params.dockerfile, task.params.tag, task.missionId);
                    break;
                case 'deploy':
                    result = await this.deploy(task.params.config, task.params.target, task.missionId);
                    break;
                case 'notify':
                    result = await this.sendNotification(task.params.recipients, task.params.message, task.missionId);
                    break;
                case 'package_all':
                    result = await this.packageAll(task.missionId);
                    break;
                default:
                    throw new Error(`Unknown delivery capability: ${task.capability}`);
            }
            result.taskId = task.id;
            this.metrics.totalTasks++;
            this.metrics.successfulTasks++;
            this.metrics.totalDurationMs += result.durationMs;
            this.metrics.totalDeliverables++;
            if (result.size) {
                this.metrics.totalBytesDelivered += result.size;
            }
            this.taskLog.set(task.id, { task, result });
            this.logger.log(`Delivery task [${task.capability}] completed in ${result.durationMs}ms → ${result.location}`);
            return result;
        }
        catch (error) {
            const durationMs = Date.now() - start;
            const result = {
                taskId: task.id,
                success: false,
                deliverableType: task.capability,
                location: '',
                error: error.message,
                durationMs,
            };
            this.metrics.totalTasks++;
            this.metrics.failedTasks++;
            this.metrics.totalDurationMs += durationMs;
            this.taskLog.set(task.id, { task, result });
            this.logger.error(`Delivery task [${task.capability}] failed: ${error.message}`);
            return result;
        }
    }
    async generatePDF(content, options, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        const title = options?.title || 'Report';
        const format = options?.format || 'A4';
        const orientation = options?.orientation || 'portrait';
        this.logger.log(`Generating PDF: "${title}" (${format}, ${orientation})`);
        const contentLength = typeof content === 'string' ? content.length : JSON.stringify(content).length;
        await this.sleep(300 + Math.min(contentLength / 20, 2000));
        const pdfId = this.generateId();
        const location = `/deliverables/${projectId}/reports/${pdfId}.pdf`;
        const estimatedSize = Math.floor(contentLength * 1.5 + 50000);
        const ctx = this.contexts.get(projectId);
        if (ctx) {
            ctx.deliverables.push({
                id: pdfId,
                missionId: projectId,
                type: 'pdf',
                location,
                sizeBytes: estimatedSize,
                createdAt: new Date(),
                metadata: { title, format, orientation, template: options?.template },
            });
            ctx.lastActivity = new Date();
        }
        return {
            taskId: '',
            success: true,
            deliverableType: 'pdf',
            location,
            url: `https://deliverables.aenews.io${location}`,
            size: estimatedSize,
            durationMs: Date.now() - start,
        };
    }
    async createZip(files, options, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        const archiveName = options?.name || `deliverable-${projectId}`;
        const compressionLevel = options?.compressionLevel || 6;
        this.logger.log(`Creating ZIP: ${archiveName}.zip with ${files.length} files (compression: ${compressionLevel})`);
        await this.sleep(200 + files.length * 30);
        const zipId = this.generateId();
        const location = `/deliverables/${projectId}/archives/${archiveName}.zip`;
        const avgFileSize = 15000;
        const compressionRatio = 0.4 + (compressionLevel / 10) * 0.2;
        const estimatedSize = Math.floor(files.length * avgFileSize * compressionRatio);
        const ctx = this.contexts.get(projectId);
        if (ctx) {
            ctx.deliverables.push({
                id: zipId,
                missionId: projectId,
                type: 'zip',
                location,
                sizeBytes: estimatedSize,
                createdAt: new Date(),
                metadata: {
                    fileCount: files.length,
                    compressionLevel,
                    archiveName,
                },
            });
            ctx.lastActivity = new Date();
        }
        return {
            taskId: '',
            success: true,
            deliverableType: 'zip',
            location,
            url: `https://deliverables.aenews.io${location}`,
            size: estimatedSize,
            durationMs: Date.now() - start,
        };
    }
    async pushToGitHub(repo, files, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        this.logger.log(`Pushing ${files.length} files to GitHub: ${repo}`);
        await this.sleep(100);
        await this.sleep(50);
        await this.sleep(300 + files.length * 20);
        const commitSha = this.generateCommitSha();
        const branch = 'main';
        const location = `github://${repo}/${branch}`;
        const ctx = this.contexts.get(projectId);
        if (ctx) {
            ctx.deliverables.push({
                id: this.generateId(),
                missionId: projectId,
                type: 'github',
                location,
                sizeBytes: 0,
                createdAt: new Date(),
                metadata: { repo, branch, commitSha, fileCount: files.length },
            });
            ctx.lastActivity = new Date();
        }
        return {
            taskId: '',
            success: true,
            deliverableType: 'github',
            location,
            url: `https://github.com/${repo}/commit/${commitSha}`,
            size: files.length,
            durationMs: Date.now() - start,
        };
    }
    async buildDocker(dockerfile, tag, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        const imageTag = tag || `aenews/${projectId}:latest`;
        this.logger.log(`Building Docker image: ${imageTag}`);
        await this.sleep(500);
        await this.sleep(800);
        await this.sleep(400);
        await this.sleep(300);
        const imageId = this.generateId();
        const location = `docker://local/${imageTag}`;
        const imageSize = Math.floor(Math.random() * 300_000_000) + 50_000_000;
        const success = !dockerfile?.includes('ERROR');
        const ctx = this.contexts.get(projectId);
        if (ctx) {
            ctx.deliverables.push({
                id: imageId,
                missionId: projectId,
                type: 'docker',
                location,
                sizeBytes: imageSize,
                createdAt: new Date(),
                metadata: {
                    imageTag,
                    imageId: `sha256:${this.generateCommitSha()}${this.generateCommitSha()}`,
                    baseImage: 'node:20-alpine',
                    layers: Math.floor(Math.random() * 8) + 5,
                },
            });
            ctx.lastActivity = new Date();
        }
        return {
            taskId: '',
            success,
            deliverableType: 'docker',
            location,
            url: `https://hub.docker.com/r/${imageTag}`,
            size: imageSize,
            error: success ? undefined : 'Docker build failed: ERROR instruction found in Dockerfile',
            durationMs: Date.now() - start,
        };
    }
    async deploy(config, target, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        const env = config.environment || target || 'production';
        const provider = config.provider || 'aws';
        const region = config.region || 'us-east-1';
        const strategy = config.strategy || 'rolling';
        this.logger.log(`Deploying to ${env} on ${provider}/${region} (${strategy} update)`);
        await this.sleep(200);
        await this.sleep(300);
        await this.sleep(500 + Math.random() * 500);
        await this.sleep(300);
        const deployId = this.generateId();
        const deployUrl = `https://${projectId}-${env}.aenews.io`;
        const location = `${provider}://${region}/${projectId}/${env}`;
        const success = Math.random() > 0.03;
        const ctx = this.contexts.get(projectId);
        if (ctx) {
            ctx.deployments.push({
                target: env,
                status: success ? 'healthy' : 'failed',
                url: success ? deployUrl : undefined,
                deployedAt: new Date(),
            });
            ctx.lastActivity = new Date();
            if (success) {
                ctx.deliverables.push({
                    id: deployId,
                    missionId: projectId,
                    type: 'deploy',
                    location,
                    sizeBytes: 0,
                    createdAt: new Date(),
                    metadata: { env, provider, region, strategy, deployUrl },
                });
            }
        }
        return {
            taskId: '',
            success,
            deliverableType: 'deploy',
            location,
            url: success ? deployUrl : undefined,
            size: 0,
            error: success ? undefined : `Deployment to ${env} failed: health check timeout after 120s`,
            durationMs: Date.now() - start,
        };
    }
    async sendNotification(recipients, message, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        const recipientList = Array.isArray(recipients) ? recipients : [recipients];
        this.logger.log(`Sending notification to ${recipientList.length} recipient(s)`);
        await this.sleep(100 + recipientList.length * 50);
        const notifId = this.generateId();
        const location = `/notifications/${notifId}`;
        const deliveredCount = recipientList.filter(() => Math.random() > 0.02).length;
        const ctx = this.contexts.get(projectId);
        if (ctx) {
            ctx.notifications.push({
                type: 'email',
                recipients: recipientList,
                sentAt: new Date(),
                status: deliveredCount === recipientList.length ? 'delivered' : 'partial',
            });
            ctx.lastActivity = new Date();
        }
        return {
            taskId: '',
            success: deliveredCount > 0,
            deliverableType: 'notification',
            location,
            size: recipientList.length,
            error: deliveredCount < recipientList.length
                ? `${recipientList.length - deliveredCount} notification(s) failed to deliver`
                : undefined,
            durationMs: Date.now() - start,
        };
    }
    async packageAll(missionId) {
        const start = Date.now();
        this.logger.log(`Packaging ALL deliverables for mission ${missionId}`);
        const ctx = this.ensureContext(missionId);
        const results = [];
        const artifacts = [];
        this.logger.log('  [1/5] Generating PDF report...');
        const pdfResult = await this.generatePDF({ missionId, summary: 'Full mission deliverable package' }, { title: `Mission ${missionId} Report`, includeTableOfContents: true }, missionId);
        results.push(pdfResult);
        if (pdfResult.success)
            artifacts.push(pdfResult.location);
        this.logger.log('  [2/5] Creating ZIP archive...');
        const zipResult = await this.createZip(artifacts.length > 0 ? artifacts : ['src/', 'docs/', 'config/'], { name: `mission-${missionId}-complete`, compressionLevel: 9 }, missionId);
        results.push(zipResult);
        if (zipResult.success)
            artifacts.push(zipResult.location);
        this.logger.log('  [3/5] Building Docker image...');
        const dockerResult = await this.buildDocker('FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci\nCMD ["node", "dist/main.js"]', `aenews/mission-${missionId}:${Date.now().toString(36)}`, missionId);
        results.push(dockerResult);
        if (dockerResult.success)
            artifacts.push(dockerResult.location);
        this.logger.log('  [4/5] Deploying to production...');
        const deployResult = await this.deploy({ environment: 'production', strategy: 'blue-green' }, 'production', missionId);
        results.push(deployResult);
        if (deployResult.success)
            artifacts.push(deployResult.location);
        this.logger.log('  [5/5] Sending completion notifications...');
        const notifyResult = await this.sendNotification(['team@aenews.io', 'stakeholders@aenews.io'], `Mission ${missionId} deliverables are ready. ${artifacts.length} artifacts produced.`, missionId);
        results.push(notifyResult);
        const allSucceeded = results.every((r) => r.success);
        const totalSize = results.reduce((sum, r) => sum + (r.size || 0), 0);
        const packageId = this.generateId();
        const location = `/deliverables/${missionId}/package-${packageId}`;
        ctx.deliverables.push({
            id: packageId,
            missionId,
            type: 'package_all',
            location,
            sizeBytes: totalSize,
            createdAt: new Date(),
            metadata: {
                steps: results.length,
                succeeded: results.filter((r) => r.success).length,
                failed: results.filter((r) => !r.success).length,
                artifacts,
            },
        });
        ctx.lastActivity = new Date();
        return {
            taskId: '',
            success: allSucceeded,
            deliverableType: 'package_all',
            location,
            url: `https://deliverables.aenews.io${location}`,
            size: totalSize,
            error: allSucceeded
                ? undefined
                : `${results.filter((r) => !r.success).length} step(s) failed in packaging pipeline`,
            durationMs: Date.now() - start,
        };
    }
    getStatus() {
        const contextSummaries = Array.from(this.contexts.entries()).map(([missionId, ctx]) => ({
            missionId,
            deliverableCount: ctx.deliverables.length,
            deploymentCount: ctx.deployments.length,
            notificationCount: ctx.notifications.length,
            lastActivity: ctx.lastActivity,
        }));
        return {
            team: 'delivery',
            activeContexts: this.contexts.size,
            tasksCompleted: this.metrics.successfulTasks,
            tasksFailed: this.metrics.failedTasks,
            totalDeliverables: this.metrics.totalDeliverables,
            totalBytesDelivered: this.metrics.totalBytesDelivered,
            avgDurationMs: this.metrics.totalTasks > 0
                ? Math.round(this.metrics.totalDurationMs / this.metrics.totalTasks)
                : 0,
            contexts: contextSummaries,
        };
    }
    ensureContext(missionId) {
        let ctx = this.contexts.get(missionId);
        if (!ctx) {
            ctx = {
                missionId,
                deliverables: [],
                notifications: [],
                deployments: [],
                lastActivity: new Date(),
            };
            this.contexts.set(missionId, ctx);
            this.logger.log(`Created delivery context for mission ${missionId}`);
        }
        return ctx;
    }
    generateId() {
        return `dlv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }
    generateCommitSha() {
        const hex = () => Array.from({ length: 20 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        return hex();
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.DeliveryTeamService = DeliveryTeamService;
exports.DeliveryTeamService = DeliveryTeamService = DeliveryTeamService_1 = __decorate([
    (0, common_1.Injectable)()
], DeliveryTeamService);
//# sourceMappingURL=delivery-team.service.js.map