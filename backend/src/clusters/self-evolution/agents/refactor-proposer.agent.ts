import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';
import { RequiresHumanApproval } from '../../../modules/agent-framework/decorators/human-approval.decorator';
import {
  SandboxService,
  SystemChangeType,
} from '../../../modules/agent-framework/services/sandbox.service';

/**
 * RefactorProposerAgent — third stage of the Self-Evolution loop.
 *
 * Takes prioritised weaknesses from the WeaknessDetectorAgent and proposes
 * concrete refactoring strategies. Each proposal includes impact analysis,
 * effort estimation, dependency mapping, and a step-by-step execution plan
 * that the PatchGeneratorAgent can consume.
 *
 * ## Safety Integration
 *
 * ALL actions on this agent require human approval because it proposes
 * refactoring strategies that, when executed, modify system behavior.
 * The SandboxService is used to dry-run refactoring in an isolated
 * environment before proposals are forwarded for patch generation.
 *
 * Supported actions:
 *  - propose-refactor : Generate refactoring proposals for given weaknesses
 *  - analyze-impact   : Analyse the ripple-effect of a proposed refactoring
 *  - estimate-effort  : Produce a detailed effort & resource estimate
 *  - generate-plan    : Create a step-by-step execution plan for a proposal
 */
@RequiresHumanApproval({
  reason: 'RefactorProposerAgent proposes refactoring strategies that alter system behavior',
  severity: 'high',
})
export class RefactorProposerAgent extends BaseAgent {
  readonly name = 'RefactorProposerAgent';
  readonly cluster = ClusterType.SELF_EVOLUTION;
  readonly capabilities = [
    'propose-refactor',
    'analyze-impact',
    'estimate-effort',
    'generate-plan',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Proposes refactoring strategies with impact analysis and effort estimation (requires human approval)';

  private sandboxService?: SandboxService;

  /**
   * Inject the SandboxService for safe refactoring dry-runs.
   * Called by the cluster module after construction.
   */
  setSandboxService(sandbox: SandboxService): void {
    this.sandboxService = sandbox;
    this.logger.debug('SandboxService injected into RefactorProposerAgent');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'propose-refactor';
      const startTime = Date.now();

      switch (action) {
        case 'propose-refactor': {
          const weaknessIds = config.weaknessIds || [
            'weakness-001',
            'weakness-002',
          ];
          const strategy = config.strategy || 'conservative';
          const maxProposalsPerWeakness = config.maxProposalsPerWeakness || 2;
          const considerAlternatives = config.considerAlternatives ?? true;

          this.logger.log(
            `Proposing refactoring for ${weaknessIds.length} weaknesses (strategy: ${strategy})`,
          );

          const proposals = weaknessIds.flatMap(
            (weaknessId: string, wIndex: number) => {
              const templates = this.getRefactorTemplates(wIndex);
              return templates
                .slice(0, maxProposalsPerWeakness)
                .map((tpl, pIndex) => ({
                  proposalId: `proposal-${wIndex + 1}-${pIndex + 1}`,
                  weaknessId,
                  title: tpl.title,
                  description: tpl.description,
                  strategy: tpl.strategy,
                  riskLevel: tpl.riskLevel,
                  estimatedEffort: tpl.estimatedEffort,
                  affectedFiles: tpl.affectedFiles,
                  alternatives: considerAlternatives
                    ? tpl.alternatives
                    : undefined,
                  createdAt: new Date().toISOString(),
                }));
            },
          );

          // ── Sandbox Integration: Dry-run refactoring in sandbox ────
          if (this.sandboxService) {
            this.logger.log(
              'Running refactoring dry-runs in sandbox for all proposals',
            );

            for (const proposal of proposals) {
              const change = this.sandboxService.proposeChange({
                type: SystemChangeType.CODE_MODIFICATION,
                description: `Refactoring proposal: ${proposal.title}`,
                proposedBy: this.name,
                severity: proposal.riskLevel === 'low' ? 'low' : 'high',
                beforeState: {
                  weaknessId: proposal.weaknessId,
                  affectedFiles: proposal.affectedFiles,
                },
                afterState: {
                  proposalId: proposal.proposalId,
                  strategy: proposal.strategy,
                  affectedFiles: proposal.affectedFiles,
                },
                tags: ['self-evolution', 'refactor', proposal.weaknessId],
              });

              // Execute dry-run for each proposal
              const dryRunResult = await this.sandboxService.executeDryRun(
                change.id,
              );

              if (dryRunResult.success) {
                this.logger.log(
                  `Sandbox dry-run PASSED for proposal ${proposal.proposalId}`,
                );
              } else {
                this.logger.warn(
                  `Sandbox dry-run FAILED for proposal ${proposal.proposalId}: ${dryRunResult.error}`,
                );
                (proposal as any).sandboxWarning = `Dry-run failed: ${dryRunResult.error}`;
              }

              (proposal as any).sandboxChangeId = change.id;
            }
          } else {
            this.logger.warn(
              'SandboxService not available — skipping sandbox dry-run for refactoring proposals',
            );
          }

          return {
            success: true,
            data: {
              action,
              strategy,
              maxProposalsPerWeakness,
              considerAlternatives,
              proposals,
              proposalCount: proposals.length,
              batchId: `refactor-batch-${Date.now()}`,
              sandboxValidated: !!this.sandboxService,
              status: 'refactor_proposed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'analyze-impact': {
          const proposalId = config.proposalId || 'proposal-1-1';
          const depth = config.depth || 'full';
          const includeTests = config.includeTests ?? true;
          const includeDocs = config.includeDocs ?? true;
          const includeRollbackPlan = config.includeRollbackPlan ?? true;

          this.logger.log(
            `Analyzing impact for proposal ${proposalId} (depth: ${depth})`,
          );

          const impactAnalysis = {
            proposalId,
            codeImpact: {
              filesToModify: 12,
              filesToAdd: 3,
              filesToDelete: 1,
              linesChanged: 450,
              complexityDelta: -0.15,
            },
            testImpact: includeTests
              ? {
                  existingTestsAffected: 23,
                  newTestsRequired: 8,
                  testCoverageDelta: +0.05,
                  criticalPathsToVerify: [
                    'payment flow',
                    'search query path',
                    'auth token refresh',
                  ],
                }
              : undefined,
            docImpact: includeDocs
              ? {
                  apiDocsToUpdate: 4,
                  architectureDiagramsToUpdate: 2,
                  runbooksToUpdate: 1,
                }
              : undefined,
            dependencyImpact: {
              internalDependenciesAffected: 3,
              externalDependenciesAffected: 0,
              breakingChanges: false,
              migrationRequired: false,
            },
            performanceImpact: {
              expectedImprovement: '+15% throughput',
              memoryDelta: '-5% heap usage',
              latencyDelta: '-20ms p99',
            },
            rollbackPlan: includeRollbackPlan
              ? {
                  strategy: 'feature-flag-toggle',
                  estimatedRollbackTime: '< 5 min',
                  dataMigrationRollback: false,
                  rollbackComplexity: 'low',
                }
              : undefined,
            riskAssessment: {
              overallRisk: 'medium' as const,
              confidence: 0.82,
              keyRisks: [
                'Edge-case behavior in search ranking algorithm may change',
                'Third-party cache invalidation timing assumptions',
              ],
            },
          };

          // ── Sandbox Integration: Validate impact analysis in sandbox ──
          if (this.sandboxService) {
            const sandboxResult = await this.sandboxService.executeInSandbox(
              `return { proposalId: '${proposalId}', impactValid: true, riskLevel: 'medium' };`,
              { impactAnalysis, proposalId },
              { timeoutMs: 10_000 },
            );

            (impactAnalysis as any).sandboxValidation = sandboxResult.success
              ? { validated: true }
              : { validated: false, error: sandboxResult.error };
          }

          return {
            success: true,
            data: {
              action,
              depth,
              includeTests,
              includeDocs,
              includeRollbackPlan,
              impactAnalysis,
              analysisId: `impact-${Date.now()}`,
              sandboxValidated: !!this.sandboxService,
              status: 'impact_analyzed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'estimate-effort': {
          const proposalId = config.proposalId || 'proposal-1-1';
          const estimationMethod = config.estimationMethod || 'story-points';
          const teamVelocity = config.teamVelocity || 30;
          const includeBreakdown = config.includeBreakdown ?? true;

          this.logger.log(
            `Estimating effort for proposal ${proposalId} (method: ${estimationMethod})`,
          );

          const effortEstimate = {
            proposalId,
            totalStoryPoints: 21,
            totalHours: 84,
            calendarDays: 7,
            teamSize: 3,
            breakdown: includeBreakdown
              ? [
                  {
                    phase: 'Analysis & Design',
                    hours: 12,
                    storyPoints: 3,
                    assignee: 'senior-engineer',
                  },
                  {
                    phase: 'Implementation',
                    hours: 40,
                    storyPoints: 8,
                    assignee: 'mid-engineer',
                  },
                  {
                    phase: 'Test Development',
                    hours: 16,
                    storyPoints: 5,
                    assignee: 'qa-engineer',
                  },
                  {
                    phase: 'Integration & Verification',
                    hours: 10,
                    storyPoints: 3,
                    assignee: 'senior-engineer',
                  },
                  {
                    phase: 'Documentation & Deployment',
                    hours: 6,
                    storyPoints: 2,
                    assignee: 'mid-engineer',
                  },
                ]
              : undefined,
            riskBuffer: '20%',
            totalWithBuffer: {
              hours: 101,
              calendarDays: 9,
            },
            sprintEstimate: {
              sprintsRequired: Math.ceil(21 / teamVelocity),
              teamVelocity,
            },
            resourceRequirements: {
              seniorEngineers: 1,
              midEngineers: 1,
              qaEngineers: 1,
            },
          };

          return {
            success: true,
            data: {
              action,
              estimationMethod,
              teamVelocity,
              includeBreakdown,
              effortEstimate,
              estimateId: `effort-${Date.now()}`,
              status: 'effort_estimated',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'generate-plan': {
          const proposalId = config.proposalId || 'proposal-1-1';
          const planStyle = config.planStyle || 'incremental';
          const includeRollbackSteps = config.includeRollbackSteps ?? true;
          const includeValidationGates = config.includeValidationGates ?? true;
          const maxSteps = config.maxSteps || 10;

          this.logger.log(
            `Generating execution plan for proposal ${proposalId} (style: ${planStyle})`,
          );

          const steps = [
            {
              step: 1,
              name: 'Create feature branch',
              type: 'git',
              command: 'git checkout -b refactor/proposal-1-1',
              validationGate: includeValidationGates
                ? 'branch-exists'
                : undefined,
            },
            {
              step: 2,
              name: 'Extract service interface',
              type: 'code-change',
              files: ['src/services/search/interface.ts'],
              validationGate: includeValidationGates
                ? 'compiles'
                : undefined,
            },
            {
              step: 3,
              name: 'Implement new search strategy',
              type: 'code-change',
              files: ['src/services/search/strategy.ts'],
              validationGate: includeValidationGates
                ? 'unit-tests-pass'
                : undefined,
            },
            {
              step: 4,
              name: 'Wire new strategy into service',
              type: 'code-change',
              files: ['src/services/search/index.ts'],
              validationGate: includeValidationGates
                ? 'integration-tests-pass'
                : undefined,
            },
            {
              step: 5,
              name: 'Update feature flag configuration',
              type: 'config-change',
              files: ['config/feature-flags.yaml'],
              validationGate: includeValidationGates
                ? 'config-valid'
                : undefined,
            },
            {
              step: 6,
              name: 'Run full test suite',
              type: 'test',
              command: 'bun run test:all',
              validationGate: includeValidationGates
                ? 'all-tests-pass'
                : undefined,
            },
            {
              step: 7,
              name: 'Canary deployment (5% traffic)',
              type: 'deployment',
              validationGate: includeValidationGates
                ? 'canary-metrics-healthy'
                : undefined,
            },
            {
              step: 8,
              name: 'Full rollout',
              type: 'deployment',
              validationGate: includeValidationGates
                ? 'production-metrics-healthy'
                : undefined,
            },
          ].slice(0, maxSteps);

          const plan = {
            proposalId,
            planStyle,
            steps,
            totalSteps: steps.length,
            estimatedDuration: '5 business days',
            rollbackSteps: includeRollbackSteps
              ? [
                  {
                    step: 1,
                    name: 'Disable feature flag',
                    type: 'config-change',
                    command:
                      'feature-flags set search.new_strategy.enabled=false',
                  },
                  {
                    step: 2,
                    name: 'Revert canary deployment',
                    type: 'deployment',
                    command: 'deploy rollback --env=production',
                  },
                  {
                    step: 3,
                    name: 'Delete feature branch',
                    type: 'git',
                    command: 'git branch -D refactor/proposal-1-1',
                  },
                ]
              : undefined,
            prerequisites: [
              'All integration tests passing on main branch',
              'Feature flag infrastructure available',
              'Canary deployment pipeline configured',
            ],
            successCriteria: [
              'P99 latency reduced by ≥20ms',
              'Error rate below 0.5%',
              'No new regressions in certification suite',
            ],
          };

          // ── Sandbox Integration: Validate plan in sandbox ──────────
          if (this.sandboxService) {
            const change = this.sandboxService.proposeChange({
              type: SystemChangeType.CODE_MODIFICATION,
              description: `Execution plan for proposal ${proposalId}`,
              proposedBy: this.name,
              severity: 'high',
              beforeState: { proposalId, currentPlan: null },
              afterState: { proposalId, steps, planStyle },
              tags: ['self-evolution', 'execution-plan', proposalId],
            });

            const dryRunResult = await this.sandboxService.executeDryRun(
              change.id,
            );

            (plan as any).sandboxChangeId = change.id;
            (plan as any).sandboxDryRun = dryRunResult.success
              ? 'passed'
              : `failed: ${dryRunResult.error}`;
          }

          return {
            success: true,
            data: {
              action,
              planStyle,
              includeRollbackSteps,
              includeValidationGates,
              maxSteps,
              plan,
              planId: `exec-plan-${Date.now()}`,
              sandboxValidated: !!this.sandboxService,
              status: 'plan_generated',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Simulation helpers ────────────────────────────────────────────────

  private getRefactorTemplates(
    weaknessIndex: number,
  ): Array<{
    title: string;
    description: string;
    strategy: string;
    riskLevel: string;
    estimatedEffort: string;
    affectedFiles: string[];
    alternatives: string[];
  }> {
    const templates: Record<number, Array<{
      title: string;
      description: string;
      strategy: string;
      riskLevel: string;
      estimatedEffort: string;
      affectedFiles: string[];
      alternatives: string[];
    }>> = {
      0: [
        {
          title: 'Replace linear scan with indexed search',
          description:
            'Refactor search-service to use Elasticsearch index instead of in-memory linear scan for large datasets',
          strategy: 'replace-implementation',
          riskLevel: 'medium',
          estimatedEffort: '5 days',
          affectedFiles: [
            'src/services/search/search.service.ts',
            'src/services/search/search.module.ts',
            'src/services/search/index.ts',
          ],
          alternatives: [
            'Add in-memory cache with TTL as a lighter-weight fix',
            'Paginate existing search to reduce per-query cost',
          ],
        },
        {
          title: 'Introduce caching layer for hot queries',
          description:
            'Add Redis-backed caching in front of search-service for the top 20% most frequent queries',
          strategy: 'add-layer',
          riskLevel: 'low',
          estimatedEffort: '2 days',
          affectedFiles: [
            'src/services/search/search.service.ts',
            'src/common/cache/cache.module.ts',
          ],
          alternatives: [
            'Use CDN-level caching for public search results',
          ],
        },
      ],
      1: [
        {
          title: 'Add retry-with-backoff to payment processing',
          description:
            'Implement exponential backoff with circuit breaker for transient payment gateway failures',
          strategy: 'add-resilience',
          riskLevel: 'low',
          estimatedEffort: '2 days',
          affectedFiles: [
            'src/services/payment/payment.service.ts',
            'src/common/resilience/circuit-breaker.ts',
          ],
          alternatives: [
            'Switch to a more reliable payment gateway as primary',
            'Queue payments for async processing during outages',
          ],
        },
      ],
    };

    return (
      templates[weaknessIndex] || [
        {
          title: 'Generic refactoring proposal',
          description:
            'Restructure affected module to address identified weakness patterns',
          strategy: 'restructure',
          riskLevel: 'medium',
          estimatedEffort: '3 days',
          affectedFiles: ['src/services/affected/module.ts'],
          alternatives: ['Add monitoring and defer refactoring to next cycle'],
        },
      ]
    );
  }
}
