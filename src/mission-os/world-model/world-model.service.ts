/**
 * AENEWS Agent OS X - World Model Service
 * Global representation that ALL agents work from.
 * Contains: User, Project, Context, Objectives, Constraints,
 * History, Knowledge, Events, Current State.
 *
 * The World Model is the single source of truth for the agent ecosystem.
 * Every agent reads from and writes to this shared state, ensuring
 * coherent and coordinated behavior across the entire system.
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// ─── Type Definitions ──────────────────────────────────────────────

export enum ObjectiveStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export interface WorldObjective {
  id: string;
  description: string;
  priority: number;
  status: ObjectiveStatus;
  targetDate: Date | null;
  progress: number;
  subObjectives: WorldObjective[];
  assignedAgents: string[];
  metadata: Record<string, any>;
}

export interface WorldConstraint {
  id: string;
  type: 'time' | 'budget' | 'resource' | 'policy' | 'technical';
  description: string;
  value: any;
  enforced: boolean;
}

export interface WorldEvent {
  id: string;
  type: string;
  source: string;
  data: any;
  timestamp: Date;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProjectContext {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  repository: string;
  environment: string;
  team: string[];
  startDate: Date;
  deadlines: Array<{ name: string; date: Date }>;
}

export interface UserContext {
  id: string;
  name: string;
  role: string;
  preferences: Record<string, any>;
  permissions: string[];
  activeSessionId: string | null;
}

export interface SystemState {
  uptime: number;
  activeAgents: number;
  activeMissions: number;
  eqiScore: number;
  memoryUsage: { total: number; used: number; byTier: Record<string, number> };
  cpuLoad: number;
  networkLatency: number;
}

export interface WorldModelState {
  currentUser: UserContext | null;
  currentProject: ProjectContext | null;
  context: Record<string, any>;
  objectives: WorldObjective[];
  constraints: WorldConstraint[];
  history: WorldEvent[];
  knowledgeBase: Record<string, any>;
  currentEvents: WorldEvent[];
  systemState: SystemState;
  lastUpdated: Date;
}

// ─── Internal Tracking Types ────────────────────────────────────────

interface ChangeRecord {
  timestamp: Date;
  field: string;
  previousValue: any;
  newValue: any;
}

type WorldModelChangeCallback = (state: WorldModelState, changes: ChangeRecord[]) => void;

// ─── Constants ──────────────────────────────────────────────────────

const WORLD_EVENT_CRITICAL = 'world.event.critical';
const MAX_HISTORY_SIZE = 10_000;
const MAX_CURRENT_EVENTS_SIZE = 1_000;
const MAX_CHANGE_LOG_SIZE = 50_000;

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class WorldModelService {
  private readonly logger = new Logger(WorldModelService.name);

  /** The canonical world model state */
  private state: WorldModelState;

  /** Change log for incremental diff queries */
  private readonly changeLog: ChangeRecord[] = [];

  /** Subscribers notified on every state mutation */
  private readonly subscribers: Map<string, WorldModelChangeCallback> = new Map();

  /** Index: objective id -> objective (flat lookup, includes sub-objectives) */
  private readonly objectiveIndex: Map<string, WorldObjective> = new Map();

  /** Index: constraint id -> constraint */
  private readonly constraintIndex: Map<string, WorldConstraint> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.state = this.createDefaultState();
  }

  // ─── 1. initialize ────────────────────────────────────────────────

  /**
   * Set up the world model with initial state.
   * Merges provided partial state over the defaults.
   */
  initialize(initialState?: Partial<WorldModelState>): void {
    this.logger.log('Initializing World Model');

    const defaults = this.createDefaultState();

    if (initialState) {
      this.state = {
        ...defaults,
        ...initialState,
        systemState: {
          ...defaults.systemState,
          ...(initialState.systemState ?? {}),
          memoryUsage: {
            ...defaults.systemState.memoryUsage,
            ...(initialState.systemState?.memoryUsage ?? {}),
          },
        },
        lastUpdated: new Date(),
      };
    } else {
      this.state = defaults;
    }

    // Rebuild indexes
    this.rebuildObjectiveIndex(this.state.objectives);
    this.rebuildConstraintIndex(this.state.constraints);

    this.logger.log(
      `World Model initialized — ${this.objectiveIndex.size} objectives, ${this.constraintIndex.size} constraints`,
    );
  }

  // ─── 2. getState ──────────────────────────────────────────────────

  /**
   * Get current world model state as a deep copy.
   * Agents should never hold a reference to the internal state.
   */
  getState(): WorldModelState {
    return this.deepClone(this.state);
  }

  // ─── 3. updateUser ────────────────────────────────────────────────

  /**
   * Update current user context.
   */
  updateUser(user: UserContext): void {
    const previous = this.state.currentUser;
    this.state.currentUser = { ...user };
    this.state.lastUpdated = new Date();

    this.recordChange('currentUser', previous, this.state.currentUser);
    this.notifySubscribers();
    this.logger.debug?.(`User context updated: ${user.name} (${user.id})`);
  }

  // ─── 4. updateProject ─────────────────────────────────────────────

  /**
   * Update current project context.
   */
  updateProject(project: ProjectContext): void {
    const previous = this.state.currentProject;
    this.state.currentProject = {
      ...project,
      deadlines: project.deadlines.map((d) => ({ ...d })),
    };
    this.state.lastUpdated = new Date();

    this.recordChange('currentProject', previous, this.state.currentProject);
    this.notifySubscribers();
    this.logger.debug?.(`Project context updated: ${project.name} (${project.id})`);
  }

  // ─── 5. addObjective ──────────────────────────────────────────────

  /**
   * Add a new objective. Validates no duplicate IDs.
   */
  addObjective(objective: WorldObjective): void {
    if (this.objectiveIndex.has(objective.id)) {
      throw new Error(`Objective with id "${objective.id}" already exists`);
    }

    const inserted: WorldObjective = {
      ...objective,
      subObjectives: objective.subObjectives.map((s) => ({ ...s })),
    };

    this.state.objectives.push(inserted);
    this.indexObjectiveRecursive(inserted);
    this.state.lastUpdated = new Date();

    this.recordChange('objectives', null, inserted);
    this.notifySubscribers();
    this.logger.log(`Objective added: ${inserted.id} — "${inserted.description}"`);
  }

  // ─── 6. updateObjective ───────────────────────────────────────────

  /**
   * Update objective progress, status, etc.
   * Supports partial updates; only supplied fields are overwritten.
   */
  updateObjective(objectiveId: string, updates: Partial<WorldObjective>): void {
    const objective = this.findObjective(objectiveId);
    if (!objective) {
      throw new Error(`Objective with id "${objectiveId}" not found`);
    }

    const previous = { ...objective };

    // Apply updates (except id and subObjectives which need special handling)
    if (updates.description !== undefined) objective.description = updates.description;
    if (updates.priority !== undefined) objective.priority = updates.priority;
    if (updates.status !== undefined) objective.status = updates.status;
    if (updates.targetDate !== undefined) objective.targetDate = updates.targetDate;
    if (updates.progress !== undefined) objective.progress = updates.progress;
    if (updates.assignedAgents !== undefined)
      objective.assignedAgents = [...updates.assignedAgents];
    if (updates.metadata !== undefined) objective.metadata = { ...updates.metadata };

    // Handle sub-objective replacement if provided
    if (updates.subObjectives !== undefined) {
      // Remove old sub-objective indexes
      this.removeObjectiveIndexes(objective.subObjectives);
      objective.subObjectives = updates.subObjectives.map((s) => ({ ...s }));
      this.indexObjectiveRecursive(objective);
    }

    this.state.lastUpdated = new Date();

    this.recordChange(`objective:${objectiveId}`, previous, { ...objective });
    this.notifySubscribers();
    this.logger.debug?.(`Objective updated: ${objectiveId} — status=${objective.status}`);
  }

  // ─── 7. removeObjective ───────────────────────────────────────────

  /**
   * Remove an objective by marking it as ABANDONED.
   * Truly deleting from the array could break references; abandoning
   * preserves history while signalling termination.
   */
  removeObjective(objectiveId: string): void {
    const objective = this.findObjective(objectiveId);
    if (!objective) {
      throw new Error(`Objective with id "${objectiveId}" not found`);
    }

    const previous = { ...objective };
    objective.status = ObjectiveStatus.ABANDONED;
    objective.progress = 0;
    this.state.lastUpdated = new Date();

    this.recordChange(`objective:${objectiveId}`, previous, { ...objective });
    this.notifySubscribers();
    this.logger.log(`Objective abandoned: ${objectiveId}`);
  }

  // ─── 8. addConstraint ─────────────────────────────────────────────

  /**
   * Add a constraint. Checks for conflicts with existing constraints
   * of the same type and overlapping values.
   */
  addConstraint(constraint: WorldConstraint): void {
    // Check for conflicts with existing constraints
    const conflicts = this.findConstraintConflicts(constraint);
    if (conflicts.length > 0) {
      this.logger.warn(
        `Constraint "${constraint.id}" conflicts with: ${conflicts.map((c) => c.id).join(', ')}`,
      );
    }

    if (this.constraintIndex.has(constraint.id)) {
      throw new Error(`Constraint with id "${constraint.id}" already exists`);
    }

    const inserted: WorldConstraint = { ...constraint };
    this.state.constraints.push(inserted);
    this.constraintIndex.set(inserted.id, inserted);
    this.state.lastUpdated = new Date();

    this.recordChange('constraints', null, inserted);
    this.notifySubscribers();
    this.logger.log(
      `Constraint added: ${inserted.id} — type=${inserted.type}, enforced=${inserted.enforced}`,
    );
  }

  // ─── 9. removeConstraint ──────────────────────────────────────────

  /**
   * Remove a constraint by ID.
   */
  removeConstraint(constraintId: string): void {
    const constraint = this.constraintIndex.get(constraintId);
    if (!constraint) {
      throw new Error(`Constraint with id "${constraintId}" not found`);
    }

    this.state.constraints = this.state.constraints.filter((c) => c.id !== constraintId);
    this.constraintIndex.delete(constraintId);
    this.state.lastUpdated = new Date();

    this.recordChange('constraints', constraint, null);
    this.notifySubscribers();
    this.logger.log(`Constraint removed: ${constraintId}`);
  }

  // ─── 10. recordEvent ──────────────────────────────────────────────

  /**
   * Record a world event.
   * - Adds to history (bounded by MAX_HISTORY_SIZE).
   * - Adds to currentEvents (bounded by MAX_CURRENT_EVENTS_SIZE).
   * - If impact is "critical", emits WORLD_EVENT_CRITICAL via EventEmitter2.
   */
  recordEvent(event: WorldEvent): void {
    const stored: WorldEvent = { ...event };

    // Append to history
    this.state.history.push(stored);
    if (this.state.history.length > MAX_HISTORY_SIZE) {
      this.state.history = this.state.history.slice(-MAX_HISTORY_SIZE);
    }

    // Append to current events
    this.state.currentEvents.push(stored);
    if (this.state.currentEvents.length > MAX_CURRENT_EVENTS_SIZE) {
      this.state.currentEvents = this.state.currentEvents.slice(-MAX_CURRENT_EVENTS_SIZE);
    }

    this.state.lastUpdated = new Date();

    this.recordChange('history', null, stored);
    this.notifySubscribers();

    // Emit critical event
    if (event.impact === 'critical') {
      this.eventEmitter.emit(WORLD_EVENT_CRITICAL, stored);
      this.logger.warn(`CRITICAL world event: ${event.type} from ${event.source}`);
    }

    this.logger.debug?.(
      `Event recorded: ${event.type} (impact=${event.impact}) from ${event.source}`,
    );
  }

  // ─── 11. updateSystemState ────────────────────────────────────────

  /**
   * Update system state metrics with a partial update.
   */
  updateSystemState(partial: Partial<SystemState>): void {
    const previous = { ...this.state.systemState };

    this.state.systemState = {
      ...this.state.systemState,
      ...partial,
      memoryUsage: {
        ...this.state.systemState.memoryUsage,
        ...(partial.memoryUsage ?? {}),
        byTier: {
          ...this.state.systemState.memoryUsage.byTier,
          ...(partial.memoryUsage?.byTier ?? {}),
        },
      },
    };
    this.state.lastUpdated = new Date();

    this.recordChange('systemState', previous, { ...this.state.systemState });
    this.notifySubscribers();
  }

  // ─── 12. updateKnowledge ──────────────────────────────────────────

  /**
   * Update knowledge base entry by key.
   */
  updateKnowledge(key: string, value: any): void {
    const previous = this.state.knowledgeBase[key];
    this.state.knowledgeBase[key] = value;
    this.state.lastUpdated = new Date();

    this.recordChange(`knowledge:${key}`, previous, value);
    this.notifySubscribers();
    this.logger.debug?.(`Knowledge updated: ${key}`);
  }

  // ─── 13. queryKnowledge ───────────────────────────────────────────

  /**
   * Search knowledge base by key pattern.
   * Supports glob-like patterns using * as a wildcard.
   * Returns matching key-value pairs.
   */
  queryKnowledge(query: string): Record<string, any> {
    const pattern = this.globToRegex(query);
    const results: Record<string, any> = {};

    for (const [key, value] of Object.entries(this.state.knowledgeBase)) {
      if (pattern.test(key)) {
        results[key] = value;
      }
    }

    return results;
  }

  // ─── 14. getObjectivesByStatus ────────────────────────────────────

  /**
   * Filter objectives by status.
   * Searches top-level objectives and all nested sub-objectives.
   */
  getObjectivesByStatus(status: ObjectiveStatus): WorldObjective[] {
    const results: WorldObjective[] = [];

    const collect = (objectives: WorldObjective[]): void => {
      for (const obj of objectives) {
        if (obj.status === status) {
          results.push({ ...obj, subObjectives: obj.subObjectives.map((s) => ({ ...s })) });
        }
        if (obj.subObjectives.length > 0) {
          collect(obj.subObjectives);
        }
      }
    };

    collect(this.state.objectives);
    return results;
  }

  // ─── 15. getActiveConstraints ─────────────────────────────────────

  /**
   * Get all enforced constraints.
   */
  getActiveConstraints(): WorldConstraint[] {
    return this.state.constraints
      .filter((c) => c.enforced)
      .map((c) => ({ ...c }));
  }

  // ─── 16. evaluateConstraints ──────────────────────────────────────

  /**
   * Check if an action violates any active constraints.
   * The action object is expected to contain fields that can be
   * evaluated against constraints (e.g., cost for budget constraints,
   * deadline for time constraints, resourceName for resource constraints).
   *
   * Returns { violated: boolean, violations: string[] } where violations
   * are human-readable descriptions of each breached constraint.
   */
  evaluateConstraints(action: Record<string, any>): { violated: boolean; violations: string[] } {
    const violations: string[] = [];

    const activeConstraints = this.state.constraints.filter((c) => c.enforced);

    for (const constraint of activeConstraints) {
      switch (constraint.type) {
        case 'budget': {
          const cost = action.cost ?? action.budget ?? action.price;
          if (cost !== undefined && typeof constraint.value === 'number' && cost > constraint.value) {
            violations.push(
              `Budget constraint "${constraint.description}" exceeded: ${cost} > ${constraint.value}`,
            );
          }
          break;
        }
        case 'time': {
          const deadline = action.deadline ?? action.dueDate ?? action.targetDate;
          if (
            deadline !== undefined &&
            constraint.value instanceof Date &&
            new Date(deadline) > constraint.value
          ) {
            violations.push(
              `Time constraint "${constraint.description}" exceeded: ${new Date(deadline).toISOString()} > ${constraint.value.toISOString()}`,
            );
          }
          break;
        }
        case 'resource': {
          const resourceName = action.resource ?? action.resourceName;
          const blockedResources = Array.isArray(constraint.value) ? constraint.value : [constraint.value];
          if (
            resourceName !== undefined &&
            blockedResources.some(
              (r: any) =>
                (typeof r === 'string' && r === resourceName) ||
                (typeof r === 'object' && r?.name === resourceName),
            )
          ) {
            violations.push(
              `Resource constraint "${constraint.description}" violated: ${resourceName} is restricted`,
            );
          }
          break;
        }
        case 'policy': {
          // Policy constraints: value is a predicate function serialized as string
          // or a list of forbidden action types
          const actionType = action.type ?? action.actionType;
          const forbiddenTypes = Array.isArray(constraint.value) ? constraint.value : [];
          if (
            actionType !== undefined &&
            forbiddenTypes.some((t: any) => t === actionType || (typeof t === 'string' && t === actionType))
          ) {
            violations.push(
              `Policy constraint "${constraint.description}" violated: action type "${actionType}" is not allowed`,
            );
          }
          break;
        }
        case 'technical': {
          // Technical constraints: value is an object with maxValues, allowedValues, etc.
          if (typeof constraint.value === 'object' && constraint.value !== null) {
            const cv = constraint.value as Record<string, any>;
            for (const [metric, limit] of Object.entries(cv)) {
              if (action[metric] !== undefined && typeof limit === 'number' && action[metric] > limit) {
                violations.push(
                  `Technical constraint "${constraint.description}" violated: ${metric}=${action[metric]} exceeds limit ${limit}`,
                );
              }
            }
          }
          break;
        }
      }
    }

    return {
      violated: violations.length > 0,
      violations,
    };
  }

  // ─── 17. getSnapshot ──────────────────────────────────────────────

  /**
   * Complete snapshot for agent consumption.
   * Returns a deep copy of the entire world model state.
   */
  getSnapshot(): WorldModelState {
    return this.deepClone(this.state);
  }

  // ─── 18. diff ─────────────────────────────────────────────────────

  /**
   * Get changes since a timestamp (for incremental updates).
   * Returns all ChangeRecord entries recorded after the given timestamp.
   */
  diff(sinceTimestamp: Date): ChangeRecord[] {
    return this.changeLog.filter((c) => c.timestamp > sinceTimestamp);
  }

  // ─── 19. subscribe ────────────────────────────────────────────────

  /**
   * Allow agents to subscribe to world model changes.
   * Returns an unsubscribe function.
   */
  subscribe(callback: WorldModelChangeCallback): () => void {
    const id = uuidv4();
    this.subscribers.set(id, callback);
    this.logger.debug?.(`Subscriber added: ${id} (total: ${this.subscribers.size})`);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(id);
      this.logger.debug?.(`Subscriber removed: ${id} (total: ${this.subscribers.size})`);
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Create the default (empty) world model state.
   */
  private createDefaultState(): WorldModelState {
    return {
      currentUser: null,
      currentProject: null,
      context: {},
      objectives: [],
      constraints: [],
      history: [],
      knowledgeBase: {},
      currentEvents: [],
      systemState: {
        uptime: 0,
        activeAgents: 0,
        activeMissions: 0,
        eqiScore: 0,
        memoryUsage: { total: 0, used: 0, byTier: {} },
        cpuLoad: 0,
        networkLatency: 0,
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Record a change in the change log for diff support.
   */
  private recordChange(field: string, previousValue: any, newValue: any): void {
    this.changeLog.push({
      timestamp: new Date(),
      field,
      previousValue,
      newValue,
    });

    // Bound the change log size
    if (this.changeLog.length > MAX_CHANGE_LOG_SIZE) {
      this.changeLog.splice(0, this.changeLog.length - MAX_CHANGE_LOG_SIZE);
    }
  }

  /**
   * Notify all subscribers of a state change.
   */
  private notifySubscribers(): void {
    const currentState = this.getState();
    const recentChanges = this.changeLog.slice(-10); // Last 10 changes for context

    for (const [id, callback] of this.subscribers) {
      try {
        callback(currentState, recentChanges);
      } catch (error) {
        this.logger.error(
          `Subscriber ${id} callback error: ${(error as Error).message}`,
        );
      }
    }
  }

  /**
   * Find an objective by ID, searching recursively through sub-objectives.
   */
  private findObjective(objectiveId: string): WorldObjective | null {
    const search = (objectives: WorldObjective[]): WorldObjective | null => {
      for (const obj of objectives) {
        if (obj.id === objectiveId) return obj;
        const found = search(obj.subObjectives);
        if (found) return found;
      }
      return null;
    };

    return search(this.state.objectives);
  }

  /**
   * Rebuild the objective index from the objectives array.
   */
  private rebuildObjectiveIndex(objectives: WorldObjective[]): void {
    this.objectiveIndex.clear();
    for (const obj of objectives) {
      this.indexObjectiveRecursive(obj);
    }
  }

  /**
   * Recursively index an objective and its sub-objectives.
   */
  private indexObjectiveRecursive(objective: WorldObjective): void {
    this.objectiveIndex.set(objective.id, objective);
    for (const sub of objective.subObjectives) {
      this.indexObjectiveRecursive(sub);
    }
  }

  /**
   * Remove indexes for a list of objectives (and their sub-objectives).
   */
  private removeObjectiveIndexes(objectives: WorldObjective[]): void {
    for (const obj of objectives) {
      this.objectiveIndex.delete(obj.id);
      this.removeObjectiveIndexes(obj.subObjectives);
    }
  }

  /**
   * Rebuild the constraint index from the constraints array.
   */
  private rebuildConstraintIndex(constraints: WorldConstraint[]): void {
    this.constraintIndex.clear();
    for (const c of constraints) {
      this.constraintIndex.set(c.id, c);
    }
  }

  /**
   * Find constraints that conflict with a new constraint.
   * Two constraints conflict if they share the same type and have
   * incompatible values (e.g., overlapping time ranges, same resource
   * blocked twice, contradictory budget limits).
   */
  private findConstraintConflicts(constraint: WorldConstraint): WorldConstraint[] {
    return this.state.constraints.filter((existing) => {
      if (existing.type !== constraint.type) return false;

      // Same ID is a hard conflict (handled by the caller)
      if (existing.id === constraint.id) return true;

      // Type-specific conflict detection
      switch (constraint.type) {
        case 'budget': {
          // Both constrain budget — conflict if ranges overlap
          return (
            typeof existing.value === 'number' &&
            typeof constraint.value === 'number' &&
            Math.abs(existing.value - constraint.value) < Number.EPSILON
          );
        }
        case 'resource': {
          // Same resource name
          const existingResources = Array.isArray(existing.value)
            ? existing.value
            : [existing.value];
          const newResources = Array.isArray(constraint.value)
            ? constraint.value
            : [constraint.value];
          return existingResources.some((r: any) =>
            newResources.some(
              (nr: any) =>
                (typeof r === 'string' && r === nr) ||
                (typeof r === 'object' && typeof nr === 'object' && r?.name === nr?.name),
            ),
          );
        }
        case 'time': {
          // Same deadline constraint
          if (
            existing.value instanceof Date &&
            constraint.value instanceof Date &&
            existing.value.getTime() === constraint.value.getTime()
          ) {
            return true;
          }
          return false;
        }
        case 'policy': {
          // Overlapping forbidden action types
          const existingTypes = Array.isArray(existing.value) ? existing.value : [];
          const newTypes = Array.isArray(constraint.value) ? constraint.value : [];
          return existingTypes.some((t: any) => newTypes.includes(t));
        }
        default:
          return false;
      }
    });
  }

  /**
   * Convert a glob-like pattern to a RegExp.
   * Supports * as a wildcard (matches any sequence of characters).
   */
  private globToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*'); // Convert * to .*
    return new RegExp(`^${escaped}$`);
  }

  /**
   * Deep clone a value using structuredClone if available,
   * falling back to JSON parse/stringify.
   */
  private deepClone<T>(value: T): T {
    try {
      return structuredClone(value);
    } catch {
      return JSON.parse(JSON.stringify(value));
    }
  }
}
