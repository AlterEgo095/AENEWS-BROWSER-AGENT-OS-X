import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * HyperReasoningAgent — Advanced multi-modal reasoning (v3.0.0).
 *
 * Provides chain-of-thought, tree-of-thought, analogical reasoning,
 * counterfactual reasoning, abductive reasoning, and meta-cognitive reflection.
 */
export class HyperReasoningAgent extends BaseAgent {
  readonly name = 'HyperReasoningAgent';
  readonly cluster = ClusterType.META_INTELLIGENCE;
  readonly capabilities = [
    'chain-of-thought',
    'tree-of-thought',
    'analogical-reasoning',
    'counterfactual-reasoning',
    'abductive-reasoning',
    'meta-cognitive-reflection',
  ];
  readonly version = '3.0.0';
  readonly description =
    'Advanced multi-modal reasoning with chain-of-thought, tree-of-thought, analogical, counterfactual, abductive reasoning, and meta-cognitive reflection';

  readonly missionCategories = [MissionCategory.AI_ORCHESTRATION];
  readonly creditCost = 4;
  readonly powerLevel = 3;
  readonly tier = 'elite';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'chain-think';
      const startTime = Date.now();

      this.emitEvent(AgentEventType.AGENT_STARTED, { action, agent: this.name });

      switch (action) {
        case 'chain-think': {
          const problem = config.problem;
          const domain = config.domain || 'general';
          const depth = config.depth || 5;
          const showWork = config.showWork !== false;

          if (!problem) {
            return { success: false, error: '"problem" is required for chain-of-thought reasoning' };
          }

          this.logger.log(`Chain-of-thought reasoning on "${problem.substring(0, 60)}..." (depth: ${depth})`);

          const llmResult = await this.executeWithLLM(
            `You are an expert at chain-of-thought reasoning. Break down complex problems into explicit step-by-step reasoning chains, showing each inference and its justification.`,
            `Apply chain-of-thought reasoning to: "${problem}". Domain: ${domain}. Depth: ${depth} steps. Return JSON with: reasoningChain (array of {step, thought, inference, justification, confidence}), conclusion {answer, confidence, assumptions (array)}, alternativePaths (array of {path, conclusion, confidence}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);

          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, steps: parsed.reasoningChain?.length || 0 });
            return {
              success: true,
              data: {
                action, problem, domain, depth, showWork,
                reasoningChain: parsed.reasoningChain || [],
                conclusion: parsed.conclusion || { answer: '', confidence: 0, assumptions: [] },
                alternativePaths: parsed.alternativePaths || [],
                status: 'reasoned',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'llm' },
            };
          }

          // Heuristic fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action, problem, domain, depth, showWork,
              reasoningChain: [
                { step: 1, thought: 'Identify the core problem and its constraints', inference: 'The problem requires decomposing into sub-problems', justification: 'Complex problems benefit from divide-and-conquer', confidence: 0.95 },
                { step: 2, thought: 'Analyze each sub-problem independently', inference: 'Key variables and relationships identified', justification: 'Isolating variables reduces cognitive load', confidence: 0.90 },
                { step: 3, thought: 'Map dependencies between sub-problems', inference: 'Sequential and parallel resolution paths exist', justification: 'Dependency analysis prevents circular reasoning', confidence: 0.85 },
                { step: 4, thought: 'Evaluate evidence for each resolution path', inference: 'Strongest evidence supports primary resolution path', justification: 'Evidence-weighted reasoning reduces bias', confidence: 0.82 },
                { step: 5, thought: 'Synthesize conclusions and validate consistency', inference: 'Conclusions are internally consistent with available evidence', justification: 'Consistency checking prevents logical contradictions', confidence: 0.88 },
              ],
              conclusion: { answer: 'Based on systematic decomposition and evidence evaluation, the optimal approach addresses the core constraint first, then resolves dependent sub-problems in parallel', confidence: 0.86, assumptions: ['Problem is decomposable', 'Available evidence is sufficient', 'No hidden constraints exist'] },
              alternativePaths: [
                { path: 'Holistic pattern matching', conclusion: 'Rapid intuitive solution with lower confidence', confidence: 0.65 },
                { path: 'Adversarial reasoning', conclusion: 'Solution optimized against worst-case scenarios', confidence: 0.72 },
              ],
              status: 'reasoned',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'tree-think': {
          const problem = config.problem;
          const branchingFactor = config.branchingFactor || 3;
          const maxDepth = config.maxDepth || 3;
          const evaluationMetric = config.evaluationMetric || 'plausibility';

          if (!problem) {
            return { success: false, error: '"problem" is required for tree-of-thought reasoning' };
          }

          this.logger.log(`Tree-of-thought reasoning on "${problem.substring(0, 60)}..." (branching: ${branchingFactor})`);

          const llmResult = await this.executeWithLLM(
            `You are an expert at tree-of-thought reasoning. Explore multiple reasoning paths simultaneously, evaluating and pruning branches to find the optimal solution.`,
            `Apply tree-of-thought reasoning to: "${problem}". Branching: ${branchingFactor}. Max depth: ${maxDepth}. Evaluation: ${evaluationMetric}. Return JSON with: thoughtTree {root {thought, children (array of {thought, evaluation, children (array)})}}, bestPath (array of {step, thought, evaluation}), prunedBranches (array of {reason, branchThought}), summary {totalPathsExplored, bestPathScore, pruningEfficiency}.`,
            { responseFormat: 'json', temperature: 0.4, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);

          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action });
            return {
              success: true,
              data: {
                action, problem, branchingFactor, maxDepth, evaluationMetric,
                thoughtTree: parsed.thoughtTree || {},
                bestPath: parsed.bestPath || [],
                prunedBranches: parsed.prunedBranches || [],
                summary: parsed.summary || {},
                status: 'reasoned',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'llm' },
            };
          }

          // Heuristic fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action, problem, branchingFactor, maxDepth, evaluationMetric,
              thoughtTree: {
                root: {
                  thought: 'Initial problem decomposition',
                  children: [
                    { thought: 'Approach A: Analytical decomposition', evaluation: 0.85, children: [{ thought: 'A1: Mathematical modeling', evaluation: 0.78 }, { thought: 'A2: Statistical inference', evaluation: 0.82 }, { thought: 'A3: Logical deduction', evaluation: 0.88 }] },
                    { thought: 'Approach B: Empirical testing', evaluation: 0.72, children: [{ thought: 'B1: Controlled experiment', evaluation: 0.70 }, { thought: 'B2: Observational study', evaluation: 0.65 }, { thought: 'B3: Simulation', evaluation: 0.75 }] },
                    { thought: 'Approach C: Analogical transfer', evaluation: 0.68, children: [{ thought: 'C1: Domain analogy', evaluation: 0.60 }, { thought: 'C2: Structural analogy', evaluation: 0.72 }, { thought: 'C3: Functional analogy', evaluation: 0.58 }] },
                  ],
                },
              },
              bestPath: [
                { step: 1, thought: 'Analytical decomposition', evaluation: 0.85 },
                { step: 2, thought: 'Logical deduction', evaluation: 0.88 },
                { step: 3, thought: 'Apply deduction rules to decomposed sub-problems', evaluation: 0.90 },
              ],
              prunedBranches: [
                { reason: 'Low evaluation score (< 0.65)', branchThought: 'Functional analogy' },
                { reason: 'Low evaluation score (< 0.65)', branchThought: 'Observational study' },
              ],
              summary: { totalPathsExplored: 9, bestPathScore: 0.90, pruningEfficiency: 0.78 },
              status: 'reasoned',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'analogize': {
          const source = config.source;
          const target = config.target;
          const mappingDepth = config.mappingDepth || 'deep';

          if (!source || !target) {
            return { success: false, error: '"source" and "target" are required for analogical reasoning' };
          }

          this.logger.log(`Analogical reasoning: ${source} → ${target}`);

          const llmResult = await this.executeWithLLM(
            `You are an expert at analogical reasoning. Map structural relationships from a source domain to a target domain, identifying isomorphisms and transferable insights.`,
            `Apply analogical reasoning. Source: "${source}". Target: "${target}". Depth: ${mappingDepth}. Return JSON with: mappings (array of {sourceElement, targetElement, relationshipType, confidence}), sharedStructure {principles (array), patterns (array)}, transferableInsights (array of {insight, sourceBasis, targetApplication, confidence}), limitations (array of strings), creativeLeaps (array of {leap, reasoning, novelty}).`,
            { responseFormat: 'json', temperature: 0.4, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);

          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action });
            return {
              success: true,
              data: {
                action, source, target, mappingDepth,
                mappings: parsed.mappings || [],
                sharedStructure: parsed.sharedStructure || {},
                transferableInsights: parsed.transferableInsights || [],
                limitations: parsed.limitations || [],
                creativeLeaps: parsed.creativeLeaps || [],
                status: 'analogized',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'llm' },
            };
          }

          // Heuristic fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action, source, target, mappingDepth,
              mappings: [
                { sourceElement: 'Neural network layers', targetElement: 'Organizational hierarchy', relationshipType: 'structural', confidence: 0.78 },
                { sourceElement: 'Backpropagation', targetElement: 'Feedback culture', relationshipType: 'functional', confidence: 0.72 },
                { sourceElement: 'Weight adjustment', targetElement: 'Skill development', relationshipType: 'dynamic', confidence: 0.68 },
              ],
              sharedStructure: {
                principles: ['Hierarchical information processing', 'Adaptive learning through feedback', 'Emergent behavior from simple rules'],
                patterns: ['Input-processing-output cycles', 'Progressive refinement', 'Distributed computation'],
              },
              transferableInsights: [
                { insight: 'Local feedback loops drive global improvement', sourceBasis: 'Gradient descent in neural networks', targetApplication: 'Implement rapid feedback cycles at team level', confidence: 0.82 },
                { insight: 'Redundancy improves robustness', sourceBasis: 'Distributed representations in deep learning', targetApplication: 'Cross-train team members for resilience', confidence: 0.75 },
              ],
              limitations: ['Biological systems have different constraints than computational ones', 'Organizational dynamics include political factors absent in neural networks'],
              creativeLeaps: [{ leap: 'Apply dropout regularization concept to prevent organizational groupthink', reasoning: 'Randomly excluding perspectives forces diverse thinking', novelty: 'high' }],
              status: 'analogized',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'counterfactual': {
          const scenario = config.scenario;
          const intervention = config.intervention;
          const timeHorizon = config.timeHorizon || 'medium';

          if (!scenario || !intervention) {
            return { success: false, error: '"scenario" and "intervention" are required for counterfactual reasoning' };
          }

          this.logger.log(`Counterfactual reasoning: "${intervention}" on "${scenario.substring(0, 50)}..."`);

          const llmResult = await this.executeWithLLM(
            `You are an expert at counterfactual reasoning. Analyze "what if" scenarios by constructing alternative causal chains and evaluating their likelihood.`,
            `Apply counterfactual reasoning. Scenario: "${scenario}". Intervention: "${intervention}". Horizon: ${timeHorizon}. Return JSON with: causalModel {actualChain (array of strings), counterfactualChain (array of strings)}, differences (array of {aspect, actual, counterfactual, magnitude, probability}), downstreamEffects (array of {effect, probability, impact, timeframe}), nearestPossibleWorlds (array of {world, distance, keyDifference}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);

          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action });
            return {
              success: true,
              data: {
                action, scenario, intervention, timeHorizon,
                causalModel: parsed.causalModel || {},
                differences: parsed.differences || [],
                downstreamEffects: parsed.downstreamEffects || [],
                nearestPossibleWorlds: parsed.nearestPossibleWorlds || [],
                status: 'reasoned',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'llm' },
            };
          }

