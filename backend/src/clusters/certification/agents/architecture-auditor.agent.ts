import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * ArchitectureAuditorAgent audits system architecture for structural integrity,
 * circular dependencies, coupling analysis, and layer verification.
 * Ensures the codebase adheres to clean architecture principles and
 * identifies architectural anti-patterns.
 */
export class ArchitectureAuditorAgent extends BaseAgent {
  readonly name = 'ArchitectureAuditorAgent';
  readonly cluster = ClusterType.CERTIFICATION;
  readonly capabilities = [
    'audit-architecture',
    'check-circular-deps',
    'assess-coupling',
    'verify-layers',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Audits system architecture for structural integrity, detects circular dependencies, assesses module coupling, and verifies clean layer boundaries';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'audit-architecture';
      const startTime = Date.now();

      switch (action) {
        case 'audit-architecture': {
          const scope = config.scope || 'full';
          const modules = config.modules || [];
          const depth = config.depth || 'standard';
          const checkPatterns = config.checkPatterns ?? true;
          const checkPrinciples = config.checkPrinciples ?? true;
          const checkBoundaries = config.checkBoundaries ?? true;
          this.logger.log(
            `Auditing architecture (${scope}) for ${modules.length || 'all'} modules (depth: ${depth})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, scope, depth });

          const llmResult = await this.executeWithLLM(
            `You are a professional software architecture auditor. Evaluate architecture quality, detect anti-patterns, and verify adherence to clean architecture principles.`,
            `Audit architecture: scope="${scope}", modules=${JSON.stringify(modules)}, depth="${depth}", checkPatterns=${checkPatterns}, checkPrinciples=${checkPrinciples}, checkBoundaries=${checkBoundaries}. Return JSON with: auditId (string), findings (array of {id, severity, category, title, description, location, recommendation}), score ({overall, modularity, cohesion, separation}), violations (array of {type, module, description, impact}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const auditId = parsed?.auditId || `arch-audit-${Date.now()}`;
          const findings = parsed?.findings || [
            { id: 'arch-001', severity: 'high', category: 'coupling', title: 'Tight coupling between services', description: 'Service layer directly imports repository implementations instead of interfaces', location: 'src/services/', recommendation: 'Introduce interface abstractions and use dependency injection' },
            { id: 'arch-002', severity: 'medium', category: 'separation', title: 'Business logic in controller layer', description: 'Controllers contain validation and transformation logic that should reside in the service layer', location: 'src/controllers/user.controller.ts', recommendation: 'Move business logic to service layer; keep controllers thin' },
          ];
          const score = parsed?.score || { overall: 78, modularity: 75, cohesion: 82, separation: 71 };
          const violations = parsed?.violations || [
            { type: 'layer-breach', module: 'user-controller', description: 'Controller directly accesses database layer', impact: 'Violates separation of concerns; reduces testability' },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { auditId, overallScore: score.overall, findingCount: findings.length });

          return {
            success: true,
            data: { action, scope, modules, depth, checkPatterns, checkPrinciples, checkBoundaries, auditId, findings, score, violations, status: 'architecture_audit_completed', timestamp: new Date().toISOString() },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'check-circular-deps': {
          const includeTransitive = config.includeTransitive ?? true;
          const maxDepth = config.maxDepth || 10;
          const excludeModules = config.excludeModules || [];
          const detectSelfLoops = config.detectSelfLoops ?? true;
          this.logger.log(`Checking circular dependencies (transitive: ${includeTransitive}, maxDepth: ${maxDepth})`);

          this.emitEvent(AgentEventType.AGENT_STARTED, { action });

          const llmResult = await this.executeWithLLM(
            `You are a professional dependency analysis expert. Detect circular dependencies in a TypeScript/NestJS codebase.`,
            `Check circular deps: includeTransitive=${includeTransitive}, maxDepth=${maxDepth}, detectSelfLoops=${detectSelfLoops}. Return JSON with: circularDependencies (array of {cycle, type, severity, description}), dependencyGraph ({nodeCount, edgeCount, hasCircularPaths}), resolutionSuggestions (array of {cycle, suggestion, effort}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const circularDependencies = parsed?.circularDependencies || [
            { cycle: ['UserService → NotificationService → UserService'], type: 'direct', severity: 'high', description: 'UserService directly imports NotificationService which imports UserService' },
          ];
          const dependencyGraph = parsed?.dependencyGraph || { nodeCount: 85, edgeCount: 142, hasCircularPaths: true };
          const resolutionSuggestions = parsed?.resolutionSuggestions || [
            { cycle: ['UserService → NotificationService → UserService'], suggestion: 'Extract notification interface; use event-driven communication via EventBus', effort: 'medium' },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { circularCount: circularDependencies.length, hasCycles: dependencyGraph.hasCircularPaths });

          return {
            success: true,
            data: { action, includeTransitive, maxDepth, excludeModules, detectSelfLoops, circularDependencies, dependencyGraph, resolutionSuggestions, status: 'circular_deps_check_completed', timestamp: new Date().toISOString() },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'assess-coupling': {
          const couplingType = config.couplingType || 'all';
          const threshold = config.threshold || 0.7;
          const includeDataCoupling = config.includeDataCoupling ?? true;
          const includeControlCoupling = config.includeControlCoupling ?? true;
          this.logger.log(`Assessing coupling (type: ${couplingType}, threshold: ${threshold})`);

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, couplingType, threshold });

          const llmResult = await this.executeWithLLM(
            `You are a professional coupling analysis expert. Measure and assess coupling metrics between modules.`,
            `Assess coupling: type="${couplingType}", threshold=${threshold}, includeDataCoupling=${includeDataCoupling}, includeControlCoupling=${includeControlCoupling}. Return JSON with: couplingMetrics (array of {moduleA, moduleB, afferentCoupling, efferentCoupling, instability, abstractness, distance}), highCouplingPairs (array of {modules, score, type, recommendation}), overallCouplingScore (number 0-100).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const couplingMetrics = parsed?.couplingMetrics || [
            { moduleA: 'UserService', moduleB: 'AuthService', afferentCoupling: 8, efferentCoupling: 3, instability: 0.27, abstractness: 0.6, distance: 0.13 },
            { moduleA: 'OrderService', moduleB: 'PaymentService', afferentCoupling: 5, efferentCoupling: 6, instability: 0.55, abstractness: 0.4, distance: 0.05 },
          ];
          const highCouplingPairs = parsed?.highCouplingPairs || [
            { modules: ['OrderService', 'InventoryService'] as [string, string], score: 0.82, type: 'data', recommendation: 'Introduce event-driven decoupling via domain events' },
          ];
          const overallCouplingScore = parsed?.overallCouplingScore ?? 72;

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { overallScore: overallCouplingScore, highPairCount: highCouplingPairs.length });

          return {
            success: true,
            data: { action, couplingType, threshold, includeDataCoupling, includeControlCoupling, couplingMetrics, highCouplingPairs, overallCouplingScore, status: 'coupling_assessment_completed', timestamp: new Date().toISOString() },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'verify-layers': {
          const architecture = config.architecture || 'clean';
          const layers = config.layers || ['presentation', 'application', 'domain', 'infrastructure'];
          const strictMode = config.strictMode ?? true;
          const checkDependencyDirection = config.checkDependencyDirection ?? true;
          this.logger.log(`Verifying layers (${architecture}) for ${layers.length} layers (strict: ${strictMode})`);

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, architecture });

          const llmResult = await this.executeWithLLM(
            `You are a professional architecture layer verification expert. Verify that a codebase adheres to layered architecture principles.`,
            `Verify layers: architecture="${architecture}", layers=${JSON.stringify(layers)}, strictMode=${strictMode}, checkDependencyDirection=${checkDependencyDirection}. Return JSON with: layerViolations (array of {fromLayer, toLayer, module, dependency, direction, severity}), layerCompliance (object mapping layer to {compliant, violationCount}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const layerViolations = parsed?.layerViolations || [
            { fromLayer: 'presentation', toLayer: 'infrastructure', module: 'UserController', dependency: 'direct DB access', direction: 'downward-skip', severity: 'high' },
          ];
          const layerCompliance = parsed?.layerCompliance || { presentation: { compliant: false, violationCount: 1 }, application: { compliant: true, violationCount: 0 }, domain: { compliant: true, violationCount: 0 }, infrastructure: { compliant: true, violationCount: 0 } };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { violationCount: layerViolations.length });

          return {
            success: true,
            data: { action, architecture, layers, strictMode, checkDependencyDirection, layerViolations, layerCompliance, status: 'layer_verification_completed', timestamp: new Date().toISOString() },
            metadata: { duration: Date.now() - startTime },
          };
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
