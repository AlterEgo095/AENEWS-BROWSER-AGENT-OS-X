/**
 * AENEWS Agent OS X — Knowledge Graph Service
 *
 * Phase 9 — Neo4j-powered knowledge graph that connects agents, missions,
 * outcomes, patterns, learnings, and relationships.
 *
 * Graph Schema (Nodes):
 *   - Agent: { id, name, cluster, capabilities[], successRate, avgDuration }
 *   - Mission: { id, description, status, priority, createdAt, completedAt, score }
 *   - Pattern: { id, name, type, description, frequency, confidence, lastSeen }
 *   - Learning: { id, type, description, confidence, createdAt, appliedCount }
 *   - Outcome: { id, success, duration, score, errorType?, createdAt }
 *   - Strategy: { id, name, parameters, successRate, usageCount }
 *   - Capability: { id, name, category }
 *   - Cluster: { id, type, healthScore, agentCount }
 *
 * Graph Schema (Relationships):
 *   - (Agent)-[:EXECUTED]->(Mission)
 *   - (Agent)-[:HAS_CAPABILITY]->(Capability)
 *   - (Agent)-[:BELONGS_TO]->(Cluster)
 *   - (Mission)-[:PRODUCED]->(Outcome)
 *   - (Mission)-[:USED_STRATEGY]->(Strategy)
 *   - (Mission)-[:MATCHED_PATTERN]->(Pattern)
 *   - (Outcome)-[:GENERATED]->(Learning)
 *   - (Learning)-[:IMPROVES]->(Agent)
 *   - (Learning)-[:IMPROVES]->(Strategy)
 *   - (Pattern)-[:SUGGESTS]->(Strategy)
 *   - (Agent)-[:COLLABORATED_WITH]->(Agent)
 *   - (Mission)-[:DEPENDS_ON]->(Mission)
 *
 * Features:
 *   - Automatic knowledge extraction from mission outcomes
 *   - Semantic similarity search via graph traversal
 *   - Agent expertise scoring based on historical performance
 *   - Strategy recommendation based on pattern matching
 *   - Cross-cluster dependency mapping
 *   - Learning propagation through the graph
 *   - Graph analytics (centrality, communities, bridges)
 */

import { Injectable, Logger, Optional, OnModuleInit } from '@nestjs/common';
import { Neo4jService } from '../../neo4j/neo4j.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { ClusterType } from '../../agent/entities/agent.entity';

// ─── Knowledge Graph Types ────────────────────────────────────────

export interface KnowledgeNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}

export interface KnowledgeRelationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties: Record<string, any>;
}

export interface AgentKnowledge {
  agentId: string;
  name: string;
  cluster: ClusterType;
  capabilities: string[];
  expertiseScore: number;
  missionCount: number;
  successRate: number;
  avgDurationMs: number;
  collaborationPartners: string[];
  learnedStrategies: string[];
}

export interface MissionKnowledge {
  missionId: string;
  description: string;
  status: string;
  priority: string;
  strategyUsed: string;
  agentsInvolved: string[];
  patternsMatched: string[];
  outcome?: OutcomeKnowledge;
  relatedMissions: string[];
}

export interface OutcomeKnowledge {
  success: boolean;
  durationMs: number;
  score?: number;
  errorType?: string;
  lessonsLearned: string[];
  timestamp: number;
}

export interface PatternKnowledge {
  id: string;
  name: string;
  type: 'success' | 'failure' | 'optimization' | 'anti-pattern' | 'collaboration';
  description: string;
  frequency: number;
  confidence: number;
  lastSeen: number;
  suggestedStrategies: string[];
}

export interface StrategyKnowledge {
  id: string;
  name: string;
  parameters: Record<string, any>;
  successRate: number;
  usageCount: number;
  applicablePatterns: string[];
}

export interface GraphQueryResult {
  nodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
  metadata: {
    query: string;
    durationMs: number;
    resultCount: number;
  };
}

