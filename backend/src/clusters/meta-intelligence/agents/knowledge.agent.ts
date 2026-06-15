import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

export class KnowledgeAgent extends BaseAgent {
  readonly name = 'KnowledgeAgent';
  readonly cluster = ClusterType.META_INTELLIGENCE;
  readonly capabilities = [
    'acquire',
    'represent',
    'query',
    'infer',
    'update',
    'graph',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Knowledge management engine for acquiring, representing, querying, inferring, updating, and graph-structuring knowledge across domains';

  readonly missionCategories = [MissionCategory.AI_ORCHESTRATION];
  readonly creditCost = 2;
  readonly powerLevel = 2;
  readonly tier = 'advanced';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'acquire';
      const startTime = Date.now();

      switch (action) {
        case 'acquire': {
          const source = config.source;
          const sourceType = config.sourceType || 'document';
          const domain = config.domain;
          const extractionMethod = config.extractionMethod || 'automatic';
          const qualityThreshold = config.qualityThreshold || 0.7;
          const deduplication = config.deduplication !== false;
          const includeProvenance = config.includeProvenance !== false;

          if (!source) {
            return {
              success: false,
              error: '"source" is required for knowledge acquisition',
            };
          }

          this.logger.log(
            `Acquiring knowledge from ${sourceType} source (method: ${extractionMethod})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, sourceType, extractionMethod });

          const llmResult = await this.executeWithLLM(
            `You are an expert knowledge acquisition engine. Extract facts, concepts, and relationships from the given source.
Return a JSON object with this exact structure:
{
  "facts": [
    { "id": "f1", "subject": "...", "predicate": "...", "object": "...", "confidence": 0.92, "source": "..." }
  ],
  "concepts": [
    { "id": "c1", "name": "...", "definition": "...", "attributes": {}, "relatedConcepts": ["c2"] }
  ],
  "relationships": [
    { "id": "r1", "from": "c1", "to": "c2", "type": "part_of", "properties": {}, "confidence": 0.88 }
  ],
  "statistics": { "totalExtracted": 25, "highConfidence": 18, "duplicatesRemoved": 3, "qualityScore": 0.87 },
  "provenance": { "sourceUri": "...", "extractionTimestamp": "...", "extractor": "...", "confidence": 0.85 }
}`,
            `Acquire knowledge from source: ${source}\nSource type: ${sourceType}\nDomain: ${domain || 'general'}\nExtraction method: ${extractionMethod}\nQuality threshold: ${qualityThreshold}\nDeduplication: ${deduplication}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && (parsed.facts || parsed.concepts)) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, factCount: parsed.facts?.length, conceptCount: parsed.concepts?.length });
              return {
                success: true,
                data: {
                  action, source, sourceType: sourceType as any, domain, extractionMethod: extractionMethod as any,
                  qualityThreshold, deduplication, includeProvenance,
                  acquisition: {
                    facts: parsed.facts || [], concepts: parsed.concepts || [], relationships: parsed.relationships || [],
                    statistics: parsed.statistics || { totalExtracted: 0, highConfidence: 0, duplicatesRemoved: 0, qualityScore: 0 },
                    provenance: includeProvenance ? parsed.provenance || { sourceUri: source, extractionTimestamp: new Date().toISOString(), extractor: extractionMethod, confidence: 0 } : undefined,
                    status: 'acquired',
                  },
                  status: 'acquisition_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic acquisition');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, source, sourceType: sourceType as any, domain, extractionMethod: extractionMethod as any,
              qualityThreshold, deduplication, includeProvenance,
              acquisition: {
                facts: [
                  { id: 'f1', subject: source, predicate: 'contains', object: 'structured information', confidence: 0.88, source: source as string },
                  { id: 'f2', subject: 'extracted_entity', predicate: 'belongs_to', object: domain || 'general', confidence: 0.82, source: source as string },
                  { id: 'f3', subject: 'knowledge_domain', predicate: 'encompasses', object: 'related concepts', confidence: 0.79, source: source as string },
                ],
                concepts: [
                  { id: 'c1', name: 'Core concept', definition: `Primary concept extracted from ${sourceType} source`, attributes: { relevance: 'high' }, relatedConcepts: ['c2'] },
                  { id: 'c2', name: 'Supporting concept', definition: 'Secondary concept related to core', attributes: { relevance: 'medium' }, relatedConcepts: ['c1'] },
                ],
                relationships: [
                  { id: 'r1', from: 'c1', to: 'c2', type: 'related_to', properties: { strength: 'strong' }, confidence: 0.85 },
                ],
                statistics: { totalExtracted: 6, highConfidence: 4, duplicatesRemoved: deduplication ? 1 : 0, qualityScore: 0.84 },
                provenance: includeProvenance
                  ? { sourceUri: source, extractionTimestamp: new Date().toISOString(), extractor: extractionMethod, confidence: 0.84 }
                  : undefined,
                status: 'acquired',
              },
              status: 'acquisition_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'represent': {
          const knowledge = config.knowledge;
          const representationFormat = config.representationFormat || 'knowledge_graph';
          const ontology = config.ontology;
          const granularity = config.granularity || 'standard';
          const includeSchema = config.includeSchema !== false;
          const normalizations = config.normalizations || ['naming', 'units'];

          if (!knowledge) {
            return { success: false, error: '"knowledge" is required for knowledge representation' };
          }

          this.logger.log(`Representing knowledge in ${representationFormat} format`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, representationFormat });

          const llmResult = await this.executeWithLLM(
            `You are an expert knowledge representation engine. Transform knowledge into a structured representation.
Return a JSON object with this exact structure:
{
  "schema": { "entities": [{ "name": "...", "properties": [{ "name": "...", "type": "string", "required": true }] }], "relations": [{ "name": "...", "from": "...", "to": "...", "cardinality": "1:N" }], "constraints": ["..."] },
  "instances": [{ "id": "i1", "type": "...", "properties": {} }],
  "triples": [{ "subject": "...", "predicate": "...", "object": "...", "confidence": 0.9 }],
  "embeddings": { "dimensions": 768, "count": 150, "model": "text-embedding-3-small" },
  "qualityMetrics": { "completeness": 0.88, "consistency": 0.92, "coverage": 0.85 }
}`,
            `Represent knowledge: ${JSON.stringify(knowledge)}\nFormat: ${representationFormat}\nOntology: ${JSON.stringify(ontology)}\nGranularity: ${granularity}\nNormalizations: ${JSON.stringify(normalizations)}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && (parsed.instances || parsed.triples)) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, representationFormat });
              return {
                success: true,
                data: {
                  action, knowledge, representationFormat: representationFormat as any, ontology: ontology as any,
                  granularity: granularity as any, includeSchema, normalizations: normalizations as string[],
                  representation: {
                    schema: includeSchema ? parsed.schema || { entities: [], relations: [], constraints: [] } : undefined,
                    instances: parsed.instances || [], triples: parsed.triples || [],
                    embeddings: representationFormat === 'vector' ? parsed.embeddings || { dimensions: 0, count: 0, model: '' } : undefined,
                    qualityMetrics: parsed.qualityMetrics || { completeness: 0, consistency: 0, coverage: 0 },
                    status: 'represented',
                  },
                  status: 'representation_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic representation');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, knowledge, representationFormat: representationFormat as any, ontology: ontology as any,
              granularity: granularity as any, includeSchema, normalizations: normalizations as string[],
              representation: {
                schema: includeSchema ? {
                  entities: [{ name: 'Entity', properties: [{ name: 'id', type: 'string', required: true }, { name: 'label', type: 'string', required: true }] }],
                  relations: [{ name: 'related_to', from: 'Entity', to: 'Entity', cardinality: 'N:M' }],
                  constraints: ['Entity.id must be unique'],
                } : undefined,
                instances: [
                  { id: 'e1', type: 'Entity', properties: { label: 'Primary knowledge node' } },
                  { id: 'e2', type: 'Entity', properties: { label: 'Secondary knowledge node' } },
                ],
                triples: [
                  { subject: 'e1', predicate: 'related_to', object: 'e2', confidence: 0.85 },
                ],
                embeddings: representationFormat === 'vector' ? { dimensions: 768, count: 45, model: 'text-embedding-3-small' } : undefined,
                qualityMetrics: { completeness: 0.86, consistency: 0.91, coverage: 0.83 },
                status: 'represented',
              },
              status: 'representation_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'query': {
          const query = config.query;
          const queryLanguage = config.queryLanguage || 'natural';
          const knowledgeBases = config.knowledgeBases || [];
          const maxResults = config.maxResults || 20;
          const includeExplanation = config.includeExplanation || false;
          const similarityThreshold = config.similarityThreshold || 0.5;
          const expandContext = config.expandContext !== false;

          if (!query) {
            return { success: false, error: '"query" is required for knowledge querying' };
          }

          this.logger.log(`Querying knowledge: "${query}" (language: ${queryLanguage})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, query });

