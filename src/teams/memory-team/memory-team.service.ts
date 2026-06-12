// ========== FILE: src/teams/memory-team/memory-team.service.ts ==========

/**
 * AENEWS Agent OS X - Memory Team Service
 * Orchestrates memory-related agents: RAG queries, store/retrieve,
 * context management, project state, user preferences, and summarization.
 * Maintains an in-memory store with mission-scoped namespaces and
 * simulated vector embeddings for RAG-style semantic search.
 */

import { Injectable, Logger } from '@nestjs/common';

// ─── Task & Result Interfaces ───────────────────────────────────────

export interface MemoryTask {
  id: string;
  capability:
    | 'rag_query'
    | 'store'
    | 'retrieve'
    | 'context'
    | 'project'
    | 'preferences'
    | 'summarize';
  params: Record<string, any>;
  missionId: string;
}

export interface MemoryResult {
  taskId: string;
  success: boolean;
  data?: any;
  context?: Record<string, any>;
  error?: string;
  durationMs: number;
}

// ─── Internal Types ─────────────────────────────────────────────────

interface MemoryEntry {
  key: string;
  value: any;
  missionId: string;
  namespace: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  tags: string[];
}

interface MissionContext {
  missionId: string;
  objective: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  createdAt: Date;
  entries: Map<string, MemoryEntry>;
  timeline: Array<{ event: string; timestamp: Date; data?: any }>;
  summary?: string;
}

interface ProjectState {
  projectId: string;
  name: string;
  status: 'planning' | 'in_progress' | 'review' | 'delivered';
  progress: number;
  milestones: Array<{ name: string; completed: boolean; dueDate?: Date }>;
  metadata: Record<string, any>;
  updatedAt: Date;
}

