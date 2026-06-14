import { EventEmitter2 } from '@nestjs/event-emitter';
export declare enum ObjectiveStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    ABANDONED = "abandoned"
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
    deadlines: Array<{
        name: string;
        date: Date;
    }>;
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
    memoryUsage: {
        total: number;
        used: number;
        byTier: Record<string, number>;
    };
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
interface ChangeRecord {
    timestamp: Date;
    field: string;
    previousValue: any;
    newValue: any;
}
type WorldModelChangeCallback = (state: WorldModelState, changes: ChangeRecord[]) => void;
export declare class WorldModelService {
    private readonly eventEmitter;
    private readonly logger;
    private state;
    private readonly changeLog;
    private readonly subscribers;
    private readonly objectiveIndex;
    private readonly constraintIndex;
    constructor(eventEmitter: EventEmitter2);
    initialize(initialState?: Partial<WorldModelState>): void;
    getState(): WorldModelState;
    updateUser(user: UserContext): void;
    updateProject(project: ProjectContext): void;
    addObjective(objective: WorldObjective): void;
    updateObjective(objectiveId: string, updates: Partial<WorldObjective>): void;
    removeObjective(objectiveId: string): void;
    addConstraint(constraint: WorldConstraint): void;
    removeConstraint(constraintId: string): void;
    recordEvent(event: WorldEvent): void;
    updateSystemState(partial: Partial<SystemState>): void;
    updateKnowledge(key: string, value: any): void;
    queryKnowledge(query: string): Record<string, any>;
    getObjectivesByStatus(status: ObjectiveStatus): WorldObjective[];
    getActiveConstraints(): WorldConstraint[];
    evaluateConstraints(action: Record<string, any>): {
        violated: boolean;
        violations: string[];
    };
    getSnapshot(): WorldModelState;
    diff(sinceTimestamp: Date): ChangeRecord[];
    subscribe(callback: WorldModelChangeCallback): () => void;
    private createDefaultState;
    private recordChange;
    private notifySubscribers;
    private findObjective;
    private rebuildObjectiveIndex;
    private indexObjectiveRecursive;
    private removeObjectiveIndexes;
    private rebuildConstraintIndex;
    private findConstraintConflicts;
    private globToRegex;
    private deepClone;
}
export {};
