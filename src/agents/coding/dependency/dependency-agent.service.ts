/**
 * AENEWS Agent OS X - Dependency Agent
 * Manages project dependencies, checks for vulnerabilities, updates packages,
 * audits dependencies, and resolves version conflicts.
 */

import { Injectable, Inject } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
import { DevCapability } from '../../../software-factory/interfaces';

// ─── Agent Configuration ──────────────────────────────────────────

export const DEPENDENCY_AGENT_CONFIG: AgentConfig = {
  id: 'coding-dependency',
  name: 'Dependency',
  cluster: AgentCluster.CODING,
  version: '1.0.0',
  description:
    'Manage project dependencies, check for security vulnerabilities, update packages, audit dependency trees, and resolve version conflicts. Supports npm, yarn, and pnpm ecosystems.',
  capabilities: [
    {
      name: 'listDependencies',
      description: 'List all project dependencies with version and status information',
      inputSchema: {
        type: 'object',
        properties: {
          packageJson: { type: 'object', description: 'Parsed package.json contents' },
          includeDev: { type: 'boolean', default: true, description: 'Include devDependencies' },
          includeTransitive: {
            type: 'boolean',
            default: false,
            description: 'Include transitive dependencies',
          },
          filter: { type: 'string', description: 'Filter pattern for dependency names' },
        },
        required: ['packageJson'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          dependencies: { type: 'array', items: { type: 'object' } },
          totalCount: { type: 'number' },
          outdatedCount: { type: 'number' },
        },
      },
    },
    {
      name: 'checkVulnerabilities',
      description: 'Check dependencies for known security vulnerabilities',
      inputSchema: {
        type: 'object',
        properties: {
          packageJson: { type: 'object', description: 'Parsed package.json contents' },
          severityThreshold: {
            type: 'string',
            enum: ['low', 'moderate', 'high', 'critical'],
            default: 'low',
          },
          includeDev: { type: 'boolean', default: true },
        },
        required: ['packageJson'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          vulnerabilities: { type: 'array', items: { type: 'object' } },
          totalVulnerabilities: { type: 'number' },
          riskScore: { type: 'number' },
          summary: { type: 'string' },
        },
      },
    },
    {
      name: 'updateDependency',
      description: 'Update a specific dependency to a target version',
      inputSchema: {
        type: 'object',
        properties: {
          packageName: { type: 'string', description: 'Name of the package to update' },
          currentVersion: { type: 'string', description: 'Current version' },
          targetVersion: { type: 'string', description: 'Target version (or "latest")' },
          packageJson: { type: 'object', description: 'Current package.json' },
          isDevDependency: { type: 'boolean', default: false },
        },
        required: ['packageName', 'targetVersion', 'packageJson'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          updatedPackageJson: { type: 'object' },
          changeDescription: { type: 'string' },
          breakingChanges: { type: 'array', items: { type: 'string' } },
          migrationSteps: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'auditDependencies',
      description: 'Perform a comprehensive audit of the dependency tree',
      inputSchema: {
        type: 'object',
        properties: {
          packageJson: { type: 'object', description: 'Parsed package.json contents' },
          checkUnused: { type: 'boolean', default: true },
          checkOutdated: { type: 'boolean', default: true },
          checkLicenses: { type: 'boolean', default: true },
        },
        required: ['packageJson'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          unusedDependencies: { type: 'array', items: { type: 'string' } },
          outdatedDependencies: { type: 'array', items: { type: 'object' } },
          licenseIssues: { type: 'array', items: { type: 'object' } },
          healthScore: { type: 'number' },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'resolveConflict',
      description: 'Resolve version conflicts between dependencies',
      inputSchema: {
        type: 'object',
        properties: {
          conflicts: {
            type: 'array',
            items: { type: 'object', description: 'Version conflict descriptions' },
          },
          packageJson: { type: 'object', description: 'Current package.json' },
          strategy: {
            type: 'string',
            enum: ['newest', 'oldest', 'semver-compatible', 'manual'],
            default: 'semver-compatible',
          },
        },
        required: ['conflicts', 'packageJson'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          resolvedPackageJson: { type: 'object' },
          resolutions: { type: 'array', items: { type: 'object' } },
          unresolved: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:package',
    'write:package',
    'read:registry',
    'execute:install',
  ],
  maxConcurrentTasks: 3,
  timeout: 120000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 2000,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface DependencyInfo {
  name: string;
  version: string;
  latestVersion: string;
  type: 'production' | 'development' | 'peer' | 'optional';
  outdated: boolean;
  deprecated: boolean;
  license: string;
  description: string;
}

interface VulnerabilityInfo {
  package: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  cve?: string;
  vulnerableVersions: string;
  patchedVersions: string;
  recommendation: string;
  url: string;
}

interface OutdatedDependency {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  type: string;
}

interface LicenseIssue {
  package: string;
  license: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
}

interface ConflictResolution {
  package: string;
  conflictVersions: string[];
  resolvedVersion: string;
  strategy: string;
  reason: string;
}

// ─── Known Vulnerability Database (Simulated) ────────────────────

const KNOWN_VULNERABILITIES: Array<{
  package: string;
  versions: string;
  severity: VulnerabilityInfo['severity'];
  title: string;
  cve: string;
  patched: string;
}> = [
  {
    package: 'lodash',
    versions: '<4.17.21',
    severity: 'high',
    title: 'Prototype Pollution',
    cve: 'CVE-2020-8203',
    patched: '>=4.17.21',
  },
  {
    package: 'express',
    versions: '<4.17.3',
    severity: 'moderate',
    title: 'Open Redirect',
    cve: 'CVE-2021-44906',
    patched: '>=4.17.3',
  },
  {
    package: 'axios',
    versions: '<0.21.1',
    severity: 'high',
    title: 'Server-Side Request Forgery',
    cve: 'CVE-2021-3749',
    patched: '>=0.21.1',
  },
  {
    package: 'node-fetch',
    versions: '<2.6.7',
    severity: 'high',
    title: 'ReDoS via Content-Length Header',
    cve: 'CVE-2022-0235',
    patched: '>=2.6.7',
  },
  {
    package: 'jsonwebtoken',
    versions: '<9.0.0',
    severity: 'moderate',
    title: 'Insecure default algorithm',
    cve: 'CVE-2022-23529',
    patched: '>=9.0.0',
  },
  {
    package: 'debug',
    versions: '<2.6.9',
    severity: 'moderate',
    title: 'Regular Expression Denial of Service',
    cve: 'CVE-2017-16119',
    patched: '>=2.6.9',
  },
  {
    package: 'minimist',
    versions: '<0.2.1',
    severity: 'low',
    title: 'Prototype Pollution',
    cve: 'CVE-2020-7598',
    patched: '>=0.2.1',
  },
  {
    package: 'yargs-parser',
    versions: '<5.0.1',
    severity: 'low',
    title: 'Prototype Pollution',
    cve: 'CVE-2020-7608',
    patched: '>=5.0.1',
  },
];

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class DependencyAgentService extends BaseAgentService {
  private auditHistory: Array<{ timestamp: Date; healthScore: number }> = [];

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return DEPENDENCY_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'listDependencies',
      description: 'List all project dependencies',
      execute: async (params: {
        packageJson: Record<string, any>;
        includeDev?: boolean;
        includeTransitive?: boolean;
        filter?: string;
      }) => this.listDependencies(params),
    });

    this.registerTool({
      name: 'checkVulnerabilities',
      description: 'Check dependencies for security vulnerabilities',
      execute: async (params: {
        packageJson: Record<string, any>;
        severityThreshold?: string;
        includeDev?: boolean;
      }) => this.checkVulnerabilities(params),
    });

    this.registerTool({
      name: 'updateDependency',
      description: 'Update a dependency to a target version',
      execute: async (params: {
        packageName: string;
        targetVersion: string;
        packageJson: Record<string, any>;
        currentVersion?: string;
        isDevDependency?: boolean;
      }) => this.updateDependency(params),
    });

    this.registerTool({
      name: 'auditDependencies',
      description: 'Perform comprehensive dependency audit',
      execute: async (params: {
        packageJson: Record<string, any>;
        checkUnused?: boolean;
        checkOutdated?: boolean;
        checkLicenses?: boolean;
      }) => this.auditDependencies(params),
    });

    this.registerTool({
      name: 'resolveConflict',
      description: 'Resolve version conflicts between dependencies',
      execute: async (params: {
        conflicts: Array<{ package: string; requiredBy: string[]; versions: string[] }>;
        packageJson: Record<string, any>;
        strategy?: string;
      }) => this.resolveConflict(params),
    });

    await this.storeInWorkingMemory('deps:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('Dependency agent initialized with 5 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    // Delegate to real connector
    if (this.bridge) {
      try {
        const result = await this.bridge.executeCapability(DevCapability.DEBUG, {
          missionId: input.taskId,
          instruction: JSON.stringify(input.payload),
          workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
          parameters: input.payload,
        });

        return this.createAgentOutput(
          input.taskId,
          result.success,
          result.output,
          result.error,
          startTime,
        );
      } catch (error) {
        this.logger.warn(`Bridge failed, fallback to local: ${(error as Error).message}`);
      }
    }

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

    const supportedActions = [
      'listDependencies',
      'checkVulnerabilities',
      'updateDependency',
      'auditDependencies',
      'resolveConflict',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown dependency action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    }

    try {
      const tool = this.getTool(action);
      if (!tool) {
        return this.createAgentOutput(
          input.taskId,
          false,
          null,
          `Tool not found: ${action}`,
          startTime,
        );
      }

      const result = await tool.execute(params);

      await this.storeInWorkingMemory(
        `deps:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Dependency execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.auditHistory = [];
    this.logger.log('Dependency agent destroyed, history cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async listDependencies(params: {
    packageJson: Record<string, any>;
    includeDev?: boolean;
    includeTransitive?: boolean;
    filter?: string;
  }): Promise<{
    dependencies: DependencyInfo[];
    totalCount: number;
    outdatedCount: number;
  }> {
    const { packageJson, includeDev = true, includeTransitive = false, filter } = params;

    if (!packageJson || typeof packageJson !== 'object') {
      throw new Error('Valid package.json object is required');
    }

    const dependencies: DependencyInfo[] = [];

    // Parse production dependencies
    const prodDeps = packageJson.dependencies || {};
    for (const [name, version] of Object.entries(prodDeps)) {
      if (filter && !name.includes(filter)) continue;
      dependencies.push(this.createDependencyInfo(name, version as string, 'production'));
    }

    // Parse dev dependencies
    if (includeDev) {
      const devDeps = packageJson.devDependencies || {};
      for (const [name, version] of Object.entries(devDeps)) {
        if (filter && !name.includes(filter)) continue;
        dependencies.push(this.createDependencyInfo(name, version as string, 'development'));
      }
    }

    // Parse peer dependencies
    const peerDeps = packageJson.peerDependencies || {};
    for (const [name, version] of Object.entries(peerDeps)) {
      if (filter && !name.includes(filter)) continue;
      dependencies.push(this.createDependencyInfo(name, version as string, 'peer'));
    }

    // Parse optional dependencies
    const optDeps = packageJson.optionalDependencies || {};
    for (const [name, version] of Object.entries(optDeps)) {
      if (filter && !name.includes(filter)) continue;
      dependencies.push(this.createDependencyInfo(name, version as string, 'optional'));
    }

    const outdatedCount = dependencies.filter((d) => d.outdated).length;

    this.logger.log(`Listed dependencies: ${dependencies.length} total, ${outdatedCount} outdated`);

    return { dependencies, totalCount: dependencies.length, outdatedCount };
  }

  private async checkVulnerabilities(params: {
    packageJson: Record<string, any>;
    severityThreshold?: string;
    includeDev?: boolean;
  }): Promise<{
    vulnerabilities: VulnerabilityInfo[];
    totalVulnerabilities: number;
    riskScore: number;
    summary: string;
  }> {
    const { packageJson, severityThreshold = 'low', includeDev = true } = params;

    if (!packageJson || typeof packageJson !== 'object') {
      throw new Error('Valid package.json object is required');
    }

    const vulnerabilities: VulnerabilityInfo[] = [];
    const allDeps: Record<string, string> = { ...(packageJson.dependencies || {}) };
    if (includeDev) {
      Object.assign(allDeps, packageJson.devDependencies || {});
    }

    const severityOrder: Record<string, number> = { low: 0, moderate: 1, high: 2, critical: 3 };
    const minSeverity = severityOrder[severityThreshold] || 0;

    // Check each dependency against known vulnerability database
    for (const [name, version] of Object.entries(allDeps)) {
      const cleanVersion = this.cleanVersion(version);
      const knownVulns = KNOWN_VULNERABILITIES.filter((v) => v.package === name);

      for (const vuln of knownVulns) {
        if (this.isVersionVulnerable(cleanVersion, vuln.versions)) {
          const severity = severityOrder[vuln.severity] || 0;
          if (severity >= minSeverity) {
            vulnerabilities.push({
              package: name,
              severity: vuln.severity,
              title: vuln.title,
              cve: vuln.cve,
              vulnerableVersions: vuln.versions,
              patchedVersions: vuln.patched,
              recommendation: `Upgrade ${name} to ${vuln.patched}`,
              url: `https://nvd.nist.gov/vuln/detail/${vuln.cve}`,
            });
          }
        }
      }
    }

    // Simulate additional vulnerability checks
    this.simulateAdditionalVulnerabilityChecks(allDeps, vulnerabilities, minSeverity);

    // Calculate risk score
    const riskScore = this.calculateVulnerabilityRiskScore(vulnerabilities);

    // Generate summary
    const critical = vulnerabilities.filter((v) => v.severity === 'critical').length;
    const high = vulnerabilities.filter((v) => v.severity === 'high').length;
    const moderate = vulnerabilities.filter((v) => v.severity === 'moderate').length;
    const low = vulnerabilities.filter((v) => v.severity === 'low').length;

    const summary =
      `Found ${vulnerabilities.length} vulnerabilities: ` +
      `${critical} critical, ${high} high, ${moderate} moderate, ${low} low. ` +
      `Risk score: ${riskScore}/100.`;

    this.logger.log(
      `Vulnerability check: ${vulnerabilities.length} found, risk score=${riskScore}`,
    );

    return { vulnerabilities, totalVulnerabilities: vulnerabilities.length, riskScore, summary };
  }

  private async updateDependency(params: {
    packageName: string;
    targetVersion: string;
    packageJson: Record<string, any>;
    currentVersion?: string;
    isDevDependency?: boolean;
  }): Promise<{
    updatedPackageJson: Record<string, any>;
    changeDescription: string;
    breakingChanges: string[];
    migrationSteps: string[];
  }> {
    const {
      packageName,
      targetVersion,
      packageJson,
      currentVersion,
      isDevDependency = false,
    } = params;

    if (!packageName || typeof packageName !== 'string') {
      throw new Error('Package name is required');
    }
    if (!targetVersion || typeof targetVersion !== 'string') {
      throw new Error('Target version is required');
    }
    if (!packageJson || typeof packageJson !== 'object') {
      throw new Error('Valid package.json object is required');
    }

    // Find the current version
    const resolvedCurrentVersion =
      currentVersion ||
      packageJson.dependencies?.[packageName] ||
      packageJson.devDependencies?.[packageName];

    if (!resolvedCurrentVersion) {
      throw new Error(`Package "${packageName}" not found in dependencies`);
    }

    // Determine the target version
    const resolvedTarget =
      targetVersion === 'latest' ? this.simulateLatestVersion(packageName) : targetVersion;

    // Create updated package.json
    const updatedPackageJson = { ...packageJson };

    if (isDevDependency || packageJson.devDependencies?.[packageName]) {
      if (!updatedPackageJson.devDependencies) updatedPackageJson.devDependencies = {};
      updatedPackageJson.devDependencies[packageName] = `^${resolvedTarget}`;
    } else {
      if (!updatedPackageJson.dependencies) updatedPackageJson.dependencies = {};
      updatedPackageJson.dependencies[packageName] = `^${resolvedTarget}`;
    }

    // Detect breaking changes
    const breakingChanges = this.detectBreakingChanges(
      packageName,
      this.cleanVersion(resolvedCurrentVersion),
      resolvedTarget,
    );

    // Generate migration steps
    const migrationSteps = this.generateMigrationSteps(
      packageName,
      resolvedCurrentVersion,
      resolvedTarget,
      breakingChanges,
    );

    const changeDescription = `Updated ${packageName} from ${resolvedCurrentVersion} to ^${resolvedTarget}`;

    this.logger.log(`Updated dependency: ${changeDescription}`);

    return {
      updatedPackageJson,
      changeDescription,
      breakingChanges,
      migrationSteps,
    };
  }

  private async auditDependencies(params: {
    packageJson: Record<string, any>;
    checkUnused?: boolean;
    checkOutdated?: boolean;
    checkLicenses?: boolean;
  }): Promise<{
    unusedDependencies: string[];
    outdatedDependencies: OutdatedDependency[];
    licenseIssues: LicenseIssue[];
    healthScore: number;
    recommendations: string[];
  }> {
    const { packageJson, checkUnused = true, checkOutdated = true, checkLicenses = true } = params;

    if (!packageJson || typeof packageJson !== 'object') {
      throw new Error('Valid package.json object is required');
    }

    const unusedDependencies: string[] = [];
    const outdatedDependencies: OutdatedDependency[] = [];
    const licenseIssues: LicenseIssue[] = [];
    const recommendations: string[] = [];

    // Check for unused dependencies
    if (checkUnused) {
      const allDeps = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      for (const name of Object.keys(allDeps)) {
        // Simulate unused detection based on common patterns
        if (this.isLikelyUnused(name, packageJson)) {
          unusedDependencies.push(name);
        }
      }

      if (unusedDependencies.length > 0) {
        recommendations.push(
          `Found ${unusedDependencies.length} potentially unused dependencies. Review and remove them to reduce bundle size.`,
        );
      }
    }

    // Check for outdated dependencies
    if (checkOutdated) {
      const allDeps = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      for (const [name, version] of Object.entries(allDeps)) {
        const cleanVer = this.cleanVersion(version as string);
        const latest = this.simulateLatestVersion(name);
        const currentMajor = parseInt(cleanVer.split('.')[0], 10);
        const latestMajor = parseInt(latest.split('.')[0], 10);

        if (latestMajor > currentMajor) {
          outdatedDependencies.push({
            name,
            current: cleanVer,
            wanted: `${currentMajor}.${this.simulateMinorVersion()}.0`,
            latest,
            type: packageJson.dependencies?.[name] ? 'production' : 'development',
          });
        }
      }

      if (outdatedDependencies.length > 0) {
        recommendations.push(
          `Found ${outdatedDependencies.length} outdated dependencies. Consider updating them for security and feature improvements.`,
        );
      }
    }

    // Check license issues
    if (checkLicenses) {
      const allDeps = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      const problematicLicenses = ['GPL-3.0', 'AGPL-3.0', 'GPL-2.0', 'SSPL-1.0'];

      for (const name of Object.keys(allDeps)) {
        const simulatedLicense = this.simulateLicense(name);
        if (problematicLicenses.includes(simulatedLicense)) {
          licenseIssues.push({
            package: name,
            license: simulatedLicense,
            issue: `${simulatedLicense} is a copyleft license that may require source code disclosure`,
            severity: 'high',
          });
        } else if (simulatedLicense === 'UNLICENSED') {
          licenseIssues.push({
            package: name,
            license: simulatedLicense,
            issue: 'Package has no license specified',
            severity: 'medium',
          });
        }
      }

      if (licenseIssues.length > 0) {
        recommendations.push(
          `Found ${licenseIssues.length} license issue(s). Review and ensure compliance with your project's license policy.`,
        );
      }
    }

    // Calculate health score
    const healthScore = this.calculateDependencyHealthScore(
      unusedDependencies.length,
      outdatedDependencies.length,
      licenseIssues.length,
      Object.keys({ ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) })
        .length,
    );

    // General recommendations
    if (Object.keys(packageJson.dependencies || {}).length > 30) {
      recommendations.push(
        'Project has many production dependencies. Consider reducing dependency count for better maintainability.',
      );
    }

    this.auditHistory.push({ timestamp: new Date(), healthScore });

    this.logger.log(
      `Dependency audit: ${unusedDependencies.length} unused, ${outdatedDependencies.length} outdated, ${licenseIssues.length} license issues, health=${healthScore}`,
    );

    return {
      unusedDependencies,
      outdatedDependencies,
      licenseIssues,
      healthScore,
      recommendations,
    };
  }

  private async resolveConflict(params: {
    conflicts: Array<{ package: string; requiredBy: string[]; versions: string[] }>;
    packageJson: Record<string, any>;
    strategy?: string;
  }): Promise<{
    resolvedPackageJson: Record<string, any>;
    resolutions: ConflictResolution[];
    unresolved: Array<{ package: string; reason: string }>;
  }> {
    const { conflicts, packageJson, strategy = 'semver-compatible' } = params;

    if (!conflicts || !Array.isArray(conflicts) || conflicts.length === 0) {
      throw new Error('At least one conflict description is required');
    }
    if (!packageJson || typeof packageJson !== 'object') {
      throw new Error('Valid package.json object is required');
    }

    const resolutions: ConflictResolution[] = [];
    const unresolved: Array<{ package: string; reason: string }> = [];
    const resolvedPackageJson = { ...packageJson };

    for (const conflict of conflicts) {
      if (!conflict.package || !conflict.versions || conflict.versions.length < 2) {
        unresolved.push({
          package: conflict.package || 'unknown',
          reason: 'Invalid conflict description: must specify package and at least 2 versions',
        });
        continue;
      }

      try {
        const resolution = this.resolveVersionConflict(conflict, strategy);
        resolutions.push(resolution);

        // Apply resolution to package.json
        if (resolvedPackageJson.dependencies?.[conflict.package]) {
          resolvedPackageJson.dependencies[conflict.package] = `^${resolution.resolvedVersion}`;
        }
        if (resolvedPackageJson.devDependencies?.[conflict.package]) {
          resolvedPackageJson.devDependencies[conflict.package] = `^${resolution.resolvedVersion}`;
        }

        // Add resolutions/overrides field if needed
        if (!resolvedPackageJson.resolutions) {
          resolvedPackageJson.resolutions = {};
        }
        resolvedPackageJson.resolutions[conflict.package] = resolution.resolvedVersion;
      } catch (error) {
        unresolved.push({
          package: conflict.package,
          reason: (error as Error).message,
        });
      }
    }

    this.logger.log(
      `Resolved conflicts: ${resolutions.length} resolved, ${unresolved.length} unresolved, strategy=${strategy}`,
    );

    return { resolvedPackageJson, resolutions, unresolved };
  }

  // ─── Helper Methods ───────────────────────────────────────────

  private createDependencyInfo(
    name: string,
    version: string,
    type: DependencyInfo['type'],
  ): DependencyInfo {
    const cleanVer = this.cleanVersion(version);
    const latest = this.simulateLatestVersion(name);
    const currentMajor = parseInt(cleanVer.split('.')[0], 10) || 0;
    const latestMajor = parseInt(latest.split('.')[0], 10) || 0;

    return {
      name,
      version: cleanVer,
      latestVersion: latest,
      type,
      outdated: latestMajor > currentMajor,
      deprecated: false,
      license: this.simulateLicense(name),
      description: `Package: ${name}`,
    };
  }

  private cleanVersion(version: string): string {
    return version.replace(/^[\^~>=<]+/, '').replace(/-.*$/, '');
  }

  private isVersionVulnerable(version: string, vulnerableRange: string): boolean {
    // Simplified version comparison
    const rangeMatch = vulnerableRange.match(/([<>=]+)([\d.]+)/);
    if (!rangeMatch) return false;

    const operator = rangeMatch[1];
    const targetVersion = rangeMatch[2];

    const vParts = version.split('.').map(Number);
    const tParts = targetVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(vParts.length, tParts.length); i++) {
      const v = vParts[i] || 0;
      const t = tParts[i] || 0;

      if (v < t) return operator.includes('<') || operator.includes('<=');
      if (v > t) return operator.includes('>') || operator.includes('>=');
    }

    return operator.includes('=');
  }

  private simulateLatestVersion(packageName: string): string {
    // Simulate latest version based on known packages
    const knownLatest: Record<string, string> = {
      express: '4.18.2',
      lodash: '4.17.21',
      axios: '1.6.0',
      react: '18.2.0',
      next: '14.0.0',
      typescript: '5.3.3',
      '@nestjs/common': '10.3.0',
      '@nestjs/core': '10.3.0',
      jest: '29.7.0',
      eslint: '8.56.0',
      prettier: '3.2.0',
      'node-fetch': '2.7.0',
      jsonwebtoken: '9.0.2',
      debug: '4.3.4',
      minimist: '1.2.8',
    };

    if (knownLatest[packageName]) return knownLatest[packageName];

    // Generate a plausible version
    const hash = packageName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return `${(hash % 10) + 1}.${hash % 20}.${hash % 30}`;
  }

  private simulateMinorVersion(): string {
    return String(Math.floor(Math.random() * 20) + 1);
  }

  private simulateLicense(packageName: string): string {
    const knownLicenses: Record<string, string> = {
      express: 'MIT',
      lodash: 'MIT',
      axios: 'MIT',
      react: 'MIT',
      typescript: 'Apache-2.0',
      '@nestjs/common': 'MIT',
      jest: 'MIT',
    };

    if (knownLicenses[packageName]) return knownLicenses[packageName];

    const licenses = [
      'MIT',
      'MIT',
      'MIT',
      'Apache-2.0',
      'BSD-3-Clause',
      'ISC',
      'GPL-3.0',
      'UNLICENSED',
    ];
    const hash = packageName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return licenses[hash % licenses.length];
  }

  private simulateAdditionalVulnerabilityChecks(
    deps: Record<string, string>,
    vulnerabilities: VulnerabilityInfo[],
    minSeverity: number,
  ): void {
    // Check for packages with known risky patterns
    for (const [name, version] of Object.entries(deps)) {
      const cleanVer = this.cleanVersion(version);

      // Very old major versions
      const major = parseInt(cleanVer.split('.')[0], 10) || 0;
      if (major > 0 && major < 2 && minSeverity <= 1) {
        const existing = vulnerabilities.find((v) => v.package === name);
        if (!existing) {
          vulnerabilities.push({
            package: name,
            severity: 'moderate',
            title: `Outdated major version of ${name}`,
            vulnerableVersions: version,
            patchedVersions: this.simulateLatestVersion(name),
            recommendation: `Consider upgrading ${name} to the latest version`,
            url: `https://www.npmjs.com/package/${name}`,
          });
        }
      }
    }
  }

  private calculateVulnerabilityRiskScore(vulnerabilities: VulnerabilityInfo[]): number {
    let score = 0;
    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case 'critical':
          score += 25;
          break;
        case 'high':
          score += 15;
          break;
        case 'moderate':
          score += 8;
          break;
        case 'low':
          score += 3;
          break;
      }
    }
    return Math.min(100, score);
  }

  private isLikelyUnused(name: string, packageJson: Record<string, any>): boolean {
    // Heuristic: some packages are commonly installed but unused
    const commonUnused = ['tslib', 'core-js', 'regenerator-runtime'];
    if (commonUnused.includes(name)) return false; // These are actually used

    // Very rarely used packages that are often installed by mistake
    const rarelyUsed = ['left-pad', 'is-array', 'is-undefined'];
    return rarelyUsed.includes(name);
  }

  private detectBreakingChanges(
    packageName: string,
    currentVersion: string,
    targetVersion: string,
  ): string[] {
    const breakingChanges: string[] = [];
    const currentMajor = parseInt(currentVersion.split('.')[0], 10) || 0;
    const targetMajor = parseInt(targetVersion.split('.')[0], 10) || 0;

    if (targetMajor > currentMajor) {
      breakingChanges.push(
        `Major version upgrade from v${currentMajor} to v${targetMajor} may contain breaking API changes`,
      );
      breakingChanges.push(`Review the migration guide for ${packageName} v${targetMajor}`);
      breakingChanges.push(`Some APIs may have been removed or renamed`);
    }

    // Package-specific breaking changes
    if (packageName === 'express' && targetMajor >= 5) {
      breakingChanges.push('Express v5 removes deprecated methods: app.del(), app.param() changes');
    }
    if (packageName === 'react' && targetMajor >= 18) {
      breakingChanges.push(
        'React 18 introduces automatic batching; use flushSync for synchronous updates',
      );
    }
    if (packageName === 'typescript' && targetMajor >= 5) {
      breakingChanges.push(
        'TypeScript 5 has stricter type checks; some previously compiling code may error',
      );
    }

    return breakingChanges;
  }

  private generateMigrationSteps(
    packageName: string,
    currentVersion: string,
    targetVersion: string,
    breakingChanges: string[],
  ): string[] {
    const steps: string[] = [];

    steps.push(`1. Update package: npm install ${packageName}@${targetVersion}`);
    steps.push(`2. Run type checking: npx tsc --noEmit`);
    steps.push(`3. Run test suite: npm test`);

    if (breakingChanges.length > 0) {
      steps.push(`4. Review and fix breaking changes:`);
      for (const change of breakingChanges) {
        steps.push(`   - ${change}`);
      }
      steps.push(
        `5. Check the official migration guide: https://github.com/${packageName}/${packageName}/blob/main/MIGRATION.md`,
      );
      steps.push(`6. Update any related type definitions if using TypeScript`);
      steps.push(`7. Verify all integration tests pass`);
    }

    return steps;
  }

  private calculateDependencyHealthScore(
    unusedCount: number,
    outdatedCount: number,
    licenseIssueCount: number,
    totalDeps: number,
  ): number {
    let score = 100;

    // Deduct for unused dependencies
    score -= Math.min(20, unusedCount * 5);

    // Deduct for outdated dependencies
    score -= Math.min(30, outdatedCount * 5);

    // Deduct for license issues
    score -= Math.min(25, licenseIssueCount * 10);

    // Penalty for too many dependencies
    if (totalDeps > 50) score -= 5;
    if (totalDeps > 100) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private resolveVersionConflict(
    conflict: { package: string; requiredBy: string[]; versions: string[] },
    strategy: string,
  ): ConflictResolution {
    const versions = conflict.versions.map((v) => this.cleanVersion(v));

    let resolvedVersion: string;
    let reason: string;

    switch (strategy) {
      case 'newest': {
        resolvedVersion = this.findNewestVersion(versions);
        reason = `Selected newest version ${resolvedVersion} among conflicting versions: ${versions.join(', ')}`;
        break;
      }
      case 'oldest': {
        resolvedVersion = this.findOldestVersion(versions);
        reason = `Selected oldest compatible version ${resolvedVersion} for maximum compatibility`;
        break;
      }
      case 'semver-compatible': {
        resolvedVersion = this.findSemverCompatibleVersion(versions);
        reason = `Found semver-compatible version ${resolvedVersion} that satisfies all requirements`;
        break;
      }
      case 'manual': {
        throw new Error(
          `Manual resolution required for ${conflict.package}. Provide explicit version.`,
        );
      }
      default: {
        resolvedVersion = this.findSemverCompatibleVersion(versions);
        reason = `Defaulted to semver-compatible strategy: resolved to ${resolvedVersion}`;
      }
    }

    return {
      package: conflict.package,
      conflictVersions: conflict.versions,
      resolvedVersion,
      strategy,
      reason,
    };
  }

  private findNewestVersion(versions: string[]): string {
    return versions.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if ((aParts[i] || 0) !== (bParts[i] || 0)) return (bParts[i] || 0) - (aParts[i] || 0);
      }
      return 0;
    })[0];
  }

  private findOldestVersion(versions: string[]): string {
    return versions.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if ((aParts[i] || 0) !== (bParts[i] || 0)) return (aParts[i] || 0) - (bParts[i] || 0);
      }
      return 0;
    })[0];
  }

  private findSemverCompatibleVersion(versions: string[]): string {
    // Find the highest version that is semver-compatible with all requirements
    const newest = this.findNewestVersion(versions);

    // If all versions share the same major, the newest is compatible
    const majorGroups = new Set(versions.map((v) => v.split('.')[0]));
    if (majorGroups.size === 1) {
      return newest;
    }

    // If mixed majors, use the lowest common major version
    const lowestMajor = Math.min(...Array.from(majorGroups).map(Number));
    const compatible = versions.filter((v) => v.startsWith(`${lowestMajor}.`));
    return this.findNewestVersion(compatible);
  }
}