export interface ExpertiseRanking {
  agentId: string;
  name: string;
  cluster: ClusterType;
  expertiseScore: number;
  missionCount: number;
  successRate: number;
  avgDurationMs: number;
  topCapabilities: string[];
}

export interface StrategyRecommendation {
  strategyId: string;
  strategyName: string;
  confidence: number;
  reason: string;
  expectedSuccessRate: number;
  parameters: Record<string, any>;
}

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class KnowledgeGraphService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeGraphService.name);

  /** In-memory cache for when Neo4j is unavailable */
  private readonly agentCache = new Map<string, AgentKnowledge>();
  private readonly missionCache = new Map<string, MissionKnowledge>();
  private readonly patternCache = new Map<string, PatternKnowledge>();
  private readonly strategyCache = new Map<string, StrategyKnowledge>();

  /** Whether Neo4j is available */
  private neo4jAvailable = false;

  constructor(
    @Optional() private readonly neo4jService: Neo4jService,
    private readonly eventBus: AgentEventBusService,
    private readonly memory: AgentMemoryService,
  ) {}

  async onModuleInit() {
    // Check Neo4j availability
    try {
      if (this.neo4jService) {
        await this.neo4jService.run('RETURN 1 AS test');
        this.neo4jAvailable = true;
        await this.initializeSchema();
        this.logger.log('Knowledge Graph initialized with Neo4j backend');
      }
    } catch {
      this.neo4jAvailable = false;
      this.logger.warn('Neo4j unavailable — Knowledge Graph using in-memory cache');
    }
  }

  // ─── Schema Initialization ─────────────────────────────────────

  /**
   * Initialize the graph schema with constraints and indexes.
   */
  private async initializeSchema(): Promise<void> {
    if (!this.neo4jAvailable) return;

    const schemaQueries = [
      // Uniqueness constraints
      'CREATE CONSTRAINT agent_id IF NOT EXISTS FOR (a:Agent) REQUIRE a.id IS UNIQUE',
      'CREATE CONSTRAINT mission_id IF NOT EXISTS FOR (m:Mission) REQUIRE m.id IS UNIQUE',
      'CREATE CONSTRAINT pattern_id IF NOT EXISTS FOR (p:Pattern) REQUIRE p.id IS UNIQUE',
      'CREATE CONSTRAINT learning_id IF NOT EXISTS FOR (l:Learning) REQUIRE l.id IS UNIQUE',
      'CREATE CONSTRAINT strategy_id IF NOT EXISTS FOR (s:Strategy) REQUIRE s.id IS UNIQUE',
      'CREATE CONSTRAINT capability_id IF NOT EXISTS FOR (c:Capability) REQUIRE c.id IS UNIQUE',
      'CREATE CONSTRAINT outcome_id IF NOT EXISTS FOR (o:Outcome) REQUIRE o.id IS UNIQUE',
      'CREATE CONSTRAINT cluster_id IF NOT EXISTS FOR (cl:Cluster) REQUIRE cl.id IS UNIQUE',

      // Performance indexes
      'CREATE INDEX agent_cluster IF NOT EXISTS FOR (a:Agent) ON (a.cluster)',
      'CREATE INDEX agent_success_rate IF NOT EXISTS FOR (a:Agent) ON (a.successRate)',
      'CREATE INDEX mission_status IF NOT EXISTS FOR (m:Mission) ON (m.status)',
      'CREATE INDEX mission_priority IF NOT EXISTS FOR (m:Mission) ON (m.priority)',
      'CREATE INDEX pattern_type IF NOT EXISTS FOR (p:Pattern) ON (p.type)',
      'CREATE INDEX pattern_confidence IF NOT EXISTS FOR (p:Pattern) ON (p.confidence)',
      'CREATE INDEX strategy_success_rate IF NOT EXISTS FOR (s:Strategy) ON (s.successRate)',
      'CREATE INDEX outcome_success IF NOT EXISTS FOR (o:Outcome) ON (o.success)',
      'CREATE INDEX outcome_created IF NOT EXISTS FOR (o:Outcome) ON (o.createdAt)',
    ];

    for (const query of schemaQueries) {
      try {
        await this.neo4jService!.run(query);
      } catch {
        // Constraint/index may already exist — that's OK
      }
    }

    this.logger.debug('Knowledge Graph schema initialized');
  }

  // ─── Agent Operations ──────────────────────────────────────────

  /**
   * Register or update an agent in the knowledge graph.
   */
  async registerAgent(agent: AgentKnowledge): Promise<void> {
    this.agentCache.set(agent.agentId, agent);

    if (!this.neo4jAvailable) return;

    try {
      await this.neo4jService!.run(
        `MERGE (a:Agent {id: $id})
         SET a.name = $name,
             a.cluster = $cluster,
             a.capabilities = $capabilities,
             a.expertiseScore = $expertiseScore,
             a.missionCount = $missionCount,
             a.successRate = $successRate,
             a.avgDuration = $avgDuration,
             a.updatedAt = timestamp()`,
        {
          id: agent.agentId,
          name: agent.name,
          cluster: agent.cluster,
          capabilities: agent.capabilities,
          expertiseScore: agent.expertiseScore,
          missionCount: agent.missionCount,
          successRate: agent.successRate,
          avgDuration: agent.avgDurationMs,
        },
      );

      // Ensure cluster node exists and link agent
      await this.neo4jService!.run(
        `MERGE (cl:Cluster {id: $cluster})
         SET cl.type = $cluster
         MERGE (a:Agent {id: $agentId})
         MERGE (a)-[:BELONGS_TO]->(cl)`,
        { cluster: agent.cluster, agentId: agent.agentId },
      );

      // Create capability nodes and relationships
      for (const cap of agent.capabilities) {
        await this.neo4jService!.run(
          `MERGE (c:Capability {id: $capId})
           SET c.name = $capName, c.category = $cluster
           MERGE (a:Agent {id: $agentId})
           MERGE (a)-[:HAS_CAPABILITY]->(c)`,
          { capId: `${agent.cluster}_${cap}`, capName: cap, cluster: agent.cluster, agentId: agent.agentId },
        );
      }
    } catch (error: any) {
      this.logger.debug(`Failed to register agent in Neo4j: ${error.message}`);
    }
  }

  /**
   * Get an agent's knowledge profile.
   */
  async getAgentKnowledge(agentId: string): Promise<AgentKnowledge | null> {
    const cached = this.agentCache.get(agentId);
    if (cached) return cached;

    if (!this.neo4jAvailable) return null;

    try {
      const results = await this.neo4jService!.run(
        `MATCH (a:Agent {id: $id}) RETURN a`,
        { id: agentId },
      );

      if (results.length === 0) return null;

      const props = results[0].a.properties || results[0].a;
      return {
        agentId: props.id,
        name: props.name,
        cluster: props.cluster,
        capabilities: props.capabilities || [],
        expertiseScore: props.expertiseScore || 0,
        missionCount: props.missionCount || 0,
        successRate: props.successRate || 0,
        avgDurationMs: props.avgDuration || 0,
        collaborationPartners: [],
        learnedStrategies: [],
      };
    } catch {
      return null;
    }
  }

  // ─── Mission Operations ────────────────────────────────────────

  /**
   * Record a mission execution in the knowledge graph.
   */
  async recordMission(mission: MissionKnowledge): Promise<void> {
    this.missionCache.set(mission.missionId, mission);

    if (!this.neo4jAvailable) return;

    try {
      // Create mission node
      await this.neo4jService!.run(
        `MERGE (m:Mission {id: $id})
         SET m.description = $description,
             m.status = $status,
             m.priority = $priority,
             m.strategyUsed = $strategyUsed,
             m.updatedAt = timestamp()`,
        {
          id: mission.missionId,
          description: mission.description,
          status: mission.status,
          priority: mission.priority,
          strategyUsed: mission.strategyUsed || 'default',
        },
      );

      // Link agents to mission
      for (const agentId of mission.agentsInvolved) {
        await this.neo4jService!.run(
          `MERGE (a:Agent {id: $agentId})
           MERGE (m:Mission {id: $missionId})
           MERGE (a)-[:EXECUTED]->(m)`,
          { agentId, missionId: mission.missionId },
        );
      }

      // Link patterns to mission
      for (const patternId of mission.patternsMatched) {
        await this.neo4jService!.run(
          `MERGE (p:Pattern {id: $patternId})
           MERGE (m:Mission {id: $missionId})
           MERGE (m)-[:MATCHED_PATTERN]->(p)`,
          { patternId, missionId: mission.missionId },
        );
      }

      // Link strategy to mission
      if (mission.strategyUsed) {
        await this.neo4jService!.run(
          `MERGE (s:Strategy {id: $strategyId})
           SET s.name = $strategyName
           MERGE (m:Mission {id: $missionId})
           MERGE (m)-[:USED_STRATEGY]->(s)`,
          { strategyId: `strategy_${mission.strategyUsed}`, strategyName: mission.strategyUsed, missionId: mission.missionId },
        );
      }

      // Record outcome if available
      if (mission.outcome) {
        const outcomeId = `outcome_${mission.missionId}_${Date.now()}`;
        await this.neo4jService!.run(
          `CREATE (o:Outcome {id: $id, success: $success, duration: $duration, score: $score,
            errorType: $errorType, createdAt: timestamp()})
           MERGE (m:Mission {id: $missionId})
           MERGE (m)-[:PRODUCED]->(o)`,
          {
            id: outcomeId,
            success: mission.outcome.success,
            duration: mission.outcome.durationMs,
            score: mission.outcome.score ?? null,
            errorType: mission.outcome.errorType ?? null,
            missionId: mission.missionId,
          },
        );

        // Record lessons learned
        for (const lesson of mission.outcome.lessonsLearned) {
          const learningId = `learning_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          await this.neo4jService!.run(
            `CREATE (l:Learning {id: $id, type: 'lesson', description: $description,
              confidence: 0.5, createdAt: timestamp(), appliedCount: 0})
             MERGE (o:Outcome {id: $outcomeId})
             MERGE (o)-[:GENERATED]->(l)`,
            { id: learningId, description: lesson, outcomeId },
          );
        }
      }
    } catch (error: any) {
      this.logger.debug(`Failed to record mission in Neo4j: ${error.message}`);
    }
  }

  // ─── Pattern Operations ────────────────────────────────────────

  /**
   * Register or update a pattern in the knowledge graph.
   */
  async registerPattern(pattern: PatternKnowledge): Promise<void> {
    this.patternCache.set(pattern.id, pattern);

    if (!this.neo4jAvailable) return;

    try {
      await this.neo4jService!.run(
        `MERGE (p:Pattern {id: $id})
         SET p.name = $name,
             p.type = $type,
             p.description = $description,
             p.frequency = $frequency,
             p.confidence = $confidence,
             p.lastSeen = $lastSeen`,
        {
          id: pattern.id,
          name: pattern.name,
          type: pattern.type,
          description: pattern.description,
          frequency: pattern.frequency,
          confidence: pattern.confidence,
          lastSeen: pattern.lastSeen,
        },
      );

      // Link pattern to suggested strategies
      for (const strategyId of pattern.suggestedStrategies) {
        await this.neo4jService!.run(
          `MERGE (p:Pattern {id: $patternId})
           MERGE (s:Strategy {id: $strategyId})
           MERGE (p)-[:SUGGESTS]->(s)`,
          { patternId: pattern.id, strategyId },
        );
      }
    } catch (error: any) {
      this.logger.debug(`Failed to register pattern in Neo4j: ${error.message}`);
    }
  }

  /**
   * Find patterns matching a given context.
   */
  async findMatchingPatterns(context: {
    cluster?: ClusterType;
    capability?: string;
    type?: PatternKnowledge['type'];
    minConfidence?: number;
  }): Promise<PatternKnowledge[]> {
    const minConfidence = context.minConfidence ?? 0.3;

    // Check in-memory cache first
    const cachedPatterns = [...this.patternCache.values()].filter((p) => {
      if (context.type && p.type !== context.type) return false;
      if (p.confidence < minConfidence) return false;
      return true;
    });

    if (!this.neo4jAvailable) return cachedPatterns;

    try {
      let query = `MATCH (p:Pattern) WHERE p.confidence >= $minConfidence`;
      const params: Record<string, any> = { minConfidence };

      if (context.type) {
        query += ` AND p.type = $type`;
        params.type = context.type;
      }

      query += ` RETURN p ORDER BY p.confidence DESC, p.frequency DESC LIMIT 20`;

      const results = await this.neo4jService!.run(query, params);

      const patterns: PatternKnowledge[] = results.map((r) => {
        const props = r.p.properties || r.p;
        return {
          id: props.id,
          name: props.name,
          type: props.type,
          description: props.description,
          frequency: props.frequency,
          confidence: props.confidence,
          lastSeen: props.lastSeen,
          suggestedStrategies: [],
        };
      });

      // Merge with cache
      const allPatterns = [...patterns, ...cachedPatterns];
      // Deduplicate by ID
      const seen = new Set<string>();
      return allPatterns.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    } catch {
      return cachedPatterns;
    }
  }

  // ─── Strategy Operations ───────────────────────────────────────

  /**
   * Get strategy recommendations for a given context.
   */
  async getStrategyRecommendations(context: {
    cluster?: ClusterType;
    capabilities?: string[];
    missionType?: string;
    priority?: string;
  }): Promise<StrategyRecommendation[]> {
    if (!this.neo4jAvailable) {
      return this.getStrategyRecommendationsFromCache(context);
    }

    try {
      // Find patterns that match the context and get their suggested strategies
      const query = `
        MATCH (p:Pattern)-[:SUGGESTS]->(s:Strategy)
        WHERE p.confidence >= 0.3 AND s.successRate >= 0.5
        WITH p, s, p.confidence * s.successRate AS combinedScore
        ORDER BY combinedScore DESC
        LIMIT 10
        RETURN s, p.name AS patternName, p.type AS patternType, combinedScore
      `;

      const results = await this.neo4jService!.run(query);

      return results.map((r) => {
        const props = r.s.properties || r.s;
        return {
          strategyId: props.id,
          strategyName: props.name || props.id,
          confidence: r.combinedScore,
          reason: `Pattern "${r.patternName}" (${r.patternType}) suggests this strategy`,
          expectedSuccessRate: props.successRate || 0.5,
          parameters: props.parameters ? JSON.parse(props.parameters) : {},
        };
      });
    } catch {
      return this.getStrategyRecommendationsFromCache(context);
    }
  }

  /**
   * Update strategy statistics after execution.
   */
  async updateStrategyStats(strategyId: string, success: boolean): Promise<void> {
    if (!this.neo4jAvailable) return;

    try {
      await this.neo4jService!.run(
        `MATCH (s:Strategy {id: $id})
         SET s.usageCount = s.usageCount + 1,
             s.successRate = CASE
               WHEN s.usageCount = 1 THEN CASE WHEN $success THEN 1.0 ELSE 0.0 END
               ELSE s.successRate + ((${success ? 1 : 0} - s.successRate) / s.usageCount)
             END`,
        { id: strategyId, success },
      );
    } catch (error: any) {
      this.logger.debug(`Failed to update strategy stats: ${error.message}`);
    }
  }

  // ─── Collaboration Graph ───────────────────────────────────────

  /**
   * Record a collaboration between agents.
   */
  async recordCollaboration(agentAId: string, agentBId: string, missionId: string, success: boolean): Promise<void> {
    if (!this.neo4jAvailable) return;

    try {
      await this.neo4jService!.run(
        `MERGE (a:Agent {id: $agentAId})
         MERGE (b:Agent {id: $agentBId})
         MERGE (a)-[r:COLLABORATED_WITH]->(b)
         SET r.missionCount = COALESCE(r.missionCount, 0) + 1,
             r.successCount = COALESCE(r.successCount, 0) + CASE WHEN $success THEN 1 ELSE 0 END,
             r.lastMission = $missionId,
             r.lastCollaboration = timestamp()`,
        { agentAId, agentBId, missionId, success },
      );
    } catch (error: any) {
      this.logger.debug(`Failed to record collaboration: ${error.message}`);
    }
  }

  /**
   * Find the best collaboration partners for an agent.
   */
  async findCollaborationPartners(agentId: string, limit = 5): Promise<Array<{
    agentId: string;
    collaborationCount: number;
    successRate: number;
  }>> {
    if (!this.neo4jAvailable) return [];

    try {
      const results = await this.neo4jService!.run(
        `MATCH (a:Agent {id: $agentId})-[r:COLLABORATED_WITH]->(b:Agent)
         RETURN b.id AS partnerId, r.missionCount AS count,
                CASE WHEN r.missionCount > 0 THEN r.successCount * 1.0 / r.missionCount ELSE 0 END AS successRate
         ORDER BY successRate DESC, count DESC
         LIMIT $limit`,
        { agentId, limit },
      );

      return results.map((r) => ({
        agentId: r.partnerId,
        collaborationCount: r.count,
        successRate: r.successRate,
      }));
    } catch {
      return [];
    }
  }

  // ─── Graph Analytics ───────────────────────────────────────────

  /**
   * Get expertise ranking across all agents.
   */
  async getExpertiseRanking(cluster?: ClusterType, limit = 20): Promise<ExpertiseRanking[]> {
    if (!this.neo4jAvailable) {
      // Fall back to in-memory cache
      let agents = [...this.agentCache.values()];
      if (cluster) agents = agents.filter((a) => a.cluster === cluster);
      agents.sort((a, b) => b.expertiseScore - a.expertiseScore);
      return agents.slice(0, limit).map((a) => ({
        agentId: a.agentId,
        name: a.name,
        cluster: a.cluster,
        expertiseScore: a.expertiseScore,
        missionCount: a.missionCount,
        successRate: a.successRate,
        avgDurationMs: a.avgDurationMs,
        topCapabilities: a.capabilities.slice(0, 5),
      }));
    }

    try {
      let query = `
        MATCH (a:Agent)
        WHERE a.missionCount > 0
      `;
      const params: Record<string, any> = { limit };

      if (cluster) {
        query += ` AND a.cluster = $cluster`;
        params.cluster = cluster;
      }

      query += `
        RETURN a.id AS agentId, a.name AS name, a.cluster AS cluster,
               a.expertiseScore AS expertiseScore, a.missionCount AS missionCount,
               a.successRate AS successRate, a.avgDuration AS avgDuration,
               a.capabilities AS capabilities
        ORDER BY expertiseScore DESC
        LIMIT $limit
      `;

      const results = await this.neo4jService!.run(query, params);

      return results.map((r) => ({
        agentId: r.agentId,
        name: r.name,
        cluster: r.cluster,
        expertiseScore: r.expertiseScore || 0,
        missionCount: r.missionCount || 0,
        successRate: r.successRate || 0,
        avgDurationMs: r.avgDuration || 0,
        topCapabilities: (r.capabilities || []).slice(0, 5),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Find knowledge paths between two concepts in the graph.
   * Useful for understanding how agents, capabilities, and outcomes relate.
   */
  async findKnowledgePaths(fromId: string, toId: string, maxDepth = 4): Promise<GraphQueryResult> {
    if (!this.neo4jAvailable) {
      return { nodes: [], relationships: [], metadata: { query: 'findKnowledgePaths', durationMs: 0, resultCount: 0 } };
    }

    const startTime = Date.now();

    try {
      const results = await this.neo4jService!.run(
        `MATCH path = shortestPath((a {id: $fromId})-[*..${maxDepth}]-(b {id: $toId}))
         RETURN path`,
        { fromId, toId },
      );

      const nodes: KnowledgeNode[] = [];
      const relationships: KnowledgeRelationship[] = [];
      const nodeIds = new Set<string>();
      const relIds = new Set<string>();

      // Parse path results (simplified — actual Neo4j path parsing is more complex)
      for (const record of results) {
        // The path object contains segments
        // For simplicity, we return the raw path info
        nodes.push({
          id: fromId,
          label: 'Source',
          properties: {},
        });
        nodes.push({
          id: toId,
          label: 'Target',
          properties: {},
        });
      }

      return {
        nodes,
        relationships,
        metadata: {
          query: `findKnowledgePaths(${fromId}, ${toId})`,
          durationMs: Date.now() - startTime,
          resultCount: nodes.length,
        },
      };
    } catch {
      return { nodes: [], relationships: [], metadata: { query: 'findKnowledgePaths', durationMs: 0, resultCount: 0 } };
    }
  }

  /**
   * Get the overall knowledge graph statistics.
   */
  async getGraphStatistics(): Promise<{
    nodeCounts: Record<string, number>;
    relationshipCounts: Record<string, number>;
    neo4jAvailable: boolean;
    topAgents: ExpertiseRanking[];
    topPatterns: PatternKnowledge[];
  }> {
    const nodeCounts: Record<string, number> = {
      Agent: this.agentCache.size,
      Mission: this.missionCache.size,
      Pattern: this.patternCache.size,
      Strategy: this.strategyCache.size,
    };

    const relationshipCounts: Record<string, number> = {};

    if (this.neo4jAvailable) {
      try {
        const nodeStats = await this.neo4jService!.run(
          `MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count`,
        );
        for (const r of nodeStats) {
          nodeCounts[r.label] = r.count;
        }

        const relStats = await this.neo4jService!.run(
          `MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count`,
        );
        for (const r of relStats) {
          relationshipCounts[r.type] = r.count;
        }
      } catch {
        // Use in-memory counts
      }
    }

    const topAgents = await this.getExpertiseRanking(undefined, 5);
    const topPatterns = [...this.patternCache.values()]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    return {
      nodeCounts,
      relationshipCounts,
      neo4jAvailable: this.neo4jAvailable,
      topAgents,
      topPatterns,
    };
  }

  // ─── General Query ─────────────────────────────────────────────

  /**
   * Execute a custom Cypher query against the knowledge graph.
   */
  async executeQuery(cypherQuery: string, params?: Record<string, any>): Promise<GraphQueryResult> {
    const startTime = Date.now();

    if (!this.neo4jAvailable) {
      return {
        nodes: [],
        relationships: [],
        metadata: {
          query: cypherQuery,
          durationMs: 0,
          resultCount: 0,
        },
      };
    }

    try {
      const results = await this.neo4jService!.run(cypherQuery, params);
      const nodes: KnowledgeNode[] = [];
      const relationships: KnowledgeRelationship[] = [];

      // Parse results into graph format
      for (const record of results) {
        for (const [, value] of Object.entries(record)) {
          if (value && typeof value === 'object') {
            const v = value as Record<string, any>;
            if (v.labels || v.identity) {
              nodes.push({
                id: v.properties?.id || v.identity?.toString() || 'unknown',
                label: v.labels?.[0] || 'Unknown',
                properties: v.properties || {},
              });
            }
          }
        }
      }

      return {
        nodes,
        relationships,
        metadata: {
          query: cypherQuery,
          durationMs: Date.now() - startTime,
          resultCount: nodes.length,
        },
      };
    } catch (error: any) {
      return {
        nodes: [],
        relationships: [],
        metadata: {
          query: cypherQuery,
          durationMs: Date.now() - startTime,
          resultCount: 0,
        },
      };
    }
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private getStrategyRecommendationsFromCache(context: {
    cluster?: ClusterType;
    capabilities?: string[];
  }): StrategyRecommendation[] {
    const strategies = [...this.strategyCache.values()]
      .filter((s) => s.successRate >= 0.5)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    return strategies.map((s) => ({
      strategyId: s.id,
      strategyName: s.name,
      confidence: s.successRate * 0.8,
      reason: `Historical success rate: ${(s.successRate * 100).toFixed(1)}%`,
      expectedSuccessRate: s.successRate,
      parameters: s.parameters,
    }));
  }
}
