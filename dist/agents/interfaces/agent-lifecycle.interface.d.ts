import { AgentInput, AgentOutput, AgentState, AgentStatus } from './agent.interface';
export declare enum LifecyclePhase {
    PRE_INITIALIZE = "pre_initialize",
    POST_INITIALIZE = "post_initialize",
    PRE_START = "pre_start",
    POST_START = "post_start",
    PRE_EXECUTE = "pre_execute",
    POST_EXECUTE = "post_execute",
    PRE_PAUSE = "pre_pause",
    POST_PAUSE = "post_pause",
    PRE_RESUME = "pre_resume",
    POST_RESUME = "post_resume",
    PRE_STOP = "pre_stop",
    POST_STOP = "post_stop",
    PRE_DESTROY = "pre_destroy",
    POST_DESTROY = "post_destroy",
    ON_ERROR = "on_error",
    ON_HEALTH_CHECK = "on_health_check"
}
export interface LifecycleContext {
    agentId: string;
    phase: LifecyclePhase;
    previousStatus: AgentStatus;
    newStatus: AgentStatus;
    timestamp: Date;
    correlationId?: string;
    taskId?: string;
    error?: Error;
}
export interface LifecycleHookResult {
    success: boolean;
    shouldProceed: boolean;
    error?: Error;
    metadata?: Record<string, any>;
}
export type LifecycleHook = (context: LifecycleContext) => Promise<LifecycleHookResult> | LifecycleHookResult;
export interface LifecycleTransitionRule {
    from: AgentStatus[];
    to: AgentStatus;
    guard?: (context: LifecycleContext) => Promise<boolean> | boolean;
    onTransition?: LifecycleHook;
}
export interface IAgentLifecycleController {
    initialize(): Promise<void>;
    start(): Promise<void>;
    execute(input: AgentInput): Promise<AgentOutput>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    stop(): Promise<void>;
    destroy(): Promise<void>;
    getStatus(): AgentStatus;
    getState(): AgentState;
    healthCheck(): Promise<boolean>;
}
export interface IAgentLifecycle {
    registerHook(phase: LifecyclePhase, hook: LifecycleHook): void;
    removeHook(phase: LifecyclePhase, hook: LifecycleHook): void;
    getHooks(phase: LifecyclePhase): LifecycleHook[];
    executeHooks(phase: LifecyclePhase, context: LifecycleContext): Promise<LifecycleHookResult[]>;
    validateTransition(from: AgentStatus, to: AgentStatus): boolean;
    getValidTransitions(currentStatus: AgentStatus): AgentStatus[];
    getCurrentPhase(): LifecyclePhase | null;
}
export declare const VALID_TRANSITIONS: Record<AgentStatus, AgentStatus[]>;
