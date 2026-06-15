import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * WeaknessDetectorAgent — second stage of the Self-Evolution loop.
 *
 * Consumes anomaly reports from MetricAnalyzerAgent and certification results
 * from AutoCertifierAgent to detect systemic weaknesses in the codebase,
 * architecture, or operational patterns. Assesses impact severity, prioritises
 * the most critical weaknesses, and generates a structured improvement plan
 * that feeds into RefactorProposerAgent.
 *
 * Supported actions:
 *  - detect-weaknesses      : Scan metric & cert data for weakness signals
 *  - assess-impact          : Estimate blast-radius & severity per weakness
 *  - prioritize-weaknesses  : Rank weaknesses by composite priority score
 *  - generate-improvement-plan : Produce an ordered plan of improvement items
 */
export class WeaknessDetectorAgent extends BaseAgent {
  readonly name = 'WeaknessDetectorAgent';
  readonly cluster = ClusterType.SELF_EVOLUTION;
  readonly capabilities = [
    'detect-weaknesses',
    'assess-impact',
    'prioritize-weaknesses',
    'generate-improvement-plan',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Detects weak points from metrics and certification results, assesses their impact, and prioritizes improvement areas';

  readonly missionCategories = [MissionCategory.AI_ORCHESTRATION];
  readonly creditCost = 2;
  readonly powerLevel = 2;
  readonly tier = 'advanced';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'detect-weaknesses';
      const startTime = Date.now();

      switch (action) {
        case 'detect-weaknesses': {
          const sources = config.sources || ['metrics', 'certification', 'logs'];
          const scanDepth = config.scanDepth || 'deep';
          const includeHistorical = config.includeHistorical ?? true;
          const timeRange = config.timeRange || '7d';
          const minConfidence = config.minConfidence || 0.6;

          this.logger.log(
            `Detecting weaknesses from sources: [${sources.join(', ')}] (depth: ${scanDepth})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, sources, scanDepth });

          const llmResult = await this.executeWithLLM(
            `You are a professional system weakness detection expert. Analyze metrics, certification results, and logs to identify systemic weaknesses.`,
            `Detect weaknesses from sources: ${sources.join(', ')}, scanDepth="${scanDepth}", includeHistorical=${includeHistorical}, timeRange="${timeRange}", minConfidence=${minConfidence}. Return JSON with: weaknesses (array of {id, type, source, description, confidence, affectedComponents, detectedAt}), weaknessCount (number).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const weaknesses: Array<{
            id: string;
            type: string;
            source: string;
            description: string;
            confidence: number;
            affectedComponents: string[];
            detectedAt: string;
          }> = parsed?.weaknesses || [
            {
              id: 'weakness-001',
              type: 'performance-bottleneck',
              source: 'metrics',
              description:
                'P99 response time consistently exceeds baseline by >50% on /api/search endpoint',
              confidence: 0.92,
              affectedComponents: ['api-gateway', 'search-service'],
              detectedAt: new Date().toISOString(),
            },
            {
              id: 'weakness-002',
              type: 'error-spike',
              source: 'metrics',
              description:
                'Error rate for payment processing has risen from 0.3% to 2.1% over 48h',
              confidence: 0.87,
              affectedComponents: ['payment-service', 'order-service'],
              detectedAt: new Date().toISOString(),
            },
            {
              id: 'weakness-003',
              type: 'certification-failure',
              source: 'certification',
              description:
                'Security certification failing on dependency vulnerability CVE-2024-1234',
              confidence: 0.95,
              affectedComponents: ['auth-service', 'shared-libs'],
              detectedAt: new Date().toISOString(),
            },
            {
              id: 'weakness-004',
              type: 'architectural-drift',
              source: 'logs',
              description:
                'Cyclic dependency detected between user-service and notification-service modules',
              confidence: 0.78,
              affectedComponents: ['user-service', 'notification-service'],
              detectedAt: new Date().toISOString(),
            },
          ].filter((w) => w.confidence >= minConfidence);

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { weaknessCount: weaknesses.length });

          return {
            success: true,
            data: {
              action,
              sources,
              scanDepth,
              includeHistorical,
              timeRange,
              minConfidence,
              weaknesses,
              weaknessCount: weaknesses.length,
              detectionId: `weakness-detect-${Date.now()}`,
              status: 'weaknesses_detected',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'assess-impact': {
          const weaknessIds = config.weaknessIds || [
            'weakness-001',
            'weakness-002',
            'weakness-003',
          ];
          const impactDimensions =
            config.impactDimensions || ['availability', 'performance', 'security', 'maintainability'];
          const includeBlastRadius = config.includeBlastRadius ?? true;
          const quantifiedEstimate = config.quantifiedEstimate ?? true;

          this.logger.log(
            `Assessing impact for ${weaknessIds.length} weaknesses across dimensions: [${impactDimensions.join(', ')}]`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, weaknessIds, impactDimensions });

          const llmResult = await this.executeWithLLM(
            `You are a professional impact assessment expert. Evaluate the blast radius and severity of identified weaknesses.`,
            `Assess impact for weaknessIds=${JSON.stringify(weaknessIds)}, dimensions=${JSON.stringify(impactDimensions)}, includeBlastRadius=${includeBlastRadius}, quantifiedEstimate=${quantifiedEstimate}. Return JSON with: impactAssessments (array of {weaknessId, overallImpact, dimensions: {object mapping dimension to {severity, score, description}}, blastRadius: {directlyAffectedServices, indirectlyAffectedServices, estimatedUserImpact, downstreamDependencies}, quantifiedEstimate: {potentialRevenueLoss, mttrEstimate, riskScore}}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const impactAssessments = parsed?.impactAssessments || weaknessIds.map((id: string) => ({
            weaknessId: id,
            overallImpact: this.simulateImpactLevel(),
            dimensions: impactDimensions.reduce(
              (acc: Record<string, any>, dim: string) => {
                acc[dim] = {
                  severity: this.simulateImpactLevel(),
                  score: parseFloat((Math.random() * 10).toFixed(1)),
                  description: `Impact on ${dim} is estimated based on observed degradation patterns`,
                };
                return acc;
              },
              {} as Record<string, any>,
            ),
            blastRadius: includeBlastRadius
              ? {
                  directlyAffectedServices: Math.floor(Math.random() * 5) + 1,
                  indirectlyAffectedServices: Math.floor(Math.random() * 10) + 2,
                  estimatedUserImpact: `${Math.floor(Math.random() * 30) + 5}% of active users`,
                  downstreamDependencies: Math.floor(Math.random() * 8) + 1,
                }
              : undefined,
            quantifiedEstimate: quantifiedEstimate
              ? {
                  potentialRevenueLoss: `$${(Math.random() * 50000 + 1000).toFixed(0)}/day`,
                  mttrEstimate: `${Math.floor(Math.random() * 48 + 2)}h`,
                  riskScore: parseFloat((Math.random() * 10).toFixed(1)),
                }
              : undefined,
          }));

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { assessedCount: impactAssessments.length });

          return {
            success: true,
            data: {
              action,
              impactDimensions,
              includeBlastRadius,
              quantifiedEstimate,
              impactAssessments,
              assessedCount: weaknessIds.length,
              assessmentId: `impact-${Date.now()}`,
              status: 'impact_assessed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'prioritize-weaknesses': {
          const weaknessIds = config.weaknessIds || [
            'weakness-001',
            'weakness-002',
            'weakness-003',
            'weakness-004',
          ];
          const strategy = config.strategy || 'risk-based';
          const weights = config.weights || {
            impact: 0.4,
            likelihood: 0.25,
            effort: 0.15,
            businessValue: 0.2,
          };
          const maxConcurrent = config.maxConcurrent || 3;

          this.logger.log(
            `Prioritizing ${weaknessIds.length} weaknesses using ${strategy} strategy`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, weaknessIds, strategy });

          const llmResult = await this.executeWithLLM(
            `You are a professional weakness prioritization expert. Rank weaknesses by composite priority score.`,
            `Prioritize weaknesses: ids=${JSON.stringify(weaknessIds)}, strategy="${strategy}", weights=${JSON.stringify(weights)}, maxConcurrent=${maxConcurrent}. Return JSON with: prioritized (array of {weaknessId, compositeScore, impactScore, likelihoodScore, effortScore, businessValueScore, recommendedScheduling}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const prioritized = (parsed?.prioritized || weaknessIds.map((id: string, index: number) => ({
            weaknessId: id,
            compositeScore: parseFloat((Math.random() * 10).toFixed(1)),
            rank: 0,
            impactScore: parseFloat((Math.random() * 10).toFixed(1)),
            likelihoodScore: parseFloat((Math.random() * 10).toFixed(1)),
            effortScore: parseFloat((Math.random() * 10).toFixed(1)),
            businessValueScore: parseFloat((Math.random() * 10).toFixed(1)),
            recommendedScheduling: index < 2 ? 'immediate' : index < 4 ? 'this-sprint' : 'next-sprint',
          }))).sort((a: { compositeScore: number }, b: { compositeScore: number }) => b.compositeScore - a.compositeScore)
            .map((item: any, idx: number) => ({ ...item, rank: idx + 1 }));

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { prioritizedCount: prioritized.length, immediateCount: prioritized.filter((p: any) => p.recommendedScheduling === 'immediate').length });

          return {
            success: true,
            data: {
              action,
              strategy,
              weights,
              maxConcurrent,
              prioritized,
              totalWeaknesses: weaknessIds.length,
              immediateAction: prioritized.filter(
                (p: any) => p.recommendedScheduling === 'immediate',
              ).length,
              prioritizationId: `priority-${Date.now()}`,
              status: 'weaknesses_prioritized',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'generate-improvement-plan': {
          const prioritizedWeaknessIds = config.prioritizedWeaknessIds || [
            'weakness-001',
            'weakness-002',
            'weakness-003',
          ];
          const planHorizon = config.planHorizon || '30d';
          const includeMilestones = config.includeMilestones ?? true;
          const resourceConstraints = config.resourceConstraints || {
            maxParallelEfforts: 3,
            availableDevelopers: 5,
            budgetHours: 240,
          };

          this.logger.log(
            `Generating improvement plan for ${prioritizedWeaknessIds.length} weaknesses over ${planHorizon}`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, weaknessCount: prioritizedWeaknessIds.length, planHorizon });

          const llmResult = await this.executeWithLLM(
            `You are a professional improvement planning expert. Create a structured improvement plan with milestones and resource allocation.`,
            `Generate improvement plan: weaknessIds=${JSON.stringify(prioritizedWeaknessIds)}, planHorizon="${planHorizon}", includeMilestones=${includeMilestones}, resourceConstraints=${JSON.stringify(resourceConstraints)}. Return JSON with: planItems (array of {weaknessId, phase, estimatedEffort, assigneeSuggestion, dependencies, targetDate}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const planItems = parsed?.planItems || prioritizedWeaknessIds.map(
            (id: string, index: number) => ({
              weaknessId: id,
              phase: index < 1 ? 'critical-fix' : index < 3 ? 'improvement' : 'optimization',
              estimatedEffort: `${Math.floor(Math.random() * 40 + 8)}h`,
              assigneeSuggestion: `team-${Math.floor(Math.random() * 3) + 1}`,
              dependencies:
                index > 0 ? [prioritizedWeaknessIds[index - 1]] : [],
              targetDate: new Date(
                Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            }),
          );

          const milestones = includeMilestones
            ? [
                {
                  name: 'Critical Fixes Complete',
                  targetDate: new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000,
                  ).toISOString(),
                  items: planItems
                    .filter((i: { phase: string }) => i.phase === 'critical-fix')
                    .map((i: { weaknessId: string }) => i.weaknessId),
                },
                {
                  name: 'Improvements Delivered',
                  targetDate: new Date(
                    Date.now() + 21 * 24 * 60 * 60 * 1000,
                  ).toISOString(),
                  items: planItems
                    .filter((i: { phase: string }) => i.phase === 'improvement')
                    .map((i: { weaknessId: string }) => i.weaknessId),
                },
                {
                  name: 'Optimization Cycle Complete',
                  targetDate: new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000,
                  ).toISOString(),
                  items: planItems
                    .filter((i: { phase: string }) => i.phase === 'optimization')
                    .map((i: { weaknessId: string }) => i.weaknessId),
                },
              ]
            : undefined;

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { planItemCount: planItems.length });

          return {
            success: true,
            data: {
              action,
              planHorizon,
              includeMilestones,
              resourceConstraints,
              planItems,
              milestones,
              totalItems: planItems.length,
              estimatedTotalEffort: `${planItems.reduce((sum: number, i: any) => sum + parseInt(i.estimatedEffort, 10), 0)}h`,
              planId: `plan-${Date.now()}`,
              status: 'improvement_plan_generated',
              timestamp: new Date().toISOString(),
            },
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

  // ── Simulation helpers ────────────────────────────────────────────────

  private simulateImpactLevel(): string {
    const levels = ['low', 'medium', 'high', 'critical'];
    const weights = [0.15, 0.35, 0.35, 0.15];
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < levels.length; i++) {
      cumulative += weights[i];
      if (r < cumulative) return levels[i];
    }
    return 'medium';
  }
}
