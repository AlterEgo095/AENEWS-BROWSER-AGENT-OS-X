import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * LLMJudgeAgent — Final go/no-go arbitration via LLM reasoning.
 *
 * Provides authoritative decisions on mission deliverables, resolving conflicts
 * between agents, and making final arbitration calls when evaluation results
 * are ambiguous or contested.
 *
 * When LLM is available: Uses real LLM calls for nuanced judgment.
 * When LLM is unavailable: Falls back to rule-based scoring.
 *
 * Supported actions:
 * - `arbitrate`        → Resolve a dispute between conflicting agent evaluations
 * - `final-decision`   → Issue a definitive go/no-go decision on a deliverable
 * - `resolve-conflict` → Mediate and resolve conflicts between competing approaches
 */
export class LLMJudgeAgent extends BaseAgent {
  readonly name = 'LLMJudgeAgent';
  readonly cluster = ClusterType.LLM_INTELLIGENCE;
  readonly capabilities = ['arbitrate', 'final-decision', 'resolve-conflict'];
  readonly version = '3.0.0';
  readonly description =
    'Final go/no-go arbitration via LLM reasoning for mission deliverables';

  readonly missionCategories = [MissionCategory.AI_ORCHESTRATION];
  readonly creditCost = 2;
  readonly powerLevel = 2;
  readonly tier = 'advanced';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'arbitrate';
      const startTime = Date.now();

      switch (action) {
        case 'arbitrate': {
          const dispute = config.dispute;
          if (!dispute) {
            return { success: false, error: 'Dispute details are required for arbitrate action' };
          }
          const positions = config.positions || [];
          const evidence = config.evidence || [];
          const policy = config.policy || 'balanced';

          this.logger.log(
            `Arbitrating dispute with ${positions.length} position(s) under policy: ${policy}`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, positionCount: positions.length });

          const llmResult = await this.executeWithLLM(
            `You are a senior arbitrator. Resolve the following dispute by evaluating all positions against the evidence.
Return a JSON object with this structure:
{
  "ruling": "favor|partial-favor|compromise|reject",
  "winningPosition": "...",
  "reasoning": "...",
  "confidence": 0.87,
  "conditions": ["..."],
  "dissentingNotes": "..."
}`,
            `Dispute: ${JSON.stringify(dispute)}\nPositions: ${JSON.stringify(positions)}\nEvidence: ${JSON.stringify(evidence)}\nPolicy: ${policy}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.ruling) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, ruling: parsed.ruling });
              return {
                success: true,
                data: {
                  action,
                  arbitrationId: `arb-${Date.now()}`,
                  ruling: parsed.ruling,
                  winningPosition: parsed.winningPosition || (positions.length > 0 ? positions[0] : null),
                  reasoning: parsed.reasoning || 'Arbitration completed via LLM analysis.',
                  confidence: parsed.confidence ?? 0.8,
                  evidenceEvaluated: evidence.length,
                  positionsConsidered: positions.length,
                  policy,
                  conditions: parsed.conditions || [],
                  dissentingNotes: parsed.dissentingNotes || '',
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback
          this.logger.log('LLM unavailable — falling back to rule-based arbitration');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action,
              arbitrationId: `arb-${Date.now()}`,
              ruling: 'partial-favor',
              winningPosition: positions.length > 0 ? positions[0] : null,
              reasoning: 'Rule-based arbitration: primary position selected with modifications (LLM unavailable for nuanced analysis).',
              confidence: 0.7,
              evidenceEvaluated: evidence.length,
              positionsConsidered: positions.length,
              policy,
              conditions: ['Recommend manual review when LLM is available'],
              dissentingNotes: 'Automated arbitration without LLM may miss nuanced arguments.',
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'final-decision': {
          const deliverableId = config.deliverableId;
          if (!deliverableId) {
            return { success: false, error: 'deliverableId is required for final-decision action' };
          }
          const evaluationResults = config.evaluationResults || [];
          const criteria = config.criteria || ['quality', 'completeness', 'timeliness'];
          const strictness = config.strictness || 'standard';

          this.logger.log(
            `Issuing final decision for deliverable ${deliverableId} (strictness: ${strictness})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, deliverableId, strictness });

          const passThreshold = strictness === 'strict' ? 0.9 : strictness === 'lenient' ? 0.6 : 0.75;

