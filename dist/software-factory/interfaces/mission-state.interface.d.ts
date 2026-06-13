export declare enum MissionState {
    DRAFT = "DRAFT",
    PLANNED = "PLANNED",
    RESEARCH = "RESEARCH",
    BUILDING = "BUILDING",
    TESTING = "TESTING",
    AUDITING = "AUDITING",
    CERTIFYING = "CERTIFYING",
    DELIVERING = "DELIVERING",
    COMPLETED = "COMPLETED",
    ARCHIVED = "ARCHIVED"
}
export declare enum TransitionTrigger {
    SUBMIT = "SUBMIT",
    APPROVE_PLAN = "APPROVE_PLAN",
    START_RESEARCH = "START_RESEARCH",
    START_BUILD = "START_BUILD",
    START_TESTING = "START_TESTING",
    START_AUDIT = "START_AUDIT",
    START_CERTIFICATION = "START_CERTIFICATION",
    START_DELIVERY = "START_DELIVERY",
    MARK_COMPLETE = "MARK_COMPLETE",
    ARCHIVE = "ARCHIVE",
    REJECT = "REJECT",
    FAIL = "FAIL",
    PAUSE = "PAUSE",
    RESUME = "RESUME",
    ROLLBACK = "ROLLBACK"
}
export interface StateTransition {
    from: MissionState;
    to: MissionState;
    trigger: TransitionTrigger;
    guard?: TransitionGuard;
    onTransition?: string;
    description: string;
}
export interface TransitionGuard {
    name: string;
    check: (context: TransitionContext) => boolean | Promise<boolean>;
    errorMessage: string;
}
export interface TransitionContext {
    missionId: string;
    contractId: string;
    currentState: MissionState;
    trigger: TransitionTrigger;
    agentId?: string;
    payload?: Record<string, any>;
    artifacts?: string[];
}
export interface TransitionResult {
    success: boolean;
    previousState: MissionState;
    newState: MissionState;
    timestamp: Date;
    error?: string;
    warnings: string[];
}
export interface MissionTimelineEntry {
    state: MissionState;
    enteredAt: Date;
    exitedAt?: Date;
    duration?: number;
    trigger: TransitionTrigger;
    agentId?: string;
    notes: string;
    artifacts: string[];
}
export interface MissionTimeline {
    missionId: string;
    entries: MissionTimelineEntry[];
    currentState: MissionState;
    totalDuration?: number;
    stateDurations: Record<MissionState, number>;
}
export declare const VALID_TRANSITIONS: StateTransition[];
export declare const GLOBAL_TRANSITIONS: StateTransition[];
