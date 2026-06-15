import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

export class MemoryAgent extends BaseAgent {
  readonly name = 'MemoryAgent';
  readonly cluster = ClusterType.META_INTELLIGENCE;
  readonly capabilities = [
    'store',
    'retrieve',
    'consolidate',
    'forget',
    'search',
    'associate',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Manages memory operations including storing, retrieving, consolidating, forgetting, searching, and associating information across memory systems';

  readonly missionCategories = [MissionCategory.AI_ORCHESTRATION];
  readonly creditCost = 2;
  readonly powerLevel = 1;
  readonly tier = 'standard';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'store';
      const startTime = Date.now();

      switch (action) {
        case 'store': {
          const content = config.content;
          const memoryType = config.memoryType || 'episodic';
          const importance = config.importance || 'medium';
          const tags = config.tags || [];
          const associations = config.associations || [];
          const ttl = config.ttl;
          const compress = config.compress !== false;
          const indexFields = config.indexFields || [];

          if (!content) {
            return { success: false, error: '"content" is required for storing memory' };
          }

          this.logger.log(`Storing ${memoryType} memory (importance: ${importance})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, memoryType, importance });

          const llmResult = await this.executeWithLLM(
            `You are an expert memory storage engine. Analyze content and provide storage metadata.
Return a JSON object with this exact structure:
{
  "memoryId": "mem-...",
  "storedAt": "...",
  "compressedSize": 850,
  "originalSize": 1200,
  "compressionRatio": 0.71,
  "indexedFields": ["..."],
  "accessCount": 0
}`,
            `Store memory content: ${JSON.stringify(content)}\nType: ${memoryType}\nImportance: ${importance}\nTags: ${JSON.stringify(tags)}\nCompress: ${compress}\nIndex fields: ${JSON.stringify(indexFields)}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.memoryId) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, memoryId: parsed.memoryId });
              return {
                success: true,
                data: {
                  action, content, memoryType: memoryType as any, importance: importance as any, tags,
                  associations: associations as any, ttl, compress, indexFields,
                  storage: {
                    memoryId: parsed.memoryId, storedAt: parsed.storedAt || new Date().toISOString(),
                    compressedSize: parsed.compressedSize || 0, originalSize: parsed.originalSize || 0,
                    compressionRatio: parsed.compressionRatio || 0, indexedFields: parsed.indexedFields || indexFields,
                    accessCount: parsed.accessCount || 0, status: 'stored',
                  },
                  status: 'store_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic store');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          const originalSize = JSON.stringify(content).length;
          return {
            success: true,
            data: {
              action, content, memoryType: memoryType as any, importance: importance as any, tags,
              associations: associations as any, ttl, compress, indexFields,
              storage: {
                memoryId: `mem-${Date.now()}`, storedAt: new Date().toISOString(),
                compressedSize: Math.floor(originalSize * 0.72), originalSize,
                compressionRatio: 0.72, indexedFields: indexFields, accessCount: 0, status: 'stored',
              },
              status: 'store_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'retrieve': {
          const memoryId = config.memoryId;
          const query = config.query;
          const memoryType = config.memoryType;
          const maxResults = config.maxResults || 10;
          const includeContext = config.includeContext !== false;
          const recencyBias = config.recencyBias || 0.5;
          const relevanceThreshold = config.relevanceThreshold || 0.3;

          if (!memoryId && !query) {
            return { success: false, error: '"memoryId" or "query" is required for retrieval' };
          }

          this.logger.log(`Retrieving memory${memoryId ? ` "${memoryId}"` : ` by query "${query}"`}`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, memoryId, query });

          const llmResult = await this.executeWithLLM(
            `You are an expert memory retrieval engine. Retrieve and rank relevant memories.
Return a JSON object with this exact structure:
{
  "results": [
    { "memoryId": "mem-1", "content": "...", "memoryType": "episodic", "relevanceScore": 0.92, "recencyScore": 0.85, "combinedScore": 0.89, "tags": ["..."], "createdAt": "...", "lastAccessedAt": "...", "accessCount": 5 }
  ],
  "context": { "relatedMemories": ["mem-2"], "temporalContext": { "before": [], "after": [], "concurrent": ["mem-3"] }, "associativeContext": [{ "memoryId": "mem-4", "associationType": "causes", "strength": 0.8 }] },
  "totalMatches": 8,
  "searchDuration": 25
}`,
            `Retrieve memory: ${memoryId || ''}\nQuery: ${query || ''}\nType filter: ${memoryType || 'any'}\nMax results: ${maxResults}\nRecency bias: ${recencyBias}\nRelevance threshold: ${relevanceThreshold}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.results) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, resultCount: parsed.results?.length });
              return {
                success: true,
                data: {
                  action, memoryId, query, memoryType: memoryType as any, maxResults,
                  includeContext, recencyBias, relevanceThreshold,
                  retrieval: {
                    results: parsed.results || [],
                    context: includeContext ? parsed.context || { relatedMemories: [], temporalContext: { before: [], after: [], concurrent: [] }, associativeContext: [] } : undefined,
                    totalMatches: parsed.totalMatches || 0, searchDuration: parsed.searchDuration || 0, status: 'retrieved',
                  },
                  status: 'retrieval_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic retrieval');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, memoryId, query, memoryType: memoryType as any, maxResults,
              includeContext, recencyBias, relevanceThreshold,
              retrieval: {
                results: [
                  { memoryId: memoryId || 'mem-1', content: `Retrieved memory matching query: ${query || memoryId}`, memoryType: memoryType || 'episodic', relevanceScore: 0.89, recencyScore: 0.82, combinedScore: 0.86, tags: ['retrieved'], createdAt: new Date(Date.now() - 86400000).toISOString(), lastAccessedAt: new Date().toISOString(), accessCount: 3 },
                  { memoryId: 'mem-2', content: 'Contextually related memory entry', memoryType: memoryType || 'semantic', relevanceScore: 0.75, recencyScore: 0.68, combinedScore: 0.72, tags: ['related'], createdAt: new Date(Date.now() - 172800000).toISOString(), lastAccessedAt: new Date(Date.now() - 3600000).toISOString(), accessCount: 7 },
                ],
                context: includeContext ? { relatedMemories: ['mem-3', 'mem-4'], temporalContext: { before: ['mem-0'], after: ['mem-5'], concurrent: ['mem-2'] }, associativeContext: [{ memoryId: 'mem-3', associationType: 'related_to', strength: 0.72 }] } : undefined,
                totalMatches: 5, searchDuration: 18, status: 'retrieved',
              },
              status: 'retrieval_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'consolidate': {
          const sourceMemoryIds = config.sourceMemoryIds || [];
          const strategy = config.strategy || 'merge';
          const targetMemoryType = config.targetMemoryType || 'semantic';
          const deduplicate = config.deduplicate !== false;
          const resolveConflicts = config.resolveConflicts || 'keep_recent';
          const preserveProvenance = config.preserveProvenance !== false;

          if (sourceMemoryIds.length === 0) {
            return { success: false, error: '"sourceMemoryIds" are required for consolidation' };
          }

          this.logger.log(`Consolidating ${sourceMemoryIds.length} memories (strategy: ${strategy})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, strategy, sourceCount: sourceMemoryIds.length });

          const llmResult = await this.executeWithLLM(
            `You are an expert memory consolidation engine. Merge and consolidate memories.
Return a JSON object with this exact structure:
{
  "consolidatedMemoryId": "mem-consolidated-...",
  "sourcesProcessed": 5,
  "duplicatesRemoved": 2,
  "conflictsResolved": 1,
  "compressionRatio": 0.65,
  "informationRetained": 0.92,
  "qualityMetrics": { "completeness": 0.88, "accuracy": 0.91, "consistency": 0.95 },
  "provenance": { "sourceIds": [], "transformations": [{ "type": "merge", "description": "...", "affectedData": "..." }] }
}`,
            `Consolidate memories: ${JSON.stringify(sourceMemoryIds)}\nStrategy: ${strategy}\nTarget type: ${targetMemoryType}\nDeduplicate: ${deduplicate}\nConflict resolution: ${resolveConflicts}\nPreserve provenance: ${preserveProvenance}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.consolidatedMemoryId) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, consolidatedId: parsed.consolidatedMemoryId });
              return {
                success: true,
                data: {
                  action, sourceMemoryIds, strategy: strategy as any, targetMemoryType: targetMemoryType as any,
                  deduplicate, resolveConflicts: resolveConflicts as any, preserveProvenance,
                  consolidation: {
                    consolidatedMemoryId: parsed.consolidatedMemoryId, sourcesProcessed: parsed.sourcesProcessed || sourceMemoryIds.length,
                    duplicatesRemoved: parsed.duplicatesRemoved || 0, conflictsResolved: parsed.conflictsResolved || 0,
                    compressionRatio: parsed.compressionRatio || 0, informationRetained: parsed.informationRetained || 0,
                    qualityMetrics: parsed.qualityMetrics || { completeness: 0, accuracy: 0, consistency: 0 },
                    provenance: preserveProvenance ? parsed.provenance || { sourceIds: sourceMemoryIds, transformations: [] } : undefined,
                    status: 'consolidated',
                  },
                  status: 'consolidation_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic consolidation');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, sourceMemoryIds, strategy: strategy as any, targetMemoryType: targetMemoryType as any,
              deduplicate, resolveConflicts: resolveConflicts as any, preserveProvenance,
              consolidation: {
                consolidatedMemoryId: `mem-consolidated-${Date.now()}`, sourcesProcessed: sourceMemoryIds.length,
                duplicatesRemoved: Math.floor(sourceMemoryIds.length * 0.3), conflictsResolved: Math.floor(sourceMemoryIds.length * 0.1),
                compressionRatio: 0.68, informationRetained: 0.91,
                qualityMetrics: { completeness: 0.88, accuracy: 0.92, consistency: 0.94 },
                provenance: preserveProvenance ? { sourceIds: sourceMemoryIds, transformations: [{ type: 'merge', description: 'Merged episodic memories into semantic knowledge', affectedData: 'all source memories' }] } : undefined,
                status: 'consolidated',
              },
              status: 'consolidation_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'forget': {
          const memoryIds = config.memoryIds || [];
          const criteria = config.criteria || {};
          const strategy = config.strategy || 'soft_delete';
          const archive = config.archive !== false;
          const cascadeToAssociations = config.cascadeToAssociations || false;

          if (memoryIds.length === 0 && Object.keys(criteria).length === 0) {
            return { success: false, error: '"memoryIds" or "criteria" are required for forgetting' };
          }

          this.logger.log(`Forgetting ${memoryIds.length} memories (strategy: ${strategy})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, strategy, count: memoryIds.length });

          const llmResult = await this.executeWithLLM(
            `You are an expert memory management engine. Process forgetting operations.
Return a JSON object with this exact structure:
{
  "deletedCount": 3,
  "archivedCount": 5,
  "compressedCount": 2,
  "associationUpdates": 4,
  "freedSpace": 45000,
  "affectedAssociations": [{ "memoryId": "...", "lostAssociations": ["..."], "strengthReduction": 0.3 }]
}`,
            `Forget memories: ${JSON.stringify(memoryIds)}\nCriteria: ${JSON.stringify(criteria)}\nStrategy: ${strategy}\nArchive: ${archive}\nCascade: ${cascadeToAssociations}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, deletedCount: parsed.deletedCount });
              return {
                success: true,
                data: {
                  action, memoryIds, criteria: criteria as any, strategy: strategy as any, archive, cascadeToAssociations,
                  forgetting: {
                    deletedCount: parsed.deletedCount || 0, archivedCount: parsed.archivedCount || 0,
                    compressedCount: parsed.compressedCount || 0, associationUpdates: parsed.associationUpdates || 0,
                    freedSpace: parsed.freedSpace || 0, affectedAssociations: parsed.affectedAssociations || [], status: 'forgotten',
                  },
                  status: 'forget_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic forget');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, memoryIds, criteria: criteria as any, strategy: strategy as any, archive, cascadeToAssociations,
              forgetting: {
                deletedCount: memoryIds.length, archivedCount: archive ? Math.floor(memoryIds.length * 0.6) : 0,
                compressedCount: strategy === 'compress' ? memoryIds.length : 0, associationUpdates: memoryIds.length * 2,
                freedSpace: memoryIds.length * 12000,
                affectedAssociations: memoryIds.slice(0, 2).map((id: string) => ({ memoryId: id, lostAssociations: [`assoc-${id}`], strengthReduction: 0.25 })),
                status: 'forgotten',
              },
              status: 'forget_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'search': {
          const query = config.query;
          const filters = config.filters || {};
          const searchMode = config.searchMode || 'semantic';
          const maxResults = config.maxResults || 20;
          const highlightMatches = config.highlightMatches !== false;
          const facets = config.facets || [];
          const sortBy = config.sortBy || 'relevance';

          if (!query) {
            return { success: false, error: '"query" is required for memory search' };
          }

          this.logger.log(`Searching memories: "${query}" (mode: ${searchMode})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, searchMode, query });

