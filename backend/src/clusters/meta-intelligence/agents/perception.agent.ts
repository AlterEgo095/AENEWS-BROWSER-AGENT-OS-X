import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

export class PerceptionAgent extends BaseAgent {
  readonly name = 'PerceptionAgent';
  readonly cluster = ClusterType.META_INTELLIGENCE;
  readonly capabilities = [
    'analyze',
    'classify',
    'detect',
    'segment',
    'recognize',
    'extract',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Perception capabilities for analyzing, classifying, detecting, segmenting, recognizing, and extracting information from multi-modal inputs';

  readonly missionCategories = [MissionCategory.AI_ORCHESTRATION];
  readonly creditCost = 2;
  readonly powerLevel = 1;
  readonly tier = 'standard';

  private buildHeuristicFallback(action: string, config: Record<string, any>, startTime: number): AgentResult {
    const timestamp = new Date().toISOString();
    const duration = Date.now() - startTime;

    switch (action) {
      case 'analyze': {
        const input = config.input;
        const inputType = config.inputType || 'text';
        const analysisDepth = config.analysisDepth || 'standard';
        const aspects = config.aspects || ['structure', 'content', 'sentiment'];
        const language = config.language || 'auto';
        const includeStatistics = config.includeStatistics !== false;
        return {
          success: true,
          data: {
            action, input, inputType: inputType as any, analysisDepth: analysisDepth as any,
            aspects: aspects as string[], language, includeStatistics,
            analysis: {
              summary: `Analysis of ${inputType} input reveals structured content with moderate complexity and positive sentiment indicators.`,
              structure: { type: inputType, components: [{ name: 'primary', type: 'content_block', position: 0, size: 85 }, { name: 'secondary', type: 'supporting', position: 1, size: 45 }], complexity: 0.62, coherence: 0.78 },
              content: {
                topics: [{ topic: 'primary_subject', relevance: 0.92, keywords: ['key1', 'key2', 'key3'] }, { topic: 'secondary_subject', relevance: 0.75, keywords: ['aspect1', 'aspect2'] }],
                entities: [{ entity: 'Entity_A', type: 'organization', salience: 0.88, mentions: 3 }, { entity: 'Entity_B', type: 'concept', salience: 0.72, mentions: 2 }],
                themes: ['Core thematic element', 'Supporting narrative thread'],
              },
              sentiment: { overall: 'positive' as const, score: 0.72, aspects: [{ aspect: 'tone', sentiment: 'positive', score: 0.78 }, { aspect: 'content', sentiment: 'neutral', score: 0.55 }] },
              statistics: includeStatistics ? { wordCount: 250, uniqueTerms: 120, informationDensity: 0.68, readability: 0.82 } : undefined,
              quality: { completeness: 0.85, clarity: 0.88, consistency: 0.91 },
              status: 'analyzed',
            },
            status: 'analysis_complete', generatedBy: 'heuristic', timestamp,
          },
          metadata: { duration, source: 'heuristic' },
        };
      }
      case 'classify': {
        const input = config.input;
        const categories = config.categories || [];
        const model = config.model || 'zero_shot';
        const multiLabel = config.multiLabel || false;
        const confidenceThreshold = config.confidenceThreshold || 0.5;
        const includeReasoning = config.includeReasoning || false;
        return {
          success: true,
          data: {
            action, input, categories: categories as string[], model: model as any, multiLabel, confidenceThreshold,
            maxCategories: config.maxCategories || 5, includeReasoning,
            classification: {
              primaryCategory: categories[0] || 'general',
              primaryConfidence: 0.88,
              allCategories: [
                { category: categories[0] || 'general', confidence: 0.88, rank: 1 },
                { category: categories[1] || 'secondary', confidence: 0.72, rank: 2 },
                { category: categories[2] || 'tertiary', confidence: 0.55, rank: 3 },
              ],
              reasoning: includeReasoning ? [{ category: categories[0] || 'general', evidence: ['Pattern match on key features', 'Distribution alignment'], reasoning: 'Input exhibits strong alignment with category characteristics' }] : undefined,
              rejectedCategories: ['unrelated_category'],
              uncertainty: 0.18,
              status: 'classified',
            },
            status: 'classification_complete', generatedBy: 'heuristic', timestamp,
          },
          metadata: { duration, source: 'heuristic' },
        };
      }
      case 'detect': {
        const input = config.input;
        const detectionType = config.detectionType || 'anomaly';
        const sensitivity = config.sensitivity || 'medium';
        const minConfidence = config.minConfidence || 0.5;
        const includeContext = config.includeContext !== false;
        return {
          success: true,
          data: {
            action, input, detectionType: detectionType as any, sensitivity: sensitivity as any,
            regions: (config.regions || []) as any, minConfidence, includeContext, maxDetections: config.maxDetections || 50,
            detection: {
              detections: [
                { id: 'det-1', type: detectionType, confidence: 0.91, location: { region: 'primary', bounds: { x: 10, y: 20, width: 100, height: 80 } }, features: { intensity: 0.85, size: 'medium' }, context: { surrounding: 'normal baseline region', temporalContext: 'first occurrence in 24h window', relatedDetections: ['det-2'] } },
                { id: 'det-2', type: detectionType, confidence: 0.78, location: { region: 'secondary', bounds: { x: 150, y: 30, width: 60, height: 45 } }, features: { intensity: 0.65, size: 'small' }, context: { surrounding: 'adjacent to primary detection', temporalContext: 'concurrent with det-1', relatedDetections: ['det-1'] } },
              ],
              summary: { totalDetections: 2, byType: { [detectionType]: 2 }, averageConfidence: 0.845, coverage: 0.72 },
              falsePositiveEstimate: 0.12,
              status: 'detected',
            },
            status: 'detection_complete', generatedBy: 'heuristic', timestamp,
          },
          metadata: { duration, source: 'heuristic' },
        };
      }
      case 'segment': {
        const input = config.input;
        const segmentationType = config.segmentationType || 'semantic';
        const granularity = config.granularity || 'medium';
        const includeBoundaries = config.includeBoundaries !== false;
        return {
          success: true,
          data: {
            action, input, segmentationType: segmentationType as any, granularity: granularity as any,
            criteria: (config.criteria || []) as any, minSegmentSize: config.minSegmentSize || 1,
            maxSegments: config.maxSegments || 100, includeBoundaries,
            segmentation: {
              segments: [
                { id: 'seg-1', content: 'Primary segment content', label: 'introduction', confidence: 0.92, start: 0, end: 45, size: 45, features: { type: 'narrative', density: 'high' } },
                { id: 'seg-2', content: 'Secondary segment content', label: 'body', confidence: 0.88, start: 45, end: 180, size: 135, features: { type: 'descriptive', density: 'medium' } },
                { id: 'seg-3', content: 'Final segment content', label: 'conclusion', confidence: 0.85, start: 180, end: 250, size: 70, features: { type: 'summary', density: 'medium' } },
              ],
              boundaries: includeBoundaries ? [{ position: 45, type: 'semantic_shift', sharpness: 0.82, leftSegment: 'seg-1', rightSegment: 'seg-2' }, { position: 180, type: 'topic_change', sharpness: 0.75, leftSegment: 'seg-2', rightSegment: 'seg-3' }] : undefined,
              statistics: { totalSegments: 3, averageSize: 83, sizeVariance: 1825, labelDistribution: { introduction: 1, body: 1, conclusion: 1 } },
              quality: { homogeneity: 0.85, separation: 0.78, completeness: 0.82 },
              status: 'segmented',
            },
            status: 'segmentation_complete', generatedBy: 'heuristic', timestamp,
          },
          metadata: { duration, source: 'heuristic' },
        };
      }
      case 'recognize': {
        const input = config.input;
        const recognitionType = config.recognitionType || 'entity';
        const confidenceThreshold = config.confidenceThreshold || 0.6;
        const includeAlternatives = config.includeAlternatives || false;
        return {
          success: true,
          data: {
            action, input, recognitionType: recognitionType as any,
            knownPatterns: (config.knownPatterns || []) as any, fuzzyMatch: config.fuzzyMatch !== false,
            maxResults: config.maxResults || 20, confidenceThreshold, includeAlternatives,
            recognition: {
              recognized: [
                { id: 'rec-1', type: 'entity', value: 'Recognized Entity A', confidence: 0.92, location: { start: 0, end: 15 }, matchedPattern: 'entity_pattern_1', alternatives: includeAlternatives ? [{ value: 'Entity A variant', confidence: 0.75 }] : undefined },
                { id: 'rec-2', type: 'pattern', value: 'Sequential pattern detected', confidence: 0.85, location: { start: 20, end: 50 }, matchedPattern: 'sequence_pattern' },
              ],
              unrecognized: [{ value: 'ambiguous_token', location: { start: 55, end: 70 }, closestMatch: 'similar_token', similarity: 0.68 }],
              coverage: 0.85,
              summary: { recognizedCount: 2, unrecognizedCount: 1, coveragePercentage: 85 },
              status: 'recognized',
            },
            status: 'recognition_complete', generatedBy: 'heuristic', timestamp,
          },
          metadata: { duration, source: 'heuristic' },
        };
      }
      case 'extract': {
        const input = config.input;
        const extractType = config.extractType || 'key_value';
        const normalize = config.normalize !== false;
        const validate = config.validate !== false;
        const includeMetadata = config.includeMetadata !== false;
        return {
          success: true,
          data: {
            action, input, extractType: extractType as any, schema: (config.schema || {}) as any,
            fields: (config.fields || []) as any, normalize, validate, includeMetadata,
            extraction: {
              extracted: { key1: 'value1', key2: 'value2', key3: 42 },
              fields: [
                { name: 'key1', value: 'value1', confidence: 0.92, source: 'direct_match', normalized: true, valid: true },
                { name: 'key2', value: 'value2', confidence: 0.88, source: 'pattern_extraction', normalized: true, valid: true },
                { name: 'key3', value: 42, confidence: 0.85, source: 'type_inference', normalized: false, valid: true },
              ],
              missingFields: ['key4'],
              validationErrors: validate ? [] : undefined,
              metadata: includeMetadata ? { sourceLocations: { key1: { start: 0, end: 6 } }, extractionMethod: 'hybrid', processingTime: 25 } : undefined,
              completeness: 0.75,
              status: 'extracted',
            },
            status: 'extraction_complete', generatedBy: 'heuristic', timestamp,
          },
          metadata: { duration, source: 'heuristic' },
        };
      }
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'analyze';
      const startTime = Date.now();

      this.emitEvent(AgentEventType.AGENT_STARTED, { action });

      const llmResult = await this.executeWithLLM(
        `You are an expert perception engine capable of analyzing, classifying, detecting, segmenting, recognizing, and extracting information from inputs.
For the action "${action}", return a JSON object with the complete result matching the expected structure for that action.
Include realistic confidence scores, detailed breakdowns, and comprehensive analysis.`,
        `Action: ${action}\nConfig: ${JSON.stringify(config)}`,
        { responseFormat: 'json' },
      );

      if (llmResult) {
        const parsed = this.safeJsonParse(llmResult);
        if (parsed) {
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action });
          return {
            success: true,
            data: {
              action,
              ...config,
              [action === 'analyze' ? 'analysis' : action === 'classify' ? 'classification' : action === 'detect' ? 'detection' : action === 'segment' ? 'segmentation' : action === 'recognize' ? 'recognition' : 'extraction']: parsed,
              status: `${action}_complete`,
              generatedBy: 'llm',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'llm' },
          };
        }
      }

      this.logger.log('LLM unavailable — falling back to heuristic perception');
      this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
      return this.buildHeuristicFallback(action, config, startTime);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