interface UserPreferences {
  userId: string;
  settings: Record<string, any>;
  notificationPreferences: Record<string, boolean>;
  uiPreferences: Record<string, any>;
  updatedAt: Date;
}

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class MemoryTeamService {
  private readonly logger = new Logger(MemoryTeamService.name);

  /** Mission-scoped memory stores */
  private readonly missions = new Map<string, MissionContext>();

  /** Project state store */
  private readonly projects = new Map<string, ProjectState>();

  /** User preferences store */
  private readonly userPreferences = new Map<string, UserPreferences>();

  /** Task execution log */
  private readonly taskLog = new Map<string, { task: MemoryTask; result: MemoryResult }>();

  /** Cumulative team metrics */
  private metrics = {
    totalTasks: 0,
    successfulTasks: 0,
    failedTasks: 0,
    totalDurationMs: 0,
    totalEntriesStored: 0,
    totalQueries: 0,
  };

  // ─── Dispatcher ───────────────────────────────────────────────────

  /**
   * Execute a memory team task by dispatching to the correct handler.
   */
  async execute(task: MemoryTask): Promise<MemoryResult> {
    const start = Date.now();
    this.logger.log(`Executing memory task [${task.capability}] for mission ${task.missionId}`);

    try {
      let result: MemoryResult;

      switch (task.capability) {
        case 'store':
          result = await this.store(
            task.missionId,
            task.params.key,
            task.params.value,
            task.params,
          );
          break;
        case 'retrieve':
          result = await this.retrieve(task.missionId, task.params.key);
          break;
        case 'rag_query':
          result = await this.query(task.missionId, task.params.query);
          break;
        case 'context':
          result = await this.getContext(task.missionId);
          break;
        case 'project':
          result = { taskId: '', success: true, data: await this.getProject(task.params.projectId), durationMs: 0 };
          result.durationMs = Date.now() - start;
          break;
        case 'preferences':
          result = { taskId: '', success: true, data: await this.getPreferences(task.params.userId), durationMs: 0 };
          result.durationMs = Date.now() - start;
          break;
        case 'summarize':
          result = await this.summarize(task.missionId);
          break;
        default:
          throw new Error(`Unknown memory capability: ${task.capability}`);
      }

      result.taskId = task.id;

      this.metrics.totalTasks++;
      this.metrics.successfulTasks++;
      this.metrics.totalDurationMs += result.durationMs;

      this.taskLog.set(task.id, { task, result });
      this.logger.log(
        `Memory task [${task.capability}] completed in ${result.durationMs}ms`,
      );
      return result;
    } catch (error) {
      const durationMs = Date.now() - start;
      const result: MemoryResult = {
        taskId: task.id,
        success: false,
        error: (error as Error).message,
        durationMs,
      };

      this.metrics.totalTasks++;
      this.metrics.failedTasks++;
      this.metrics.totalDurationMs += durationMs;

      this.taskLog.set(task.id, { task, result });
      this.logger.error(
        `Memory task [${task.capability}] failed: ${(error as Error).message}`,
      );
      return result;
    }
  }

  // ─── Capability Methods ───────────────────────────────────────────

  /**
   * Store a value in mission-scoped memory with optional metadata.
   * Generates a simulated embedding for later RAG queries.
   */
  async store(
    missionId: string,
    key: string,
    value: any,
    options?: { namespace?: string; tags?: string[]; ttlMs?: number },
  ): Promise<MemoryResult> {
    const start = Date.now();
    const namespace = options?.namespace || 'default';
    const tags = options?.tags || [];

    this.logger.log(`Storing key "${key}" in mission ${missionId} [${namespace}]`);

    const mission = this.ensureMission(missionId);

    // Generate simulated embedding for the value
    const embedding = this.generateEmbedding(
      typeof value === 'string' ? value : JSON.stringify(value),
    );

    const existing = mission.entries.get(key);
    const entry: MemoryEntry = {
      key,
      value,
      missionId,
      namespace,
      embedding,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
      accessCount: existing ? existing.accessCount + 1 : 0,
      tags: [...tags, namespace],
    };

    mission.entries.set(key, entry);
    mission.timeline.push({
      event: 'store',
      timestamp: new Date(),
      data: { key, namespace },
    });

    this.metrics.totalEntriesStored++;

    return {
      taskId: '',
      success: true,
      data: {
        key,
        namespace,
        stored: true,
        entryCount: mission.entries.size,
        embeddingDimensions: embedding.length,
      },
      durationMs: Date.now() - start,
    };
  }

  /**
   * Retrieve a value from mission-scoped memory by key.
   */
  async retrieve(missionId: string, key: string): Promise<MemoryResult> {
    const start = Date.now();

    this.logger.log(`Retrieving key "${key}" from mission ${missionId}`);

    const mission = this.missions.get(missionId);
    if (!mission) {
      return {
        taskId: '',
        success: false,
        error: `Mission ${missionId} not found`,
        durationMs: Date.now() - start,
      };
    }

    const entry = mission.entries.get(key);
    if (!entry) {
      return {
        taskId: '',
        success: false,
        error: `Key "${key}" not found in mission ${missionId}`,
        durationMs: Date.now() - start,
      };
    }

    // Update access metadata
    entry.accessCount++;
    entry.updatedAt = new Date();
    mission.timeline.push({
      event: 'retrieve',
      timestamp: new Date(),
      data: { key },
    });

    return {
      taskId: '',
      success: true,
      data: entry.value,
      context: {
        key: entry.key,
        namespace: entry.namespace,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        accessCount: entry.accessCount,
        tags: entry.tags,
      },
      durationMs: Date.now() - start,
    };
  }

  /**
   * Perform a RAG-style semantic query across mission data.
   * Uses cosine similarity on simulated embeddings to rank results.
   */
  async query(missionId: string, query: string): Promise<MemoryResult> {
    const start = Date.now();

    this.logger.log(`RAG query on mission ${missionId}: "${query}"`);

    const mission = this.missions.get(missionId);
    if (!mission) {
      return {
        taskId: '',
        success: false,
        error: `Mission ${missionId} not found`,
        durationMs: Date.now() - start,
      };
    }

    // Simulate embedding computation for the query
    await this.sleep(50 + Math.random() * 100); // Simulate inference time
    const queryEmbedding = this.generateEmbedding(query);

    // Score all entries by cosine similarity
    const scored = Array.from(mission.entries.values())
      .map((entry) => ({
        entry,
        score: this.cosineSimilarity(queryEmbedding, entry.embedding),
      }))
      .sort((a, b) => b.score - a.score);

    const topK = 5;
    const results = scored.slice(0, topK).map((s) => ({
      key: s.entry.key,
      value: s.entry.value,
      score: Math.round(s.score * 1000) / 1000,
      namespace: s.entry.namespace,
      tags: s.entry.tags,
    }));

    this.metrics.totalQueries++;
    mission.timeline.push({
      event: 'rag_query',
      timestamp: new Date(),
      data: { query, resultsCount: results.length },
    });

    return {
      taskId: '',
      success: true,
      data: {
        query,
        resultsCount: results.length,
        totalEntries: mission.entries.size,
        results,
      },
      context: {
        missionId,
        embeddingDimensions: queryEmbedding.length,
        topK,
        scoringMethod: 'cosine_similarity',
      },
      durationMs: Date.now() - start,
    };
  }

  /**
   * Get the full context for a mission, including all stored entries
   * and timeline events.
   */
  async getContext(missionId: string): Promise<MemoryResult> {
    const start = Date.now();

    this.logger.log(`Getting context for mission ${missionId}`);

    const mission = this.missions.get(missionId);
    if (!mission) {
      return {
        taskId: '',
        success: false,
        error: `Mission ${missionId} not found`,
        durationMs: Date.now() - start,
      };
    }

    // Build namespace summary
    const namespaces: Record<string, number> = {};
    const entriesByNamespace: Record<string, string[]> = {};

    for (const [key, entry] of mission.entries) {
      const ns = entry.namespace;
      namespaces[ns] = (namespaces[ns] || 0) + 1;
      if (!entriesByNamespace[ns]) entriesByNamespace[ns] = [];
      entriesByNamespace[ns].push(key);
    }

    const context: Record<string, any> = {
      missionId,
      objective: mission.objective,
      status: mission.status,
      createdAt: mission.createdAt,
      totalEntries: mission.entries.size,
      namespaces,
      entriesByNamespace,
      timelineEventCount: mission.timeline.length,
      recentTimeline: mission.timeline.slice(-10),
      summary: mission.summary || null,
    };

    return {
      taskId: '',
      success: true,
      data: context,
      context,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Get project state by project ID.
   */
  async getProject(projectId: string): Promise<ProjectState | null> {
    this.logger.log(`Getting project state: ${projectId}`);

    const project = this.projects.get(projectId);
    if (!project) {
      // Return a simulated project if not found
      return this.ensureProject(projectId);
    }
    return project;
  }

  /**
   * Get user preferences by user ID.
   */
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    this.logger.log(`Getting preferences for user: ${userId}`);

    const prefs = this.userPreferences.get(userId);
    if (!prefs) {
      return this.ensureUserPreferences(userId);
    }
    return prefs;
  }

  /**
   * Summarize mission history by analyzing stored entries and timeline.
   */
  async summarize(missionId: string): Promise<MemoryResult> {
    const start = Date.now();

    this.logger.log(`Summarizing mission ${missionId}`);

    const mission = this.missions.get(missionId);
    if (!mission) {
      return {
        taskId: '',
        success: false,
        error: `Mission ${missionId} not found`,
        durationMs: Date.now() - start,
      };
    }

    // Simulate LLM summarization latency
    await this.sleep(300 + Math.random() * 500);

    // Build summary from mission data
    const entrySummaries = Array.from(mission.entries.values()).map((entry) => ({
      key: entry.key,
      type: typeof entry.value,
      namespace: entry.namespace,
      accessCount: entry.accessCount,
      ageHours: Math.round((Date.now() - entry.createdAt.getTime()) / 3600000),
    }));

    const storeEvents = mission.timeline.filter((e) => e.event === 'store').length;
    const retrieveEvents = mission.timeline.filter((e) => e.event === 'retrieve').length;
    const queryEvents = mission.timeline.filter((e) => e.event === 'rag_query').length;

    const summary = [
      `Mission "${missionId}" is currently ${mission.status}.`,
      `It contains ${mission.entries.size} stored entries across ${new Set(entrySummaries.map((e) => e.namespace)).size} namespaces.`,
      `${storeEvents} store operations, ${retrieveEvents} retrievals, and ${queryEvents} RAG queries have been performed.`,
      `The most accessed entry has been accessed ${Math.max(...entrySummaries.map((e) => e.accessCount), 0)} times.`,
      `Timeline spans ${mission.timeline.length} events from ${mission.createdAt.toISOString()} to now.`,
    ].join(' ');

    mission.summary = summary;
    mission.timeline.push({
      event: 'summarize',
      timestamp: new Date(),
    });

    return {
      taskId: '',
      success: true,
      data: {
        summary,
        entryCount: mission.entries.size,
        timelineEventCount: mission.timeline.length,
        entrySummaries,
        storeOperations: storeEvents,
        retrieveOperations: retrieveEvents,
        queryOperations: queryEvents,
      },
      context: {
        missionId,
        status: mission.status,
        totalEntries: mission.entries.size,
      },
      durationMs: Date.now() - start,
    };
  }

  // ─── Status ───────────────────────────────────────────────────────

  /**
   * Get the current status of the Memory Team.
   */
  getStatus(): {
    team: string;
    activeMissions: number;
    activeProjects: number;
    registeredUsers: number;
    tasksCompleted: number;
    tasksFailed: number;
    totalEntriesStored: number;
    totalQueries: number;
    avgDurationMs: number;
    missions: Array<{
      missionId: string;
      status: string;
      entryCount: number;
      timelineEventCount: number;
      lastActivity: Date;
    }>;
  } {
    const missionSummaries = Array.from(this.missions.entries()).map(
      ([missionId, mission]) => ({
        missionId,
        status: mission.status,
        entryCount: mission.entries.size,
        timelineEventCount: mission.timeline.length,
        lastActivity:
          mission.timeline.length > 0
            ? mission.timeline[mission.timeline.length - 1].timestamp
            : mission.createdAt,
      }),
    );

    return {
      team: 'memory',
      activeMissions: this.missions.size,
      activeProjects: this.projects.size,
      registeredUsers: this.userPreferences.size,
      tasksCompleted: this.metrics.successfulTasks,
      tasksFailed: this.metrics.failedTasks,
      totalEntriesStored: this.metrics.totalEntriesStored,
      totalQueries: this.metrics.totalQueries,
      avgDurationMs:
        this.metrics.totalTasks > 0
          ? Math.round(this.metrics.totalDurationMs / this.metrics.totalTasks)
          : 0,
      missions: missionSummaries,
    };
  }

  // ─── Mission Management ───────────────────────────────────────────

  private ensureMission(missionId: string): MissionContext {
    let mission = this.missions.get(missionId);
    if (!mission) {
      mission = {
        missionId,
        objective: '',
        status: 'active',
        createdAt: new Date(),
        entries: new Map(),
        timeline: [],
      };
      this.missions.set(missionId, mission);
      this.logger.log(`Created memory context for mission ${missionId}`);
    }
    return mission;
  }

  private ensureProject(projectId: string): ProjectState {
    let project = this.projects.get(projectId);
    if (!project) {
      project = {
        projectId,
        name: `Project-${projectId.slice(0, 8)}`,
        status: 'planning',
        progress: 0,
        milestones: [
          { name: 'Requirements', completed: false },
          { name: 'Design', completed: false },
          { name: 'Implementation', completed: false },
          { name: 'Testing', completed: false },
          { name: 'Deployment', completed: false },
        ],
        metadata: {},
        updatedAt: new Date(),
      };
      this.projects.set(projectId, project);
      this.logger.log(`Created project state for ${projectId}`);
    }
    return project;
  }

  private ensureUserPreferences(userId: string): UserPreferences {
    let prefs = this.userPreferences.get(userId);
    if (!prefs) {
      prefs = {
        userId,
        settings: {
          language: 'en',
          timezone: 'UTC',
          theme: 'dark',
        },
        notificationPreferences: {
          email: true,
          push: true,
          slack: false,
          sms: false,
        },
        uiPreferences: {
          compactMode: false,
          sidebarCollapsed: false,
          defaultView: 'dashboard',
        },
        updatedAt: new Date(),
      };
      this.userPreferences.set(userId, prefs);
      this.logger.log(`Created default preferences for user ${userId}`);
    }
    return prefs;
  }

  // ─── Vector Simulation Helpers ────────────────────────────────────

  /**
   * Generate a deterministic pseudo-embedding for a string.
   * In production, this would call an actual embedding model.
   */
  private generateEmbedding(text: string): number[] {
    const dimensions = 128;
    const embedding: number[] = [];

    // Simple hash-based pseudo-embedding: similar strings produce similar vectors
    let seed = 0;
    for (let i = 0; i < text.length; i++) {
      seed = ((seed << 5) - seed + text.charCodeAt(i)) | 0;
    }

    for (let i = 0; i < dimensions; i++) {
      // Use seed + position to generate each dimension
      const value = Math.sin(seed * (i + 1) * 0.001) * 0.5 +
                    Math.cos(i * 0.1) * 0.3 +
                    (Math.random() - 0.5) * 0.1; // Small random noise
      embedding.push(value);
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map((v) => v / magnitude);
  }

  /**
   * Compute cosine similarity between two vectors.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dotProduct / denominator;
  }

  // ─── Utility ──────────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