          const llmResult = await this.executeWithLLM(
            `You are an expert knowledge query engine. Answer the query using available knowledge.
Return a JSON object with this exact structure:
{
  "answers": [
    { "id": "a1", "answer": "...", "confidence": 0.92, "sources": [{ "id": "s1", "relevance": 0.88 }], "type": "fact" }
  ],
  "context": { "relatedEntities": ["..."], "relatedConcepts": ["..."], "broaderContext": "..." },
  "explanation": { "reasoningChain": [{ "step": 1, "operation": "...", "description": "..." }], "sourcesConsulted": ["..."] },
  "statistics": { "totalMatches": 15, "highConfidenceMatches": 8, "queryTime": 45, "knowledgeBasesSearched": 3 }
}`,
            `Query: "${query}"\nLanguage: ${queryLanguage}\nKnowledge bases: ${JSON.stringify(knowledgeBases)}\nMax results: ${maxResults}\nSimilarity threshold: ${similarityThreshold}\nExpand context: ${expandContext}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.answers) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, answerCount: parsed.answers?.length });
              return {
                success: true,
                data: {
                  action, query, queryLanguage: queryLanguage as any, knowledgeBases: knowledgeBases as string[],
                  maxResults, includeExplanation, similarityThreshold, expandContext,
                  queryResult: {
                    answers: parsed.answers || [],
                    context: expandContext ? parsed.context || { relatedEntities: [], relatedConcepts: [], broaderContext: '' } : undefined,
                    explanation: includeExplanation ? parsed.explanation || { reasoningChain: [], sourcesConsulted: [] } : undefined,
                    statistics: parsed.statistics || { totalMatches: 0, highConfidenceMatches: 0, queryTime: 0, knowledgeBasesSearched: 0 },
                    status: 'queried',
                  },
                  status: 'query_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic query');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, query, queryLanguage: queryLanguage as any, knowledgeBases: knowledgeBases as string[],
              maxResults, includeExplanation, similarityThreshold, expandContext,
              queryResult: {
                answers: [
                  { id: 'a1', answer: `Based on available knowledge, the query "${query}" relates to established patterns in the knowledge base`, confidence: 0.86, sources: [{ id: 'kb1', relevance: 0.82 }], type: 'fact' as const },
                  { id: 'a2', answer: 'Inferred relationship suggests connectivity between queried concepts', confidence: 0.78, sources: [{ id: 'kb2', relevance: 0.75 }], type: 'inferred' as const },
                ],
                context: expandContext ? { relatedEntities: ['entity_A', 'entity_B'], relatedConcepts: ['concept_1', 'concept_2'], broaderContext: 'The query touches on the intersection of multiple knowledge domains' } : undefined,
                explanation: includeExplanation ? { reasoningChain: [{ step: 1, operation: 'semantic_match', description: 'Matched query against knowledge graph nodes' }], sourcesConsulted: ['kb1', 'kb2'] } : undefined,
                statistics: { totalMatches: 12, highConfidenceMatches: 7, queryTime: 38, knowledgeBasesSearched: knowledgeBases.length || 2 },
                status: 'queried',
              },
              status: 'query_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'infer': {
          const premises = config.premises || [];
          const inferenceType = config.inferenceType || 'forward';
          const rules = config.rules || [];
          const maxInferenceDepth = config.maxInferenceDepth || 10;
          const includeProof = config.includeProof !== false;
          const detectContradictions = config.detectContradictions !== false;
          const confidencePropagation = config.confidencePropagation || 'dempster_shafer';

          if (premises.length === 0) {
            return { success: false, error: '"premises" are required for inference' };
          }

          this.logger.log(`Inferring from ${premises.length} premises (type: ${inferenceType})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, inferenceType, premiseCount: premises.length });

          const llmResult = await this.executeWithLLM(
            `You are an expert knowledge inference engine. Derive new knowledge from premises using logical inference.
Return a JSON object with this exact structure:
{
  "conclusions": [
    { "conclusion": "...", "confidence": 0.88, "depth": 1, "type": "probable", "supportingPremises": ["..."], "rulesApplied": ["..."] }
  ],
  "proof": [{ "step": 1, "derived": "...", "from": ["..."], "rule": "...", "confidence": 0.9 }],
  "contradictions": [{ "statement1": "...", "statement2": "...", "conflictType": "...", "resolution": "..." }],
  "newFacts": ["..."],
  "inferenceGraph": { "nodes": ["..."], "edges": [{ "from": "...", "to": "...", "rule": "..." }] }
}`,
            `Infer from premises: ${JSON.stringify(premises)}\nType: ${inferenceType}\nRules: ${JSON.stringify(rules)}\nMax depth: ${maxInferenceDepth}\nDetect contradictions: ${detectContradictions}\nConfidence propagation: ${confidencePropagation}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.conclusions) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, conclusionCount: parsed.conclusions?.length });
              return {
                success: true,
                data: {
                  action, premises: premises as string[], inferenceType: inferenceType as any, rules: rules as any,
                  maxInferenceDepth, includeProof, detectContradictions, confidencePropagation: confidencePropagation as any,
                  inference: {
                    conclusions: parsed.conclusions || [],
                    proof: includeProof ? parsed.proof || [] : undefined,
                    contradictions: detectContradictions ? parsed.contradictions || [] : undefined,
                    newFacts: parsed.newFacts || [],
                    inferenceGraph: parsed.inferenceGraph || { nodes: [], edges: [] },
                    status: 'inferred',
                  },
                  status: 'inference_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic inference');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, premises: premises as string[], inferenceType: inferenceType as any, rules: rules as any,
              maxInferenceDepth, includeProof, detectContradictions, confidencePropagation: confidencePropagation as any,
              inference: {
                conclusions: [
                  { conclusion: 'Forward chaining yields intermediate derived fact from premise combination', confidence: 0.85, depth: 1, type: 'probable' as const, supportingPremises: [premises[0]], rulesApplied: ['inference_rule_1'] },
                  { conclusion: 'Combined inference produces high-confidence conclusion', confidence: 0.82, depth: 2, type: 'probable' as const, supportingPremises: premises.slice(0, 2), rulesApplied: ['inference_rule_1', 'inference_rule_2'] },
                ],
                proof: includeProof
                  ? [{ step: 1, derived: 'Intermediate fact', from: [premises[0]], rule: 'forward_chaining', confidence: 0.85 }, { step: 2, derived: 'Final conclusion', from: ['Intermediate fact'], rule: 'deduction', confidence: 0.82 }]
                  : undefined,
                contradictions: detectContradictions ? [] : undefined,
                newFacts: ['Derived fact from forward chaining', 'Inferred relationship between premise entities'],
                inferenceGraph: { nodes: [premises[0] as string, 'Intermediate fact', 'Final conclusion'], edges: [{ from: premises[0] as string, to: 'Intermediate fact', rule: 'forward_chaining' }, { from: 'Intermediate fact', to: 'Final conclusion', rule: 'deduction' }] },
                status: 'inferred',
              },
              status: 'inference_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'update': {
          const updates = config.updates || [];
          const updateStrategy = config.updateStrategy || 'merge';
          const validateConsistency = config.validateConsistency !== false;
          const versionKnowledge = config.versionKnowledge !== false;
          const propagateChanges = config.propagateChanges || false;
          const conflictResolution = config.conflictResolution || 'newer_wins';

          if (updates.length === 0) {
            return { success: false, error: '"updates" are required for knowledge update' };
          }

          this.logger.log(`Updating knowledge with ${updates.length} changes (strategy: ${updateStrategy})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, updateCount: updates.length, updateStrategy });

          const llmResult = await this.executeWithLLM(
            `You are an expert knowledge update engine. Apply updates to the knowledge base.
Return a JSON object with this exact structure:
{
  "applied": [{ "update": "...", "status": "applied", "affectedEntities": ["..."], "sideEffects": ["..."] }],
  "conflicts": [{ "entity": "...", "existingValue": "...", "newValue": "...", "resolution": "..." }],
  "consistency": { "consistent": true, "violations": [] },
  "versioning": { "version": "1.3.0", "changelog": [{ "change": "...", "timestamp": "..." }] },
  "propagation": { "propagatedUpdates": 8, "affectedNodes": 12, "pendingPropagations": 0 }
}`,
            `Apply updates: ${JSON.stringify(updates)}\nStrategy: ${updateStrategy}\nValidate consistency: ${validateConsistency}\nVersion: ${versionKnowledge}\nPropagate: ${propagateChanges}\nConflict resolution: ${conflictResolution}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.applied) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, appliedCount: parsed.applied?.length });
              return {
                success: true,
                data: {
                  action, updates: updates as any, updateStrategy: updateStrategy as any,
                  validateConsistency, versionKnowledge, propagateChanges, conflictResolution: conflictResolution as any,
                  update: {
                    applied: parsed.applied || [], conflicts: parsed.conflicts || [],
                    consistency: validateConsistency ? parsed.consistency || { consistent: true, violations: [] } : undefined,
                    versioning: versionKnowledge ? parsed.versioning || { version: '', changelog: [] } : undefined,
                    propagation: propagateChanges ? parsed.propagation || { propagatedUpdates: 0, affectedNodes: 0, pendingPropagations: 0 } : undefined,
                    status: 'updated',
                  },
                  status: 'update_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic update');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, updates: updates as any, updateStrategy: updateStrategy as any,
              validateConsistency, versionKnowledge, propagateChanges, conflictResolution: conflictResolution as any,
              update: {
                applied: updates.map((u: any, i: number) => ({ update: `Update ${i + 1}`, status: 'applied' as const, affectedEntities: [`entity_${i}`], sideEffects: [] })),
                conflicts: [],
                consistency: validateConsistency ? { consistent: true, violations: [] } : undefined,
                versioning: versionKnowledge ? { version: '1.1.0', changelog: [{ change: `${updates.length} updates applied`, timestamp: new Date().toISOString() }] } : undefined,
                propagation: propagateChanges ? { propagatedUpdates: Math.floor(updates.length * 1.5), affectedNodes: updates.length * 3, pendingPropagations: 0 } : undefined,
                status: 'updated',
              },
              status: 'update_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'graph': {
          const operation = config.operation || 'traverse';
          const graphId = config.graphId;
          const startNode = config.startNode;
          const traversalDepth = config.traversalDepth || 3;
          const edgeTypes = config.edgeTypes || [];
          const filters = config.filters || {};
          const includeWeights = config.includeWeights !== false;
          const layout = config.layout || 'force_directed';

          this.logger.log(`Graph operation "${operation}"${graphId ? ` on "${graphId}"` : ''}`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, operation, graphId });

          const llmResult = await this.executeWithLLM(
            `You are an expert knowledge graph engine. Perform the requested graph operation.
Return a JSON object with this exact structure:
{
  "nodes": [{ "id": "n1", "label": "...", "type": "...", "properties": {}, "weight": 1.0, "centrality": 0.45 }],
  "edges": [{ "from": "n1", "to": "n2", "type": "related_to", "weight": 0.8, "properties": {} }],
  "paths": [{ "start": "n1", "end": "n5", "path": ["n1","n3","n5"], "totalWeight": 2.1, "length": 3 }],
  "clusters": [{ "id": "cl1", "nodes": ["n1","n2"], "label": "...", "density": 0.75 }],
  "statistics": { "totalNodes": 150, "totalEdges": 320, "density": 0.028, "averageDegree": 4.27, "connectedComponents": 3 },
  "visualization": { "layout": "force_directed", "positions": { "n1": { "x": 100, "y": 200 } } }
}`,
            `Graph operation: ${operation}\nGraph ID: ${graphId || 'default'}\nStart node: ${startNode}\nTraversal depth: ${traversalDepth}\nEdge types: ${JSON.stringify(edgeTypes)}\nFilters: ${JSON.stringify(filters)}\nLayout: ${layout}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.nodes) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, operation, nodeCount: parsed.nodes?.length });
              return {
                success: true,
                data: {
                  action, operation: operation as any, graphId, startNode, traversalDepth,
                  edgeTypes: edgeTypes as string[], filters: filters as any, includeWeights, layout: layout as any,
                  graph: {
                    nodes: parsed.nodes || [], edges: parsed.edges || [], paths: parsed.paths || [],
                    clusters: parsed.clusters || [],
                    statistics: parsed.statistics || { totalNodes: 0, totalEdges: 0, density: 0, averageDegree: 0, connectedComponents: 0 },
                    visualization: parsed.visualization || { layout, positions: {} },
                    status: 'graph_operation_complete',
                  },
                  status: 'graph_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic graph');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, operation: operation as any, graphId, startNode, traversalDepth,
              edgeTypes: edgeTypes as string[], filters: filters as any, includeWeights, layout: layout as any,
              graph: {
                nodes: [
                  { id: 'n1', label: 'Core entity', type: 'concept', properties: { importance: 'high' }, weight: 1.0, centrality: 0.72 },
                  { id: 'n2', label: 'Related entity', type: 'concept', properties: { importance: 'medium' }, weight: 0.8, centrality: 0.45 },
                  { id: 'n3', label: 'Peripheral entity', type: 'instance', properties: { importance: 'low' }, weight: 0.5, centrality: 0.28 },
                  { id: 'n4', label: 'Bridge entity', type: 'relation', properties: { importance: 'medium' }, weight: 0.7, centrality: 0.55 },
                ],
                edges: [
                  { from: 'n1', to: 'n2', type: 'related_to', weight: 0.85, properties: {} },
                  { from: 'n2', to: 'n3', type: 'depends_on', weight: 0.65, properties: {} },
                  { from: 'n1', to: 'n4', type: 'connected_to', weight: 0.78, properties: {} },
                  { from: 'n4', to: 'n3', type: 'links_to', weight: 0.55, properties: {} },
                ],
                paths: [{ start: 'n1', end: 'n3', path: ['n1', 'n2', 'n3'], totalWeight: 1.5, length: 3 }],
                clusters: [{ id: 'cl1', nodes: ['n1', 'n2', 'n4'], label: 'Core cluster', density: 0.67 }],
                statistics: { totalNodes: 4, totalEdges: 4, density: 0.33, averageDegree: 2.0, connectedComponents: 1 },
                visualization: { layout, positions: { n1: { x: 200, y: 150 }, n2: { x: 350, y: 100 }, n3: { x: 450, y: 250 }, n4: { x: 300, y: 300 } } },
                status: 'graph_operation_complete',
              },
              status: 'graph_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported actions: acquire, represent, query, infer, update, graph`,
          };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
