/**
 * AENEWS Agent OS X - Meta Governance Agent
 * System governance, policy enforcement, and compliance for the Meta Intelligence cluster.
 * Handles policy enforcement, compliance auditing, governance review,
 * policy updates, governance reporting, and exception management.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';

// ─── Agent Configuration ──────────────────────────────────────────

export const META_GOVERNANCE_AGENT_CONFIG: AgentConfig = {
  id: 'meta-governance',
  name: 'MetaGovernance',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '1.0.0',
  description:
    'Governance agent that enforces policies, audits compliance, reviews governance, updates policies, generates governance reports, and manages exceptions across the Meta Intelligence cluster.',
  capabilities: [
    {
      name: 'enforcePolicy',
      description: 'Enforce a specific policy on agent behavior',
      inputSchema: {
        type: 'object',
        properties: {
          policyId: { type: 'string' },
          target: { type: 'string' },
          action: { type: 'string' },
        },
        required: ['policyId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          enforced: { type: 'boolean' },
          policyId: { type: 'string' },
          violations: { type: 'number' },
          enforcementId: { type: 'string' },
        },
      },
    },
    {
      name: 'auditCompliance',
      description: 'Audit compliance across agents and operations',
      inputSchema: {
        type: 'object',
        properties: {
          scope: { type: 'string' },
          policies: { type: 'array', items: { type: 'string' } },
        },
        required: [],
      },
      outputSchema: {
        type: 'object',
        properties: {
          auditId: { type: 'string' },
          complianceScore: { type: 'number' },
          violations: { type: 'array', items: { type: 'object' } },
          compliant: { type: 'boolean' },
        },
      },
    },
    {
      name: 'reviewGovernance',
      description: 'Review the overall governance framework',
      inputSchema: {
        type: 'object',
        properties: { scope: { type: 'string' }, depth: { type: 'string' } },
        required: [],
      },
      outputSchema: {
        type: 'object',
        properties: {
          reviewId: { type: 'string' },
          findings: { type: 'array', items: { type: 'object' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          overallRating: { type: 'string' },
        },
      },
    },
    {
      name: 'updatePolicy',
      description: 'Update an existing policy or create a new one',
      inputSchema: {
        type: 'object',
        properties: {
          policyId: { type: 'string' },
          changes: { type: 'object' },
          reason: { type: 'string' },
        },
        required: ['policyId', 'changes'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          updated: { type: 'boolean' },
          policyId: { type: 'string' },
          version: { type: 'string' },
          updateId: { type: 'string' },
        },
      },
    },
    {
      name: 'generateGovernanceReport',
      description: 'Generate a comprehensive governance report',
      inputSchema: {
        type: 'object',
        properties: {
          period: { type: 'string' },
          includeViolations: { type: 'boolean' },
          includeRecommendations: { type: 'boolean' },
        },
        required: [],
      },
      outputSchema: {
        type: 'object',
        properties: {
          reportId: { type: 'string' },
          summary: { type: 'object' },
          metrics: { type: 'object' },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'manageExceptions',
      description: 'Manage policy exceptions and exemptions',
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          exceptionId: { type: 'string' },
          details: { type: 'object' },
        },
        required: ['operation'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          exceptionId: { type: 'string' },
          status: { type: 'string' },
          operation: { type: 'string' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:policy',
    'write:policy',
    'read:compliance',
    'write:violation',
    'admin:governance',
  ],
  maxConcurrentTasks: 3,
  timeout: 60000,
  retryPolicy: { maxRetries: 2, backoffMs: 2500, exponentialBackoff: true },
};

// ─── Internal Types ───────────────────────────────────────────────

interface Policy {
  id: string;
  name: string;
  description: string;
  rules: Array<{ id: string; condition: string; action: string; severity: string }>;
  version: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Violation {
  id: string;
  policyId: string;
  ruleId: string;
  target: string;
  severity: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
}

interface Exception {
  id: string;
  policyId: string;
  target: string;
  reason: string;
  grantedAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'revoked';
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class GovernanceAgentService extends BaseAgentService {
  constructor(
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super();
  }
  private policies: Map<string, Policy> = new Map();
  private violations: Violation[] = [];
  private exceptions: Map<string, Exception> = new Map();

  protected defineConfig(): AgentConfig {
    return META_GOVERNANCE_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'enforcePolicy',
      description: 'Enforce a specific policy',
      execute: async (params: { policyId: string; target?: string; action?: string }) =>
        this.enforcePolicy(params),
    });
    this.registerTool({
      name: 'auditCompliance',
      description: 'Audit compliance',
      execute: async (params: { scope?: string; policies?: string[] }) =>
        this.auditCompliance(params),
    });
    this.registerTool({
      name: 'reviewGovernance',
      description: 'Review governance framework',
      execute: async (params: { scope?: string; depth?: string }) => this.reviewGovernance(params),
    });
    this.registerTool({
      name: 'updatePolicy',
      description: 'Update or create a policy',
      execute: async (params: {
        policyId: string;
        changes: Record<string, any>;
        reason?: string;
      }) => this.updatePolicy(params),
    });
    this.registerTool({
      name: 'generateGovernanceReport',
      description: 'Generate governance report',
      execute: async (params: {
        period?: string;
        includeViolations?: boolean;
        includeRecommendations?: boolean;
      }) => this.generateGovernanceReport(params),
    });
    this.registerTool({
      name: 'manageExceptions',
      description: 'Manage policy exceptions',
      execute: async (params: {
        operation: string;
        exceptionId?: string;
        details?: Record<string, any>;
      }) => this.manageExceptions(params),
    });

    this.seedPolicies();
    await this.storeInWorkingMemory('governance:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('MetaGovernance agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    // Bridge: use LLM for governance decisions
    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: `You are the ${this.config.name} agent in the Meta-Intelligence cluster. Analyze the following task and provide detailed governance decisions including policy enforcement, compliance auditing, and exception management.`,
          userPrompt: JSON.stringify(input.payload),
          temperature: 0.3,
          maxTokens: 2048,
        });

        const analysis = llmResult.content;

        return this.createAgentOutput(
          input.taskId,
          true,
          { analysis, costUsd: llmResult.costUsd, tokensUsed: llmResult.tokenCount },
          undefined,
          startTime,
        );
      } catch (error) {
        this.logger.warn(`Bridge LLM failed, fallback: ${(error as Error).message}`);
      }
    }

    const { action, ...params } = input.payload;
    if (!action)
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        'Missing required parameter: action',
        startTime,
      );
    const supportedActions = [
      'enforcePolicy',
      'auditCompliance',
      'reviewGovernance',
      'updatePolicy',
      'generateGovernanceReport',
      'manageExceptions',
    ];
    if (!supportedActions.includes(action))
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown governance action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    try {
      const tool = this.getTool(action);
      if (!tool)
        return this.createAgentOutput(
          input.taskId,
          false,
          null,
          `Tool not found: ${action}`,
          startTime,
        );
      const result = await tool.execute(params);
      await this.storeInWorkingMemory(
        `governance:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );
      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`MetaGovernance execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.policies.clear();
    this.violations = [];
    this.exceptions.clear();
    this.logger.log('MetaGovernance agent destroyed, policies, violations, and exceptions cleared');
  }

  private async enforcePolicy(params: {
    policyId: string;
    target?: string;
    action?: string;
  }): Promise<{ enforced: boolean; policyId: string; violations: number; enforcementId: string }> {
    const { policyId, target = 'all', action = 'check' } = params;
    if (!policyId || typeof policyId !== 'string')
      throw new Error('Valid policyId string is required');
    const policy = this.policies.get(policyId);
    if (!policy) throw new Error(`Policy not found: ${policyId}`);
    if (!policy.active) throw new Error(`Policy is not active: ${policyId}`);
    const enforcementId = this.generateId();

    // Check for existing exceptions
    const hasException = Array.from(this.exceptions.values()).some(
      (e) => e.policyId === policyId && e.target === target && e.status === 'active',
    );

    if (hasException) {
      this.logger.log(
        `Policy enforcement skipped: exception exists for policy=${policyId}, target=${target}`,
      );
      return { enforced: true, policyId, violations: 0, enforcementId };
    }

    // Simulate violation detection
    let violationCount = 0;
    for (const rule of policy.rules) {
      const violationChance = Math.random();
      if (violationChance > 0.8) {
        violationCount++;
        this.violations.push({
          id: this.generateId(),
          policyId,
          ruleId: rule.id,
          target,
          severity: rule.severity,
          description: `Rule "${rule.condition}" violated for target "${target}"`,
          timestamp: new Date(),
          resolved: false,
        });
      }
    }

    if (action === 'enforce' && violationCount > 0) {
      // Mark violations for resolution
      const recentViolations = this.violations.filter(
        (v) => !v.resolved && v.policyId === policyId,
      );
      for (const v of recentViolations.slice(-violationCount)) {
        v.resolved = true;
      }
    }

    this.logger.log(
      `Policy enforced: policyId=${policyId}, target=${target}, violations=${violationCount}`,
    );
    return { enforced: true, policyId, violations: violationCount, enforcementId };
  }

  private async auditCompliance(params: { scope?: string; policies?: string[] }): Promise<{
    auditId: string;
    complianceScore: number;
    violations: Array<{ policyId: string; severity: string; description: string }>;
    compliant: boolean;
  }> {
    const { scope = 'all', policies: policyIds = [] } = params;
    const auditId = this.generateId();
    const targetPolicies =
      policyIds.length > 0
        ? Array.from(this.policies.values()).filter((p) => policyIds.includes(p.id))
        : Array.from(this.policies.values()).filter((p) => p.active);

    const recentViolations = this.violations.filter((v) => {
      const isRecent = Date.now() - v.timestamp.getTime() < 24 * 60 * 60 * 1000;
      const inScope = scope === 'all' || v.target.includes(scope);
      const inPolicies = policyIds.length === 0 || policyIds.includes(v.policyId);
      return isRecent && inScope && inPolicies;
    });

    const criticalViolations = recentViolations.filter(
      (v) => v.severity === 'critical' && !v.resolved,
    );
    const warningViolations = recentViolations.filter((v) => v.severity === 'warning');

    const complianceScore = Math.max(
      0,
      Math.round(100 - criticalViolations.length * 20 - warningViolations.length * 5),
    );
    const compliant = complianceScore >= 80 && criticalViolations.length === 0;

    const violationSummary = recentViolations.slice(0, 10).map((v) => ({
      policyId: v.policyId,
      severity: v.severity,
      description: v.description,
    }));

    this.logger.log(
      `Compliance audited: scope=${scope}, score=${complianceScore}, violations=${recentViolations.length}, compliant=${compliant}`,
    );
    return { auditId, complianceScore, violations: violationSummary, compliant };
  }

  private async reviewGovernance(params: { scope?: string; depth?: string }): Promise<{
    reviewId: string;
    findings: Array<{ area: string; status: string; description: string; priority: string }>;
    recommendations: string[];
    overallRating: string;
  }> {
    const { scope = 'all', depth = 'standard' } = params;
    const reviewId = this.generateId();
    const findings: Array<{ area: string; status: string; description: string; priority: string }> =
      [];
    const recommendations: string[] = [];

    // Policy coverage
    const activePolicies = Array.from(this.policies.values()).filter((p) => p.active);
    if (activePolicies.length < 5) {
      findings.push({
        area: 'policy-coverage',
        status: 'warning',
        description: `Only ${activePolicies.length} active policies; consider expanding coverage`,
        priority: 'medium',
      });
      recommendations.push('Add policies for security, data handling, and resource management');
    } else {
      findings.push({
        area: 'policy-coverage',
        status: 'good',
        description: `${activePolicies.length} active policies covering key areas`,
        priority: 'low',
      });
    }

    // Violation trends
    const unresolvedViolations = this.violations.filter((v) => !v.resolved);
    if (unresolvedViolations.length > 5) {
      findings.push({
        area: 'violation-resolution',
        status: 'warning',
        description: `${unresolvedViolations.length} unresolved violations`,
        priority: 'high',
      });
      recommendations.push('Establish a violation resolution SLA and escalation process');
    } else {
      findings.push({
        area: 'violation-resolution',
        status: 'good',
        description: 'Low number of unresolved violations',
        priority: 'low',
      });
    }

    // Exception management
    const activeExceptions = Array.from(this.exceptions.values()).filter(
      (e) => e.status === 'active',
    );
    if (activeExceptions.length > 10) {
      findings.push({
        area: 'exception-management',
        status: 'warning',
        description: `${activeExceptions.length} active exceptions may indicate governance gaps`,
        priority: 'medium',
      });
      recommendations.push('Review and reduce policy exceptions; update policies instead');
    } else {
      findings.push({
        area: 'exception-management',
        status: 'good',
        description: 'Exception count within acceptable range',
        priority: 'low',
      });
    }

    if (depth === 'comprehensive') {
      findings.push({
        area: 'policy-versioning',
        status: 'good',
        description: 'All policies have version tracking',
        priority: 'low',
      });
      findings.push({
        area: 'audit-trail',
        status: 'good',
        description: 'Violation audit trail is maintained',
        priority: 'low',
      });
      recommendations.push('Implement automated compliance monitoring');
      recommendations.push('Create policy change approval workflow');
    }

    const highPriorityFindings = findings.filter((f) => f.priority === 'high');
    const overallRating =
      highPriorityFindings.length > 0
        ? 'needs-improvement'
        : findings.some((f) => f.status === 'warning')
          ? 'acceptable'
          : 'excellent';

    this.logger.log(
      `Governance reviewed: findings=${findings.length}, rating=${overallRating}, scope=${scope}`,
    );
    return { reviewId, findings, recommendations, overallRating };
  }

  private async updatePolicy(params: {
    policyId: string;
    changes: Record<string, any>;
    reason?: string;
  }): Promise<{ updated: boolean; policyId: string; version: string; updateId: string }> {
    const { policyId, changes, reason = '' } = params;
    if (!policyId || typeof policyId !== 'string')
      throw new Error('Valid policyId string is required');
    if (!changes || typeof changes !== 'object')
      throw new Error('Valid changes object is required');
    const updateId = this.generateId();

    const existing = this.policies.get(policyId);
    if (existing) {
      const versionParts = existing.version.split('.');
      const minor = parseInt(versionParts[1] || '0', 10) + 1;
      const newVersion = `${versionParts[0]}.${minor}`;

      if (changes.name) existing.name = changes.name;
      if (changes.description) existing.description = changes.description;
      if (changes.rules) existing.rules = changes.rules;
      if (changes.active !== undefined) existing.active = changes.active;
      existing.version = newVersion;
      existing.updatedAt = new Date();

      this.logger.log(
        `Policy updated: id=${policyId}, version=${newVersion}, reason="${reason.substring(0, 50)}"`,
      );
      return { updated: true, policyId, version: newVersion, updateId };
    } else {
      // Create new policy
      const newPolicy: Policy = {
        id: policyId,
        name: changes.name || policyId,
        description: changes.description || 'Auto-generated policy',
        rules: changes.rules || [
          { id: `${policyId}-rule-1`, condition: 'default', action: 'allow', severity: 'info' },
        ],
        version: '1.0',
        active: changes.active !== undefined ? changes.active : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.policies.set(policyId, newPolicy);

      this.logger.log(`Policy created: id=${policyId}, version=1.0`);
      return { updated: true, policyId, version: '1.0', updateId };
    }
  }

  private async generateGovernanceReport(params: {
    period?: string;
    includeViolations?: boolean;
    includeRecommendations?: boolean;
  }): Promise<{
    reportId: string;
    summary: Record<string, any>;
    metrics: Record<string, number>;
    recommendations: string[];
  }> {
    const { period = '30d', includeViolations = true, includeRecommendations = true } = params;
    const reportId = this.generateId();

    const periodMs =
      period === '7d' ? 7 * 86400000 : period === '30d' ? 30 * 86400000 : 90 * 86400000;
    const cutoff = new Date(Date.now() - periodMs);
    const periodViolations = this.violations.filter((v) => v.timestamp >= cutoff);

    const summary: Record<string, any> = {
      period,
      totalPolicies: this.policies.size,
      activePolicies: Array.from(this.policies.values()).filter((p) => p.active).length,
      totalViolations: periodViolations.length,
      unresolvedViolations: periodViolations.filter((v) => !v.resolved).length,
      activeExceptions: Array.from(this.exceptions.values()).filter((e) => e.status === 'active')
        .length,
      generatedAt: new Date().toISOString(),
    };

    if (includeViolations) {
      summary.violationsBySeverity = {
        critical: periodViolations.filter((v) => v.severity === 'critical').length,
        warning: periodViolations.filter((v) => v.severity === 'warning').length,
        info: periodViolations.filter((v) => v.severity === 'info').length,
      };
    }

    const metrics: Record<string, number> = {
      complianceRate:
        periodViolations.length > 0
          ? Math.round(
              (1 - periodViolations.filter((v) => !v.resolved).length / periodViolations.length) *
                100,
            )
          : 100,
      policyCoverage:
        this.policies.size > 0
          ? Math.round(
              (Array.from(this.policies.values()).filter((p) => p.active).length /
                this.policies.size) *
                100,
            )
          : 0,
      violationResolutionRate:
        periodViolations.length > 0
          ? Math.round(
              (periodViolations.filter((v) => v.resolved).length / periodViolations.length) * 100,
            )
          : 100,
    };

    const recommendations: string[] = [];
    if (includeRecommendations) {
      if (metrics.complianceRate < 80)
        recommendations.push('Improve violation resolution processes to increase compliance rate');
      if (summary.unresolvedViolations > 10)
        recommendations.push('Prioritize resolution of unresolved violations');
      if (summary.activeExceptions > 5)
        recommendations.push('Review and reduce active policy exceptions');
      if (summary.activePolicies < 3)
        recommendations.push('Expand policy coverage for better governance');
      if (recommendations.length === 0)
        recommendations.push('Governance is in good standing; continue regular reviews');
    }

    this.logger.log(
      `Governance report generated: id=${reportId}, period=${period}, violations=${periodViolations.length}`,
    );
    return { reportId, summary, metrics, recommendations };
  }

  private async manageExceptions(params: {
    operation: string;
    exceptionId?: string;
    details?: Record<string, any>;
  }): Promise<{ success: boolean; exceptionId: string; status: string; operation: string }> {
    const { operation, exceptionId, details = {} } = params;
    if (!operation || typeof operation !== 'string')
      throw new Error('Valid operation string is required');

    const validOperations = ['create', 'revoke', 'extend', 'list'];
    if (!validOperations.includes(operation)) {
      throw new Error(`Invalid operation: ${operation}. Supported: ${validOperations.join(', ')}`);
    }

    switch (operation) {
      case 'create': {
        const id = this.generateId();
        const exception: Exception = {
          id,
          policyId: details.policyId || 'unknown',
          target: details.target || 'all',
          reason: details.reason || 'No reason provided',
          grantedAt: new Date(),
          expiresAt: new Date(Date.now() + (details.durationDays || 30) * 86400000),
          status: 'active',
        };
        this.exceptions.set(id, exception);
        this.logger.log(
          `Exception created: id=${id}, policy=${exception.policyId}, target=${exception.target}`,
        );
        return { success: true, exceptionId: id, status: 'active', operation };
      }

      case 'revoke': {
        if (!exceptionId) throw new Error('exceptionId is required for revoke operation');
        const exception = this.exceptions.get(exceptionId);
        if (!exception) throw new Error(`Exception not found: ${exceptionId}`);
        exception.status = 'revoked';
        this.logger.log(`Exception revoked: id=${exceptionId}`);
        return { success: true, exceptionId, status: 'revoked', operation };
      }

      case 'extend': {
        if (!exceptionId) throw new Error('exceptionId is required for extend operation');
        const exception = this.exceptions.get(exceptionId);
        if (!exception) throw new Error(`Exception not found: ${exceptionId}`);
        const extendDays = details.durationDays || 30;
        exception.expiresAt = new Date(exception.expiresAt.getTime() + extendDays * 86400000);
        this.logger.log(
          `Exception extended: id=${exceptionId}, new expiry=${exception.expiresAt.toISOString()}`,
        );
        return { success: true, exceptionId, status: exception.status, operation };
      }

      case 'list': {
        const active = Array.from(this.exceptions.values()).filter((e) => e.status === 'active');
        this.logger.log(`Exceptions listed: active=${active.length}`);
        return {
          success: true,
          exceptionId: 'list',
          status: `${active.length} active exceptions`,
          operation,
        };
      }

      default:
        return {
          success: false,
          exceptionId: exceptionId || '',
          status: 'unknown-operation',
          operation,
        };
    }
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private seedPolicies(): void {
    const defaultPolicies: Policy[] = [
      {
        id: 'policy-resource-limits',
        name: 'Resource Limits Policy',
        description: 'Enforces resource usage limits across all agents',
        rules: [
          {
            id: 'rule-max-concurrent',
            condition: 'maxConcurrentTasks <= 10',
            action: 'enforce',
            severity: 'warning',
          },
          {
            id: 'rule-timeout-limit',
            condition: 'timeout <= 300000',
            action: 'enforce',
            severity: 'critical',
          },
        ],
        version: '1.0',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'policy-data-handling',
        name: 'Data Handling Policy',
        description: 'Regulates how agents handle and process data',
        rules: [
          {
            id: 'rule-no-sensitive-logging',
            condition: 'No sensitive data in logs',
            action: 'block',
            severity: 'critical',
          },
          {
            id: 'rule-data-retention',
            condition: 'Data retention within limits',
            action: 'warn',
            severity: 'warning',
          },
        ],
        version: '1.0',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'policy-error-handling',
        name: 'Error Handling Policy',
        description: 'Defines how agents should handle errors and failures',
        rules: [
          {
            id: 'rule-error-reporting',
            condition: 'All errors must be reported',
            action: 'enforce',
            severity: 'warning',
          },
          {
            id: 'rule-retry-limits',
            condition: 'maxRetries <= 5',
            action: 'enforce',
            severity: 'info',
          },
        ],
        version: '1.0',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'policy-security',
        name: 'Security Policy',
        description: 'Security requirements for agent operations',
        rules: [
          {
            id: 'rule-auth-required',
            condition: 'Authentication required for execution',
            action: 'block',
            severity: 'critical',
          },
          {
            id: 'rule-permission-check',
            condition: 'Permission check before operations',
            action: 'enforce',
            severity: 'critical',
          },
        ],
        version: '1.0',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const policy of defaultPolicies) {
      this.policies.set(policy.id, policy);
    }
  }
}
