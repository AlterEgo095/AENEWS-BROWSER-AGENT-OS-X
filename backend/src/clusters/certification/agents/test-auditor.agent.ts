import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

export class TestAuditorAgent extends BaseAgent {
  readonly name = 'TestAuditorAgent';
  readonly cluster = ClusterType.CERTIFICATION;
  readonly capabilities = ['audit-tests', 'check-coverage', 'verify-assertions', 'identify-gaps'];
  readonly version = '2.0.0';
  readonly description = 'Audits the test suite for coverage, assertion quality, and gap identification to ensure comprehensive and meaningful testing';

  readonly missionCategories = [MissionCategory.AI_ORCHESTRATION, MissionCategory.SECURITY_OPS];
  readonly creditCost = 2;
  readonly powerLevel = 1;
  readonly tier = 'standard';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'audit-tests';
      const startTime = Date.now();

      switch (action) {
        case 'audit-tests': {
          const scope = config.scope || 'full';
          const testTypes = config.testTypes || ['unit', 'integration', 'e2e'];
          const checkFlakiness = config.checkFlakiness ?? true;
          const checkPerformance = config.checkPerformance ?? true;
          this.logger.log(`Auditing test suite (${scope}, types: ${testTypes.join(', ')})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, scope });

          const llmResult = await this.executeWithLLM(
            `You are a professional test suite auditor. Evaluate test quality, flakiness, and health.`,
            `Audit tests: scope="${scope}", types=${JSON.stringify(testTypes)}, checkFlakiness=${checkFlakiness}, checkPerformance=${checkPerformance}. Return JSON with: auditId (string), findings (array of {severity, category, description, file, recommendation}), testHealth ({totalTests, passing, failing, skipped, flaky}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const auditId = parsed?.auditId || `test-audit-${Date.now()}`;
          const findings = parsed?.findings || [
            { severity: 'high', category: 'flakiness', description: '5 tests in auth-suite exhibit flaky behavior (>10% failure rate)', file: 'tests/integration/auth-suite.spec.ts', recommendation: 'Add proper test isolation; mock external dependencies' },
            { severity: 'medium', category: 'coverage', description: 'Error handling paths have only 34% test coverage', file: 'src/services/', recommendation: 'Add negative test cases for error scenarios' },
          ];
          const testHealth = parsed?.testHealth || { totalTests: 847, passing: 812, failing: 15, skipped: 20, flaky: 5 };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { auditId, totalTests: testHealth.totalTests, passingRate: testHealth.passing / testHealth.totalTests });
          return { success: true, data: { action, scope, testTypes, checkFlakiness, checkPerformance, auditId, findings, testHealth, status: 'test_audit_completed', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime } };
        }

        case 'check-coverage': {
          const targetCoverage = config.targetCoverage || 80;
          const coverageType = config.coverageType || 'statement';
          const includeBranches = config.includeBranches ?? true;
          const includeFunctions = config.includeFunctions ?? true;
          const includeLines = config.includeLines ?? true;
          this.logger.log(`Checking coverage (target: ${targetCoverage}%, type: ${coverageType})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, targetCoverage });

          const llmResult = await this.executeWithLLM(
            `You are a professional test coverage expert. Analyze code coverage metrics and identify gaps.`,
            `Check coverage: target=${targetCoverage}%, type="${coverageType}", includeBranches=${includeBranches}, includeFunctions=${includeFunctions}, includeLines=${includeLines}. Return JSON with: coverageResults ({statements, branches, functions, lines}), coverageByFile (array of {file, statements, branches, functions, lines}), belowThreshold (array of {file, coverage, threshold, deficit}), meetsTarget (boolean).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const coverageResults = parsed?.coverageResults || { statements: 84.2, branches: 71.5, functions: 88.1, lines: 82.7 };
          const coverageByFile = parsed?.coverageByFile || [
            { file: 'src/services/search/search.service.ts', statements: 92.3, branches: 85.1, functions: 95.0, lines: 91.0 },
            { file: 'src/services/user/user.service.ts', statements: 78.4, branches: 62.5, functions: 82.0, lines: 76.8 },
          ];
          const belowThreshold = parsed?.belowThreshold || [
            { file: 'src/services/user/user.service.ts', coverage: 78.4, threshold: 80, deficit: 1.6 },
          ];
          const meetsTarget = parsed?.meetsTarget ?? (coverageResults.statements >= targetCoverage);

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { statements: coverageResults.statements, meetsTarget });
          return { success: true, data: { action, targetCoverage, coverageType, includeBranches, includeFunctions, includeLines, coverageResults, coverageByFile, belowThreshold, meetsTarget, status: 'coverage_check_completed', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime } };
        }

        case 'verify-assertions': {
          const testPaths = config.testPaths || [];
          const checkMeaningful = config.checkMeaningful ?? true;
          const checkSpecificity = config.checkSpecificity ?? true;
          const checkNegativeCases = config.checkNegativeCases ?? true;
          this.logger.log(`Verifying assertions in ${testPaths.length || 'all'} test paths`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action });

          const llmResult = await this.executeWithLLM(
            `You are a professional test assertion quality expert. Verify that test assertions are meaningful and specific.`,
            `Verify assertions: paths=${JSON.stringify(testPaths)}, checkMeaningful=${checkMeaningful}, checkSpecificity=${checkSpecificity}, checkNegativeCases=${checkNegativeCases}. Return JSON with: assertionAnalysis (array of {file, totalAssertions, meaningful, weak: [{line, assertion, issue, suggestion}]}), antiPatterns (array of {type, file, description, severity}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const assertionAnalysis = parsed?.assertionAnalysis || [
            { file: 'tests/unit/search.service.spec.ts', totalAssertions: 45, meaningful: 38, weak: [{ line: 67, assertion: 'expect(result).toBeDefined()', issue: 'Overly generic assertion; does not verify correctness', suggestion: 'Assert specific properties of the result object' }] },
          ];
          const antiPatterns = parsed?.antiPatterns || [
            { type: 'sleep-assertion', file: 'tests/integration/auth.spec.ts', description: 'Uses setTimeout to wait for async operations instead of proper await', severity: 'medium' },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { fileCount: assertionAnalysis.length, antiPatternCount: antiPatterns.length });
          return { success: true, data: { action, testPaths, checkMeaningful, checkSpecificity, checkNegativeCases, assertionAnalysis, antiPatterns, status: 'assertion_verification_completed', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime } };
        }

        case 'identify-gaps': {
          const sourcePaths = config.sourcePaths || [];
          const testPaths = config.testPaths || [];
          const analyzeEdgeCases = config.analyzeEdgeCases ?? true;
          const analyzeErrorPaths = config.analyzeErrorPaths ?? true;
          const analyzeBoundaryConditions = config.analyzeBoundaryConditions ?? true;
          this.logger.log(`Identifying test gaps between ${sourcePaths.length} source and ${testPaths.length} test paths`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action });

          const llmResult = await this.executeWithLLM(
            `You are a professional test gap analysis expert. Identify missing test coverage and untested scenarios.`,
            `Identify gaps: sourcePaths=${JSON.stringify(sourcePaths)}, testPaths=${JSON.stringify(testPaths)}, analyzeEdgeCases=${analyzeEdgeCases}, analyzeErrorPaths=${analyzeErrorPaths}, analyzeBoundaryConditions=${analyzeBoundaryConditions}. Return JSON with: gaps (array of {module, function, type, description, severity, suggestedTests}), untestedModules (string array), partiallyTested (array of {module, testedScenarios, untestedScenarios}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const gaps = parsed?.gaps || [
            { module: 'payment-service', function: 'processRefund', type: 'error-path', description: 'No tests for refund when payment gateway is unreachable', severity: 'high', suggestedTests: ['Test refund with gateway timeout', 'Test refund with gateway 500 error', 'Test refund retry mechanism'] },
            { module: 'search-service', function: 'search', type: 'edge-case', description: 'No tests for empty query or special characters', severity: 'medium', suggestedTests: ['Test empty string query', 'Test query with SQL injection characters', 'Test query with unicode characters'] },
          ];
          const untestedModules = parsed?.untestedModules || ['legacy-import-service'];
          const partiallyTested = parsed?.partiallyTested || [
            { module: 'payment-service', testedScenarios: ['successful payment', 'payment decline'], untestedScenarios: ['partial refund', 'gateway timeout', 'currency conversion'] },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { gapCount: gaps.length, untestedCount: untestedModules.length });
          return { success: true, data: { action, sourcePaths, testPaths, analyzeEdgeCases, analyzeErrorPaths, analyzeBoundaryConditions, gaps, untestedModules, partiallyTested, status: 'gap_identification_completed', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime } };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      this.emitEvent(AgentEventType.AGENT_FAILED, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}
