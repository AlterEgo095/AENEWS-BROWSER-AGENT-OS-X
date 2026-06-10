/**
 * AENEWS Agent OS X - RAG (Retrieval-Augmented Generation) Service
 * Combines all memory tiers for context-aware information retrieval.
 * Provides document ingestion with chunking, embedding generation,
 * vector search, knowledge graph integration, context assembly,
 * and relevance scoring.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IRAGService,
  RAGQuery,
  RAGResult,
  MemoryEntry,
  MemoryTier,
  MemoryEncoding,
  MemoryMetadata,
} from '../interfaces/agent-memory.interface';
import { WorkingMemoryService } from './working-memory.service';
import { SessionMemoryService } from './session-memory.service';
import { LongTermMemoryService } from './long-term-memory.service';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { VectorSearchService } from './vector-search.service';

// ─── Document Chunk ───────────────────────────────────────────────
interface DocumentChunk {
  id: string;
  content: string;
  index: number;
  startOffset: number;
  endOffset: number;
  metadata: Record<string, any>;
}

@Injectable()
export class RAGService implements IRAGService {
  private readonly logger = new Logger(RAGService.name);

  // Chunking configuration
  private static readonly DEFAULT_CHUNK_SIZE = 512;
  private static readonly DEFAULT_CHUNK_OVERLAP = 64;
  private static readonly MIN_CHUNK_SIZE = 64;

  constructor(
    private readonly workingMemory: WorkingMemoryService,
    private readonly sessionMemory: SessionMemoryService,
    private readonly longTermMemory: LongTermMemoryService,
    private readonly knowledgeGraph: KnowledgeGraphService,
    private readonly vectorSearch: VectorSearchService,
  ) {}

  /**
   * Query across all memory tiers and combine results.
   */
  async query(request: RAGQuery): Promise<RAGResult> {
    const startTime = Date.now();
    this.logger.log(
      `RAG query for agent ${request.agentId || 'global'}: "${request.query.substring(0, 100)}"`,
    );

    const tiers = request.tiers || [
      MemoryTier.WORKING,
      MemoryTier.SESSION,
      MemoryTier.LONG_TERM,
      MemoryTier.VECTOR,
    ];

    const sources: MemoryEntry[] = [];
    const contextParts: string[] = [];
    let totalTokensEstimate = 0;

    // ─── Working Memory ──────────────────────────────────────────
    if (tiers.includes(MemoryTier.WORKING) && request.agentId) {
      const workingResults = this.searchWorkingMemory(
        request.agentId,
        request.query,
      );
      sources.push(...workingResults);
      for (const entry of workingResults) {
        contextParts.push(`[Working Memory] ${entry.key}: ${JSON.stringify(entry.value)}`);
        totalTokensEstimate += this.estimateTokens(JSON.stringify(entry.value));
      }
    }

    // ─── Session Memory ──────────────────────────────────────────
    if (tiers.includes(MemoryTier.SESSION) && request.agentId && request.sessionId) {
      const sessionResults = await this.searchSessionMemory(
        request.agentId,
        request.sessionId,
        request.query,
      );
      sources.push(...sessionResults);
      for (const entry of sessionResults) {
        contextParts.push(`[Session Memory] ${entry.key}: ${JSON.stringify(entry.value)}`);
        totalTokensEstimate += this.estimateTokens(JSON.stringify(entry.value));
      }
    }

    // ─── Long-Term Memory ────────────────────────────────────────
    if (tiers.includes(MemoryTier.LONG_TERM)) {
      const longTermResults = await this.searchLongTermMemory(
        request.agentId,
        request.query,
        request.topK,
      );
      sources.push(...longTermResults);
      for (const entry of longTermResults) {
        contextParts.push(`[Long-Term Memory] ${entry.key}: ${JSON.stringify(entry.value)}`);
        totalTokensEstimate += this.estimateTokens(JSON.stringify(entry.value));
      }
    }

    // ─── Vector Search ───────────────────────────────────────────
    if (tiers.includes(MemoryTier.VECTOR)) {
      const vectorResults = await this.searchVectorMemory(
        request.query,
        request.topK,
        request.scoreThreshold,
      );
      for (const entry of vectorResults) {
        sources.push(entry);
        contextParts.push(`[Vector Search] ${JSON.stringify(entry.value)}`);
        totalTokensEstimate += this.estimateTokens(JSON.stringify(entry.value));
      }
    }

    // ─── Knowledge Graph ─────────────────────────────────────────
    if (tiers.includes(MemoryTier.KNOWLEDGE_GRAPH)) {
      const kgResults = await this.searchKnowledgeGraph(request.query);
      for (const node of kgResults.nodes) {
        const entry = this.nodeToMemoryEntry(node);
        sources.push(entry);
        contextParts.push(
          `[Knowledge Graph:${node.label}] ${JSON.stringify(node.properties)}`,
        );
        totalTokensEstimate += this.estimateTokens(JSON.stringify(node.properties));
      }
    }

    // ─── Compose Answer ──────────────────────────────────────────
    const topK = request.topK || 5;
    const topSources = this.rankAndSelectSources(sources, topK);
    const context = contextParts.join('\n\n');
    const answer = this.composeAnswer(request.query, topSources, request.includeContext ? context : undefined);
    const confidence = this.calculateConfidence(topSources);

    this.logger.log(
      `RAG query completed: ${sources.length} sources, ${topSources.length} selected in ${Date.now() - startTime}ms`,
    );

    return {
      answer,
      sources: topSources,
      confidence,
      context: request.includeContext ? context : undefined,
      tokensUsed: totalTokensEstimate,
    };
  }

  /**
   * Index a document into vector and long-term memory.
   * Splits the document into chunks, generates embeddings, and indexes each chunk.
   */
  async indexDocument(
    agentId: string,
    document: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const docId = uuidv4();

    // Chunk the document
    const chunks = this.chunkDocument(document, {
      docId,
      agentId,
      ...metadata,
    });

    this.logger.debug?.(`Indexing document ${docId}: ${chunks.length} chunks`);

    // Index each chunk
    for (const chunk of chunks) {
      const vector = this.vectorSearch.generateSimpleEmbedding(chunk.content);

      await this.vectorSearch.upsert(chunk.id, vector, {
        agentId,
        docId,
        content: chunk.content,
        chunkIndex: chunk.index,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        indexedAt: new Date().toISOString(),
        ...metadata,
      });
    }

    // Store document metadata in long-term memory
    await this.longTermMemory.store(agentId, `document:${docId}`, {
      content: document.substring(0, 1000), // Store first 1000 chars as summary
      docId,
      totalChunks: chunks.length,
      chunkSize: RAGService.DEFAULT_CHUNK_SIZE,
      metadata,
    }, {
      tags: ['document', 'indexed', 'rag'],
    });

    this.logger.log(`Indexed document ${docId} for agent ${agentId}: ${chunks.length} chunks`);
  }

  /**
   * Index a memory entry into the vector store.
   */
  async indexMemoryEntry(entry: MemoryEntry): Promise<void> {
    const text = typeof entry.value === 'string'
      ? entry.value
      : JSON.stringify(entry.value);

    const vector = this.vectorSearch.generateSimpleEmbedding(text);

    await this.vectorSearch.upsert(entry.id, vector, {
      agentId: entry.agentId,
      key: entry.key,
      tier: entry.tier,
      content: text.substring(0, 2000),
      indexedAt: new Date().toISOString(),
    });
  }

  // ─── Document Chunking ────────────────────────────────────────────

  /**
   * Split a document into overlapping chunks.
   */
  private chunkDocument(
    document: string,
    metadata: Record<string, any>,
    chunkSize: number = RAGService.DEFAULT_CHUNK_SIZE,
    overlap: number = RAGService.DEFAULT_CHUNK_OVERLAP,
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    if (document.length <= chunkSize) {
      chunks.push({
        id: uuidv4(),
        content: document,
        index: 0,
        startOffset: 0,
        endOffset: document.length,
        metadata,
      });
      return chunks;
    }

    let startOffset = 0;
    let chunkIndex = 0;

    while (startOffset < document.length) {
      let endOffset = Math.min(startOffset + chunkSize, document.length);

      // Try to break at sentence or word boundary
      if (endOffset < document.length) {
        const lastSentenceEnd = document.lastIndexOf('.', endOffset);
        const lastSpace = document.lastIndexOf(' ', endOffset);

        if (lastSentenceEnd > startOffset + RAGService.MIN_CHUNK_SIZE) {
          endOffset = lastSentenceEnd + 1;
        } else if (lastSpace > startOffset + RAGService.MIN_CHUNK_SIZE) {
          endOffset = lastSpace;
        }
      }

      const content = document.substring(startOffset, endOffset).trim();

      if (content.length > 0) {
        chunks.push({
          id: uuidv4(),
          content,
          index: chunkIndex,
          startOffset,
          endOffset,
          metadata: { ...metadata, chunkIndex },
        });
        chunkIndex++;
      }

      startOffset = endOffset - overlap;

      // Ensure forward progress
      if (startOffset <= (chunks.length > 1 ? chunks[chunks.length - 2].startOffset : -1)) {
        startOffset = endOffset;
      }
    }

    return chunks;
  }

  // ─── Private Search Methods ──────────────────────────────────────

  private searchWorkingMemory(agentId: string, query: string): MemoryEntry[] {
    const keys = this.workingMemory.getKeys(agentId);
    const results: MemoryEntry[] = [];
    const queryLower = query.toLowerCase();

    for (const key of keys) {
      const value = this.workingMemory.get(agentId, key);
      if (value !== null) {
        const valueStr = JSON.stringify(value).toLowerCase();
        const keyLower = key.toLowerCase();
        const relevance = this.calculateRelevance(queryLower, keyLower, valueStr);

        if (relevance > 0) {
          results.push({
            id: `working:${agentId}:${key}`,
            key,
            value,
            tier: MemoryTier.WORKING,
            agentId,
            metadata: {
              source: 'working_memory',
              confidence: relevance,
              tags: [],
              accessCount: 0,
              lastAccessedAt: new Date(),
              size: valueStr.length,
              encoding: MemoryEncoding.JSON,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    return results;
  }

  private async searchSessionMemory(
    agentId: string,
    sessionId: string,
    query: string,
  ): Promise<MemoryEntry[]> {
    const keys = await this.sessionMemory.getSessionKeys(agentId, sessionId);
    const results: MemoryEntry[] = [];
    const queryLower = query.toLowerCase();

    for (const key of keys) {
      const value = await this.sessionMemory.get(agentId, sessionId, key);
      if (value !== null) {
        const valueStr = JSON.stringify(value).toLowerCase();
        const keyLower = key.toLowerCase();
        const relevance = this.calculateRelevance(queryLower, keyLower, valueStr);

        if (relevance > 0) {
          results.push({
            id: `session:${agentId}:${sessionId}:${key}`,
            key,
            value,
            tier: MemoryTier.SESSION,
            agentId,
            sessionId,
            metadata: {
              source: 'session_memory',
              confidence: relevance,
              tags: [],
              accessCount: 0,
              lastAccessedAt: new Date(),
              size: valueStr.length,
              encoding: MemoryEncoding.JSON,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    return results;
  }

  private async searchLongTermMemory(
    agentId: string | undefined,
    query: string,
    topK?: number,
  ): Promise<MemoryEntry[]> {
    // First try full-text search
    const ftResult = await this.longTermMemory.fullTextSearch(query, {
      agentId,
      limit: topK || 10,
    });

    if (ftResult.entries.length > 0) {
      return ftResult.entries.map((entry) => {
        const e = entry as any;
        return {
          id: `longterm:${e.id}`,
          key: e.key,
          value: e.value,
          tier: MemoryTier.LONG_TERM,
          agentId: e.agentId,
          metadata: {
            source: 'long_term_memory',
            confidence: Math.max(0.5, e.confidence ?? 1.0),
            tags: e.tags ?? [],
            accessCount: e.accessCount ?? 0,
            lastAccessedAt: e.lastAccessedAt ?? new Date(),
            size: JSON.stringify(e.value).length,
            encoding: MemoryEncoding.JSON as any,
          },
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        };
      });
    }

    // Fallback to regular query with keyword matching
    const result = await this.longTermMemory.query({
      agentId,
      limit: topK || 10,
    });

    const queryLower = query.toLowerCase();
    const scored = result.entries
      .map((entry) => {
        const e = entry as any;
        const valueStr = JSON.stringify(e.value).toLowerCase();
        const keyLower = e.key.toLowerCase();
        const relevance = this.calculateRelevance(queryLower, keyLower, valueStr);
        return { entry: e, relevance };
      })
      .filter(({ relevance }) => relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, topK || 10);

    return scored.map(({ entry, relevance }) => ({
      id: `longterm:${entry.id}`,
      key: entry.key,
      value: entry.value,
      tier: MemoryTier.LONG_TERM,
      agentId: entry.agentId,
      metadata: {
        source: 'long_term_memory',
        confidence: Math.max(relevance, entry.confidence ?? 1.0),
        tags: entry.tags ?? [],
        accessCount: entry.accessCount ?? 0,
        lastAccessedAt: entry.lastAccessedAt ?? new Date(),
        size: JSON.stringify(entry.value).length,
        encoding: MemoryEncoding.JSON as any,
      },
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));
  }

  private async searchVectorMemory(
    query: string,
    topK?: number,
    scoreThreshold?: number,
  ): Promise<MemoryEntry[]> {
    const vector = this.vectorSearch.generateSimpleEmbedding(query);

    const result = await this.vectorSearch.search({
      vector,
      limit: topK || 5,
      scoreThreshold: scoreThreshold || 0.3,
    });

    return result.entries.map((entry) => ({
      id: `vector:${entry.id}`,
      key: entry.payload.key || entry.id,
      value: entry.payload,
      tier: MemoryTier.VECTOR,
      agentId: entry.payload.agentId,
      metadata: {
        source: 'vector_search',
        confidence: entry.score || 0.5,
        tags: [],
        accessCount: 0,
        lastAccessedAt: new Date(),
        size: JSON.stringify(entry.payload).length,
        encoding: MemoryEncoding.JSON,
      },
      createdAt: new Date(entry.payload.indexedAt || Date.now()),
      updatedAt: new Date(),
    }));
  }

  private async searchKnowledgeGraph(query: string): Promise<{ nodes: any[]; relationships: any[] }> {
    // Extract potential entity names from the query
    const words = query.split(/\s+/).filter((w) => w.length > 3);

    const allNodes: any[] = [];

    for (const word of words) {
      const result = await this.knowledgeGraph.query({
        properties: { name: word },
        limit: 5,
      });
      allNodes.push(...result.nodes);
    }

    // Also search by common labels
    const commonLabels = ['agent', 'task', 'document', 'knowledge', 'pattern'];
    for (const label of commonLabels) {
      if (query.toLowerCase().includes(label)) {
        const result = await this.knowledgeGraph.query({
          nodeLabel: label,
          limit: 5,
        });
        allNodes.push(...result.nodes);
      }
    }

    // Deduplicate
    const uniqueNodes = Array.from(
      new Map(allNodes.map((n) => [n.id, n])).values(),
    );

    return { nodes: uniqueNodes, relationships: [] };
  }

  // ─── Helper Methods ──────────────────────────────────────────────

  private nodeToMemoryEntry(node: any): MemoryEntry {
    return {
      id: `kg:${node.id}`,
      key: node.label,
      value: node.properties,
      tier: MemoryTier.KNOWLEDGE_GRAPH,
      agentId: node.properties?.agentId || 'unknown',
      metadata: {
        source: 'knowledge_graph',
        confidence: 0.7,
        tags: [node.label],
        accessCount: 0,
        lastAccessedAt: new Date(),
        size: JSON.stringify(node.properties).length,
        encoding: MemoryEncoding.JSON,
      },
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
  }

  private calculateRelevance(query: string, key: string, value: string): number {
    let score = 0;
    const queryWords = query.split(/\s+/).filter((w) => w.length > 2);

    for (const word of queryWords) {
      if (key.includes(word)) score += 0.3;
      if (value.includes(word)) score += 0.2;
    }

    // Exact match bonus
    if (key === query || value.includes(query)) {
      score += 0.5;
    }

    return Math.min(score, 1.0);
  }

  private rankAndSelectSources(sources: MemoryEntry[], topK: number): MemoryEntry[] {
    return sources
      .sort((a, b) => (b.metadata.confidence || 0) - (a.metadata.confidence || 0))
      .slice(0, topK);
  }

  private composeAnswer(
    query: string,
    sources: MemoryEntry[],
    context?: string,
  ): string {
    if (sources.length === 0) {
      return `No relevant information found for query: "${query}"`;
    }

    const parts: string[] = [];

    parts.push(`Based on ${sources.length} source(s) of information:`);

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const valueStr = typeof source.value === 'string'
        ? source.value
        : JSON.stringify(source.value, null, 2);

      parts.push(
        `\n[Source ${i + 1} - ${source.tier}] ${source.key}: ${valueStr.substring(0, 500)}`,
      );
    }

    if (context) {
      parts.push(`\n\nContext:\n${context.substring(0, 2000)}`);
    }

    return parts.join('');
  }

  private calculateConfidence(sources: MemoryEntry[]): number {
    if (sources.length === 0) return 0;

    const avgConfidence =
      sources.reduce((sum, s) => sum + (s.metadata.confidence || 0), 0) / sources.length;

    // Boost confidence with more sources (diminishing returns)
    const sourceBonus = Math.min(sources.length * 0.05, 0.2);

    return Math.min(avgConfidence + sourceBonus, 1.0);
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
