/**
 * AENEWS Agent OS X - Mission Memory Service
 *
 * Scoped memory for context, history, project state, and RAG within
 * a mission boundary. Each mission has its own isolated memory space
 * that persists through the mission lifecycle and is cleaned up after
 * completion.
 *
 * Features:
 *   - Key-value store per mission with typed retrieval
 *   - Phase result accumulation (append-only per phase type)
 *   - Full-text search within mission data
 *   - History log with timestamped entries
 *   - Project-level data sharing across missions
 *   - User preference persistence
 *   - Mission progress summarisation
 */

import { Injectable, Logger } from '@nestjs/common';

// ─── Local Types ─────────────────────────────────────────────────────────

export interface MissionContext {
  missionId: string;
  instruction: string;
  userId: string;
  projectId: string | null;
  startTime: Date;
  currentPhase: string | null;
  phaseResults: Record<string, PhaseResult[]>;
  metadata: Record<string, unknown>;
}

export interface PhaseResult {
  phaseType: string;
  result: unknown;
  timestamp: Date;
  durationMs: number;
  success: boolean;
  metadata: Record<string, unknown>;
}

export interface MissionHistoryItem {
  id: string;
  missionId: string;
  timestamp: Date;
  type:
    | 'PHASE_START'
    | 'PHASE_COMPLETE'
    | 'PHASE_FAIL'
    | 'DATA_STORE'
    | 'DATA_RETRIEVE'
    | 'ALERT'
    | 'NOTE';
  description: string;
  data: unknown;
}

export interface ProjectData {
  projectId: string;
  name: string;
  description: string;
  techStack: string[];
  repositoryUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface UserPreferences {
  userId: string;
  language: string;
  notificationLevel: 'ALL' | 'IMPORTANT' | 'MINIMAL' | 'NONE';
  defaultPriority: string;
  preferredTeams: string[];
  customSettings: Record<string, unknown>;
  updatedAt: Date;
}

interface MissionMemoryStore {
  data: Map<string, unknown>;
  phaseResults: Map<string, PhaseResult[]>;
  history: MissionHistoryItem[];
  context: MissionContext | null;
}

// ─── Service ─────────────────────────────────────────────────────────────

@Injectable()
export class MissionMemoryService {
  private readonly logger = new Logger(MissionMemoryService.name);

  /** missionId → MissionMemoryStore */
  private readonly missionStores: Map<string, MissionMemoryStore> = new Map();

  /** projectId → ProjectData */
  private readonly projects: Map<string, ProjectData> = new Map();

  /** userId → UserPreferences */
  private readonly userPreferences: Map<string, UserPreferences> = new Map();

  private historyIdCounter = 0;

  // ─── 1. store ──────────────────────────────────────────────────────

  /**
   * Store a key-value pair within a mission's memory scope.
   * Creates the mission store if it does not yet exist.
   */
  store(missionId: string, key: string, value: unknown): void {
    const store = this.getOrCreateStore(missionId);
    store.data.set(key, value);

    this.addHistoryItem(missionId, 'DATA_STORE', `Stored key "${key}"`, {
      key,
      valueType: typeof value,
    });

    this.logger.debug(`Mission "${missionId}": stored key "${key}"`);
  }

  // ─── 2. retrieve ───────────────────────────────────────────────────

  /**
   * Retrieve a value by key from a mission's memory scope.
   * Returns undefined if key or mission not found.
   */
  retrieve(missionId: string, key: string): unknown {
    const store = this.missionStores.get(missionId);
    if (!store) {
      this.logger.warn(`Mission "${missionId}": no store found for retrieval of key "${key}"`);
      return undefined;
    }

    const value = store.data.get(key);
    this.addHistoryItem(missionId, 'DATA_RETRIEVE', `Retrieved key "${key}"`, {
      key,
      found: value !== undefined,
    });

    return value;
  }

  // ─── 3. getMissionContext ──────────────────────────────────────────

  /**
   * Return the full mission context including instruction, phase results,
   * and metadata. Returns null if the mission has no store.
   */
  getMissionContext(missionId: string): MissionContext | null {
    const store = this.missionStores.get(missionId);
    if (!store || !store.context) {
      return null;
    }

    // Refresh phase results snapshot in context
    const phaseResults: Record<string, PhaseResult[]> = {};
    for (const [phaseType, results] of store.phaseResults.entries()) {
      phaseResults[phaseType] = [...results];
    }

    return {
      ...store.context,
      phaseResults,
    };
  }

  // ─── 4. initializeMissionContext ───────────────────────────────────