          const llmResult = await this.executeWithLLM(
            `You are a quality judge. Assess the overall quality and issue a final go/no-go decision.
Return a JSON object with this structure:
{
  "decision": "go|no-go",
  "confidence": 0.89,
  "score": 0.82,
  "rationale": "...",
  "conditions": ["..."]
}`,
            `Deliverable ID: ${deliverableId}\nEvaluation results: ${JSON.stringify(evaluationResults)}\nCriteria: ${JSON.stringify(criteria)}\nStrictness: ${strictness}\nPass threshold: ${passThreshold}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.decision) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, decision: parsed.decision, score: parsed.score });
              return {
                success: true,
                data: {
                  action,
                  decisionId: `decision-${Date.now()}`,
                  deliverableId,
                  decision: parsed.decision,
                  confidence: parsed.confidence ?? 0.8,
                  score: parsed.score ?? 0.75,
                  passThreshold,
                  strictness,
                  evaluationResults,
                  criteria,
                  rationale: parsed.rationale || 'Decision made via LLM analysis.',
                  conditions: parsed.conditions || [],
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback: compute score from evaluation results
          this.logger.log('LLM unavailable — falling back to score-based decision');
          const computedScore = evaluationResults.length > 0
            ? evaluationResults.reduce((sum: number, r: any) => sum + (r.score || r.overallScore || 0.75), 0) / evaluationResults.length
            : 0.75;
          const decision = computedScore >= passThreshold ? 'go' : 'no-go';
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, decision, source: 'fallback' });
          return {
            success: true,
            data: {
              action,
              decisionId: `decision-${Date.now()}`,
              deliverableId,
              decision,
              confidence: 0.7,
              score: computedScore,
              passThreshold,
              strictness,
              evaluationResults,
              criteria,
              rationale: decision === 'go'
                ? 'Deliverable meets quality threshold based on evaluation scores (LLM unavailable for deep analysis).'
                : 'Deliverable falls below quality threshold (LLM unavailable for nuanced assessment).',
              conditions: decision === 'go'
                ? ['Recommend LLM-powered review when available']
                : ['Address quality gaps and re-submit', 'Enable LLM for deeper analysis'],
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'resolve-conflict': {
          const conflictType = config.conflictType;
          if (!conflictType) {
            return { success: false, error: 'conflictType is required for resolve-conflict action' };
          }
          const parties = config.parties || [];
          const contextData = config.context || {};
          const urgency = config.urgency || 'normal';

          this.logger.log(
            `Resolving conflict of type "${conflictType}" between ${parties.length} party/parties (urgency: ${urgency})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, conflictType, urgency });

          const llmResult = await this.executeWithLLM(
            `You are a conflict resolution expert. Mediate and resolve the following conflict.
Return a JSON object with this structure:
{
  "resolution": "compromise|collaboration|accommodation|competition|avoidance",
  "summary": "...",
  "terms": [
    { "party": "...", "concession": "...", "gain": "..." }
  ],
  "enforcementMechanism": "..."
}`,
            `Conflict type: ${conflictType}\nParties: ${JSON.stringify(parties)}\nContext: ${JSON.stringify(contextData)}\nUrgency: ${urgency}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.resolution) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, resolution: parsed.resolution });
              return {
                success: true,
                data: {
                  action,
                  resolutionId: `resolve-${Date.now()}`,
                  conflictType,
                  resolution: parsed.resolution,
                  summary: parsed.summary || 'Conflict resolved via LLM-mediated analysis.',
                  terms: parsed.terms || [],
                  enforcementMechanism: parsed.enforcementMechanism || 'Monitoring with escalation triggers',
                  urgency,
                  context: contextData,
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback
          this.logger.log('LLM unavailable — falling back to rule-based conflict resolution');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action,
              resolutionId: `resolve-${Date.now()}`,
              conflictType,
              resolution: 'compromise',
              summary: 'Compromise resolution applied (LLM unavailable for nuanced mediation).',
              terms: [
                { party: parties.length > 0 ? parties[0] : 'Party A', concession: 'Agrees to modified terms', gain: 'Receives core requirements' },
                { party: parties.length > 1 ? parties[1] : 'Party B', concession: 'Accepts incremental approach', gain: 'Receives commitment for next cycle' },
              ],
              enforcementMechanism: 'Automated monitoring with escalation triggers',
              urgency,
              context: contextData,
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
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
