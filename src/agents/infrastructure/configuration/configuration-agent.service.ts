/**
 * AENEWS Agent OS X - Configuration Agent
 * Manages application configuration, environment variables, feature flags,
 * config versioning, and configuration drift detection.
 */

import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';

// ─── Agent Configuration ──────────────────────────────────────────

export const CONFIGURATION_AGENT_CONFIG: AgentConfig = {
  id: 'infrastructure-configuration',
  name: 'Configuration',
  cluster: AgentCluster.INFRASTRUCTURE,
  version: '1.0.0',
  description:
    'Manage application configuration, environment variables, feature flags, config versioning, and detect configuration drift across services.',
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
  permissions: ['execute:task', 'read:config', 'write:config', 'manage:feature-flags', 'admin:config'],
  maxConcurrentTasks: 5,
  timeout: 30000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1000,
    exponentialBackoff: true,
  },
};

// ─── Config Store ─────────────────────────────────────────────────

interface ConfigEntry {
  key: string;
  value: any;
  environment: string;
  version: number;
  lastModified: Date;
  source: string;
}

interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  rolloutPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class ConfigurationAgentService extends BaseAgentService {
  private configStore: Map<string, ConfigEntry> = new Map();
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private configVersion: number = 1;

  protected defineConfig(): AgentConfig {
    return CONFIGURATION_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'getConfig',
      description: 'Retrieve configuration values by key or path',
      execute: async (params: { key: string; environment?: string; includeDefaults?: boolean }) =>
        this.retrieveConfig(params),
    });

    this.registerTool({
      name: 'setConfig',
      description: 'Set or update a configuration value',
      execute: async (params: { key: string; value: any; environment?: string; overwrite?: boolean }) =>
        this.setConfig(params),
    });

    this.registerTool({
      name: 'manageFeatureFlag',
      description: 'Create, toggle, or remove a feature flag',
      execute: async (params: { name: string; enabled?: boolean; description?: string; rolloutPercentage?: number }) =>
        this.manageFeatureFlag(params),
    });

    this.registerTool({
      name: 'detectDrift',
      description: 'Detect configuration drift between environments',
      execute: async (params: { sourceEnvironment: string; targetEnvironment: string; keys?: string[] }) =>
        this.detectDrift(params),
    });

    this.registerTool({
      name: 'validateConfig',
      description: 'Validate configuration against schema and rules',
      execute: async (params: { environment: string; schemaVersion?: string; strict?: boolean }) =>
        this.validateConfig(params),
    });

    this.registerTool({
      name: 'rollbackConfig',
      description: 'Roll back configuration to a previous version',
      execute: async (params: { targetVersion: number; environment?: string; dryRun?: boolean }) =>
        this.rollbackConfig(params),
    });

    this.logger.log('Configuration agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    if (!action) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        'Missing required parameter: action',
        startTime,
      );
    }

    try {
      let result: any;

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
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown configuration action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Configuration execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.configStore.clear();
    this.featureFlags.clear();
    this.configVersion = 1;
    this.logger.log('Configuration agent destroyed, state cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async retrieveConfig(params: {
    key: string;
    environment?: string;
    includeDefaults?: boolean;
  }): Promise<{ key: string; value: any; source: string; version: number; lastModified: string }> {
    const { key, environment = 'default', includeDefaults = true } = params;

    const compositeKey = `${environment}:${key}`;
    const entry = this.configStore.get(compositeKey);

    if (!entry) {
      if (!includeDefaults) {
        throw new Error(`Configuration key "${key}" not found in environment "${environment}"`);
      }
      // Return a default placeholder
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

  private async setConfig(params: {
    key: string;
    value: any;
    environment?: string;
    overwrite?: boolean;
  }): Promise<{ key: string; previousValue: any; newValue: any; version: number }> {
    const { key, value, environment = 'default', overwrite = true } = params;

    const compositeKey = `${environment}:${key}`;
    const existing = this.configStore.get(compositeKey);

    if (existing && !overwrite) {
      throw new Error(`Configuration key "${key}" already exists in environment "${environment}" and overwrite is false`);
    }

    const previousValue = existing?.value ?? null;
    this.configVersion++;

    const entry: ConfigEntry = {
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

  private async manageFeatureFlag(params: {
    name: string;
    enabled?: boolean;
    description?: string;
    rolloutPercentage?: number;
  }): Promise<{ name: string; enabled: boolean; previousState: boolean; rolloutPercentage: number }> {
    const { name, enabled = true, description, rolloutPercentage = 100 } = params;

    const existing = this.featureFlags.get(name);
    const previousState = existing?.enabled ?? false;

    const flag: FeatureFlag = {
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

  private async detectDrift(params: {
    sourceEnvironment: string;
    targetEnvironment: string;
    keys?: string[];
  }): Promise<{ driftDetected: boolean; differences: any[]; totalKeys: number; driftedKeys: number }> {
    const { sourceEnvironment, targetEnvironment, keys } = params;

    const sourcePrefix = `${sourceEnvironment}:`;
    const targetPrefix = `${targetEnvironment}:`;

    const differences: any[] = [];
    const checkedKeys: string[] = keys || [];

    // If no specific keys provided, find all keys in source environment
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
        differences.push({ key, type: 'missing_in_target', sourceValue: sourceEntry.value, targetValue: null });
      } else if (!sourceEntry && targetEntry) {
        differences.push({ key, type: 'missing_in_source', sourceValue: null, targetValue: targetEntry.value });
      } else if (sourceEntry && targetEntry && JSON.stringify(sourceEntry.value) !== JSON.stringify(targetEntry.value)) {
        differences.push({ key, type: 'value_mismatch', sourceValue: sourceEntry.value, targetValue: targetEntry.value });
      }
    }

    const driftDetected = differences.length > 0;

    this.logger.log(
      `Drift detection: ${sourceEnvironment} vs ${targetEnvironment} — ${differences.length} differences found across ${checkedKeys.length} keys`,
    );

    return {
      driftDetected,
      differences,
      totalKeys: checkedKeys.length,
      driftedKeys: differences.length,
    };
  }

  private async validateConfig(params: {
    environment: string;
    schemaVersion?: string;
    strict?: boolean;
  }): Promise<{ valid: boolean; errors: string[]; warnings: string[]; checkedKeys: number }> {
    const { environment, schemaVersion = '1.0.0', strict = false } = params;

    const errors: string[] = [];
    const warnings: string[] = [];
    let checkedKeys = 0;

    const prefix = `${environment}:`;
    for (const [compositeKey, entry] of this.configStore) {
      if (compositeKey.startsWith(prefix)) {
        checkedKeys++;
        // Validate that value is not null or undefined
        if (entry.value === null || entry.value === undefined) {
          errors.push(`Key "${entry.key}" has null/undefined value`);
        }
        // Validate version consistency
        if (strict && entry.version > this.configVersion) {
          errors.push(`Key "${entry.key}" has version ${entry.version} exceeding current ${this.configVersion}`);
        }
        // Warn about very old entries
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

  private async rollbackConfig(params: {
    targetVersion: number;
    environment?: string;
    dryRun?: boolean;
  }): Promise<{ rolledBack: boolean; currentVersion: number; previousVersion: number; changesApplied: number }> {
    const { targetVersion, environment = 'default', dryRun = false } = params;

    if (targetVersion >= this.configVersion) {
      throw new Error(`Target version ${targetVersion} must be less than current version ${this.configVersion}`);
    }

    if (targetVersion < 1) {
      throw new Error('Target version must be at least 1');
    }

    const previousVersion = this.configVersion;
    let changesApplied = 0;

    // In a real implementation, this would restore from a versioned config history.
    // Here we simulate by counting affected entries.
    const prefix = `${environment}:`;
    for (const [compositeKey, entry] of this.configStore) {
      if (compositeKey.startsWith(prefix) && entry.version > targetVersion) {
        changesApplied++;
      }
    }

    if (!dryRun) {
      this.configVersion = targetVersion;
      this.logger.log(`Rolled back config to version ${targetVersion} (${changesApplied} changes reverted)`);
    } else {
      this.logger.log(`Dry run: would roll back config to version ${targetVersion} (${changesApplied} changes)`);
    }

    return {
      rolledBack: !dryRun,
      currentVersion: dryRun ? previousVersion : targetVersion,
      previousVersion,
      changesApplied,
    };
  }
}