  /**
   * Initialise the mission context with instruction metadata.
   * Called once when a mission is created.
   */
  initializeMissionContext(
    missionId: string,
    instruction: string,
    userId: string,
    projectId: string | null,
    metadata?: Record<string, unknown>,
  ): MissionContext {
    const store = this.getOrCreateStore(missionId);

    const context: MissionContext = {
      missionId,
      instruction,
      userId,
      projectId,
      startTime: new Date(),
      currentPhase: null,
      phaseResults: {},
      metadata: metadata ?? {},
    };

    store.context = context;

    this.addHistoryItem(
      missionId,
      'NOTE',
      `Mission context initialised: "${instruction.substring(0, 60)}..."`,
      null,
    );

    this.logger.log(`Mission "${missionId}": context initialised`);
    return context;
  }

  // ─── 5. addPhaseResult ─────────────────────────────────────────────

  /**
   * Append a phase result to the mission's phase result store.
   * Multiple results can be stored per phase type (e.g., retries).
   */
  addPhaseResult(missionId: string, phaseType: string, result: unknown): void {
    const store = this.getOrCreateStore(missionId);

    if (!store.phaseResults.has(phaseType)) {
      store.phaseResults.set(phaseType, []);
    }

    const phaseResult: PhaseResult = {
      phaseType,
      result,
      timestamp: new Date(),
      durationMs: 0,
      success: true,
      metadata: {},
    };

    store.phaseResults.get(phaseType)!.push(phaseResult);

    // Update context's current phase
    if (store.context) {
      store.context.currentPhase = phaseType;
    }

    this.addHistoryItem(
      missionId,
      'PHASE_COMPLETE',
      `Phase "${phaseType}" result recorded`,
      phaseResult,
    );

    this.logger.log(`Mission "${missionId}": phase "${phaseType}" result added`);
  }

  // ─── 6. getPhaseResults ────────────────────────────────────────────