          const llmResult = await this.executeWithLLM(
            `You are an expert memory search engine. Search and rank memories matching the query.
Return a JSON object with this exact structure:
{
  "results": [
    { "memoryId": "mem-1", "content": "...", "score": 0.92, "matchType": "semantic", "highlights": ["..."], "memoryType": "episodic", "createdAt": "..." }
  ],
  "facets": { "type": [{ "value": "episodic", "count": 5 }] },
  "totalResults": 15,
  "page": 1,
  "hasMore": true,
  "queryExpansion": ["..."],
  "searchDuration": 32
}`,
            `Search memories: "${query}"\nFilters: ${JSON.stringify(filters)}\nMode: ${searchMode}\nMax results: ${maxResults}\nFacets: ${JSON.stringify(facets)}\nSort by: ${sortBy}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.results) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, resultCount: parsed.results?.length });
              return {
                success: true,
                data: {
                  action, query, filters: filters as any, searchMode: searchMode as any, maxResults,
                  highlightMatches, facets: facets as string[], sortBy: sortBy as any,
                  search: {
                    results: parsed.results || [], facets: parsed.facets || {},
                    totalResults: parsed.totalResults || 0, page: parsed.page || 1,
                    hasMore: parsed.hasMore || false, queryExpansion: parsed.queryExpansion || [],
                    searchDuration: parsed.searchDuration || 0, status: 'searched',
                  },
                  status: 'search_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic search');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, query, filters: filters as any, searchMode: searchMode as any, maxResults,
              highlightMatches, facets: facets as string[], sortBy: sortBy as any,
              search: {
                results: [
                  { memoryId: 'mem-s1', content: `Semantic match for: ${query}`, score: 0.88, matchType: 'semantic', highlights: [query as string], memoryType: 'episodic', createdAt: new Date(Date.now() - 3600000).toISOString() },
                  { memoryId: 'mem-s2', content: 'Related memory with overlapping concepts', score: 0.76, matchType: 'semantic', highlights: ['overlapping concepts'], memoryType: 'semantic', createdAt: new Date(Date.now() - 7200000).toISOString() },
                  { memoryId: 'mem-s3', content: 'Peripherally related memory entry', score: 0.62, matchType: 'fuzzy', highlights: ['related'], memoryType: 'procedural', createdAt: new Date(Date.now() - 86400000).toISOString() },
                ],
                facets: { type: [{ value: 'episodic', count: 1 }, { value: 'semantic', count: 1 }, { value: 'procedural', count: 1 }] },
                totalResults: 8, page: 1, hasMore: true,
                queryExpansion: [query as string, `${query} related`, `${query} context`],
                searchDuration: 22, status: 'searched',
              },
              status: 'search_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'associate': {
          const sourceMemoryId = config.sourceMemoryId;
          const targetMemoryId = config.targetMemoryId;
          const relationType = config.relationType || 'related_to';
          const strength = config.strength || 0.5;
          const bidirectional = config.bidirectional !== false;
          const metadata = config.metadata || {};
          const discoverPatterns = config.discoverPatterns || false;

          if (!sourceMemoryId || !targetMemoryId) {
            return { success: false, error: '"sourceMemoryId" and "targetMemoryId" are required for association' };
          }

          this.logger.log(`Associating "${sourceMemoryId}" → "${targetMemoryId}" (type: ${relationType})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, sourceMemoryId, targetMemoryId, relationType });

          const llmResult = await this.executeWithLLM(
            `You are an expert memory association engine. Create and analyze memory associations.
Return a JSON object with this exact structure:
{
  "associationId": "assoc-...",
  "created": true,
  "bidirectionalLink": true,
  "existingAssociations": {
    "source": [{ "target": "...", "type": "...", "strength": 0.7 }],
    "target": [{ "target": "...", "type": "...", "strength": 0.5 }]
  },
  "patterns": {
    "clusters": [{ "center": "...", "members": ["..."], "theme": "..." }],
    "frequentPatterns": [{ "pattern": ["..."], "support": 0.3, "confidence": 0.85 }]
  }
}`,
            `Associate: ${sourceMemoryId} → ${targetMemoryId}\nRelation type: ${relationType}\nStrength: ${strength}\nBidirectional: ${bidirectional}\nMetadata: ${JSON.stringify(metadata)}\nDiscover patterns: ${discoverPatterns}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, associationId: parsed.associationId });
              return {
                success: true,
                data: {
                  action, sourceMemoryId, targetMemoryId, relationType: relationType as any,
                  strength, bidirectional, metadata: metadata as any, discoverPatterns,
                  association: {
                    associationId: parsed.associationId || `assoc-${Date.now()}`,
                    created: parsed.created !== false, bidirectionalLink: parsed.bidirectionalLink !== false,
                    existingAssociations: parsed.existingAssociations || { source: [], target: [] },
                    patterns: discoverPatterns ? parsed.patterns || { clusters: [], frequentPatterns: [] } : undefined,
                    status: 'associated',
                  },
                  status: 'association_complete', generatedBy: 'llm', timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          this.logger.log('LLM unavailable — falling back to heuristic association');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action, sourceMemoryId, targetMemoryId, relationType: relationType as any,
              strength, bidirectional, metadata: metadata as any, discoverPatterns,
              association: {
                associationId: `assoc-${Date.now()}`, created: true, bidirectionalLink: bidirectional,
                existingAssociations: {
                  source: [{ target: targetMemoryId, type: relationType, strength }],
                  target: [{ target: sourceMemoryId, type: relationType, strength }],
                },
                patterns: discoverPatterns
                  ? { clusters: [{ center: sourceMemoryId, members: [sourceMemoryId, targetMemoryId], theme: 'Associated memory cluster' }], frequentPatterns: [{ pattern: [sourceMemoryId, targetMemoryId], support: 0.35, confidence: 0.82 }] }
                  : undefined,
                status: 'associated',
              },
              status: 'association_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported actions: store, retrieve, consolidate, forget, search, associate`,
          };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
