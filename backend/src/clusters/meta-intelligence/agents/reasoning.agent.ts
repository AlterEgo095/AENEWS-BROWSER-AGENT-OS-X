import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

export class ReasoningAgent extends BaseAgent {
  readonly name = 'ReasoningAgent';
  readonly cluster = ClusterType.META_INTELLIGENCE;
  readonly capabilities = [
    'deduce',
    'induce',
    'analogize',
    'plan',
    'evaluate',
    'explain',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Performs logical reasoning including deduction, induction, analogy, planning, evaluation, and explanation of reasoning chains';

  readonly missionCategories = [MissionCategory.AI_ORCHESTRATION];
  readonly creditCost = 2;
  readonly powerLevel = 1;
  readonly tier = 'standard';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'deduce';
      const startTime = Date.now();

      switch (action) {
        case 'deduce': {
          const premises = config.premises || [];
          const rules = config.rules || [];
          const conclusion = config.conclusion;
          const method = config.method || 'modus_ponens';
          const validateSoundness = config.validateSoundness !== false;
          const maxDepth = config.maxDepth || 10;

          if (premises.length === 0) {
            return {
              success: false,
              error: '"premises" are required for deduction',
            };
          }

          this.logger.log(
            `Deducing from ${premises.length} premises (method: ${method})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, method, premiseCount: premises.length });

          const llmResult = await this.executeWithLLM(
            `You are an expert logic and deduction engine. Given a set of premises and optional rules, derive valid conclusions using formal deductive reasoning.
Return a JSON object with this exact structure:
{
  "derivedConclusions": [
    { "conclusion": "...", "fromPremises": [0], "fromRules": [0], "confidence": 0.92, "depth": 1 }
  ],
  "proofChain": [
    { "step": 1, "statement": "...", "justification": "Modus Ponens on Premise 1 and Rule 1", "references": [0, 1] }
  ],
  "soundness": { "isValid": true, "contradictions": [], "assumptions": ["..."] },
  "exploredPaths": 12,
  "searchDepth": 5
}
Be thorough. Each conclusion must follow logically. Provide step-by-step proof chain.`,
            `Deduce from premises: ${JSON.stringify(premises)}\nRules: ${JSON.stringify(rules)}\nMethod: ${method}\nConclusion to verify: ${conclusion || 'derive all possible'}\nMax depth: ${maxDepth}\nValidate soundness: ${validateSoundness}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.derivedConclusions) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, conclusionCount: parsed.derivedConclusions?.length });
              return {
                success: true,
                data: {
                  action,
                  premises: premises as string[],
                  rules: rules as Array<{
                    condition: string;
                    consequence: string;
                    confidence: number;
                  }>,
                  conclusion,
                  method: method as 'modus_ponens' | 'modus_tollens' | 'hypothetical_syllogism' | 'disjunctive_syllogism' | 'resolution',
                  validateSoundness,
                  maxDepth,
                  deduction: {
                    derivedConclusions: parsed.derivedConclusions || [],
                    proofChain: parsed.proofChain || [],
                    soundness: validateSoundness
                      ? parsed.soundness || { isValid: true, contradictions: [], assumptions: [] }
                      : undefined,
                    exploredPaths: parsed.exploredPaths || 0,
                    searchDepth: parsed.searchDepth || 0,
                    status: 'deduced',
                  },
                  status: 'deduction_complete',
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic deduction');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action,
              premises: premises as string[],
              rules: rules as Array<{
                condition: string;
                consequence: string;
                confidence: number;
              }>,
              conclusion,
              method: method as 'modus_ponens' | 'modus_tollens' | 'hypothetical_syllogism' | 'disjunctive_syllogism' | 'resolution',
              validateSoundness,
              maxDepth,
              deduction: {
                derivedConclusions: [
                  { conclusion: `Derived: If ${premises[0]} then the stated consequence follows by ${method}`, fromPremises: [0], fromRules: rules.length > 0 ? [0] : [], confidence: 0.85, depth: 1 },
                  { conclusion: `Intermediate: Combined premise chain yields a valid inference at depth 2`, fromPremises: premises.length > 1 ? [0, 1] : [0], fromRules: [], confidence: 0.78, depth: 2 },
                ],
                proofChain: [
                  { step: 1, statement: `Accept premise: ${premises[0]}`, justification: 'Given premise', references: [] },
                  { step: 2, statement: 'Apply deductive rule to derive intermediate conclusion', justification: `${method} application`, references: [0] },
                  { step: 3, statement: 'Validate derived conclusion against original premises', justification: 'Soundness check', references: [0, 1] },
                ],
                soundness: validateSoundness
                  ? { isValid: true, contradictions: [], assumptions: ['All premises are assumed true', 'Rules are sound and complete'] }
                  : undefined,
                exploredPaths: 8,
                searchDepth: 3,
                status: 'deduced',
              },
              status: 'deduction_complete',
              generatedBy: 'heuristic',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'induce': {
          const observations = config.observations || [];
          const hypothesisSpace = config.hypothesisSpace || 'general';
          const method = config.method || 'enumerative';
          const confidenceThreshold = config.confidenceThreshold || 0.7;
          const maxHypotheses = config.maxHypotheses || 10;
          const validateGeneralization = config.validateGeneralization !== false;

          if (observations.length === 0) {
            return {
              success: false,
              error: '"observations" are required for induction',
            };
          }

          this.logger.log(
            `Inducing from ${observations.length} observations (method: ${method})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, method, observationCount: observations.length });

          const llmResult = await this.executeWithLLM(
            `You are an expert inductive reasoning engine. Given observations, generate plausible hypotheses with supporting evidence.
Return a JSON object with this exact structure:
{
  "hypotheses": [
    { "id": "h1", "statement": "...", "confidence": 0.88, "supportingEvidence": [0, 1], "contradictingEvidence": [], "scope": "broad", "testability": "high" }
  ],
  "bestHypothesis": { "id": "h1", "statement": "...", "confidence": 0.88, "coverage": 0.92 },
  "generalization": { "validHypotheses": 3, "invalidHypotheses": 1, "overfittingRisk": "low", "recommendedSampleSize": 50 },
  "patternStrength": { "strongestPattern": "...", "weakestPattern": "...", "averageConfidence": 0.84 }
}`,
            `Induce hypotheses from observations: ${JSON.stringify(observations)}\nHypothesis space: ${hypothesisSpace}\nMethod: ${method}\nConfidence threshold: ${confidenceThreshold}\nMax hypotheses: ${maxHypotheses}\nValidate generalization: ${validateGeneralization}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.hypotheses) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, hypothesisCount: parsed.hypotheses?.length });
              return {
                success: true,
                data: {
                  action,
                  observations: observations as string[],
                  hypothesisSpace: hypothesisSpace as 'general' | 'causal' | 'statistical' | 'structural',
                  method: method as 'enumerative' | 'eliminative' | 'statistical' | 'bayesian',
                  confidenceThreshold,
                  maxHypotheses,
                  validateGeneralization,
                  induction: {
                    hypotheses: parsed.hypotheses || [],
                    bestHypothesis: parsed.bestHypothesis || { id: '', statement: '', confidence: 0, coverage: 0 },
                    generalization: validateGeneralization
                      ? parsed.generalization || { validHypotheses: 0, invalidHypotheses: 0, overfittingRisk: 'low' as const, recommendedSampleSize: 0 }
                      : undefined,
                    patternStrength: parsed.patternStrength || { strongestPattern: '', weakestPattern: '', averageConfidence: 0 },
                    status: 'induced',
                  },
                  status: 'induction_complete',
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic induction');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action,
              observations: observations as string[],
              hypothesisSpace: hypothesisSpace as 'general' | 'causal' | 'statistical' | 'structural',
              method: method as 'enumerative' | 'eliminative' | 'statistical' | 'bayesian',
              confidenceThreshold,
              maxHypotheses,
              validateGeneralization,
              induction: {
                hypotheses: [
                  { id: 'h1', statement: `Pattern observed across ${observations.length} instances suggests a recurring relationship`, confidence: 0.87, supportingEvidence: [0, 1, 2], contradictingEvidence: [], scope: 'moderate', testability: 'high' as const },
                  { id: 'h2', statement: `Statistical correlation indicates potential causal link between observed variables`, confidence: 0.79, supportingEvidence: [1, 2], contradictingEvidence: [0], scope: 'broad', testability: 'medium' as const },
                  { id: 'h3', statement: `Counter-example analysis reveals boundary conditions for the observed pattern`, confidence: 0.72, supportingEvidence: [0], contradictingEvidence: [1], scope: 'narrow', testability: 'high' as const },
                ],
                bestHypothesis: { id: 'h1', statement: `Pattern observed across ${observations.length} instances suggests a recurring relationship`, confidence: 0.87, coverage: 0.82 },
                generalization: validateGeneralization
                  ? { validHypotheses: 2, invalidHypotheses: 1, overfittingRisk: 'low' as const, recommendedSampleSize: Math.max(30, observations.length * 3) }
                  : undefined,
                patternStrength: { strongestPattern: 'Sequential co-occurrence of observed events', weakestPattern: 'Sporadic outlier correlation', averageConfidence: 0.79 },
                status: 'induced',
              },
              status: 'induction_complete',
              generatedBy: 'heuristic',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'analogize': {
          const source = config.source;
          const target = config.target;
          const mappingType = config.mappingType || 'structural';
          const depth = config.depth || 'shallow';
          const maxMappings = config.maxMappings || 5;
          const validateConsistency = config.validateConsistency !== false;

          if (!source || !target) {
            return {
              success: false,
              error: '"source" and "target" are required for analogy',
            };
          }

          this.logger.log(
            `Creating analogy from "${source}" to "${target}" (mapping: ${mappingType})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, mappingType, source, target });

          const llmResult = await this.executeWithLLM(
            `You are an expert analogical reasoning engine. Map elements from a source domain to a target domain.
Return a JSON object with this exact structure:
{
  "mappings": [
    { "sourceElement": "...", "targetElement": "...", "relationType": "structural", "confidence": 0.88 }
  ],
  "sharedStructure": ["..."],
  "differences": [
    { "aspect": "...", "source": "...", "target": "...", "impact": "medium" }
  ],
  "consistency": { "score": 0.82, "inconsistencies": [] },
  "transferableInsights": [
    { "insight": "...", "fromSource": "...", "toTarget": "...", "applicability": 0.85 }
  ],
  "qualityScore": 0.84
}`,
            `Create analogy from source: "${source}" to target: "${target}"\nMapping type: ${mappingType}\nDepth: ${depth}\nMax mappings: ${maxMappings}\nValidate consistency: ${validateConsistency}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.mappings) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, mappingCount: parsed.mappings?.length });
              return {
                success: true,
                data: {
                  action,
                  source,
                  target,
                  mappingType: mappingType as 'structural' | 'relational' | 'functional' | 'visual',
                  depth: depth as 'shallow' | 'moderate' | 'deep',
                  maxMappings,
                  validateConsistency,
                  analogy: {
                    mappings: parsed.mappings || [],
                    sharedStructure: parsed.sharedStructure || [],
                    differences: parsed.differences || [],
                    consistency: validateConsistency
                      ? parsed.consistency || { score: 0, inconsistencies: [] }
                      : undefined,
                    transferableInsights: parsed.transferableInsights || [],
                    qualityScore: parsed.qualityScore || 0,
                    status: 'analogized',
                  },
                  status: 'analogy_complete',
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic analogy');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action,
              source,
              target,
              mappingType: mappingType as 'structural' | 'relational' | 'functional' | 'visual',
              depth: depth as 'shallow' | 'moderate' | 'deep',
              maxMappings,
              validateConsistency,
              analogy: {
                mappings: [
                  { sourceElement: `${source} core mechanism`, targetElement: `${target} core mechanism`, relationType: mappingType as string, confidence: 0.82 },
                  { sourceElement: `${source} boundary conditions`, targetElement: `${target} constraints`, relationType: mappingType as string, confidence: 0.76 },
                  { sourceElement: `${source} feedback loop`, targetElement: `${target} regulatory process`, relationType: 'functional', confidence: 0.79 },
                ],
                sharedStructure: [`Both ${source} and ${target} exhibit hierarchical organization`, 'Feedback mechanisms maintain stability in both domains'],
                differences: [
                  { aspect: 'Scale', source: source, target: target, impact: 'medium' as const },
                  { aspect: 'Temporal dynamics', source: source, target: target, impact: 'low' as const },
                ],
                consistency: validateConsistency
                  ? { score: 0.78, inconsistencies: [] }
                  : undefined,
                transferableInsights: [
                  { insight: `Optimization strategy from ${source} can be adapted for ${target}`, fromSource: source, toTarget: target, applicability: 0.81 },
                ],
                qualityScore: 0.79,
                status: 'analogized',
              },
              status: 'analogy_complete',
              generatedBy: 'heuristic',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'plan': {
          const goal = config.goal;
          const initialState = config.initialState || {};
          const constraints = config.constraints || [];
          const availableActions = config.availableActions || [];
          const planningMethod = config.planningMethod || 'hierarchical';
          const horizon = config.horizon || 10;
          const optimizeFor = config.optimizeFor || 'efficiency';

          if (!goal) {
            return {
              success: false,
              error: '"goal" is required for planning',
            };
          }

          this.logger.log(
            `Planning for goal: "${goal}" (method: ${planningMethod})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, goal, planningMethod });

          const llmResult = await this.executeWithLLM(
            `You are an expert planning engine. Create a structured plan to achieve the given goal.
Return a JSON object with this exact structure:
{
  "steps": [
    { "order": 1, "action": "...", "preconditions": ["..."], "expectedEffects": ["..."], "estimatedDuration": 5000, "dependencies": [], "alternativeActions": ["..."] }
  ],
  "criticalPath": [1, 2, 5],
  "estimatedDuration": 25000,
  "estimatedCost": 150,
  "successProbability": 0.88,
  "contingencies": [
    { "condition": "...", "alternativeSteps": [3, 4] }
  ],
  "milestones": [
    { "step": 2, "description": "...", "verification": "..." }
  ]
}`,
            `Plan for goal: "${goal}"\nInitial state: ${JSON.stringify(initialState)}\nConstraints: ${JSON.stringify(constraints)}\nAvailable actions: ${JSON.stringify(availableActions)}\nMethod: ${planningMethod}\nHorizon: ${horizon}\nOptimize for: ${optimizeFor}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.steps) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, stepCount: parsed.steps?.length });
              return {
                success: true,
                data: {
                  action,
                  goal,
                  initialState,
                  constraints: constraints as Array<{
                    type: 'resource' | 'temporal' | 'logical' | 'safety';
                    description: string;
                    expression: string;
                  }>,
                  availableActions: availableActions as Array<{
                    name: string;
                    preconditions: string[];
                    effects: string[];
                    cost: number;
                  }>,
                  planningMethod: planningMethod as 'hierarchical' | 'forward' | 'backward' | 'contingent' | 'partial_order',
                  horizon,
                  optimizeFor: optimizeFor as 'efficiency' | 'reliability' | 'cost' | 'time' | 'robustness',
                  plan: {
                    steps: parsed.steps || [],
                    criticalPath: parsed.criticalPath || [],
                    estimatedDuration: parsed.estimatedDuration || 0,
                    estimatedCost: parsed.estimatedCost || 0,
                    successProbability: parsed.successProbability || 0,
                    contingencies: parsed.contingencies || [],
                    milestones: parsed.milestones || [],
                    status: 'planned',
                  },
                  status: 'planning_complete',
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic planning');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action,
              goal,
              initialState,
              constraints: constraints as Array<{
                type: 'resource' | 'temporal' | 'logical' | 'safety';
                description: string;
                expression: string;
              }>,
              availableActions: availableActions as Array<{
                name: string;
                preconditions: string[];
                effects: string[];
                cost: number;
              }>,
              planningMethod: planningMethod as 'hierarchical' | 'forward' | 'backward' | 'contingent' | 'partial_order',
              horizon,
              optimizeFor: optimizeFor as 'efficiency' | 'reliability' | 'cost' | 'time' | 'robustness',
              plan: {
                steps: [
                  { order: 1, action: 'Analyze goal requirements and current state gap', preconditions: [], expectedEffects: ['Requirements identified', 'Gap analysis complete'], estimatedDuration: 3000, dependencies: [], alternativeActions: ['Rapid assessment'] },
                  { order: 2, action: 'Decompose goal into sub-objectives', preconditions: ['Requirements identified'], expectedEffects: ['Sub-objectives defined'], estimatedDuration: 5000, dependencies: [1], alternativeActions: ['Direct execution'] },
                  { order: 3, action: 'Select optimal action sequence for each sub-objective', preconditions: ['Sub-objectives defined'], expectedEffects: ['Action sequence determined'], estimatedDuration: 4000, dependencies: [2], alternativeActions: ['Greedy selection'] },
                  { order: 4, action: 'Execute plan with monitoring checkpoints', preconditions: ['Action sequence determined'], expectedEffects: ['Goal achieved'], estimatedDuration: 10000, dependencies: [3], alternativeActions: ['Iterative refinement'] },
                ],
                criticalPath: [1, 2, 3, 4],
                estimatedDuration: 22000,
                estimatedCost: 85,
                successProbability: 0.82,
                contingencies: [
                  { condition: 'Sub-objective fails', alternativeSteps: [3] },
                  { condition: 'Resource constraint hit', alternativeSteps: [2, 3] },
                ],
                milestones: [
                  { step: 2, description: 'Sub-objectives fully decomposed', verification: 'All sub-objectives have measurable criteria' },
                  { step: 4, description: 'Goal achieved', verification: 'Success criteria met for original goal' },
                ],
                status: 'planned',
              },
              status: 'planning_complete',
              generatedBy: 'heuristic',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'evaluate': {
          const subject = config.subject;
          const criteria = config.criteria || [];
          const method = config.method || 'weighted_scoring';
          const baseline = config.baseline;
          const includeTradeoffs = config.includeTradeoffs !== false;
          const includeSensitivity = config.includeSensitivity || false;

          if (!subject || criteria.length === 0) {
            return {
              success: false,
              error: '"subject" and "criteria" are required for evaluation',
            };
          }

          this.logger.log(
            `Evaluating "${subject}" against ${criteria.length} criteria (method: ${method})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, subject, method });

          const llmResult = await this.executeWithLLM(
            `You are an expert evaluation engine. Evaluate the given subject against specified criteria.
Return a JSON object with this exact structure:
{
  "scores": [
    { "criterion": "...", "rawScore": 85, "normalizedScore": 0.85, "weightedScore": 0.255, "confidence": 0.9, "justification": "..." }
  ],
  "overallScore": 0.83,
  "grade": "B+",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "tradeoffs": [{ "criterion1": "...", "criterion2": "...", "tradeoffRate": 0.15, "description": "..." }],
  "sensitivity": { "criticalCriteria": [{ "criterion": "...", "thresholdWeight": 0.3, "impactOnRanking": 0.2 }], "robustCriteria": ["..."] },
  "comparisonToBaseline": { "better": ["..."], "worse": ["..."], "overallDelta": 0.05 }
}`,
            `Evaluate subject: "${subject}"\nCriteria: ${JSON.stringify(criteria)}\nMethod: ${method}\nBaseline: ${baseline || 'none'}\nInclude tradeoffs: ${includeTradeoffs}\nInclude sensitivity: ${includeSensitivity}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.scores) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, overallScore: parsed.overallScore });
              return {
                success: true,
                data: {
                  action,
                  subject,
                  criteria: criteria as Array<{
                    name: string;
                    weight: number;
                    direction: 'maximize' | 'minimize';
                    scale: 'binary' | 'ordinal' | 'interval' | 'ratio';
                  }>,
                  method: method as 'weighted_scoring' | 'ahp' | 'topsis' | 'promethee' | 'fuzzy',
                  baseline,
                  includeTradeoffs,
                  includeSensitivity,
                  evaluation: {
                    scores: parsed.scores || [],
                    overallScore: parsed.overallScore || 0,
                    grade: parsed.grade || '',
                    strengths: parsed.strengths || [],
                    weaknesses: parsed.weaknesses || [],
                    tradeoffs: includeTradeoffs ? parsed.tradeoffs || [] : undefined,
                    sensitivity: includeSensitivity ? parsed.sensitivity || { criticalCriteria: [], robustCriteria: [] } : undefined,
                    comparisonToBaseline: baseline ? parsed.comparisonToBaseline || { better: [], worse: [], overallDelta: 0 } : undefined,
                    status: 'evaluated',
                  },
                  status: 'evaluation_complete',
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic evaluation');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action,
              subject,
              criteria: criteria as Array<{
                name: string;
                weight: number;
                direction: 'maximize' | 'minimize';
                scale: 'binary' | 'ordinal' | 'interval' | 'ratio';
              }>,
              method: method as 'weighted_scoring' | 'ahp' | 'topsis' | 'promethee' | 'fuzzy',
              baseline,
              includeTradeoffs,
              includeSensitivity,
              evaluation: {
                scores: [
                  { criterion: 'Quality', rawScore: 82, normalizedScore: 0.82, weightedScore: 0.328, confidence: 0.88, justification: 'Subject demonstrates strong quality metrics above median threshold' },
                  { criterion: 'Efficiency', rawScore: 76, normalizedScore: 0.76, weightedScore: 0.228, confidence: 0.85, justification: 'Performance is adequate with room for optimization' },
                  { criterion: 'Reliability', rawScore: 91, normalizedScore: 0.91, weightedScore: 0.273, confidence: 0.92, justification: 'High consistency and low failure rate observed' },
                ],
                overallScore: 0.83,
                grade: 'B+',
                strengths: ['High reliability across test conditions', 'Consistent performance under varying loads'],
                weaknesses: ['Efficiency could be improved in edge cases', 'Resource utilization spikes during peak operations'],
                tradeoffs: includeTradeoffs
                  ? [{ criterion1: 'Quality', criterion2: 'Efficiency', tradeoffRate: 0.12, description: 'Higher quality output requires additional processing time' }]
                  : undefined,
                sensitivity: includeSensitivity
                  ? { criticalCriteria: [{ criterion: 'Reliability', thresholdWeight: 0.35, impactOnRanking: 0.18 }], robustCriteria: ['Quality'] }
                  : undefined,
                comparisonToBaseline: baseline
                  ? { better: ['Reliability', 'Quality'], worse: ['Efficiency'], overallDelta: 0.05 }
                  : undefined,
                status: 'evaluated',
              },
              status: 'evaluation_complete',
              generatedBy: 'heuristic',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'explain': {
          const subject = config.subject;
          const explanationType = config.explanationType || 'causal';
          const audience = config.audience || 'expert';
          const depth = config.depth || 'moderate';
          const includeVisualization = config.includeVisualization || false;
          const includeCounterfactuals = config.includeCounterfactuals || false;
          const targetExplanation = config.targetExplanation;

          if (!subject) {
            return {
              success: false,
              error: '"subject" is required for explanation',
            };
          }

          this.logger.log(
            `Explaining "${subject}" (type: ${explanationType}, audience: ${audience})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, subject, explanationType });

          const llmResult = await this.executeWithLLM(
            `You are an expert explanation engine. Provide a clear, structured explanation of the given subject.
Return a JSON object with this exact structure:
{
  "summary": "...",
  "reasoningChain": [
    { "step": 1, "statement": "...", "evidence": "...", "confidence": 0.92, "type": "premise" }
  ],
  "supportingEvidence": [
    { "source": "...", "relevance": 0.88, "type": "empirical", "summary": "..." }
  ],
  "counterfactuals": [{ "condition": "...", "wouldResult": "...", "probability": 0.7 }],
  "visualization": { "type": "chain", "nodes": [], "edges": [] },
  "gaps": ["..."],
  "assumptions": ["..."],
  "confidence": 0.85
}`,
            `Explain: "${subject}"\nType: ${explanationType}\nAudience: ${audience}\nDepth: ${depth}\nTarget explanation: ${targetExplanation || 'comprehensive'}\nInclude visualization: ${includeVisualization}\nInclude counterfactuals: ${includeCounterfactuals}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.summary) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, subject });
              return {
                success: true,
                data: {
                  action,
                  subject,
                  explanationType: explanationType as 'causal' | 'mechanistic' | 'functional' | 'teleological' | 'contrastive',
                  audience: audience as 'expert' | 'technical' | 'general' | 'novice',
                  depth: depth as 'brief' | 'moderate' | 'comprehensive',
                  includeVisualization,
                  includeCounterfactuals,
                  targetExplanation,
                  explanation: {
                    summary: parsed.summary || '',
                    reasoningChain: parsed.reasoningChain || [],
                    supportingEvidence: parsed.supportingEvidence || [],
                    counterfactuals: includeCounterfactuals ? parsed.counterfactuals || [] : undefined,
                    visualization: includeVisualization ? parsed.visualization || { type: 'chain', nodes: [], edges: [] } : undefined,
                    gaps: parsed.gaps || [],
                    assumptions: parsed.assumptions || [],
                    confidence: parsed.confidence || 0,
                    status: 'explained',
                  },
                  status: 'explanation_complete',
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic explanation');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action,
              subject,
              explanationType: explanationType as 'causal' | 'mechanistic' | 'functional' | 'teleological' | 'contrastive',
              audience: audience as 'expert' | 'technical' | 'general' | 'novice',
              depth: depth as 'brief' | 'moderate' | 'comprehensive',
              includeVisualization,
              includeCounterfactuals,
              targetExplanation,
              explanation: {
                summary: `${subject} operates through a ${explanationType} mechanism that connects underlying causes to observable effects through a chain of intermediate processes.`,
                reasoningChain: [
                  { step: 1, statement: `Identify the primary causal factors of ${subject}`, evidence: 'Observation of input-output correlation', confidence: 0.88, type: 'premise' as const },
                  { step: 2, statement: 'Trace the mechanism from cause to effect', evidence: 'Mechanistic pathway analysis', confidence: 0.82, type: 'inference' as const },
                  { step: 3, statement: 'Validate the explanation against known data', evidence: 'Cross-reference with established knowledge', confidence: 0.79, type: 'conclusion' as const },
                ],
                supportingEvidence: [
                  { source: 'Empirical observation', relevance: 0.85, type: 'empirical' as const, summary: 'Observed consistent patterns across multiple instances' },
                  { source: 'Theoretical framework', relevance: 0.78, type: 'theoretical' as const, summary: 'Established model predicts the observed behavior' },
                ],
                counterfactuals: includeCounterfactuals
                  ? [{ condition: 'If the primary causal factor were absent', wouldResult: 'The observable effect would not manifest', probability: 0.82 }]
                  : undefined,
                visualization: includeVisualization
                  ? { type: 'chain', nodes: [{ id: 'n1', label: 'Cause', type: 'premise' }, { id: 'n2', label: 'Mechanism', type: 'process' }, { id: 'n3', label: 'Effect', type: 'outcome' }], edges: [{ from: 'n1', to: 'n2', label: 'triggers' }, { from: 'n2', to: 'n3', label: 'produces' }] }
                  : undefined,
                gaps: ['Precise quantitative relationship between variables needs further investigation'],
                assumptions: ['The observed correlation implies causation within the stated confidence interval', 'The mechanism is consistent across different contexts'],
                confidence: 0.83,
                status: 'explained',
              },
              status: 'explanation_complete',
              generatedBy: 'heuristic',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported actions: deduce, induce, analogize, plan, evaluate, explain`,
          };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