  /**
   * Get phase results, optionally filtered by phase type.
   * If no phaseType is provided, returns all phase results.
   */
  getPhaseResults(missionId: string, phaseType?: string): PhaseResult[] {
    const store = this.missionStores.get(missionId);
    if (!store) {
      return [];
    }

    if (phaseType) {
      return [...(store.phaseResults.get(phaseType) ?? [])];
    }

    // Return all phase results concatenated
    const allResults: PhaseResult[] = [];
    for (const results of store.phaseResults.values()) {
      allResults.push(...results);
    }

    return allResults.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // ─── 7. search ─────────────────────────────────────────────────────

  /**
   * Simple text search within mission data values.
   * Iterates over all stored key-value pairs and returns matches
   * where the stringified value contains the query substring.
   */
  search(missionId: string, query: string): unknown[] {
    const store = this.missionStores.get(missionId);
    if (!store) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const results: unknown[] = [];

    for (const [key, value] of store.data.entries()) {
      const strValue = JSON.stringify(value).toLowerCase();
      if (strValue.includes(queryLower) || key.toLowerCase().includes(queryLower)) {
        results.push({ key, value });
      }
    }

    // Also search phase results
    for (const [phaseType, phaseResults] of store.phaseResults.entries()) {
      if (phaseType.toLowerCase().includes(queryLower)) {
        results.push({ phaseType, results: phaseResults });
      }
      for (const pr of phaseResults) {
        const prStr = JSON.stringify(pr.result).toLowerCase();
        if (prStr.includes(queryLower)) {
          results.push({ phaseType, result: pr });
        }
      }
    }

    this.logger.debug(
      `Mission "${missionId}": search for "${query}" returned ${results.length} results`,
    );
    return results;
  }

  // ─── 8. getHistory ─────────────────────────────────────────────────

  /**
   * Get the full chronological history for a mission.
   */
  getHistory(missionId: string): MissionHistoryItem[] {
    const store = this.missionStores.get(missionId);
    if (!store) {
      return [];
    }

    return [...store.history];
  }

  // ─── 9. setProject ─────────────────────────────────────────────────

  /**
   * Store or update project-level data that can be shared across missions.
   */
  setProject(projectId: string, data: Partial<ProjectData> & { name: string }): ProjectData {
    const existing = this.projects.get(projectId);

    const project: ProjectData = {
      projectId,
      name: data.name,
      description: data.description ?? existing?.description ?? '',
      techStack: data.techStack ?? existing?.techStack ?? [],
      repositoryUrl: data.repositoryUrl ?? existing?.repositoryUrl ?? null,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
      metadata: data.metadata ?? existing?.metadata ?? {},
    };

    this.projects.set(projectId, project);
    this.logger.log(`Project "${projectId}" data stored/updated`);
    return project;
  }

  // ─── 10. getProject ────────────────────────────────────────────────

  getProject(projectId: string): ProjectData | null {
    return this.projects.get(projectId) ?? null;
  }

  // ─── 11. setUserPreferences ────────────────────────────────────────

  setUserPreferences(userId: string, prefs: Partial<UserPreferences>): UserPreferences {
    const existing = this.userPreferences.get(userId);

    const preferences: UserPreferences = {
      userId,
      language: prefs.language ?? existing?.language ?? 'fr',
      notificationLevel: prefs.notificationLevel ?? existing?.notificationLevel ?? 'IMPORTANT',
      defaultPriority: prefs.defaultPriority ?? existing?.defaultPriority ?? 'MEDIUM',
      preferredTeams: prefs.preferredTeams ?? existing?.preferredTeams ?? [],
      customSettings: prefs.customSettings ?? existing?.customSettings ?? {},
      updatedAt: new Date(),
    };

    this.userPreferences.set(userId, preferences);
    this.logger.log(`User "${userId}" preferences updated`);
    return preferences;
  }

  // ─── 12. getUserPreferences ────────────────────────────────────────

  getUserPreferences(userId: string): UserPreferences | null {
    return this.userPreferences.get(userId) ?? null;
  }

  // ─── 13. summarize ─────────────────────────────────────────────────

  /**
   * Generate a text summary of mission progress, including
   * completed phases, stored data count, and history entries.
   */
  summarize(missionId: string): string {
    const store = this.missionStores.get(missionId);
    if (!store) {
      return `Mission "${missionId}": no data found.`;
    }

    const ctx = store.context;
    const phaseTypes = [...store.phaseResults.keys()];
    const completedPhases = phaseTypes.length;
    const totalDataKeys = store.data.size;
    const historyCount = store.history.length;

    const phaseSummaries = phaseTypes.map((pt) => {
      const results = store.phaseResults.get(pt) ?? [];
      const lastResult = results[results.length - 1];
      return `  - ${pt}: ${results.length} result(s), last at ${lastResult?.timestamp.toISOString() ?? 'N/A'}`;
    });

    return [
      `Mission "${missionId}" Summary:`,
      `  Instruction: "${ctx?.instruction?.substring(0, 80) ?? 'N/A'}..."`,
      `  Current Phase: ${ctx?.currentPhase ?? 'N/A'}`,
      `  Completed Phases: ${completedPhases} (${phaseTypes.join(', ') || 'none'})`,
      `  Stored Data Keys: ${totalDataKeys}`,
      `  History Entries: ${historyCount}`,
      `  Started: ${ctx?.startTime?.toISOString() ?? 'N/A'}`,
      ...phaseSummaries,
    ].join('\n');
  }

  // ─── 14. cleanup ───────────────────────────────────────────────────

  /**
   * Remove all data associated with a mission after completion.
   * Call this when the mission lifecycle is finished to free memory.
   */
  cleanup(missionId: string): void {
    const store = this.missionStores.get(missionId);
    if (!store) {
      this.logger.warn(`Mission "${missionId}": no store to cleanup`);
      return;
    }

    const dataKeys = store.data.size;
    const phaseKeys = store.phaseResults.size;
    const historyEntries = store.history.length;

    store.data.clear();
    store.phaseResults.clear();
    store.history.length = 0;
    store.context = null;

    this.missionStores.delete(missionId);

    this.logger.log(
      `Mission "${missionId}" cleaned up: ${dataKeys} data keys, ` +
        `${phaseKeys} phase types, ${historyEntries} history entries removed`,
    );
  }

  // ─── Private helpers ───────────────────────────────────────────────

  private getOrCreateStore(missionId: string): MissionMemoryStore {
    let store = this.missionStores.get(missionId);
    if (!store) {
      store = {
        data: new Map(),
        phaseResults: new Map(),
        history: [],
        context: null,
      };
      this.missionStores.set(missionId, store);
    }
    return store;
  }

  private addHistoryItem(
    missionId: string,
    type: MissionHistoryItem['type'],
    description: string,
    data: unknown,
  ): void {
    const store = this.getOrCreateStore(missionId);
    this.historyIdCounter++;

    store.history.push({
      id: `hist_${this.historyIdCounter}`,
      missionId,
      timestamp: new Date(),
      type,
      description,
      data,
    });
  }
}
