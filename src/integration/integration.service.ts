/**
 * AENEWS Agent OS X - Cross-Module Integration Service
 *
 * THE integration hub that bridges all three major modules:
 *   SoftwareFactory ↔ Agents ↔ MissionOS
 *
 * All cross-module communication flows through here.
 * This is the ONLY place where modules know about each other.
 *
 * Flow for an integrated mission:
 *   1. Security Gateway check
 *   2. Constitutional AI check
 *   3. Mission Graph registration
 *   4. Resource allocation
 *   5. Runtime Engine execution
 *   6. Real-time progress reporting
 *   7. Metrics recording
 *   8. Observability update
 *   9. Auto-recovery if needed
 *   10. Temporal memory recording
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../agents/events/event-bus.service';
import { AgentEventType, AgentEvent } from '../agents/interfaces/agent-event.interface';
import { RealtimeGateway, RealtimeEventType } from '../realtime/realtime.gateway';
import { MissionRuntimeEngine } from '../software-factory/runtime/mission-runtime.engine';
import {
  MissionMetricsService,
  MissionCategory,
} from '../software-factory/runtime/mission-metrics.service';
import { ConnectorRegistry } from '../software-factory/connectors/connector-registry';
import { AgentRegistryService } from '../agents/registry/agent-registry.service';
import { ObservabilityCenterService } from '../mission-os/observability/observability-center.service';
import {
  AutoRecoveryService,
  FailureType,
  RecoveryContext,
} from '../mission-os/auto-recovery/auto-recovery.service';
import {
  ConstitutionalAiService,
  ActionContext,
} from '../mission-os/constitutional/constitutional-ai.service';
import {
  HumanApprovalService,
  ApprovalActionType,
  RiskAssessment,
} from '../mission-os/human-approval/human-approval.service';
import { MissionGraphService } from '../mission-os/mission-graph/mission-graph.service';
import {
  ResourceOptimizerService,
  ResourceType,
  OptimizationCriteria,
} from '../mission-os/resource-optimizer/resource-optimizer.service';
import { SecurityGatewayService } from '../gateway/security/security-gateway.service';
import {
  TemporalMemoryService,
  TimeGranularity,
} from '../mission-os/temporal-memory/temporal-memory.service';

// ─── Mission Integration Context ───────────────────────────────────
export interface MissionIntegrationContext {
  missionId: string;
  instruction: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  qualityScore?: number;
  certified?: boolean;
  totalCostUsd?: number;
  artifacts?: any[];
  errors?: string[];
  constitutionalCheck?: any;
  humanApprovalRequired?: boolean;
  recoveryAttempts?: number;
}

@Injectable()
export class IntegrationService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationService.name);

  private readonly missionContexts: Map<string, MissionIntegrationContext> = new Map();
  private totalMissionsIntegrated = 0;
  private totalAgentFailuresHandled = 0;
  private totalConstitutionalChecks = 0;
  private totalHumanApprovals = 0;
  private totalRecoveryActions = 0;

  constructor(
    private readonly runtimeEngine: MissionRuntimeEngine,
    private readonly metricsService: MissionMetricsService,
    private readonly connectorRegistry: ConnectorRegistry,
    private readonly agentRegistry: AgentRegistryService,
    private readonly eventBus: EventBusService,
    private readonly observabilityCenter: ObservabilityCenterService,
    private readonly autoRecovery: AutoRecoveryService,
    private readonly constitutionalAi: ConstitutionalAiService,
    private readonly humanApproval: HumanApprovalService,
    private readonly missionGraph: MissionGraphService,
    private readonly resourceOptimizer: ResourceOptimizerService,
    private readonly temporalMemory: TemporalMemoryService,
    private readonly securityGateway: SecurityGatewayService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Integration Service initializing — wiring cross-module bridges');

    this.eventBus.subscribeTo('*', async (event: AgentEvent) => {
      await this.handleAgentEvent(event);
    });

    this.logger.log(
      'Cross-module bridge ACTIVE: SoftwareFactory ↔ Agents ↔ MissionOS ↔ Gateway ↔ Realtime',
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MISSION LIFECYCLE BRIDGE
  // ═══════════════════════════════════════════════════════════════════

  async executeIntegratedMission(request: {
    instruction: string;
    description?: string;
    quality?: string;
    budgetMaxUsd?: number;
    submittedBy?: string;
    tenantId?: string;
  }): Promise<MissionIntegrationContext> {
    const missionId = `mission-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const startTime = new Date();

    const context: MissionIntegrationContext = {
      missionId,
      instruction: request.instruction,
      status: 'pending',
      startTime,
    };
    this.missionContexts.set(missionId, context);
    this.totalMissionsIntegrated++;

    try {
      // Step 1: Security Gateway — validate input
      const securityCheck = await this.securityGateway.process(
        'integration-service',
        'execute_mission',
        'mission_runtime',
        request.instruction,
        { permissions: ['mission:execute'], metadata: { submittedBy: request.submittedBy } },
      );

      if (!securityCheck.allowed) {
        context.status = 'failed';
        context.errors = [`Security gateway blocked: risk=${securityCheck.riskScore}, threats=${securityCheck.threats.length}`];
        return context;
      }

      // Step 2: Constitutional AI check
      const actionContext: ActionContext = {
        agentId: 'integration-service',
        action: 'execute_mission',
        actionType: 'execution',
        resource: 'mission_runtime',
        payload: request.instruction,
      };
      const constitutionalResult = this.constitutionalAi.evaluate(actionContext);
      this.totalConstitutionalChecks++;
      context.constitutionalCheck = constitutionalResult;

      if (!constitutionalResult.allowed) {
        context.status = 'failed';
        context.errors = [`Constitutional AI violation: ${constitutionalResult.violations.map((v) => v.ruleName).join(', ')}`];
        this.realtimeGateway.pushMissionEvent(
          missionId,
          RealtimeEventType.SYSTEM_ALERT,
          { type: 'constitutional_violation', violations: constitutionalResult.violations.length },
        );
        return context;
      }

      // Step 3: Check if human approval is required
      if (this.requiresHumanApproval(request)) {
        context.humanApprovalRequired = true;
        this.totalHumanApprovals++;

        const riskAssessment: RiskAssessment = {
          riskLevel: 'medium',
          factors: ['high_budget', 'destructive_action'],
          impactDescription: `Mission: "${request.instruction.substring(0, 100)}"`,
          reversibility: 'partially_reversible',
        };

        const approvalRequest = this.humanApproval.requestApproval(
          'integration-service',
          'execute_mission',
          ApprovalActionType.DEPLOY_PRODUCTION,
          { instruction: request.instruction, budgetMaxUsd: request.budgetMaxUsd },
          `Mission requires human approval: "${request.instruction.substring(0, 100)}"`,
        );

        if (approvalRequest.status === 'pending') {
          this.realtimeGateway.pushMissionEvent(
            missionId,
            RealtimeEventType.SYSTEM_ALERT,
            { type: 'human_approval_required', requestId: approvalRequest.id },
          );
        }
      }

      // Step 4: Register in Mission Graph
      try {
        this.missionGraph.createMission(
          request.instruction.substring(0, 80),
          request.description || request.instruction,
          request.submittedBy || 'integration-service',
          1,
        );
      } catch (error) {
        this.logger.warn(`Mission Graph registration failed: ${(error as Error).message}`);
      }

      // Step 5: Resource allocation
      const allocation = this.resourceOptimizer.allocate(
        missionId,
        'integration-service',
        ResourceType.LLM,
        { prioritize: 'balanced' } as OptimizationCriteria,
      );

      // Step 6: Execute via Runtime Engine
      context.status = 'running';
      this.realtimeGateway.pushMissionEvent(missionId, RealtimeEventType.MISSION_RUNNING, {
        phase: 'executing',
        instruction: request.instruction.substring(0, 100),
        constitutionalCheck: 'passed',
        resourceAllocated: allocation !== null,
      });

      const result = await this.runtimeEngine.executeMission({
        instruction: request.instruction,
        description: request.description,
        quality: request.quality as any || 'standard',
        budgetMaxUsd: request.budgetMaxUsd,
      });

      // Step 7: Update context
      context.status = result.success ? 'completed' : 'failed';
      context.endTime = new Date();
      context.qualityScore = result.qualityScore;
      context.certified = result.certified;
      context.totalCostUsd = result.totalCostUsd;
      context.artifacts = result.artifacts;
      context.errors = result.errors;

      // Step 8: Record metrics
      this.metricsService.record({
        missionId,
        category: this.categorizeMission(request.instruction),
        instruction: request.instruction,
        success: result.success,
        certified: result.certified,
        qualityScore: result.qualityScore,
        durationMs: result.totalDurationMs,
        costUsd: result.totalCostUsd || 0,
        artifactCount: result.artifacts.length,
        totalSizeBytes: 0,
        retries: 0,
        errors: result.errors || [],
        phases: [],
      });

      // Step 9: Record in temporal memory
      try {
        this.temporalMemory.store({
          agentId: 'integration-service',
          content: {
            instruction: request.instruction.substring(0, 200),
            success: result.success,
            qualityScore: result.qualityScore,
            certified: result.certified,
            duration: result.totalDurationMs,
            cost: result.totalCostUsd,
          },
          summary: `Mission ${missionId}: ${result.success ? 'SUCCESS' : 'FAILED'}, score=${result.qualityScore}`,
          timestamp: new Date(),
          timeGranularity: TimeGranularity.DAY,
          project: null,
          tags: ['mission', result.success ? 'success' : 'failure'],
          importance: result.success ? 0.5 : 0.8,
          expiresAt: null,
          relatedEntries: [],
        });
      } catch (error) {
        this.logger.warn(`Temporal memory store failed: ${(error as Error).message}`);
      }

      // Step 10: Real-time completion event
      const eventType = result.success
        ? RealtimeEventType.MISSION_COMPLETED
        : RealtimeEventType.MISSION_FAILED;

      this.realtimeGateway.pushMissionEvent(missionId, eventType, {
        qualityScore: result.qualityScore,
        certified: result.certified,
        totalDurationMs: result.totalDurationMs,
        totalCostUsd: result.totalCostUsd,
        artifactCount: result.artifacts.length,
      });

      // Release allocated resource
      if (allocation) {
        this.resourceOptimizer.release(allocation.id);
      }

      this.logger.log(
        `Integrated mission ${missionId} ${context.status}: ` +
          `score=${result.qualityScore}, certified=${result.certified}, ` +
          `duration=${result.totalDurationMs}ms, cost=$${result.totalCostUsd?.toFixed(4)}`,
      );

      return context;
    } catch (error) {
      context.status = 'failed';
      context.endTime = new Date();
      context.errors = [(error as Error).message];

      await this.triggerAutoRecovery(missionId, error as Error);

      this.realtimeGateway.pushMissionEvent(missionId, RealtimeEventType.MISSION_FAILED, {
        error: (error as Error).message,
        phase: 'integration',
      });

      return context;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  EVENT ROUTING
  // ═══════════════════════════════════════════════════════════════════

  private async handleAgentEvent(event: AgentEvent): Promise<void> {
    try {
      switch (event.type) {
        case AgentEventType.AGENT_ERROR:
        case AgentEventType.TASK_FAILED:
          await this.handleAgentFailure(event);
          break;
        default:
          break;
      }
    } catch (error) {
      this.logger.error(`Error handling agent event ${event.type}: ${(error as Error).message}`);
    }
  }

  private async handleAgentFailure(event: AgentEvent): Promise<void> {
    const agentId = event.sourceAgentId;
    const error = event.payload?.error || 'Unknown error';

    this.totalAgentFailuresHandled++;

    this.logger.warn(`Agent failure detected: ${agentId} — ${error}`);

    try {
      this.autoRecovery.detectFailure(agentId, FailureType.UNHANDLED_EXCEPTION, {
        errorMessage: error,
        stackTrace: event.payload?.stack,
      } as RecoveryContext);
    } catch (recoveryError) {
      this.logger.error(
        `Auto-recovery failed for agent ${agentId}: ${(recoveryError as Error).message}`,
      );
    }

    this.realtimeGateway.pushSystemEvent(RealtimeEventType.SYSTEM_ALERT, {
      type: 'agent_failure',
      agentId,
      error,
      timestamp: new Date(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CONSTITUTIONAL AI BRIDGE
  // ═══════════════════════════════════════════════════════════════════

  async checkConstitutionalCompliance(prompt: string): Promise<{
    allowed: boolean;
    reason?: string;
    modified?: string;
  }> {
    this.totalConstitutionalChecks++;
    try {
      const actionContext: ActionContext = {
        agentId: 'integration-service',
        action: 'llm_prompt',
        actionType: 'generation',
        payload: prompt,
      };
      const result = this.constitutionalAi.evaluate(actionContext);
      return {
        allowed: result.allowed,
        reason: result.violations.length > 0 ? result.violations[0].reason : undefined,
      };
    } catch (error) {
      this.logger.warn(`Constitutional check failed: ${(error as Error).message}`);
      return { allowed: true };
    }
  }

  async validateAction(
    agentId: string,
    action: string,
    resource: string,
    input: any,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const securityResult = await this.securityGateway.process(agentId, action, resource, input);
    if (!securityResult.allowed) {
      return { allowed: false, reason: `Security: risk=${securityResult.riskScore}` };
    }

    if (action.includes('llm') || action.includes('prompt') || action.includes('generate')) {
      const constitutionalResult = await this.checkConstitutionalCompliance(
        typeof input === 'string' ? input : JSON.stringify(input),
      );
      if (!constitutionalResult.allowed) {
        return { allowed: false, reason: `Constitutional: ${constitutionalResult.reason}` };
      }
    }

    return { allowed: true };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  AUTO-RECOVERY BRIDGE
  // ═══════════════════════════════════════════════════════════════════

  private async triggerAutoRecovery(missionId: string, error: Error): Promise<void> {
    this.totalRecoveryActions++;

    try {
      this.autoRecovery.detectFailure(
        `mission:${missionId}`,
        FailureType.UNHANDLED_EXCEPTION,
        {
          errorMessage: error.message,
          stackTrace: error.stack,
        } as RecoveryContext,
      );
    } catch (recoveryError) {
      this.logger.error(
        `Auto-recovery trigger failed for mission ${missionId}: ${(recoveryError as Error).message}`,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  OBSERVABILITY BRIDGE
  // ═══════════════════════════════════════════════════════════════════

  async getUnifiedSnapshot(): Promise<any> {
    try {
      const factoryStats = {
        activeMissions: this.runtimeEngine.getActiveMissions().length,
        completedMissions: this.runtimeEngine.getCompletedMissions().length,
        connectorStats: this.connectorRegistry.getStatistics(),
        metrics: this.metricsService.getAggregate(),
      };

      const agentStats = {
        totalAgents: this.agentRegistry.getStats().total,
        eventBusStats: this.eventBus.getStats(),
      };

      let observabilitySnapshot = null;
      try {
        observabilitySnapshot = this.observabilityCenter.getSnapshot();
      } catch {
        // May not be fully initialized
      }

      return {
        timestamp: new Date(),
        factory: factoryStats,
        agents: agentStats,
        observability: observabilitySnapshot,
        integration: this.getIntegrationStats(),
      };
    } catch (error) {
      return { error: (error as Error).message, timestamp: new Date() };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ACCESS METHODS
  // ═══════════════════════════════════════════════════════════════════

  getMissionContext(missionId: string): MissionIntegrationContext | undefined {
    return this.missionContexts.get(missionId);
  }

  getAllActiveContexts(): MissionIntegrationContext[] {
    return Array.from(this.missionContexts.values()).filter((c) => c.status === 'running');
  }

  getIntegrationStats(): {
    totalMissionsIntegrated: number;
    totalAgentFailuresHandled: number;
    totalConstitutionalChecks: number;
    totalHumanApprovals: number;
    totalRecoveryActions: number;
    activeMissions: number;
  } {
    return {
      totalMissionsIntegrated: this.totalMissionsIntegrated,
      totalAgentFailuresHandled: this.totalAgentFailuresHandled,
      totalConstitutionalChecks: this.totalConstitutionalChecks,
      totalHumanApprovals: this.totalHumanApprovals,
      totalRecoveryActions: this.totalRecoveryActions,
      activeMissions: this.missionContexts.size,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════════

  private requiresHumanApproval(request: {
    instruction: string;
    budgetMaxUsd?: number;
  }): boolean {
    const lower = request.instruction.toLowerCase();
    return (
      (request.budgetMaxUsd !== undefined && request.budgetMaxUsd > 5) ||
      lower.includes('deploy') ||
      lower.includes('delete') ||
      lower.includes('remove') ||
      lower.includes('drop') ||
      lower.includes('format')
    );
  }

  private categorizeMission(instruction: string): MissionCategory {
    const lower = instruction.toLowerCase();
    if (lower.includes('website') || lower.includes('web app') || lower.includes('frontend'))
      return MissionCategory.WEB_APP;
    if (lower.includes('scrape') || lower.includes('browse') || lower.includes('screenshot'))
      return MissionCategory.AUTOMATION;
    if (lower.includes('report') || lower.includes('document') || lower.includes('pdf'))
      return MissionCategory.DOCUMENT;
    if (lower.includes('market') || lower.includes('seo') || lower.includes('brand'))
      return MissionCategory.SAAS;
    if (lower.includes('deploy') || lower.includes('docker') || lower.includes('ci'))
      return MissionCategory.DEPLOYMENT;
    return MissionCategory.WEB_APP;
  }
}
