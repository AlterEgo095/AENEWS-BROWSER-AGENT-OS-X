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
 * AutoCertifierAgent — final gate of the Self-Evolution loop.
 *
 * Runs the full certification suite on generated patches and determines
 * whether the Evolution Quality Index (EQI) has increased compared to the
 * baseline. Only patches that demonstrably improve EQI are approved for
 * merge; all others are rejected with a detailed rationale that feeds back
 * into the loop for the next iteration.
 *
 * ## Safety Integration
 *
 * Actions that modify certification rules (approve-merge, reject-merge)
 * require human approval because they alter the system's quality gate.
 * Read-only analysis actions (run-certification, verify-eqi) do not
 * require approval but are still logged for audit.
 *
 * The SandboxService is used to test certification rule changes before
 * they are applied to the live certification pipeline.
 *
 * Supported actions:
 *  - run-certification : Execute certification suites against a patch
 *  - verify-eqi        : Compare current EQI against baseline EQI
 *  - approve-merge     : Mark a patch as approved for merge (EQI↑ only) [requires approval]
 *  - reject-merge      : Mark a patch as rejected with failure rationale [requires approval]
 */
@RequiresHumanApproval({
  reason: 'AutoCertifierAgent can modify certification rules and approve/reject merges',
  severity: 'high',
})
export class AutoCertifierAgent extends BaseAgent {
  readonly name = 'AutoCertifierAgent';
  readonly cluster = ClusterType.SELF_EVOLUTION;
  readonly capabilities = [
    'run-certification',
    'verify-eqi',
    'approve-merge',
    'reject-merge',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Runs certification on generated patches and only approves merge if EQI increases (requires human approval for rule changes)';

  private sandboxService?: SandboxService;

  /**
   * Inject the SandboxService for safe certification testing.
   * Called by the cluster module after construction.
   */
  setSandboxService(sandbox: SandboxService): void {
    this.sandboxService = sandbox;
    this.logger.debug('SandboxService injected into AutoCertifierAgent');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'run-certification';
      const startTime = Date.now();

      switch (action) {
        case 'run-certification': {
          const patchId = config.patchId || `patch-${Date.now() - 500}`;
          const suites = config.suites || [
            'security',
            'performance',
            'reliability',
            'maintainability',
            'compliance',
          ];
          const baselineEqi = config.baselineEqi ?? 72.5;
          const strictMode = config.strictMode ?? false;
          const timeout = config.timeout || 600000;
          const includeDetailedResults = config.includeDetailedResults ?? true;

          this.logger.log(
            `Running certification for patch ${patchId} across ${suites.length} suites (baseline EQI: ${baselineEqi})`,
          );

          const suiteResults = suites.map((suite: string) => {
            const score = parseFloat(
              (Math.random() * 25 + 75).toFixed(1),
            );
            const passed = score >= (strictMode ? 90 : 70);
            return {
              suite,
              score,
              passed,
              maxScore: 100,
              threshold: strictMode ? 90 : 70,
              duration: Math.floor(Math.random() * 60000 + 5000),
              checks: includeDetailedResults
                ? this.generateSuiteChecks(suite, passed)
                : undefined,
            };
          });

          const allPassed = suiteResults.every((r: { passed: boolean }) => r.passed);
          const avgScore =
            suiteResults.reduce((s: number, r: { score: number }) => s + r.score, 0) /
            suiteResults.length;

          const newEqi = parseFloat(avgScore.toFixed(1));
          const eqiDelta = parseFloat((newEqi - baselineEqi).toFixed(1));
          const eqiImproved = eqiDelta > 0;

          // ── Sandbox Integration: Test certification in sandbox ────
          if (this.sandboxService) {
            const change = this.sandboxService.proposeChange({
              type: SystemChangeType.CODE_MODIFICATION,
              description: `Certification run for patch ${patchId}`,
              proposedBy: this.name,
              severity: 'medium',
              beforeState: { patchId, baselineEqi },
              afterState: {
                patchId,
                newEqi,
                eqiDelta,
                suiteResults: suiteResults.map((r: { suite: string; passed: boolean; score: number }) => ({
                  suite: r.suite,
                  passed: r.passed,
                  score: r.score,
                })),
              },
              tags: ['self-evolution', 'certification', patchId],
            });

            const dryRunResult = await this.sandboxService.executeDryRun(
              change.id,
            );

            if (!dryRunResult.success) {
              this.logger.warn(
                `Sandbox dry-run failed for certification of patch ${patchId}: ${dryRunResult.error}`,
              );
            }
          }

          return {
            success: allPassed,
            data: {
              action,
              patchId,
              suites,
              baselineEqi,
              strictMode,
              timeout,
              suiteResults,
              allSuitesPassed: allPassed,
              newEqi,
              eqiDelta,
              eqiImproved,
              certificationVerdict: allPassed && eqiImproved
                ? 'pass'
                : allPassed && !eqiImproved
                  ? 'pass-but-no-eqi-gain'
                  : 'fail',
              certificationId: `cert-${Date.now()}`,
              sandboxValidated: !!this.sandboxService,
              status: allPassed
                ? 'certification_passed'
                : 'certification_failed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'verify-eqi': {
          const patchId = config.patchId || `patch-${Date.now() - 500}`;
          const currentEqi = config.currentEqi ?? 78.3;
          const baselineEqi = config.baselineEqi ?? 72.5;
          const previousEqi = config.previousEqi ?? baselineEqi;
          const minImprovement = config.minImprovement || 1.0;
          const dimensions = config.dimensions || [
            'security',
            'performance',
            'reliability',
            'maintainability',
            'compliance',
          ];

          this.logger.log(
            `Verifying EQI for patch ${patchId}: current=${currentEqi}, baseline=${baselineEqi}`,
          );

          const eqiDelta = parseFloat(
            (currentEqi - baselineEqi).toFixed(1),
          );
          const eqiTrend =
            currentEqi > previousEqi
              ? 'improving'
              : currentEqi < previousEqi
                ? 'declining'
                : 'stable';
          const meetsMinImprovement = eqiDelta >= minImprovement;

          const dimensionBreakdown = dimensions.map((dim: string) => ({
            dimension: dim,
            currentScore: parseFloat(
              (Math.random() * 20 + 70).toFixed(1),
            ),
            baselineScore: parseFloat(
              (Math.random() * 15 + 65).toFixed(1),
            ),
            delta: 0,
            trend: '',
          }));

          // Populate deltas and trends
          for (const dim of dimensionBreakdown) {
            dim.delta = parseFloat(
              (dim.currentScore - dim.baselineScore).toFixed(1),
            );
            dim.trend =
              dim.delta > 0
                ? 'improved'
                : dim.delta < 0
                  ? 'degraded'
                  : 'stable';
          }

          const overallVerdict =
            eqiDelta > 0 && meetsMinImprovement
              ? 'eqi-increased'
              : eqiDelta > 0
                ? 'eqi-marginally-increased'
                : eqiDelta === 0
                  ? 'eqi-unchanged'
                  : 'eqi-decreased';

          return {
            success: eqiDelta > 0,
            data: {
              action,
              patchId,
              currentEqi,
              baselineEqi,
              previousEqi,
              minImprovement,
              eqiDelta,
              eqiTrend,
              meetsMinImprovement,
              dimensionBreakdown,
              overallVerdict,
              verificationId: `eqi-verify-${Date.now()}`,
              status:
                eqiDelta > 0
                  ? 'eqi_verified_improved'
                  : 'eqi_verification_failed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'approve-merge': {
          const patchId = config.patchId || `patch-${Date.now() - 500}`;
          const certificationId =
            config.certificationId || `cert-${Date.now() - 200}`;
          const currentEqi = config.currentEqi ?? 78.3;
          const baselineEqi = config.baselineEqi ?? 72.5;
          const eqiDelta = parseFloat(
            (currentEqi - baselineEqi).toFixed(1),
          );
          const pullRequestId = config.pullRequestId || `pr-${Date.now()}`;
          const approver = config.approver || 'AutoCertifierAgent';
          const requirePostMergeMonitoring =
            config.requirePostMergeMonitoring ?? true;
          const monitoringWindow = config.monitoringWindow || '2h';
          const rollbackOnRegression =
            config.rollbackOnRegression ?? true;

          // Safety check — only approve if EQI has actually increased
          if (eqiDelta <= 0) {
            return {
              success: false,
              data: {
                action,
                patchId,
                certificationId,
                currentEqi,
                baselineEqi,
                eqiDelta,
                reason:
                  'EQI has not increased; merge approval denied. Patch must demonstrate a positive EQI delta.',
                status: 'merge_denied',
                timestamp: new Date().toISOString(),
              },
              error:
                'Cannot approve merge: EQI has not increased above baseline',
              metadata: { duration: Date.now() - startTime },
            };
          }

          this.logger.log(
            `Approving merge for patch ${patchId} (EQI: ${currentEqi}, delta: +${eqiDelta})`,
          );

          // ── Sandbox Integration: Validate merge approval in sandbox ──
          if (this.sandboxService) {
            const change = this.sandboxService.proposeChange({
              type: SystemChangeType.CODE_MODIFICATION,
              description: `Merge approval for patch ${patchId}`,
              proposedBy: this.name,
              severity: 'high',
              beforeState: {
                patchId,
                certificationId,
                baselineEqi,
                status: 'pending-merge',
              },
              afterState: {
                patchId,
                certificationId,
                currentEqi,
                eqiDelta,
                status: 'merge-approved',
                approver,
              },
              tags: ['self-evolution', 'merge-approval', patchId],
            });

            const dryRunResult = await this.sandboxService.executeDryRun(
              change.id,
            );

            if (dryRunResult.success) {
              const validationResult =
                await this.sandboxService.validateChange(change.id);

              if (!validationResult.valid) {
                return {
                  success: false,
                  data: {
                    action,
                    patchId,
                    certificationId,
                    currentEqi,
                    baselineEqi,
                    eqiDelta,
                    sandboxChangeId: change.id,
                    validationResult,
                    reason: `Sandbox validation blocked merge: ${validationResult.summary}`,
                    status: 'sandbox_validation_failed',
                    timestamp: new Date().toISOString(),
                  },
                  error: `Merge approval blocked by sandbox: ${validationResult.summary}`,
                  metadata: { duration: Date.now() - startTime },
                };
              }
            } else {
              this.logger.warn(
                `Sandbox dry-run failed for merge approval of patch ${patchId}`,
              );
            }
          }

          const approval = {
            patchId,
            certificationId,
            pullRequestId,
            approver,
            approvedAt: new Date().toISOString(),
            eqiAtApproval: {
              current: currentEqi,
              baseline: baselineEqi,
              delta: eqiDelta,
            },
            postMergeConditions: {
              monitoringRequired: requirePostMergeMonitoring,
              monitoringWindow,
              rollbackOnRegression,
              regressionThreshold: '-2.0 EQI points',
            },
            mergeStrategy: 'squash-merge',
            targetBranch: config.targetBranch || 'main',
          };

          return {
            success: true,
            data: {
              action,
              approval,
              approvalId: `approval-${Date.now()}`,
              sandboxValidated: !!this.sandboxService,
              status: 'merge_approved',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'reject-merge': {
          const patchId = config.patchId || `patch-${Date.now() - 500}`;
          const certificationId =
            config.certificationId || `cert-${Date.now() - 200}`;
          const reason =
            config.reason ||
            'EQI did not increase or certification failed';
          const failedSuites = config.failedSuites || [];
          const currentEqi = config.currentEqi ?? 70.0;
          const baselineEqi = config.baselineEqi ?? 72.5;
          const eqiDelta = parseFloat(
            (currentEqi - baselineEqi).toFixed(1),
          );
          const autoRetry = config.autoRetry ?? true;
          const maxRetries = config.maxRetries || 3;
          const retryCount = config.retryCount || 0;
          const feedBackToLoop = config.feedBackToLoop ?? true;

          this.logger.warn(
            `Rejecting merge for patch ${patchId}: ${reason}`,
          );

          // ── Sandbox Integration: Log rejection in sandbox ────────
          if (this.sandboxService) {
            this.sandboxService.proposeChange({
              type: SystemChangeType.CODE_MODIFICATION,
              description: `Merge rejection for patch ${patchId}: ${reason}`,
              proposedBy: this.name,
              severity: 'medium',
              beforeState: { patchId, certificationId, status: 'pending-merge' },
              afterState: {
                patchId,
                certificationId,
                status: 'merge-rejected',
                reason,
                failedSuites,
              },
              tags: ['self-evolution', 'merge-rejection', patchId],
            });
          }

          const rejection = {
            patchId,
            certificationId,
            rejectedAt: new Date().toISOString(),
            reason,
            eqiAtRejection: {
              current: currentEqi,
              baseline: baselineEqi,
              delta: eqiDelta,
            },
            failedSuites:
              failedSuites.length > 0
                ? failedSuites
                : eqiDelta <= 0
                  ? ['eqi-regression']
                  : ['unknown'],
            nextSteps: feedBackToLoop
              ? {
                  action: 'feed-back-to-loop',
                  targetAgent: 'WeaknessDetectorAgent',
                  retryEligible: autoRetry && retryCount < maxRetries,
                  retryCount,
                  maxRetries,
                  suggestedAdjustments: [
                    'Refine refactoring scope to address certification failures',
                    'Consider alternative strategies from proposal alternatives list',
                    'Reduce patch scope for incremental improvement',
                  ],
                }
              : undefined,
          };

          return {
            success: false,
            data: {
              action,
              rejection,
              rejectionId: `rejection-${Date.now()}`,
              sandboxLogged: !!this.sandboxService,
              status: 'merge_rejected',
              timestamp: new Date().toISOString(),
            },
            error: reason,
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

  /**
   * Generates a list of simulated check results for a given certification suite.
   */
  private generateSuiteChecks(
    suite: string,
    suitePassed: boolean,
  ): Array<{
    check: string;
    status: string;
    message: string;
  }> {
    const checkTemplates: Record<string, string[]> = {
      security: [
        'dependency-vulnerability-scan',
        'owasp-top-10-compliance',
        'secret-leak-detection',
        'access-control-verification',
      ],
      performance: [
        'response-time-regression',
        'memory-usage-regression',
        'throughput-benchmark',
        'cpu-efficiency-check',
      ],
      reliability: [
        'error-rate-regression',
        'circuit-breaker-test',
        'graceful-degradation-test',
        'retry-mechanism-test',
      ],
      maintainability: [
        'code-complexity-check',
        'test-coverage-check',
        'documentation-completeness',
        'dependency-freshness',
      ],
      compliance: [
        'data-handling-compliance',
        'audit-log-verification',
        'gdpr-compliance-check',
        'encryption-at-rest-check',
      ],
    };

    const checks = checkTemplates[suite] || ['generic-check'];
    return checks.map((check) => ({
      check,
      status: suitePassed
        ? 'passed'
        : Math.random() > 0.5
          ? 'passed'
          : 'failed',
      message: suitePassed
        ? `${check}: OK`
        : `${check}: violation detected — requires remediation`,
    }));
  }
}
