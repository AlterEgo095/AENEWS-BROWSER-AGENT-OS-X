import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';

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
  readonly version = '1.0.0';
  readonly description =
    'Creative generation engine for ideation, combination, transformation, mutation, evaluation, and refinement of novel concepts and solutions';

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
            return {
              success: false,
              error: '"domain" or "problem" is required for ideation',
            };
          }

          this.logger.log(
            `Ideating in domain "${domain || problem}" (technique: ${technique}, quantity: ${quantity})`,
          );

          return {
            success: true,
            data: {
              action,
              domain,
              problem,
              technique: technique as 'brainstorming' | 'scamper' | 'lateral_thinking' | 'morphological' | 'triz' | 'analogy' | 'random_stimulus',
              constraints: constraints as string[],
              quantity,
              divergenceLevel: divergenceLevel as 'conservative' | 'moderate' | 'wild',
              inspirationSources: inspirationSources as Array<{
                type: 'analogy' | 'nature' | 'cross_domain' | 'historical';
                description: string;
              }>,
              targetAudience,
              ideation: {
                ideas: [] as Array<{
                  id: string;
                  title: string;
                  description: string;
                  novelty: number;
                  feasibility: number;
                  impact: number;
                  category: string;
                  inspirationSource: string;
                  elaboration: string;
                }>,
                clusters: [] as Array<{
                  theme: string;
                  ideas: string[];
                  coherence: number;
                }>,
                statistics: {
                  totalIdeas: 0,
                  averageNovelty: 0,
                  averageFeasibility: 0,
                  uniqueCategories: 0,
                },
                status: 'ideated',
              },
              status: 'ideation_complete',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
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
            return {
              success: false,
              error: 'At least 2 "concepts" are required for combination',
            };
          }

          this.logger.log(
            `Combining ${concepts.length} concepts (strategy: ${combinationStrategy})`,
          );

          return {
            success: true,
            data: {
              action,
              concepts: concepts as string[],
              combinationStrategy: combinationStrategy as 'synthesis' | 'fusion' | 'intersection' | 'layering' | 'recombination' | 'chimera',
              preserveIdentity,
              maxCombinations,
              evaluateCombinations,
              domain,
              combination: {
                results: [] as Array<{
                  id: string;
                  name: string;
                  description: string;
                  sourceConcepts: string[];
                  synergyScore: number;
                  noveltyScore: number;
                  coherenceScore: number;
                  emergentProperties: string[];
                  preservedElements: string[];
                  lostElements: string[];
                }>,
                evaluation: evaluateCombinations
                  ? {
                      bestCombination: '',
                      mostNovel: '',
                      mostCoherent: '',
                      highestSynergy: '',
                    }
                  : undefined,
                matrix: {
                  pairwiseSynergy: {} as Record<string, Record<string, number>>,
                  complementarity: {} as Record<string, Record<string, number>>,
                },
                status: 'combined',
              },
              status: 'combination_complete',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
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
            return {
              success: false,
              error: '"input" is required for transformation',
            };
          }

          this.logger.log(
            `Transforming input (type: ${transformationType}, intensity: ${intensity})`,
          );

          return {
            success: true,
            data: {
              action,
              input,
              transformationType: transformationType as 'reframe' | 'invert' | 'abstract' | 'concretize' | 'metaphorize' | 'extrapolate' | 'compress' | 'expand',
              intensity: intensity as 'subtle' | 'moderate' | 'radical',
              preserveCore,
              constraints: constraints as string[],
              dimensions: dimensions as string[],
              iterations,
              transformation: {
                transformedOutput: '',
                transformationChain: [] as Array<{
                  step: number;
                  type: string;
                  description: string;
                  delta: string;
                }>,
                coreElements: {
                  preserved: [] as string[],
                  modified: [] as string[],
                  removed: [] as string[],
                  added: [] as string[],
                },
                perspectiveShifts: [] as Array<{
                  from: string;
                  to: string;
                  impact: string;
                }>,
                alternatives: [] as Array<{
                  transformation: string;
                  result: string;
                  divergence: number;
                }>,
                status: 'transformed',
              },
              status: 'transformation_complete',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
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
            return {
              success: false,
              error: '"input" is required for mutation',
            };
          }

          this.logger.log(
            `Mutating input (type: ${mutationType}, rate: ${mutationRate}, population: ${populationSize})`,
          );

          return {
            success: true,
            data: {
              action,
              input,
              mutationType: mutationType as 'random' | 'directed' | 'adaptive' | 'crossover' | 'point' | 'segment',
              mutationRate,
              populationSize,
              selectionPressure: selectionPressure as 'weak' | 'moderate' | 'strong',
              fitnessCriteria: fitnessCriteria as Array<{
                criterion: string;
                weight: number;
                direction: 'maximize' | 'minimize';
              }>,
              preserveSemantics,
              mutation: {
                population: [] as Array<{
                  id: number;
                  content: any;
                  fitnessScore: number;
                  mutations: Array<{
                    type: string;
                    location: string;
                    original: string;
                    mutated: string;
                  }>;
                  semanticPreservation: number;
                }>,
                bestMutant: {
                  id: 0,
                  content: '',
                  fitnessScore: 0,
                  improvement: 0,
                },
                diversity: {
                  averageDistance: 0,
                  uniqueMutations: 0,
                  coverageMap: {} as Record<string, number>,
                },
                convergence: {
                  achieved: false,
                  generation: 0,
                  stagnationCount: 0,
                },
                status: 'mutated',
              },
              status: 'mutation_complete',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
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
            return {
              success: false,
              error: '"idea" is required for creative evaluation',
            };
          }

          this.logger.log(
            `Evaluating creative idea (method: ${evaluationMethod})`,
          );

          return {
            success: true,
            data: {
              action,
              idea,
              criteria: criteria as string[],
              evaluationMethod: evaluationMethod as 'multi_criteria' | 'consensus' | 'comparative' | 'rubric' | 'analytic_hierarchy',
              baseline,
              includeSWOT,
              includeRiskAssessment,
              evaluation: {
                overallScore: 0,
                grade: '',
                dimensionScores: {} as Record<string, {
                  score: number;
                  weight: number;
                  justification: string;
                  evidence: string[];
                }>,
                strengths: [] as string[],
                weaknesses: [] as string[],
                swot: includeSWOT
                  ? {
                      strengths: [] as string[],
                      weaknesses: [] as string[],
                      opportunities: [] as string[],
                      threats: [] as string[],
                    }
                  : undefined,
                riskAssessment: includeRiskAssessment
                  ? {
                      risks: [] as Array<{
                        risk: string;
                        probability: 'low' | 'medium' | 'high';
                        impact: 'low' | 'medium' | 'high';
                        mitigation: string;
                      }>,
                      overallRisk: 'low' as string,
                    }
                  : undefined,
                comparison: baseline
                  ? {
                      vsBaseline: 0,
                      betterDimensions: [] as string[],
                      worseDimensions: [] as string[],
                    }
                  : undefined,
                recommendations: [] as string[],
                status: 'evaluated',
              },
              status: 'creative_evaluation_complete',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
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
            return {
              success: false,
              error: '"idea" is required for refinement',
            };
          }

          this.logger.log(
            `Refining idea (goal: ${refinementGoal}, iterations: ${iterations})`,
          );

          return {
            success: true,
            data: {
              action,
              idea,
              refinementGoal: refinementGoal as 'improve_quality' | 'increase_novelty' | 'increase_feasibility' | 'increase_specificity' | 'reduce_complexity' | 'enhance_impact',
              iterations,
              criteria: criteria as string[],
              feedback: feedback as Array<{
                source: string;
                comment: string;
                dimension: string;
                severity: 'info' | 'minor' | 'major';
              }>,
              constraints: constraints as string[],
              convergenceThreshold,
              refinement: {
                refinedIdea: '',
                iterationHistory: [] as Array<{
                  iteration: number;
                  version: string;
                  score: number;
                  changes: string[];
                  feedbackAddressed: string[];
                }>,
                improvements: [] as Array<{
                  dimension: string;
                  before: number;
                  after: number;
                  improvement: number;
                }>,
                convergence: {
                  achieved: false,
                  iterationsUsed: 0,
                  finalScore: 0,
                  scoreProgression: [] as number[],
                },
                remainingIssues: [] as string[],
                status: 'refined',
              },
              status: 'refinement_complete',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
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
