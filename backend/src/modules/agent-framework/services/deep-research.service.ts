/**
 * AENEWS Agent OS X — Deep Research Service
 *
 * Provides deep research capabilities using LLM for query generation,
 * source analysis, summarization, and synthesis.
 *
 * Research Pipeline:
 *   1. Query Analysis — Decompose the research question into sub-queries
 *   2. Source Gathering — Collect information from available sources
 *   3. Source Analysis — Read and summarize each source using LLM
 *   4. Synthesis — Combine findings into a coherent research report
 *   5. Citation — Track sources and provide structured citations
 *
 * Integration Points:
 *   - LLMService: For query generation, summarization, and synthesis
 *   - LLMCacheService: Cache research results to avoid redundant LLM calls
 *   - QdrantService: Store and retrieve research knowledge vectors
 *   - Web Search: Optional integration point for external search APIs
 *
 * When web search is not available, the service uses LLM's knowledge
 * as the primary source, clearly noting this limitation in results.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { LLMService } from '../../llm/llm.service';
import { LLMCacheService } from '../../llm/services/llm-cache.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { QdrantService } from '../../qdrant/qdrant.service';

// ─── Types ─────────────────────────────────────────────────────────

export interface ResearchQuery {
  /** The research question or topic */
  query: string;
  /** Maximum depth of research (1-5, default 3) */
  depth?: number;
  /** Maximum number of sources to analyze per sub-query */
  maxSourcesPerQuery?: number;
  /** Whether to use cached results when available (default true) */
  useCache?: boolean;
  /** Domain restrictions for source filtering */
  domainFilter?: string[];
  /** Time restriction for sources (e.g., 'last_week', 'last_month', 'last_year') */
  timeRestriction?: string;
  /** Output format preference */
  outputFormat?: 'report' | 'summary' | 'bullet_points' | 'structured';
}

export interface ResearchSource {
  /** Unique identifier for this source */
  id: string;
  /** Source title */
  title: string;
  /** Source content or excerpt */
  content: string;
  /** Source URL or reference */
  url?: string;
  /** Source type */
  type: 'llm_knowledge' | 'web' | 'knowledge_base' | 'cache' | 'vector_search';
  /** Relevance score (0-1) */
  relevanceScore: number;
  /** When the source was retrieved */
  retrievedAt: string;
  /** Summary of the source content */
  summary?: string;
}

export interface ResearchSubQuery {
  /** The sub-query text */
  query: string;
  /** Original query this was derived from */
  parentQuery: string;
  /** Rationale for this sub-query */
  rationale: string;
  /** Sources found for this sub-query */
  sources: ResearchSource[];
  /** Analysis of the sources */
  analysis?: string;
}

export interface ResearchCitation {
  /** Citation number (1-indexed) */
  number: number;
  /** Source being cited */
  source: ResearchSource;
  /** Specific claim supported by this citation */
  claim: string;
}

export interface ResearchResult {
  /** Original query */
  query: string;
  /** Research depth used */
  depth: number;
  /** Sub-queries generated */
  subQueries: ResearchSubQuery[];
  /** All sources collected */
  sources: ResearchSource[];
  /** Synthesized research report */
  report: string;
  /** Key findings */
  keyFindings: string[];
  /** Citations mapping claims to sources */
  citations: ResearchCitation[];
  /** Research confidence level (0-1) */
  confidence: number;
  /** Whether the research used real web search or LLM knowledge only */
  searchProvider: 'llm_knowledge' | 'web_search' | 'hybrid';
  /** Total tokens used for LLM calls */
  totalTokensUsed: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Timestamp */
  completedAt: string;
}

// ─── Service ───────────────────────────────────────────────────────

@Injectable()
export class DeepResearchService {
  private readonly logger = new Logger(DeepResearchService.name);

  /** Default research depth */
  private readonly DEFAULT_DEPTH = 3;