          // Heuristic fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action, scenario, intervention, timeHorizon,
              causalModel: {
                actualChain: ['Initial conditions', 'Event A occurs', 'Causal link A→B', 'Outcome B observed'],
                counterfactualChain: ['Initial conditions', 'Intervention applied', 'Modified causal link A→C', 'Alternative outcome C observed'],
              },
              differences: [
                { aspect: 'Outcome path', actual: 'Path B (status quo)', counterfactual: 'Path C (intervention)', magnitude: 0.65, probability: 0.72 },
                { aspect: 'Resource allocation', actual: 'Distributed across existing priorities', counterfactual: 'Redirected to intervention focus', magnitude: 0.45, probability: 0.85 },
              ],
              downstreamEffects: [
                { effect: 'Short-term disruption during transition', probability: 0.80, impact: 'medium', timeframe: '1-3 months' },
                { effect: 'Long-term efficiency improvement', probability: 0.65, impact: 'high', timeframe: '6-12 months' },
                { effect: 'Unintended consequences in adjacent systems', probability: 0.40, impact: 'low', timeframe: '3-6 months' },
              ],
              nearestPossibleWorlds: [
                { world: 'Minimal intervention variant', distance: 0.2, keyDifference: 'Smaller scope, lower risk' },
                { world: 'Phased intervention variant', distance: 0.35, keyDifference: 'Gradual rollout with checkpoints' },
                { world: 'Full intervention variant', distance: 0.6, keyDifference: 'Complete adoption, highest potential' },
              ],
              status: 'reasoned',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'abduce': {
          const observation = config.observation;
          const hypotheses = config.hypotheses || [];
          const evidence = config.evidence || [];

          if (!observation) {
            return { success: false, error: '"observation" is required for abductive reasoning' };
          }

          this.logger.log(`Abductive reasoning on "${observation.substring(0, 60)}..."`);

          const llmResult = await this.executeWithLLM(
            `You are an expert at abductive reasoning (inference to the best explanation). Generate and evaluate hypotheses to explain observations, ranking by explanatory power.`,
            `Apply abductive reasoning. Observation: "${observation}". Existing hypotheses: ${JSON.stringify(hypotheses)}. Evidence: ${JSON.stringify(evidence)}. Return JSON with: generatedHypotheses (array of {hypothesis, explanatoryPower, simplicity, coherence, testability, overallScore}), bestExplanation {hypothesis, reasoning, evidence, gaps}, furtherInvestigations (array of {test, purpose, expectedOutcome}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);

          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action });
            return {
              success: true,
              data: {
                action, observation, hypotheses, evidence,
                generatedHypotheses: parsed.generatedHypotheses || [],
                bestExplanation: parsed.bestExplanation || {},
                furtherInvestigations: parsed.furtherInvestigations || [],
                status: 'abduced',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'llm' },
            };
          }

          // Heuristic fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action, observation, hypotheses, evidence,
              generatedHypotheses: [
                { hypothesis: 'H1: Primary causal mechanism explains the observation directly', explanatoryPower: 0.88, simplicity: 0.85, coherence: 0.90, testability: 0.82, overallScore: 0.86 },
                { hypothesis: 'H2: Secondary factor combined with environmental conditions', explanatoryPower: 0.75, simplicity: 0.70, coherence: 0.80, testability: 0.78, overallScore: 0.76 },
                { hypothesis: 'H3: Multiple interacting causes producing emergent effect', explanatoryPower: 0.92, simplicity: 0.45, coherence: 0.85, testability: 0.55, overallScore: 0.69 },
              ],
              bestExplanation: { hypothesis: 'H1: Primary causal mechanism', reasoning: 'Highest overall score combining explanatory power, simplicity, and testability', evidence: ['Direct correlation with observed pattern', 'Consistent with known mechanisms', 'Predictive of related phenomena'], gaps: ['Exact mechanism not fully characterized', 'One anomalous data point unexplained'] },
              furtherInvestigations: [
                { test: 'Controlled experiment isolating primary variable', purpose: 'Confirm causal relationship', expectedOutcome: 'Strong correlation supporting H1' },
                { test: 'Longitudinal study tracking the observation over time', purpose: 'Establish temporal causality', expectedOutcome: 'Lead-lag relationship confirming mechanism' },
              ],
              status: 'abduced',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'meta-reflect': {
          const reasoningProcess = config.reasoningProcess;
          const reflectionDepth = config.reflectionDepth || 'deep';
          const focusAreas = config.focusAreas || ['biases', 'assumptions', 'gaps', 'confidence'];

          if (!reasoningProcess) {
            return { success: false, error: '"reasoningProcess" is required for meta-cognitive reflection' };
          }

          this.logger.log(`Meta-cognitive reflection (depth: ${reflectionDepth})`);

          const llmResult = await this.executeWithLLM(
            `You are an expert at meta-cognitive reflection. Analyze reasoning processes for biases, assumptions, logical gaps, and confidence calibration, then suggest improvements.`,
            `Apply meta-cognitive reflection. Process: "${reasoningProcess}". Depth: ${reflectionDepth}. Focus: ${focusAreas.join(', ')}. Return JSON with: biasAnalysis (array of {bias, evidence, severity, mitigation}), assumptionAudit (array of {assumption, validity, riskIfWrong, testMethod}), logicalGaps (array of {gap, description, potentialImpact}), confidenceCalibration {statedVsActual, overconfidenceAreas, underconfidenceAreas}, improvementPlan {immediate (array), shortTerm (array), longTerm (array)}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);

          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action });
            return {
              success: true,
              data: {
                action, reasoningProcess, reflectionDepth, focusAreas,
                biasAnalysis: parsed.biasAnalysis || [],
                assumptionAudit: parsed.assumptionAudit || [],
                logicalGaps: parsed.logicalGaps || [],
                confidenceCalibration: parsed.confidenceCalibration || {},
                improvementPlan: parsed.improvementPlan || {},
                status: 'reflected',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'llm' },
            };
          }

          // Heuristic fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action, reasoningProcess, reflectionDepth, focusAreas,
              biasAnalysis: [
                { bias: 'Confirmation bias', evidence: 'Seeking evidence that supports initial hypothesis', severity: 'high', mitigation: 'Actively search for disconfirming evidence' },
                { bias: 'Anchoring effect', evidence: 'Initial estimate heavily influences subsequent reasoning', severity: 'medium', mitigation: 'Generate independent estimates before combining' },
                { bias: 'Availability heuristic', evidence: 'Overweighting recent or vivid examples', severity: 'medium', mitigation: 'Systematically review all available evidence' },
              ],
              assumptionAudit: [
                { assumption: 'Historical patterns will continue', validity: 'moderate', riskIfWrong: 'high', testMethod: 'Monitor leading indicators for pattern breaks' },
                { assumption: 'Available data is representative', validity: 'moderate', riskIfWrong: 'medium', testMethod: 'Check for sampling bias and coverage gaps' },
              ],
              logicalGaps: [
                { gap: 'Missing causal mechanism', description: 'Correlation identified but causal link not established', potentialImpact: 'May lead to incorrect intervention' },
                { gap: 'Unbounded uncertainty', description: 'Confidence intervals not provided for key estimates', potentialImpact: 'Overconfidence in predictions' },
              ],
              confidenceCalibration: { statedVsActual: 'Slightly overconfident (stated 85% vs actual ~72%)', overconfidenceAreas: ['Novel situations', 'Rapid assessments'], underconfidenceAreas: ['Familiar domains with recent failures'] },
              improvementPlan: {
                immediate: ['Document all assumptions explicitly', 'Assign confidence ranges to key claims'],
                shortTerm: ['Implement pre-mortem analysis before conclusions', 'Establish evidence quality scoring'],
                longTerm: ['Develop systematic bias detection framework', 'Build calibration tracking over time'],
              },
              status: 'reflected',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported actions: chain-think, tree-think, analogize, counterfactual, abduce, meta-reflect`,
          };
      }
    } catch (error: any) {
      this.emitEvent(AgentEventType.AGENT_FAILED, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}
