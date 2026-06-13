import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';

/**
 * PatchGeneratorAgent — fourth stage of the Self-Evolution loop.
 *
 * Consumes execution plans from RefactorProposerAgent and generates concrete
 * code patches on isolated Git branches. Each patch is validated for syntax,
 * type-safety and style compliance before being tested in a sandboxed
 * environment. Only patches that pass all checks are eligible for the
 * AutoCertifierAgent to certify.
 *
 * Supported actions:
 *  - generate-patch : Create a code patch from an execution plan
 *  - validate-patch : Validate patch for syntax, types, and style
 *  - test-patch     : Run the patch in an isolated test environment
 *  - apply-patch    : Apply the patch to the target branch (pending cert)
 */
export class PatchGeneratorAgent extends BaseAgent {
  readonly name = 'PatchGeneratorAgent';
  readonly cluster = ClusterType.SELF_EVOLUTION;
  readonly capabilities = [
    'generate-patch',
    'validate-patch',
    'test-patch',
    'apply-patch',
  ];
  readonly version = '1.0.0';
  readonly description =
    'Generates code patches in isolated branches for proposed refactoring strategies';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'generate-patch';
      const startTime = Date.now();

      switch (action) {
        case 'generate-patch': {
          const planId = config.planId || `exec-plan-${Date.now() - 1000}`;
          const proposalId = config.proposalId || 'proposal-1-1';
          const targetBranch = config.targetBranch || 'main';
          const branchPrefix =
            config.branchPrefix || 'self-evolution/patch';
          const patchFormat = config.patchFormat || 'unified-diff';
          const includeContextLines = config.includeContextLines ?? 3;

          const branchName = `${branchPrefix}/${proposalId}-${Date.now()}`;

          this.logger.log(
            `Generating patch for plan ${planId} on branch ${branchName}`,
          );

          const patchFiles = [
            {
              filePath: 'src/services/search/search.service.ts',
              changeType: 'modify',
              additions: 42,
              deletions: 18,
              hunks: [
                {
                  startLine: 15,
                  context: includeContextLines
                    ? [
                        '  async search(query: string): Promise<SearchResult> {',
                        '-   return this.linearScan(query);',
                        '+   return this.indexedSearch(query);',
                      ]
                    : undefined,
                },
              ],
            },
            {
              filePath: 'src/services/search/search.module.ts',
              changeType: 'modify',
              additions: 8,
              deletions: 2,
              hunks: [],
            },
            {
              filePath: 'src/services/search/strategy.ts',
              changeType: 'add',
              additions: 65,
              deletions: 0,
              hunks: [],
            },
            {
              filePath: 'config/feature-flags.yaml',
              changeType: 'modify',
              additions: 3,
              deletions: 0,
              hunks: [],
            },
          ];

          const patch = {
            patchId: `patch-${Date.now()}`,
            planId,
            proposalId,
            branchName,
            targetBranch,
            baseCommit: `abc${Date.now().toString(36)}`,
            patchFormat,
            files: patchFiles,
            summary: {
              totalFiles: patchFiles.length,
              totalAdditions: patchFiles.reduce((s, f) => s + f.additions, 0),
              totalDeletions: patchFiles.reduce((s, f) => s + f.deletions, 0),
              netChange:
                patchFiles.reduce((s, f) => s + f.additions, 0) -
                patchFiles.reduce((s, f) => s + f.deletions, 0),
            },
          };

          return {
            success: true,
            data: {
              action,
              branchPrefix,
              includeContextLines,
              patch,
              generatedAt: new Date().toISOString(),
              status: 'patch_generated',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'validate-patch': {
          const patchId = config.patchId || `patch-${Date.now() - 500}`;
          const checks = config.checks || [
            'syntax',
            'type-check',
            'lint',
            'style',
            'dependency-consistency',
          ];
          const failFast = config.failFast ?? true;
          const strictMode = config.strictMode ?? false;

          this.logger.log(
            `Validating patch ${patchId} with checks: [${checks.join(', ')}]`,
          );

          const results = checks.map((check: string) => ({
            check,
            status: Math.random() > 0.15 ? 'passed' : 'failed',
            duration: Math.floor(Math.random() * 5000 + 500),
            details:
              check === 'type-check'
                ? { errors: 0, warnings: strictMode ? 2 : 0 }
                : check === 'lint'
                  ? { errors: 0, warnings: 1, fixable: 1 }
                  : check === 'syntax'
                    ? { valid: true }
                    : check === 'style'
                      ? { violations: 0, autoFixable: 0 }
                      : { consistent: true },
          }));

          const allPassed = results.every((r) => r.status === 'passed');
          const failedChecks = results.filter((r) => r.status === 'failed');

          if (failFast && failedChecks.length > 0) {
            return {
              success: false,
              data: {
                action,
                patchId,
                checks,
                failFast,
                strictMode,
                results,
                failedChecks: failedChecks.map((c) => c.check),
                totalChecks: checks.length,
                passedChecks: results.filter((r) => r.status === 'passed').length,
                validationId: `validation-${Date.now()}`,
                status: 'validation_failed_fast',
                timestamp: new Date().toISOString(),
              },
              error: `Patch validation failed on check: ${failedChecks[0].check}`,
              metadata: { duration: Date.now() - startTime },
            };
          }

          return {
            success: allPassed,
            data: {
              action,
              patchId,
              checks,
              failFast,
              strictMode,
              results,
              failedChecks: failedChecks.map((c) => c.check),
              totalChecks: checks.length,
              passedChecks: results.filter((r) => r.status === 'passed').length,
              validationId: `validation-${Date.now()}`,
              status: allPassed
                ? 'validation_passed'
                : 'validation_failed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'test-patch': {
          const patchId = config.patchId || `patch-${Date.now() - 500}`;
          const testSuites = config.testSuites || [
            'unit',
            'integration',
            'e2e-smoke',
          ];
          const timeout = config.timeout || 300000;
          const parallelism = config.parallelism || 2;
          const environment = config.environment || 'sandbox';
          const captureCoverage = config.captureCoverage ?? true;

          this.logger.log(
            `Testing patch ${patchId} in ${environment} with suites: [${testSuites.join(', ')}]`,
          );

          const suiteResults = testSuites.map((suite: string) => ({
            suite,
            status: Math.random() > 0.1 ? 'passed' : 'failed',
            totalTests: Math.floor(Math.random() * 50) + 10,
            passed: 0,
            failed: 0,
            skipped: Math.floor(Math.random() * 3),
            duration: Math.floor(Math.random() * 30000) + 2000,
          }));

          // Derive passed/failed from status for simulation
          for (const result of suiteResults) {
            if (result.status === 'passed') {
              result.passed = result.totalTests - result.skipped;
              result.failed = 0;
            } else {
              result.passed = result.totalTests - result.skipped - 2;
              result.failed = 2;
            }
          }

          const allPassed = suiteResults.every((r) => r.status === 'passed');
          const totalTests = suiteResults.reduce((s, r) => s + r.totalTests, 0);
          const totalPassed = suiteResults.reduce((s, r) => s + r.passed, 0);
          const totalFailed = suiteResults.reduce((s, r) => s + r.failed, 0);

          const coverage = captureCoverage
            ? {
                lines: parseFloat((Math.random() * 15 + 80).toFixed(1)),
                branches: parseFloat((Math.random() * 15 + 70).toFixed(1)),
                functions: parseFloat((Math.random() * 10 + 85).toFixed(1)),
                statements: parseFloat((Math.random() * 12 + 82).toFixed(1)),
              }
            : undefined;

          return {
            success: allPassed,
            data: {
              action,
              patchId,
              testSuites,
              timeout,
              parallelism,
              environment,
              captureCoverage,
              suiteResults,
              summary: {
                totalTests,
                totalPassed,
                totalFailed,
                totalSkipped: suiteResults.reduce(
                  (s, r) => s + r.skipped,
                  0,
                ),
                passRate: parseFloat(
                  ((totalPassed / totalTests) * 100).toFixed(1),
                ),
              },
              coverage,
              testRunId: `test-run-${Date.now()}`,
              status: allPassed
                ? 'tests_passed'
                : 'tests_failed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'apply-patch': {
          const patchId = config.patchId || `patch-${Date.now() - 500}`;
          const targetBranch = config.targetBranch || 'main';
          const strategy = config.strategy || 'merge';
          const requireCertification = config.requireCertification ?? true;
          const createPullRequest = config.createPullRequest ?? true;
          const reviewers = config.reviewers || ['auto-certifier'];
          const labels = config.labels || [
            'self-evolution',
            'automated-patch',
          ];

          this.logger.log(
            `Applying patch ${patchId} to ${targetBranch} via ${strategy}`,
          );

          const application = {
            patchId,
            targetBranch,
            strategy,
            appliedAt: new Date().toISOString(),
            mergeCommit: requireCertification
              ? null
              : `merge-${Date.now().toString(36)}`,
            status: requireCertification
              ? 'pending-certification'
              : 'merged',
            pullRequest: createPullRequest
              ? {
                  id: `pr-${Date.now()}`,
                  title: `[Self-Evolution] Automated patch ${patchId}`,
                  body: `Automated patch generated by PatchGeneratorAgent.\n\nPatch ID: ${patchId}\nTarget: ${targetBranch}\nStrategy: ${strategy}\n\n⚠️ This PR requires AutoCertifierAgent approval before merge.`,
                  branch: `self-evolution/patch/${patchId}`,
                  base: targetBranch,
                  state: 'open',
                  reviewers,
                  labels,
                }
              : undefined,
            certificationRequired: requireCertification,
            nextStep: requireCertification
              ? 'run-certification'
              : 'complete',
          };

          return {
            success: true,
            data: {
              action,
              requireCertification,
              createPullRequest,
              application,
              applicationId: `apply-${Date.now()}`,
              status: 'patch_applied',
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
}
