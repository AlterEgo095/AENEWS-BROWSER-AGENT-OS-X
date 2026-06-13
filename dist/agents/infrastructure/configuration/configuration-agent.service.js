"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationAgentService = exports.CONFIGURATION_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.CONFIGURATION_AGENT_CONFIG = {
    id: 'infrastructure-configuration',
    name: 'Configuration',
    cluster: agent_interface_1.AgentCluster.INFRASTRUCTURE,
    version: '1.0.0',
    description: 'Manage application configuration, environment variables, feature flags, config versioning, and detect configuration drift across services.',
    capabilities: [
        {
            name: 'getConfig',
            description: 'Retrieve configuration values by key or path',
            inputSchema: {
                type: 'object',
                properties: {
                    key: { type: 'string', description: 'Configuration key or path' },
                    environment: { type: 'string', description: 'Target environment (dev/staging/prod)' },
                    includeDefaults: { type: 'boolean', description: 'Whether to include default values' },
                },
                required: ['key'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    key: { type: 'string' },
                    value: { type: 'any' },
                    source: { type: 'string' },
                    version: { type: 'number' },
                    lastModified: { type: 'string' },
                },
            },
        },
        {
            name: 'setConfig',
            description: 'Set or update a configuration value',
            inputSchema: {
                type: 'object',
                properties: {
                    key: { type: 'string', description: 'Configuration key' },
                    value: { type: 'any', description: 'Configuration value' },
                    environment: { type: 'string', description: 'Target environment' },
                    overwrite: { type: 'boolean', description: 'Whether to overwrite existing value' },
                },
                required: ['key', 'value'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    key: { type: 'string' },
                    previousValue: { type: 'any' },
                    newValue: { type: 'any' },
                    version: { type: 'number' },
                },
            },
        },
        {
            name: 'manageFeatureFlag',
            description: 'Create, toggle, or remove a feature flag',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Feature flag name' },
                    enabled: { type: 'boolean', description: 'Whether the flag is enabled' },
                    description: { type: 'string', description: 'Description of the feature flag' },
                    rolloutPercentage: { type: 'number', description: 'Percentage rollout (0-100)' },
                },
                required: ['name'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    enabled: { type: 'boolean' },
                    previousState: { type: 'boolean' },
                    rolloutPercentage: { type: 'number' },
                },
            },
        },
        {
            name: 'detectDrift',
            description: 'Detect configuration drift between environments or services',
            inputSchema: {
                type: 'object',
                properties: {
                    sourceEnvironment: { type: 'string', description: 'Source environment to compare' },
                    targetEnvironment: { type: 'string', description: 'Target environment to compare' },
                    keys: { type: 'array', items: { type: 'string' }, description: 'Specific keys to check' },
                },
                required: ['sourceEnvironment', 'targetEnvironment'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    driftDetected: { type: 'boolean' },
                    differences: { type: 'array', items: { type: 'object' } },
                    totalKeys: { type: 'number' },
                    driftedKeys: { type: 'number' },
                },
            },
        },
        {
            name: 'validateConfig',
            description: 'Validate configuration against schema and rules',
            inputSchema: {
                type: 'object',
                properties: {
                    environment: { type: 'string', description: 'Environment to validate' },
                    schemaVersion: { type: 'string', description: 'Schema version to validate against' },
                    strict: { type: 'boolean', description: 'Whether to apply strict validation' },
                },
                required: ['environment'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    valid: { type: 'boolean' },
                    errors: { type: 'array', items: { type: 'string' } },
                    warnings: { type: 'array', items: { type: 'string' } },
                    checkedKeys: { type: 'number' },
                },
            },
        },
        {
            name: 'rollbackConfig',
            description: 'Roll back configuration to a previous version',
            inputSchema: {
                type: 'object',
                properties: {
                    targetVersion: { type: 'number', description: 'Version to roll back to' },
                    environment: { type: 'string', description: 'Target environment' },
                    dryRun: { type: 'boolean', description: 'Preview changes without applying' },
                },
                required: ['targetVersion'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    rolledBack: { type: 'boolean' },
                    currentVersion: { type: 'number' },
                    previousVersion: { type: 'number' },
                    changesApplied: { type: 'number' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:config',
        'write:config',
        'manage:feature-flags',
        'admin:config',
    ],
    maxConcurrentTasks: 5,
    timeout: 30000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000,
        exponentialBackoff: true,
    },
};
let ConfigurationAgentService = class ConfigurationAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.configStore = new Map();
        this.featureFlags = new Map();
        this.configVersion = 1;
    }
    defineConfig() {
        return exports.CONFIGURATION_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'getConfig',
            description: 'Retrieve configuration values by key or path',
            execute: async (params) => this.retrieveConfig(params),
        });
        this.registerTool({
            name: 'setConfig',
            description: 'Set or update a configuration value',
            execute: async (params) => this.setConfig(params),
        });
        this.registerTool({
            name: 'manageFeatureFlag',
            description: 'Create, toggle, or remove a feature flag',
            execute: async (params) => this.manageFeatureFlag(params),
        });
        this.registerTool({
            name: 'detectDrift',
            description: 'Detect configuration drift between environments',
            execute: async (params) => this.detectDrift(params),
        });
        this.registerTool({
            name: 'validateConfig',
            description: 'Validate configuration against schema and rules',
            execute: async (params) => this.validateConfig(params),
        });
        this.registerTool({
            name: 'rollbackConfig',
            description: 'Roll back configuration to a previous version',
            execute: async (params) => this.rollbackConfig(params),
        });
        this.logger.log('Configuration agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        try {
            let result;
            switch (action) {
                case 'getConfig':
                    result = await this.retrieveConfig(params);
                    break;
                case 'setConfig':
                    result = await this.setConfig(params);
                    break;
                case 'manageFeatureFlag':
                    result = await this.manageFeatureFlag(params);
                    break;
                case 'detectDrift':
                    result = await this.detectDrift(params);
                    break;
                case 'validateConfig':
                    result = await this.validateConfig(params);
                    break;
                case 'rollbackConfig':
                    result = await this.rollbackConfig(params);
                    break;
                default:
                    return this.createAgentOutput(input.taskId, false, null, `Unknown configuration action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Configuration execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.configStore.clear();
        this.featureFlags.clear();
        this.configVersion = 1;
        this.logger.log('Configuration agent destroyed, state cleared');
    }
    async retrieveConfig(params) {
        const { key, environment = 'default', includeDefaults = true } = params;
        const compositeKey = `${environment}:${key}`;
        const entry = this.configStore.get(compositeKey);
        if (!entry) {
            if (!includeDefaults) {
                throw new Error(`Configuration key "${key}" not found in environment "${environment}"`);
            }
            return {
                key,
                value: null,
                source: 'default',
                version: 0,
                lastModified: new Date().toISOString(),
            };
        }
        return {
            key: entry.key,
            value: entry.value,
            source: entry.source,
            version: entry.version,
            lastModified: entry.lastModified.toISOString(),
        };
    }
    async setConfig(params) {
        const { key, value, environment = 'default', overwrite = true } = params;
        const compositeKey = `${environment}:${key}`;
        const existing = this.configStore.get(compositeKey);
        if (existing && !overwrite) {
            throw new Error(`Configuration key "${key}" already exists in environment "${environment}" and overwrite is false`);
        }
        const previousValue = existing?.value ?? null;
        this.configVersion++;
        const entry = {
            key,
            value,
            environment,
            version: this.configVersion,
            lastModified: new Date(),
            source: 'manual',
        };
        this.configStore.set(compositeKey, entry);
        this.logger.log(`Set config ${compositeKey} (version ${this.configVersion})`);
        return {
            key,
            previousValue,
            newValue: value,
            version: this.configVersion,
        };
    }
    async manageFeatureFlag(params) {
        const { name, enabled = true, description, rolloutPercentage = 100 } = params;
        const existing = this.featureFlags.get(name);
        const previousState = existing?.enabled ?? false;
        const flag = {
            name,
            enabled,
            description: description || existing?.description || `Feature flag: ${name}`,
            rolloutPercentage,
            createdAt: existing?.createdAt || new Date(),
            updatedAt: new Date(),
        };
        this.featureFlags.set(name, flag);
        this.logger.log(`Feature flag "${name}" set to ${enabled} (rollout: ${rolloutPercentage}%)`);
        return {
            name,
            enabled,
            previousState,
            rolloutPercentage,
        };
    }
    async detectDrift(params) {
        const { sourceEnvironment, targetEnvironment, keys } = params;
        const sourcePrefix = `${sourceEnvironment}:`;
        const targetPrefix = `${targetEnvironment}:`;
        const differences = [];
        const checkedKeys = keys || [];
        if (checkedKeys.length === 0) {
            for (const [compositeKey] of this.configStore) {
                if (compositeKey.startsWith(sourcePrefix)) {
                    checkedKeys.push(compositeKey.substring(sourcePrefix.length));
                }
            }
        }
        for (const key of checkedKeys) {
            const sourceEntry = this.configStore.get(`${sourcePrefix}${key}`);
            const targetEntry = this.configStore.get(`${targetPrefix}${key}`);
            if (sourceEntry && !targetEntry) {
                differences.push({
                    key,
                    type: 'missing_in_target',
                    sourceValue: sourceEntry.value,
                    targetValue: null,
                });
            }
            else if (!sourceEntry && targetEntry) {
                differences.push({
                    key,
                    type: 'missing_in_source',
                    sourceValue: null,
                    targetValue: targetEntry.value,
                });
            }
            else if (sourceEntry &&
                targetEntry &&
                JSON.stringify(sourceEntry.value) !== JSON.stringify(targetEntry.value)) {
                differences.push({
                    key,
                    type: 'value_mismatch',
                    sourceValue: sourceEntry.value,
                    targetValue: targetEntry.value,
                });
            }
        }
        const driftDetected = differences.length > 0;
        this.logger.log(`Drift detection: ${sourceEnvironment} vs ${targetEnvironment} — ${differences.length} differences found across ${checkedKeys.length} keys`);
        return {
            driftDetected,
            differences,
            totalKeys: checkedKeys.length,
            driftedKeys: differences.length,
        };
    }
    async validateConfig(params) {
        const { environment, schemaVersion = '1.0.0', strict = false } = params;
        const errors = [];
        const warnings = [];
        let checkedKeys = 0;
        const prefix = `${environment}:`;
        for (const [compositeKey, entry] of this.configStore) {
            if (compositeKey.startsWith(prefix)) {
                checkedKeys++;
                if (entry.value === null || entry.value === undefined) {
                    errors.push(`Key "${entry.key}" has null/undefined value`);
                }
                if (strict && entry.version > this.configVersion) {
                    errors.push(`Key "${entry.key}" has version ${entry.version} exceeding current ${this.configVersion}`);
                }
                const ageMs = Date.now() - entry.lastModified.getTime();
                if (ageMs > 90 * 24 * 60 * 60 * 1000) {
                    warnings.push(`Key "${entry.key}" has not been updated in over 90 days`);
                }
            }
        }
        if (checkedKeys === 0) {
            warnings.push(`No configuration entries found for environment "${environment}"`);
        }
        const valid = errors.length === 0;
        this.logger.log(`Config validation for "${environment}" (schema ${schemaVersion}): ${valid ? 'VALID' : 'INVALID'} — ${errors.length} errors, ${warnings.length} warnings`);
        return {
            valid,
            errors,
            warnings,
            checkedKeys,
        };
    }
    async rollbackConfig(params) {
        const { targetVersion, environment = 'default', dryRun = false } = params;
        if (targetVersion >= this.configVersion) {
            throw new Error(`Target version ${targetVersion} must be less than current version ${this.configVersion}`);
        }
        if (targetVersion < 1) {
            throw new Error('Target version must be at least 1');
        }
        const previousVersion = this.configVersion;
        let changesApplied = 0;
        const prefix = `${environment}:`;
        for (const [compositeKey, entry] of this.configStore) {
            if (compositeKey.startsWith(prefix) && entry.version > targetVersion) {
                changesApplied++;
            }
        }
        if (!dryRun) {
            this.configVersion = targetVersion;
            this.logger.log(`Rolled back config to version ${targetVersion} (${changesApplied} changes reverted)`);
        }
        else {
            this.logger.log(`Dry run: would roll back config to version ${targetVersion} (${changesApplied} changes)`);
        }
        return {
            rolledBack: !dryRun,
            currentVersion: dryRun ? previousVersion : targetVersion,
            previousVersion,
            changesApplied,
        };
    }
};
exports.ConfigurationAgentService = ConfigurationAgentService;
exports.ConfigurationAgentService = ConfigurationAgentService = __decorate([
    (0, common_1.Injectable)()
], ConfigurationAgentService);
//# sourceMappingURL=configuration-agent.service.js.map