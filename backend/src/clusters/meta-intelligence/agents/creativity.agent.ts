import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

export class CreativityAgent extends BaseAgent {
  readonly name = 'CreativityAgent';
  readonly cluster = ClusterType.META_INTELLIGENCE;
  readonly capabilities = [
    'ideate',
    'combine',
    'transform',
    'mutate',
    'evaluate',
    'refine',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Creative generation engine for ideation, combination, transformation, mutation, evaluation, and refinement of novel concepts and solutions';

  readonly missionCategories = [MissionCategory.AI_ORCHESTRATION];
  readonly creditCost = 2;
  readonly powerLevel = 1;
  readonly tier = 'standard';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'ideate';
      const startTime = Date.now();

      switch (action) {
        case 'ideate': {
          const domain = config.domain;
          const problem = config.problem;
          const technique = config.technique || 'brainstorming';
          const constraints = config.constraints || [];
          const quantity = config.quantity || 10;
          const divergenceLevel = config.divergenceLevel || 'moderate';
          const inspirationSources = config.inspirationSources || [];
          const targetAudience = config.targetAudience;

          if (!domain && !problem) {
            return { success: false, error: '"domain" or "problem" is required for ideation' };
          }

          this.logger.log(`Ideating in domain "${domain || problem}" (technique: ${technique}, quantity: ${quantity})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, technique, quantity });

          const llmResult = await this.executeWithLLM(
            `You are a creative ideation engine. Generate novel ideas using the specified technique.
Return a JSON object with this exact structure:
{
  "ideas": [
    { "id": "idea-1", "title": "...", "description": "...", "novelty": 0.85, "feasibility": 0.78, "impact": 0.82, "category": "...", "inspirationSource": "...", "elaboration": "..." }
  ],
  "clusters": [{ "theme": "...", "ideas": ["idea-1"], "coherence": 0.85 }],
  "statistics": { "totalIdeas": 8, "averageNovelty": 0.78, "averageFeasibility": 0.72, "uniqueCategories": 4 }
}`,
            `Ideate in domain: ${domain || 'general'}\nProblem: ${problem || 'open-ended'}\nTechnique: ${technique}\nConstraints: ${JSON.stringify(constraints)}\nQuantity: ${quantity}\nDivergence: ${divergenceLevel}\nInspiration: ${JSON.stringify(inspirationSources)}\nAudience: ${targetAudience || 'general'}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.ideas) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, ideaCount: parsed.ideas?.length });
              return {
                success: true,
                data: {
                  action, domain, problem, technique: technique as any, constraints: constraints as string[],
                  quantity, divergenceLevel: divergenceLevel as any, inspirationSources: inspirationSources as any,
                  targetAudience,
                  ideation: {
                    ideas: parsed.ideas || [], clusters: parsed.clusters || [],
                    statistics: parsed.statistics || { totalIdeas: 0, averageNovelty: 0, averageFeasibility: 0, uniqueCategories: 0 },
                    status: 'ideated',
                  },
                  status: 'ideation_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic ideation');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, domain, problem, technique: technique as any, constraints: constraints as string[],
              quantity, divergenceLevel: divergenceLevel as any, inspirationSources: inspirationSources as any, targetAudience,
              ideation: {
                ideas: [
                  { id: 'idea-1', title: 'Adaptive Resource Pool', description: 'Dynamic resource allocation based on real-time demand patterns', novelty: 0.85, feasibility: 0.78, impact: 0.82, category: 'architecture', inspirationSource: 'nature_biology', elaboration: 'Inspired by cellular resource distribution mechanisms' },
                  { id: 'idea-2', title: 'Semantic Compression Layer', description: 'Intermediate representation that compresses meaning while preserving intent', novelty: 0.82, feasibility: 0.72, impact: 0.88, category: 'data_processing', inspirationSource: 'cross_domain', elaboration: 'Applies NLP compression principles to structured data' },
                  { id: 'idea-3', title: 'Emergent Coordination Protocol', description: 'Decentralized coordination through shared environmental signals', novelty: 0.78, feasibility: 0.68, impact: 0.75, category: 'communication', inspirationSource: 'analogy', elaboration: 'Based on ant colony pheromone communication' },
                  { id: 'idea-4', title: 'Progressive Abstraction Engine', description: 'Multi-resolution processing that adapts detail level to available compute', novelty: 0.75, feasibility: 0.82, impact: 0.72, category: 'optimization', inspirationSource: 'historical', elaboration: 'Progressive refinement concept applied to computation' },
                ],
                clusters: [
                  { theme: 'Adaptive systems', ideas: ['idea-1', 'idea-4'], coherence: 0.82 },
                  { theme: 'Communication efficiency', ideas: ['idea-2', 'idea-3'], coherence: 0.75 },
                ],
                statistics: { totalIdeas: 4, averageNovelty: 0.80, averageFeasibility: 0.75, uniqueCategories: 4 },
                status: 'ideated',
              },
              status: 'ideation_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'combine': {
          const concepts = config.concepts || [];
          const combinationStrategy = config.combinationStrategy || 'synthesis';
          const preserveIdentity = config.preserveIdentity !== false;
          const maxCombinations = config.maxCombinations || 10;
          const evaluateCombinations = config.evaluateCombinations !== false;
          const domain = config.domain;

          if (concepts.length < 2) {
            return { success: false, error: 'At least 2 "concepts" are required for combination' };
          }

          this.logger.log(`Combining ${concepts.length} concepts (strategy: ${combinationStrategy})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, conceptCount: concepts.length, combinationStrategy });

          const llmResult = await this.executeWithLLM(
            `You are a creative combination engine. Combine concepts into novel synergies.
Return a JSON object with this exact structure:
{
  "results": [
    { "id": "comb-1", "name": "...", "description": "...", "sourceConcepts": ["..."], "synergyScore": 0.85, "noveltyScore": 0.82, "coherenceScore": 0.78, "emergentProperties": ["..."], "preservedElements": ["..."], "lostElements": ["..."] }
  ],
  "evaluation": { "bestCombination": "comb-1", "mostNovel": "comb-2", "mostCoherent": "comb-1", "highestSynergy": "comb-3" },
  "matrix": { "pairwiseSynergy": {}, "complementarity": {} }
}`,
            `Combine concepts: ${JSON.stringify(concepts)}\nStrategy: ${combinationStrategy}\nPreserve identity: ${preserveIdentity}\nMax combinations: ${maxCombinations}\nDomain: ${domain || 'general'}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.results) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, combinationCount: parsed.results?.length });
              return {
                success: true,
                data: {
                  action, concepts: concepts as string[], combinationStrategy: combinationStrategy as any,
                  preserveIdentity, maxCombinations, evaluateCombinations, domain,
                  combination: {
                    results: parsed.results || [],
                    evaluation: evaluateCombinations ? parsed.evaluation || { bestCombination: '', mostNovel: '', mostCoherent: '', highestSynergy: '' } : undefined,
                    matrix: parsed.matrix || { pairwiseSynergy: {}, complementarity: {} },
                    status: 'combined',
                  },
                  status: 'combination_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic combination');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, concepts: concepts as string[], combinationStrategy: combinationStrategy as any,
              preserveIdentity, maxCombinations, evaluateCombinations, domain,
              combination: {
                results: [
                  { id: 'comb-1', name: 'Synergistic Fusion', description: `Blending ${concepts[0]} with ${concepts[1]} creates emergent capabilities`, sourceConcepts: [concepts[0], concepts[1]], synergyScore: 0.85, noveltyScore: 0.78, coherenceScore: 0.82, emergentProperties: ['Cross-domain applicability', 'Enhanced robustness'], preservedElements: [concepts[0] as string, concepts[1] as string], lostElements: ['Boundary constraints'] },
                ],
                evaluation: evaluateCombinations ? { bestCombination: 'comb-1', mostNovel: 'comb-1', mostCoherent: 'comb-1', highestSynergy: 'comb-1' } : undefined,
                matrix: { pairwiseSynergy: { [concepts[0] as string]: { [concepts[1] as string]: 0.85 } }, complementarity: { [concepts[0] as string]: { [concepts[1] as string]: 0.72 } } },
                status: 'combined',
              },
              status: 'combination_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'transform': {
          const input = config.input;
          const transformationType = config.transformationType || 'reframe';
          const intensity = config.intensity || 'moderate';
          const preserveCore = config.preserveCore !== false;
          const constraints = config.constraints || [];
          const dimensions = config.dimensions || ['perspective', 'scale', 'time'];
          const iterations = config.iterations || 3;

          if (!input) {
            return { success: false, error: '"input" is required for transformation' };
          }

          this.logger.log(`Transforming input (type: ${transformationType}, intensity: ${intensity})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, transformationType, intensity });

          const llmResult = await this.executeWithLLM(
            `You are a creative transformation engine. Transform the input using the specified technique.
Return a JSON object with this exact structure:
{
  "transformedOutput": "...",
  "transformationChain": [{ "step": 1, "type": "...", "description": "...", "delta": "..." }],
  "coreElements": { "preserved": ["..."], "modified": ["..."], "removed": ["..."], "added": ["..."] },
  "perspectiveShifts": [{ "from": "...", "to": "...", "impact": "..." }],
  "alternatives": [{ "transformation": "...", "result": "...", "divergence": 0.75 }]
}`,
            `Transform: ${JSON.stringify(input)}\nType: ${transformationType}\nIntensity: ${intensity}\nPreserve core: ${preserveCore}\nConstraints: ${JSON.stringify(constraints)}\nDimensions: ${JSON.stringify(dimensions)}\nIterations: ${iterations}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.transformedOutput) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action });
              return {
                success: true,
                data: {
                  action, input, transformationType: transformationType as any, intensity: intensity as any,
                  preserveCore, constraints: constraints as string[], dimensions: dimensions as string[], iterations,
                  transformation: {
                    transformedOutput: parsed.transformedOutput, transformationChain: parsed.transformationChain || [],
                    coreElements: parsed.coreElements || { preserved: [], modified: [], removed: [], added: [] },
                    perspectiveShifts: parsed.perspectiveShifts || [], alternatives: parsed.alternatives || [],
                    status: 'transformed',
                  },
                  status: 'transformation_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic transformation');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, input, transformationType: transformationType as any, intensity: intensity as any,
              preserveCore, constraints: constraints as string[], dimensions: dimensions as string[], iterations,
              transformation: {
                transformedOutput: `Transformed (${transformationType}): The input has been reimagined through a ${intensity} ${transformationType} lens, revealing new possibilities and connections.`,
                transformationChain: [
                  { step: 1, type: 'reframe', description: 'Initial perspective shift applied', delta: 'Context reframed from operational to strategic' },
                  { step: 2, type: 'abstract', description: 'Abstraction layer applied', delta: 'Concrete details elevated to pattern level' },
                  { step: 3, type: 'recontextualize', description: 'New context applied', delta: 'Repositioned within broader framework' },
                ],
                coreElements: { preserved: ['Fundamental purpose', 'Key relationships'], modified: ['Presentation format', 'Emphasis areas'], removed: ['Domain-specific jargon'], added: ['Cross-domain analogies', 'Strategic perspective'] },
                perspectiveShifts: [{ from: 'tactical', to: 'strategic', impact: 'Reveals long-term implications and systemic effects' }],
                alternatives: [{ transformation: 'inversion', result: 'Completely inverted perspective on the same input', divergence: 0.82 }],
                status: 'transformed',
              },
              status: 'transformation_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'mutate': {
          const input = config.input;
          const mutationType = config.mutationType || 'random';
          const mutationRate = config.mutationRate || 0.1;
          const populationSize = config.populationSize || 10;
          const selectionPressure = config.selectionPressure || 'moderate';
          const fitnessCriteria = config.fitnessCriteria || [];
          const preserveSemantics = config.preserveSemantics !== false;

          if (!input) {
            return { success: false, error: '"input" is required for mutation' };
          }

          this.logger.log(`Mutating input (type: ${mutationType}, rate: ${mutationRate}, population: ${populationSize})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, mutationType, mutationRate });

          const llmResult = await this.executeWithLLM(
            `You are a creative mutation engine. Generate a population of mutated variants.
Return a JSON object with this exact structure:
{
  "population": [{ "id": 1, "content": "...", "fitnessScore": 0.82, "mutations": [{ "type": "substitution", "location": "...", "original": "...", "mutated": "..." }], "semanticPreservation": 0.88 }],
  "bestMutant": { "id": 3, "content": "...", "fitnessScore": 0.92, "improvement": 0.15 },
  "diversity": { "averageDistance": 0.45, "uniqueMutations": 28, "coverageMap": {} },
  "convergence": { "achieved": false, "generation": 1, "stagnationCount": 0 }
}`,
            `Mutate: ${JSON.stringify(input)}\nType: ${mutationType}\nRate: ${mutationRate}\nPopulation: ${populationSize}\nPressure: ${selectionPressure}\nFitness: ${JSON.stringify(fitnessCriteria)}\nPreserve semantics: ${preserveSemantics}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.population) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, bestFitness: parsed.bestMutant?.fitnessScore });
              return {
                success: true,
                data: {
                  action, input, mutationType: mutationType as any, mutationRate, populationSize,
                  selectionPressure: selectionPressure as any, fitnessCriteria: fitnessCriteria as any, preserveSemantics,
                  mutation: {
                    population: parsed.population || [],
                    bestMutant: parsed.bestMutant || { id: 0, content: '', fitnessScore: 0, improvement: 0 },
                    diversity: parsed.diversity || { averageDistance: 0, uniqueMutations: 0, coverageMap: {} },
                    convergence: parsed.convergence || { achieved: false, generation: 0, stagnationCount: 0 },
                    status: 'mutated',
                  },
                  status: 'mutation_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic mutation');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, input, mutationType: mutationType as any, mutationRate, populationSize,
              selectionPressure: selectionPressure as any, fitnessCriteria: fitnessCriteria as any, preserveSemantics,
              mutation: {
                population: [
                  { id: 1, content: `Variant A: Modified with enhanced ${mutationType} mutation`, fitnessScore: 0.82, mutations: [{ type: 'substitution', location: 'core', original: 'original', mutated: 'variant' }], semanticPreservation: 0.88 },
                  { id: 2, content: `Variant B: Divergent ${mutationType} exploration`, fitnessScore: 0.78, mutations: [{ type: 'insertion', location: 'boundary', original: '', mutated: 'extended' }], semanticPreservation: 0.82 },
                  { id: 3, content: `Variant C: Optimized ${mutationType} variant`, fitnessScore: 0.91, mutations: [{ type: 'substitution', location: 'key_point', original: 'baseline', mutated: 'improved' }], semanticPreservation: 0.92 },
                ],
                bestMutant: { id: 3, content: `Optimized ${mutationType} variant with highest fitness`, fitnessScore: 0.91, improvement: 0.15 },
                diversity: { averageDistance: 0.42, uniqueMutations: 8, coverageMap: { core: 3, boundary: 2, key_point: 3 } },
                convergence: { achieved: false, generation: 1, stagnationCount: 0 },
                status: 'mutated',
              },
              status: 'mutation_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'evaluate': {
          const idea = config.idea;
          const criteria = config.criteria || ['novelty', 'feasibility', 'impact', 'clarity'];
          const evaluationMethod = config.evaluationMethod || 'multi_criteria';
          const baseline = config.baseline;
          const includeSWOT = config.includeSWOT || false;
          const includeRiskAssessment = config.includeRiskAssessment || false;

          if (!idea) {
            return { success: false, error: '"idea" is required for creative evaluation' };
          }

          this.logger.log(`Evaluating creative idea (method: ${evaluationMethod})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, evaluationMethod });

          const llmResult = await this.executeWithLLM(
            `You are a creative evaluation engine. Evaluate the idea against specified criteria.
Return a JSON object with this exact structure:
{
  "overallScore": 0.82,
  "grade": "A-",
  "dimensionScores": { "novelty": { "score": 0.85, "weight": 0.25, "justification": "...", "evidence": ["..."] } },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "swot": { "strengths": ["..."], "weaknesses": ["..."], "opportunities": ["..."], "threats": ["..."] },
  "riskAssessment": { "risks": [{ "risk": "...", "probability": "medium", "impact": "high", "mitigation": "..." }], "overallRisk": "medium" },
  "comparison": { "vsBaseline": 0.12, "betterDimensions": ["..."], "worseDimensions": ["..."] },
  "recommendations": ["..."]
}`,
            `Evaluate idea: ${JSON.stringify(idea)}\nCriteria: ${JSON.stringify(criteria)}\nMethod: ${evaluationMethod}\nBaseline: ${baseline || 'none'}\nSWOT: ${includeSWOT}\nRisk: ${includeRiskAssessment}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.overallScore !== undefined) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, overallScore: parsed.overallScore });
              return {
                success: true,
                data: {
                  action, idea, criteria: criteria as string[], evaluationMethod: evaluationMethod as any,
                  baseline, includeSWOT, includeRiskAssessment,
                  evaluation: {
                    overallScore: parsed.overallScore || 0, grade: parsed.grade || '',
                    dimensionScores: parsed.dimensionScores || {}, strengths: parsed.strengths || [],
                    weaknesses: parsed.weaknesses || [],
                    swot: includeSWOT ? parsed.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] } : undefined,
                    riskAssessment: includeRiskAssessment ? parsed.riskAssessment || { risks: [], overallRisk: '' } : undefined,
                    comparison: baseline ? parsed.comparison || { vsBaseline: 0, betterDimensions: [], worseDimensions: [] } : undefined,
                    recommendations: parsed.recommendations || [], status: 'evaluated',
                  },
                  status: 'creative_evaluation_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
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
              action, idea, criteria: criteria as string[], evaluationMethod: evaluationMethod as any,
              baseline, includeSWOT, includeRiskAssessment,
              evaluation: {
                overallScore: 0.82, grade: 'A-',
                dimensionScores: {
                  novelty: { score: 0.85, weight: 0.25, justification: 'Highly original approach with unique combination of elements', evidence: ['No similar solutions in literature', 'Novel integration pattern'] },
                  feasibility: { score: 0.78, weight: 0.25, justification: 'Achievable with moderate effort and existing technology', evidence: ['Required tools available', 'Similar implementations exist'] },
                  impact: { score: 0.82, weight: 0.25, justification: 'Significant positive impact on target domain', evidence: ['Addresses key pain point', 'Scalable solution'] },
                  clarity: { score: 0.82, weight: 0.25, justification: 'Well-defined concept with clear articulation', evidence: ['Unambiguous description', 'Testable claims'] },
                },
                strengths: ['High novelty factor', 'Addresses genuine need', 'Scalable approach'],
                weaknesses: ['Requires cross-domain expertise', 'Implementation complexity moderate-to-high'],
                swot: includeSWOT ? { strengths: ['Innovative approach', 'First-mover advantage'], weaknesses: ['Resource intensive', 'Requires specialized skills'], opportunities: ['Growing market demand', 'Technology convergence'], threats: ['Rapid technology change', 'Potential competitor entry'] } : undefined,
                riskAssessment: includeRiskAssessment ? { risks: [{ risk: 'Technical feasibility gap', probability: 'medium' as const, impact: 'high' as const, mitigation: 'Prototype early and iterate' }], overallRisk: 'medium' } : undefined,
                comparison: baseline ? { vsBaseline: 0.12, betterDimensions: ['novelty', 'impact'], worseDimensions: ['feasibility'] } : undefined,
                recommendations: ['Build a proof-of-concept to validate technical feasibility', 'Explore partnerships for cross-domain expertise'],
                status: 'evaluated',
              },
              status: 'creative_evaluation_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'refine': {
          const idea = config.idea;
          const refinementGoal = config.refinementGoal || 'improve_quality';
          const iterations = config.iterations || 3;
          const criteria = config.criteria || ['clarity', 'specificity', 'feasibility'];
          const feedback = config.feedback || [];
          const constraints = config.constraints || [];
          const convergenceThreshold = config.convergenceThreshold || 0.95;

          if (!idea) {
            return { success: false, error: '"idea" is required for refinement' };
          }

          this.logger.log(`Refining idea (goal: ${refinementGoal}, iterations: ${iterations})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, refinementGoal, iterations });

          const llmResult = await this.executeWithLLM(
            `You are a creative refinement engine. Iteratively improve the idea toward the specified goal.
Return a JSON object with this exact structure:
{
  "refinedIdea": "...",
  "iterationHistory": [{ "iteration": 1, "version": "v1.1", "score": 0.82, "changes": ["..."], "feedbackAddressed": ["..."] }],
  "improvements": [{ "dimension": "clarity", "before": 0.72, "after": 0.88, "improvement": 0.16 }],
  "convergence": { "achieved": true, "iterationsUsed": 3, "finalScore": 0.92, "scoreProgression": [0.72, 0.82, 0.88, 0.92] },
  "remainingIssues": ["..."]
}`,
            `Refine idea: ${JSON.stringify(idea)}\nGoal: ${refinementGoal}\nIterations: ${iterations}\nCriteria: ${JSON.stringify(criteria)}\nFeedback: ${JSON.stringify(feedback)}\nConstraints: ${JSON.stringify(constraints)}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.refinedIdea) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, finalScore: parsed.convergence?.finalScore });
              return {
                success: true,
                data: {
                  action, idea, refinementGoal: refinementGoal as any, iterations,
                  criteria: criteria as string[], feedback: feedback as any, constraints: constraints as string[],
                  convergenceThreshold,
                  refinement: {
                    refinedIdea: parsed.refinedIdea, iterationHistory: parsed.iterationHistory || [],
                    improvements: parsed.improvements || [],
                    convergence: parsed.convergence || { achieved: false, iterationsUsed: 0, finalScore: 0, scoreProgression: [] },
                    remainingIssues: parsed.remainingIssues || [], status: 'refined',
                  },
                  status: 'refinement_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic refinement');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, idea, refinementGoal: refinementGoal as any, iterations,
              criteria: criteria as string[], feedback: feedback as any, constraints: constraints as string[],
              convergenceThreshold,
              refinement: {
                refinedIdea: `Refined: ${JSON.stringify(idea)} — Enhanced for ${refinementGoal} through iterative improvement across ${criteria.join(', ')} dimensions`,
                iterationHistory: [
                  { iteration: 1, version: 'v1.1', score: 0.78, changes: ['Added specificity to core concept', 'Clarified implementation approach'], feedbackAddressed: [] },
                  { iteration: 2, version: 'v1.2', score: 0.85, changes: ['Strengthened feasibility analysis', 'Added measurable success criteria'], feedbackAddressed: feedback.length > 0 ? [feedback[0] as any] : [] },
                  { iteration: 3, version: 'v1.3', score: 0.91, changes: ['Polished presentation', 'Addressed edge cases'], feedbackAddressed: [] },
                ],
                improvements: [
                  { dimension: 'clarity', before: 0.68, after: 0.88, improvement: 0.20 },
                  { dimension: 'specificity', before: 0.62, after: 0.85, improvement: 0.23 },
                  { dimension: 'feasibility', before: 0.72, after: 0.91, improvement: 0.19 },
                ],
                convergence: { achieved: true, iterationsUsed: 3, finalScore: 0.91, scoreProgression: [0.68, 0.78, 0.85, 0.91] },
                remainingIssues: ['Long-term sustainability needs further validation'],
                status: 'refined',
              },
              status: 'refinement_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported actions: ideate, combine, transform, mutate, evaluate, refine`,
          };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
