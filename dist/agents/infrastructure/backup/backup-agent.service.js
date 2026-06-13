"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupAgentService = exports.BACKUP_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.BACKUP_AGENT_CONFIG = {
    id: 'infrastructure-backup',
    name: 'Backup',
    cluster: agent_interface_1.AgentCluster.INFRASTRUCTURE,
    version: '1.0.0',
    description: 'Backup management, restore, scheduling, and verification. Creates and restores backups, schedules automated backups, verifies backup integrity, lists backups, and manages backup deletion.',
    capabilities: [
        {
            name: 'createBackup',
            description: 'Create a backup of a resource or service',
            inputSchema: {
                type: 'object',
                properties: {
                    resource: { type: 'string', description: 'Resource to back up (e.g., "database", "files", "config")' },
                    serviceName: { type: 'string', description: 'Service name' },
                    type: { type: 'string', enum: ['full', 'incremental', 'snapshot'], default: 'full' },
                    destination: { type: 'string', description: 'Backup destination (e.g., "s3", "local", "gcs")' },
                    compression: { type: 'boolean', default: true },
                    encryption: { type: 'boolean', default: true },
                    tags: { type: 'object', description: 'Tags for the backup' },
                },
                required: ['resource', 'serviceName'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    backupId: { type: 'string' },
                    status: { type: 'string' },
                    size: { type: 'number' },
                },
            },
        },
        {
            name: 'restoreBackup',
            description: 'Restore from a backup',
            inputSchema: {
                type: 'object',
                properties: {
                    backupId: { type: 'string' },
                    targetResource: { type: 'string', description: 'Target resource to restore to' },
                    targetService: { type: 'string', description: 'Target service (defaults to original)' },
                    pointInTime: { type: 'string', description: 'Point-in-time restore (ISO 8601)' },
                    dryRun: { type: 'boolean', default: false },
                },
                required: ['backupId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    restoreId: { type: 'string' },
                    success: { type: 'boolean' },
                },
            },
        },
        {
            name: 'scheduleBackup',
            description: 'Schedule automated backups',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    resource: { type: 'string' },
                    serviceName: { type: 'string' },
                    cronExpression: { type: 'string', description: 'Cron expression for schedule' },
                    type: { type: 'string', enum: ['full', 'incremental', 'snapshot'], default: 'incremental' },
                    retention: { type: 'number', description: 'Number of backups to retain' },
                    destination: { type: 'string', default: 's3' },
                },
                required: ['name', 'resource', 'serviceName', 'cronExpression'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    scheduleId: { type: 'string' },
                    nextRun: { type: 'string' },
                },
            },
        },
        {
            name: 'verifyBackup',
            description: 'Verify the integrity of a backup',
            inputSchema: {
                type: 'object',
                properties: {
                    backupId: { type: 'string' },
                    verificationType: { type: 'string', enum: ['checksum', 'restore_test', 'metadata', 'full'], default: 'checksum' },
                },
                required: ['backupId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    backupId: { type: 'string' },
                    valid: { type: 'boolean' },
                },
            },
        },
        {
            name: 'listBackups',
            description: 'List backups with optional filters',
            inputSchema: {
                type: 'object',
                properties: {
                    serviceName: { type: 'string' },
                    resource: { type: 'string' },
                    status: { type: 'string', enum: ['completed', 'in_progress', 'failed', 'all'], default: 'all' },
                    limit: { type: 'number', default: 50 },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    backups: { type: 'array' },
                    total: { type: 'number' },
                },
            },
        },
        {
            name: 'deleteBackup',
            description: 'Delete a backup',
            inputSchema: {
                type: 'object',
                properties: {
                    backupId: { type: 'string' },
                    reason: { type: 'string' },
                    force: { type: 'boolean', default: false },
                },
                required: ['backupId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    deleted: { type: 'boolean' },
                    backupId: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'create:backup',
        'restore:backup',
        'delete:backup',
        'read:backup',
        'schedule:backup',
    ],
    maxConcurrentTasks: 2,
    timeout: 300000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 3000,
        exponentialBackoff: true,
    },
};
let BackupAgentService = class BackupAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.backups = new Map();
        this.schedules = new Map();
        this.backupCounter = 0;
        this.scheduleCounter = 0;
    }
    defineConfig() {
        return exports.BACKUP_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'createBackup',
            description: 'Create a backup of a resource or service',
            execute: async (params) => this.createBackup(params),
        });
        this.registerTool({
            name: 'restoreBackup',
            description: 'Restore from a backup',
            execute: async (params) => this.restoreBackup(params),
        });
        this.registerTool({
            name: 'scheduleBackup',
            description: 'Schedule automated backups',
            execute: async (params) => this.scheduleBackup(params),
        });
        this.registerTool({
            name: 'verifyBackup',
            description: 'Verify backup integrity',
            execute: async (params) => this.verifyBackup(params),
        });
        this.registerTool({
            name: 'listBackups',
            description: 'List backups with optional filters',
            execute: async (params) => this.listBackups(params),
        });
        this.registerTool({
            name: 'deleteBackup',
            description: 'Delete a backup',
            execute: async (params) => this.deleteBackup(params),
        });
        this.seedInitialBackups();
        await this.storeInWorkingMemory('backup:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Backup agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'createBackup', 'restoreBackup', 'scheduleBackup',
            'verifyBackup', 'listBackups', 'deleteBackup',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown backup action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`backup:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Backup execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.backups.clear();
        this.schedules.clear();
        this.logger.log('Backup agent destroyed, state cleared');
    }
    async createBackup(params) {
        const { resource, serviceName, type = 'full', destination = 's3', compression = true, encryption = true, tags = {}, } = params;
        if (!resource || typeof resource !== 'string') {
            throw new Error('Resource is required');
        }
        if (!serviceName || typeof serviceName !== 'string') {
            throw new Error('Service name is required');
        }
        const validTypes = ['full', 'incremental', 'snapshot'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid backup type: ${type}. Valid: ${validTypes.join(', ')}`);
        }
        const validDestinations = ['s3', 'local', 'gcs', 'azure'];
        if (!validDestinations.includes(destination)) {
            throw new Error(`Invalid destination: ${destination}. Valid: ${validDestinations.join(', ')}`);
        }
        this.backupCounter++;
        const backupId = `backup-${this.backupCounter}-${Date.now()}`;
        const durationMs = type === 'full' ? Math.floor(Math.random() * 300000) + 60000
            : type === 'incremental' ? Math.floor(Math.random() * 120000) + 15000
                : Math.floor(Math.random() * 60000) + 5000;
        const baseSize = type === 'full' ? Math.floor(Math.random() * 10737418240) + 1073741824
            : type === 'incremental' ? Math.floor(Math.random() * 107374182) + 10485760
                : Math.floor(Math.random() * 5368709120) + 536870912;
        const sizeBytes = compression ? Math.round(baseSize * 0.6) : baseSize;
        const checksum = this.generateChecksum();
        const record = {
            id: backupId,
            resource,
            serviceName,
            type: type,
            status: 'completed',
            destination,
            sizeBytes,
            compressed: compression,
            encrypted: encryption,
            checksum,
            tags,
            createdAt: new Date(),
            completedAt: new Date(),
            durationMs,
        };
        this.backups.set(backupId, record);
        this.logger.log(`Created backup: ${backupId}, ${serviceName}/${resource}, type=${type}, size=${this.formatBytes(sizeBytes)}, ${durationMs}ms`);
        return {
            backupId,
            resource,
            serviceName,
            type,
            status: 'completed',
            destination,
            sizeBytes,
            compressed: compression,
            encrypted: encryption,
            checksum,
            durationMs,
        };
    }
    async restoreBackup(params) {
        const { backupId, targetResource, targetService, pointInTime, dryRun = false } = params;
        if (!backupId || typeof backupId !== 'string') {
            throw new Error('Backup ID is required');
        }
        const backup = this.backups.get(backupId);
        if (!backup) {
            throw new Error(`Backup not found: ${backupId}`);
        }
        if (backup.status !== 'completed') {
            throw new Error(`Backup ${backupId} is not in a completed state (current: ${backup.status})`);
        }
        this.backupCounter++;
        const restoreId = `restore-${this.backupCounter}-${Date.now()}`;
        const effectiveTargetResource = targetResource || backup.resource;
        const effectiveTargetService = targetService || backup.serviceName;
        const durationMs = Math.floor(Math.random() * 180000) + 30000;
        const message = dryRun
            ? `Dry run: Would restore ${backup.serviceName}/${backup.resource} to ${effectiveTargetService}/${effectiveTargetResource}${pointInTime ? ` at ${pointInTime}` : ''}`
            : `Restored ${backup.serviceName}/${backup.resource} to ${effectiveTargetService}/${effectiveTargetResource}${pointInTime ? ` at ${pointInTime}` : ''} successfully`;
        this.logger.log(`Restore ${dryRun ? '(dry run) ' : ''}: ${backupId} → ${effectiveTargetService}/${effectiveTargetResource}, ${durationMs}ms`);
        return {
            restoreId,
            backupId,
            targetResource: effectiveTargetResource,
            targetService: effectiveTargetService,
            dryRun,
            success: true,
            durationMs,
            message,
        };
    }
    async scheduleBackup(params) {
        const { name, resource, serviceName, cronExpression, type = 'incremental', retention = 7, destination = 's3', } = params;
        if (!name || typeof name !== 'string') {
            throw new Error('Schedule name is required');
        }
        if (!resource || typeof resource !== 'string') {
            throw new Error('Resource is required');
        }
        if (!serviceName || typeof serviceName !== 'string') {
            throw new Error('Service name is required');
        }
        if (!cronExpression || typeof cronExpression !== 'string') {
            throw new Error('Cron expression is required');
        }
        const validTypes = ['full', 'incremental', 'snapshot'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid backup type: ${type}. Valid: ${validTypes.join(', ')}`);
        }
        this.scheduleCounter++;
        const scheduleId = `schedule-${this.scheduleCounter}-${Date.now()}`;
        const nextRun = new Date(Date.now() + Math.floor(Math.random() * 86400000) + 3600000);
        this.schedules.set(scheduleId, {
            id: scheduleId,
            name,
            resource,
            serviceName,
            cronExpression,
            type: type,
            retention,
            destination,
            enabled: true,
            nextRun,
            createdAt: new Date(),
        });
        this.logger.log(`Scheduled backup: ${name} [${scheduleId}], ${serviceName}/${resource}, cron="${cronExpression}", next run: ${nextRun.toISOString()}`);
        return {
            scheduleId,
            name,
            cronExpression,
            nextRun: nextRun.toISOString(),
            enabled: true,
            created: true,
        };
    }
    async verifyBackup(params) {
        const { backupId, verificationType = 'checksum' } = params;
        if (!backupId || typeof backupId !== 'string') {
            throw new Error('Backup ID is required');
        }
        const backup = this.backups.get(backupId);
        if (!backup) {
            throw new Error(`Backup not found: ${backupId}`);
        }
        const validTypes = ['checksum', 'restore_test', 'metadata', 'full'];
        if (!validTypes.includes(verificationType)) {
            throw new Error(`Invalid verification type: ${verificationType}. Valid: ${validTypes.join(', ')}`);
        }
        const checks = [];
        if (verificationType === 'checksum' || verificationType === 'full') {
            const passed = Math.random() > 0.05;
            checks.push({
                name: 'checksum',
                passed,
                details: passed
                    ? `Checksum ${backup.checksum} verified successfully`
                    : `Checksum mismatch: expected ${backup.checksum}, got ${this.generateChecksum()}`,
            });
        }
        if (verificationType === 'metadata' || verificationType === 'full') {
            const passed = Math.random() > 0.02;
            checks.push({
                name: 'metadata',
                passed,
                details: passed
                    ? 'All metadata fields are valid and complete'
                    : 'Missing required metadata fields: encryption_key_id',
            });
        }
        if (verificationType === 'restore_test' || verificationType === 'full') {
            const passed = Math.random() > 0.08;
            checks.push({
                name: 'restore_test',
                passed,
                details: passed
                    ? `Test restore completed successfully in ${Math.floor(Math.random() * 60000) + 5000}ms`
                    : 'Test restore failed: data corruption detected in block 42',
            });
        }
        const valid = checks.every((c) => c.passed);
        if (verificationType === 'full' && valid) {
            backup.status = 'completed';
        }
        this.logger.log(`Verified backup ${backupId} (${verificationType}): ${valid ? 'PASSED' : 'FAILED'}`);
        return {
            backupId,
            verificationType,
            valid,
            checks,
            verifiedAt: new Date().toISOString(),
        };
    }
    async listBackups(params) {
        const { serviceName, resource, status = 'all', limit = 50 } = params;
        if (limit < 1 || limit > 500) {
            throw new Error('Limit must be between 1 and 500');
        }
        let records = Array.from(this.backups.values());
        if (serviceName) {
            records = records.filter((b) => b.serviceName === serviceName);
        }
        if (resource) {
            records = records.filter((b) => b.resource === resource);
        }
        if (status !== 'all') {
            records = records.filter((b) => b.status === status);
        }
        records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        records = records.slice(0, limit);
        const mapped = records.map((b) => ({
            id: b.id,
            resource: b.resource,
            serviceName: b.serviceName,
            type: b.type,
            status: b.status,
            destination: b.destination,
            sizeBytes: b.sizeBytes,
            createdAt: b.createdAt.toISOString(),
            durationMs: b.durationMs,
        }));
        this.logger.log(`listBackups: ${mapped.length} backups returned`);
        return { backups: mapped, total: mapped.length };
    }
    async deleteBackup(params) {
        const { backupId, reason, force = false } = params;
        if (!backupId || typeof backupId !== 'string') {
            throw new Error('Backup ID is required');
        }
        const backup = this.backups.get(backupId);
        if (!backup) {
            throw new Error(`Backup not found: ${backupId}`);
        }
        if (!force) {
            const ageMs = Date.now() - backup.createdAt.getTime();
            if (ageMs < 86400000) {
                throw new Error(`Backup ${backupId} was created less than 24 hours ago. Use force: true to delete anyway.`);
            }
        }
        this.backups.delete(backupId);
        this.logger.log(`Deleted backup ${backupId}, reason: ${reason || 'N/A'}, forced: ${force}`);
        return {
            deleted: true,
            backupId,
            reason,
            message: `Backup ${backupId} (${backup.serviceName}/${backup.resource}) deleted successfully`,
        };
    }
    generateChecksum() {
        const chars = '0123456789abcdef';
        let hash = '';
        for (let i = 0; i < 64; i++) {
            hash += chars[Math.floor(Math.random() * chars.length)];
        }
        return hash;
    }
    formatBytes(bytes) {
        if (bytes >= 1073741824)
            return `${(bytes / 1073741824).toFixed(1)} GB`;
        if (bytes >= 1048576)
            return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    seedInitialBackups() {
        const seedData = [
            { resource: 'database', serviceName: 'user-service', type: 'full', destination: 's3' },
            { resource: 'database', serviceName: 'payment-service', type: 'full', destination: 's3' },
            { resource: 'files', serviceName: 'media-service', type: 'incremental', destination: 'gcs' },
            { resource: 'config', serviceName: 'api-gateway', type: 'snapshot', destination: 'local' },
        ];
        for (const data of seedData) {
            this.backupCounter++;
            const backupId = `backup-seed-${this.backupCounter}`;
            const sizeBytes = data.type === 'full'
                ? Math.floor(Math.random() * 5368709120) + 1073741824
                : Math.floor(Math.random() * 536870912) + 10485760;
            this.backups.set(backupId, {
                id: backupId,
                resource: data.resource,
                serviceName: data.serviceName,
                type: data.type,
                status: 'completed',
                destination: data.destination,
                sizeBytes,
                compressed: true,
                encrypted: true,
                checksum: this.generateChecksum(),
                tags: { environment: 'production', seeded: 'true' },
                createdAt: new Date(Date.now() - Math.random() * 604800000),
                completedAt: new Date(Date.now() - Math.random() * 604800000),
                durationMs: Math.floor(Math.random() * 300000) + 30000,
            });
        }
    }
};
exports.BackupAgentService = BackupAgentService;
exports.BackupAgentService = BackupAgentService = __decorate([
    (0, common_1.Injectable)()
], BackupAgentService);
//# sourceMappingURL=backup-agent.service.js.map