  /** Maximum number of sub-queries per depth level */
  private readonly MAX_SUB_QUERIES = 5;

  /** Maximum sources to analyze per sub-query */
  private readonly DEFAULT_MAX_SOURCES = 5;

  /** Qdrant collection for research knowledge */
  private readonly RESEARCH_COLLECTION = 'research_knowledge';

  constructor(
    private readonly llmService: LLMService,
    @Optional() private readonly cacheService?: LLMCacheService,
    @Optional() private readonly memoryService?: AgentMemoryService,
    @Optional() private readonly qdrantService?: QdrantService,
  ) {
    this.ensureCollection().catch(() => {
      this.logger.warn('Qdrant collection not available — vector search will be disabled for research');
    });
  }

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Conduct deep research on a topic.
   *
   * @param query - The research question or topic
   * @param depth - Research depth (1-5, default 3)
   * @param options - Additional research options
   * @returns Structured research result with report, findings, and citations
   */
  async research(
    query: string,
    depth: number = this.DEFAULT_DEPTH,
    options?: Partial<ResearchQuery>,
  ): Promise<ResearchResult> {
    const startTime = Date.now();
    const effectiveDepth = Math.min(Math.max(depth, 1), 5);

    this.logger.log(`Starting deep research: "${query}" (depth: ${effectiveDepth})`);

    // Check cache for existing research
    const cacheKey = `research:${query}:${effectiveDepth}:${options?.outputFormat || 'report'}`;
    if (this.cacheService && options?.useCache !== false) {
      const cached = this.cacheService.get<ResearchResult>(cacheKey);
      if (cached) {
        this.logger.log(`Returning cached research result for: "${query}"`);
        return cached;
      }
    }

    let totalTokensUsed = 0;

    try {
      // Step 1: Generate sub-queries from the research question
      const subQueries = await this.generateSubQueries(query, effectiveDepth);
      this.logger.log(`Generated ${subQueries.length} sub-queries for: "${query}"`);

      // Step 2: Gather sources for each sub-query
      const allSources: ResearchSource[] = [];
      for (const sq of subQueries) {
        const sources = await this.gatherSources(sq.query, options?.maxSourcesPerQuery);
        sq.sources = sources;
        allSources.push(...sources);
        this.logger.debug(`Found ${sources.length} sources for sub-query: "${sq.query}"`);
      }

      // Step 3: Analyze and summarize each source
      for (const sq of subQueries) {
        for (const source of sq.sources) {
          if (source.content && !source.summary) {
            const { summary, tokensUsed } = await this.summarizeSource(source);
            source.summary = summary;
            totalTokensUsed += tokensUsed;
          }
        }

        // Step 4: Analyze sub-query findings
        const { analysis, tokensUsed } = await this.analyzeSubQuery(sq);
        sq.analysis = analysis;
        totalTokensUsed += tokensUsed;
      }

      // Step 5: Synthesize into a coherent report
      const { report, keyFindings, citations, tokensUsed: synthTokens } = await this.synthesizeResearch(
        query,
        subQueries,
        allSources,
        options?.outputFormat,
      );
      totalTokensUsed += synthTokens;

      // Calculate confidence based on source quality and coverage
      const confidence = this.calculateConfidence(subQueries, allSources);

      // Determine search provider type
      const hasWebSources = allSources.some((s) => s.type === 'web');
      const hasLLMSources = allSources.some((s) => s.type === 'llm_knowledge');
      const searchProvider: ResearchResult['searchProvider'] =
        hasWebSources && hasLLMSources ? 'hybrid' : hasWebSources ? 'web_search' : 'llm_knowledge';

      const result: ResearchResult = {
        query,
        depth: effectiveDepth,
        subQueries,
        sources: allSources,
        report,
        keyFindings,
        citations,
        confidence,
        searchProvider,
        totalTokensUsed,
        durationMs: Date.now() - startTime,
        completedAt: new Date().toISOString(),
      };

      // Store in cache
      if (this.cacheService && options?.useCache !== false) {
        this.cacheService.set(cacheKey, result, 30 * 60 * 1000); // 30-minute TTL for research
      }

      // Store in agent memory for future reference
      if (this.memoryService) {
        await this.memoryService.store('deep-research', MemoryTier.LONG_TERM, `research:${query}`, result);
      }

      // Store source vectors in Qdrant for future semantic search
      await this.storeResearchVectors(query, allSources);

      this.logger.log(
        `Deep research completed: "${query}" — ${allSources.length} sources, ` +
          `confidence: ${(confidence * 100).toFixed(1)}%, duration: ${result.durationMs}ms`,
      );

      return result;
    } catch (error: any) {
      this.logger.error(`Deep research failed for "${query}": ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a brief summary of a topic without full research depth.
   */
  async quickSummary(query: string): Promise<string> {
    if (!this.llmService.isAnyAvailable()) {
      return 'LLM is not available — cannot generate research summary.';
    }

    const response = await this.llmService.chatWithSystem(
      'You are a research assistant. Provide a concise, factual summary of the given topic. ' +
        'Include key facts, figures, and context. Be objective and cite general knowledge.',
      `Provide a brief summary of: ${query}`,
      { temperature: 0.3, maxTokens: 1024 },
    );

    return response.content;
  }

  /**
   * Check if the deep research service is available.
   */
  isAvailable(): boolean {
    return this.llmService.isAnyAvailable();
  }

  // ─── Private Methods ───────────────────────────────────────────

  /**
   * Step 1: Generate sub-queries from the main research question.
   * Uses LLM to decompose the question into focused sub-queries.
   */
  private async generateSubQueries(
    query: string,
    depth: number,
  ): Promise<ResearchSubQuery[]> {
    const maxSubQueries = Math.min(this.MAX_SUB_QUERIES, depth * 2);

    const systemPrompt = `You are a research methodology expert. Given a research question, generate focused sub-queries that will help gather comprehensive information.

Each sub-query should:
- Address a specific aspect of the main question
- Be searchable and well-defined
- Cover different angles (factual, analytical, contextual)
- Progressively deepen understanding

Generate between 2 and ${maxSubQueries} sub-queries.

Respond with valid JSON only:
{
  "subQueries": [
    {
      "query": "the sub-query text",
      "rationale": "why this sub-query is important for the research"
    }
  ]
}`;

    const userMessage = `Research question: "${query}"
Research depth: ${depth}
Generate sub-queries to comprehensively research this topic.`;

    const response = await this.llmService.chatWithSystem(
      systemPrompt,
      userMessage,
      { responseFormat: 'json', temperature: 0.4, maxTokens: 2048 },
    );

    try {
      const parsed = JSON.parse(response.content);
      const subQueries: ResearchSubQuery[] = (parsed.subQueries || []).map(
        (sq: any, index: number) => ({
          query: sq.query || `Sub-query ${index + 1} for: ${query}`,
          parentQuery: query,
          rationale: sq.rationale || '',
          sources: [],
        }),
      );

      // Always include the original query as the first sub-query
      if (subQueries.length === 0 || subQueries[0].query !== query) {
        subQueries.unshift({
          query,
          parentQuery: query,
          rationale: 'Original research question',
          sources: [],
        });
      }

      return subQueries.slice(0, maxSubQueries);
    } catch {
      // Fallback: use the original query as the only sub-query
      return [
        {
          query,
          parentQuery: query,
          rationale: 'Original research question (LLM decomposition failed)',
          sources: [],
        },
      ];
    }
  }

  /**
   * Step 2: Gather sources for a sub-query.
   * Uses LLM knowledge as the primary source, with optional web search integration.
   */
  private async gatherSources(
    subQuery: string,
    maxSources?: number,
  ): Promise<ResearchSource[]> {
    const effectiveMax = maxSources || this.DEFAULT_MAX_SOURCES;
    const sources: ResearchSource[] = [];

    // Source 1: LLM Knowledge
    const llmSource = await this.gatherFromLLM(subQuery);
    if (llmSource) {
      sources.push(llmSource);
    }

    // Source 2: Vector search in Qdrant for previously stored knowledge
    const vectorSources = await this.gatherFromVectorSearch(subQuery);
    sources.push(...vectorSources);

    // Source 3: Check agent memory for relevant information
    const memorySources = await this.gatherFromMemory(subQuery);
    sources.push(...memorySources);

    // Deduplicate sources by content similarity (simple title-based dedup for now)
    const seenTitles = new Set<string>();
    const uniqueSources = sources.filter((s) => {
      const key = s.title.toLowerCase().trim();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    return uniqueSources.slice(0, effectiveMax);
  }

  /**
   * Gather information from LLM's training knowledge.
   */
  private async gatherFromLLM(subQuery: string): Promise<ResearchSource | null> {
    if (!this.llmService.isAnyAvailable()) return null;

    try {
      const response = await this.llmService.chatWithSystem(
        'You are a knowledge retrieval assistant. Provide comprehensive, factual information about the given topic. ' +
          'Include specific facts, figures, dates, names, and references where possible. ' +
          'Be thorough but concise. Present information in a structured format.',
        `Provide detailed information about: ${subQuery}`,
        { temperature: 0.2, maxTokens: 2048 },
      );

      return {
        id: `llm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: `LLM Knowledge: ${subQuery}`,
        content: response.content,
        type: 'llm_knowledge',
        relevanceScore: 0.9,
        retrievedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.warn(`Failed to gather LLM knowledge for "${subQuery}": ${error.message}`);
      return null;
    }
  }

  /**
   * Gather information from Qdrant vector search.
   */
  private async gatherFromVectorSearch(subQuery: string): Promise<ResearchSource[]> {
    if (!this.qdrantService) return [];

    try {
      // Use LLM to generate a simple embedding proxy (we'd need a real embedding model in production)
      // For now, we'll do a metadata-based search using the Qdrant payload filter
      const results = await this.qdrantService.search(
        this.RESEARCH_COLLECTION,
        [], // Empty vector — will need a real embedding model for proper vector search
        3,
        {
          should: [
            {
              key: 'query_keywords',
              match: { text: subQuery },
            },
          ],
        },
      );

      return results.map((r: any, index: number) => ({
        id: `vector-${r.id || index}`,
        title: r.payload?.title || `Vector Source: ${subQuery}`,
        content: r.payload?.content || r.payload?.value || '',
        type: 'vector_search' as const,
        relevanceScore: r.score ?? 0.5,
        retrievedAt: new Date().toISOString(),
      }));
    } catch (error: any) {
      this.logger.debug(`Vector search failed for "${subQuery}": ${error.message}`);
      return [];
    }
  }

  /**
   * Gather information from agent memory.
   */
  private async gatherFromMemory(subQuery: string): Promise<ResearchSource[]> {
    if (!this.memoryService) return [];

    try {
      // Search working and long-term memory for relevant information
      const results: ResearchSource[] = [];

      for (const tier of [MemoryTier.WORKING, MemoryTier.LONG_TERM]) {
        const data = await this.memoryService.retrieve(`research:${subQuery}`, tier);
        if (data) {
          results.push({
            id: `memory-${tier}-${Date.now()}`,
            title: `Previous Research: ${subQuery}`,
            content: typeof data === 'string' ? data : JSON.stringify(data),
            type: 'cache',
            relevanceScore: 0.7,
            retrievedAt: new Date().toISOString(),
          });
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  /**
   * Step 3: Summarize a source using LLM.
   */
  private async summarizeSource(
    source: ResearchSource,
  ): Promise<{ summary: string; tokensUsed: number }> {
    if (!this.llmService.isAnyAvailable()) {
      return {
        summary: source.content.slice(0, 500) + (source.content.length > 500 ? '...' : ''),
        tokensUsed: 0,
      };
    }

    try {
      const response = await this.llmService.chatWithSystem(
        'You are a research summarizer. Provide a concise summary of the following source content, ' +
          'highlighting key facts, findings, and conclusions. Be objective and factual.',
        `Summarize this source:\n\nTitle: ${source.title}\n\nContent:\n${source.content.slice(0, 4000)}`,
        { temperature: 0.2, maxTokens: 512 },
      );

      return {
        summary: response.content,
        tokensUsed: response.usage.totalTokens,
      };
    } catch {
      return {
        summary: source.content.slice(0, 300) + '...',
        tokensUsed: 0,
      };
    }
  }

  /**
   * Step 4: Analyze findings for a sub-query.
   */
  private async analyzeSubQuery(
    subQuery: ResearchSubQuery,
  ): Promise<{ analysis: string; tokensUsed: number }> {
    if (!this.llmService.isAnyAvailable()) {
      return {
        analysis: subQuery.sources.map((s) => s.summary || s.title).join('; '),
        tokensUsed: 0,
      };
    }

    const sourceSummaries = subQuery.sources
      .map((s, i) => `Source ${i + 1}: ${s.title}\n${s.summary || s.content.slice(0, 500)}`)
      .join('\n\n');

    try {
      const response = await this.llmService.chatWithSystem(
        'You are a research analyst. Analyze the provided source summaries and synthesize ' +
          'key findings relevant to the sub-query. Identify patterns, contradictions, and gaps.',
        `Sub-query: ${subQuery.query}\n\nSources:\n${sourceSummaries}`,
        { temperature: 0.3, maxTokens: 1024 },
      );

      return {
        analysis: response.content,
        tokensUsed: response.usage.totalTokens,
      };
    } catch {
      return {
        analysis: 'Analysis unavailable — LLM service error',
        tokensUsed: 0,
      };
    }
  }

  /**
   * Step 5: Synthesize all research into a coherent report.
   */
  private async synthesizeResearch(
    query: string,
    subQueries: ResearchSubQuery[],
    sources: ResearchSource[],
    outputFormat?: string,
  ): Promise<{
    report: string;
    keyFindings: string[];
    citations: ResearchCitation[];
    tokensUsed: number;
  }> {
    const formatInstruction = this.getFormatInstruction(outputFormat);

    const analyses = subQueries
      .map((sq, i) => `## Sub-query ${i + 1}: ${sq.query}\n${sq.analysis || 'No analysis available'}`)
      .join('\n\n');

    const systemPrompt = `You are a senior research synthesizer. Given multiple sub-query analyses, produce a comprehensive research report.

Requirements:
- Structure the report with clear sections
- Support claims with source references [Source N]
- Highlight key findings
- Note any contradictions or gaps in the research
- Assess overall confidence in the conclusions
- ${formatInstruction}

Respond with valid JSON only:
{
  "report": "the full research report in markdown format",
  "keyFindings": ["finding 1", "finding 2", ...],
  "citations": [
    { "sourceIndex": 0, "claim": "the specific claim supported" }
  ],
  "confidenceNote": "assessment of research reliability"
}`;

    const userMessage = `Research question: "${query}"

Sub-query analyses:
${analyses}

Available sources:
${sources.map((s, i) => `[Source ${i + 1}] ${s.title} (${s.type})`).join('\n')}

Synthesize a comprehensive research report.`;

    const response = await this.llmService.chatWithSystem(
      systemPrompt,
      userMessage,
      { responseFormat: 'json', temperature: 0.3, maxTokens: 4096 },
    );

    try {
      const parsed = JSON.parse(response.content);
      const citations: ResearchCitation[] = (parsed.citations || []).map(
        (c: any, i: number) => ({
          number: i + 1,
          source: sources[c.sourceIndex] || sources[0],
          claim: c.claim || '',
        }),
      );

      return {
        report: parsed.report || 'Research synthesis unavailable.',
        keyFindings: parsed.keyFindings || [],
        citations,
        tokensUsed: response.usage.totalTokens,
      };
    } catch {
      // Fallback: return the raw LLM response as the report
      return {
        report: response.content,
        keyFindings: [],
        citations: [],
        tokensUsed: response.usage.totalTokens,
      };
    }
  }

  /**
   * Calculate confidence score based on source quality and coverage.
   */
  private calculateConfidence(
    subQueries: ResearchSubQuery[],
    sources: ResearchSource[],
  ): number {
    let confidence = 0;

    // Factor 1: Number of sources (0-0.3)
    const sourceScore = Math.min(sources.length / 10, 1) * 0.3;
    confidence += sourceScore;

    // Factor 2: Source diversity (0-0.2)
    const sourceTypes = new Set(sources.map((s) => s.type));
    const diversityScore = (sourceTypes.size / 4) * 0.2;
    confidence += diversityScore;

    // Factor 3: Sub-query coverage (0-0.3)
    const analyzedQueries = subQueries.filter((sq) => sq.analysis).length;
    const coverageScore = subQueries.length > 0
      ? (analyzedQueries / subQueries.length) * 0.3
      : 0;
    confidence += coverageScore;

    // Factor 4: Source relevance (0-0.2)
    const avgRelevance = sources.length > 0
      ? sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length
      : 0;
    confidence += avgRelevance * 0.2;

    // Penalty: LLM-only sources are less reliable than web sources
    const llmOnlySources = sources.filter((s) => s.type === 'llm_knowledge').length;
    if (sources.length > 0 && llmOnlySources === sources.length) {
      confidence *= 0.7; // 30% penalty for LLM-only research
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Get format instruction based on output format preference.
   */
  private getFormatInstruction(format?: string): string {
    switch (format) {
      case 'summary':
        return 'Keep the report concise (2-3 paragraphs). Focus on the most important findings.';
      case 'bullet_points':
        return 'Present findings as bullet points. Each point should be a standalone finding with source reference.';
      case 'structured':
        return 'Use a structured format with: Executive Summary, Background, Findings, Analysis, Conclusions, and References sections.';
      default:
        return 'Use a comprehensive report format with sections, subsections, and source citations.';
    }
  }

  /**
   * Store research source vectors in Qdrant for future semantic search.
   */
  private async storeResearchVectors(
    query: string,
    sources: ResearchSource[],
  ): Promise<void> {
    if (!this.qdrantService) return;

    try {
      const points = sources
        .filter((s) => s.content && s.content.length > 50)
        .map((s) => ({
          id: s.id,
          // Placeholder: in production, use a real embedding model
          // For now, we store the content in the payload for keyword-based search
          vector: new Array(1536).fill(0).map(() => Math.random() * 0.01),
          payload: {
            query,
            title: s.title,
            content: s.content.slice(0, 2000),
            type: s.type,
            query_keywords: query.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
            storedAt: new Date().toISOString(),
          },
        }));

      if (points.length > 0) {
        await this.qdrantService.upsert(this.RESEARCH_COLLECTION, points);
      }
    } catch (error: any) {
      this.logger.debug(`Failed to store research vectors: ${error.message}`);
    }
  }

  /**
   * Ensure the Qdrant collection exists.
   */
  private async ensureCollection(): Promise<void> {
    if (!this.qdrantService) return;
    try {
      const exists = await this.qdrantService.collectionExists(this.RESEARCH_COLLECTION);
      if (!exists) {
        await this.qdrantService.createCollection(this.RESEARCH_COLLECTION, 1536);
        this.logger.log(`Created Qdrant collection: ${this.RESEARCH_COLLECTION}`);
      }
    } catch {
      this.logger.warn('Could not create Qdrant collection for research');
    }
  }
}
