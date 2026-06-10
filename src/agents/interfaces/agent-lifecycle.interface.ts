/**
 * AENEWS Agent OS X - Agent Lifecycle Interface
 * Defines lifecycle hooks that agents can implement to respond to state transitions.
 */

import { AgentInput, AgentOutput, AgentState, AgentStatus } from './agent.interface';

// ─── Lifecycle Hook Phases ───────────────────────────────────────
export enum LifecyclePhase {
  PRE_INITIALIZE = 'pre_initialize',
  POST_INITIALIZE = 'post_initialize',
  PRE_START = 'pre_start',
  POST_START = 'post_start',
  PRE_EXECUTE = 'pre_execute',
  POST_EXECUTE = 'post_execute',
  PRE_PAUSE = 'pre_pause',
  POST_PAUSE = 'post_pause',
  PRE_RESUME = 'pre_resume',
  POST_RESUME = 'post_resume',
  PRE_STOP = 'pre_stop',
  POST_STOP = 'post_stop',
  PRE_DESTROY = 'pre_destroy',
  POST_DESTROY = 'post_destroy',
  ON_ERROR = 'on_error',
  ON_HEALTH_CHECK = 'on_health_check',
}

// ─── Lifecycle Context ───────────────────────────────────────────
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

// ─── Lifecycle Hook Result ───────────────────────────────────────
export interface LifecycleHookResult {
  success: boolean;
  shouldProceed: boolean;
  error?: Error;
  metadata?: Record<string, any>;
}

// ─── Lifecycle Hook ──────────────────────────────────────────────
export type LifecycleHook = (
  context: LifecycleContext,
) => Promise<LifecycleHookResult> | LifecycleHookResult;

// ─── Lifecycle Transition Rule ───────────────────────────────────
export interface LifecycleTransitionRule {
  from: AgentStatus[];
  to: AgentStatus;
  guard?: (context: LifecycleContext) => Promise<boolean> | boolean;
  onTransition?: LifecycleHook;
}

// ─── Agent Lifecycle Controller Interface ────────────────────────
// Provides direct lifecycle control methods for agents.
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

// ─── Lifecycle Manager Interface ─────────────────────────────────
export interface IAgentLifecycle {
  /**
   * Register a lifecycle hook for a specific phase.
   */
  registerHook(phase: LifecyclePhase, hook: LifecycleHook): void;

  /**
   * Remove a registered lifecycle hook.
   */
  removeHook(phase: LifecyclePhase, hook: LifecycleHook): void;

  /**
   * Get all registered hooks for a phase.
   */
  getHooks(phase: LifecyclePhase): LifecycleHook[];

  /**
   * Execute all hooks for a phase in order.
   */
  executeHooks(phase: LifecyclePhase, context: LifecycleContext): Promise<LifecycleHookResult[]>;

  /**
   * Validate a state transition is allowed.
   */
  validateTransition(from: AgentStatus, to: AgentStatus): boolean;

  /**
   * Get valid next states from current status.
   */
  getValidTransitions(currentStatus: AgentStatus): AgentStatus[];

  /**
   * Get the current lifecycle phase.
   */
  getCurrentPhase(): LifecyclePhase | null;
}

// ─── Valid State Transitions Map ─────────────────────────────────
export const VALID_TRANSITIONS: Record<AgentStatus, AgentStatus[]> = {
  [AgentStatus.IDLE]: [
    AgentStatus.INITIALIZING,
    AgentStatus.RUNNING,
    AgentStatus.STOPPED,
    AgentStatus.MAINTENANCE,
  ],
  [AgentStatus.INITIALIZING]: [
    AgentStatus.IDLE,
    AgentStatus.RUNNING,
    AgentStatus.ERROR,
    AgentStatus.STOPPED,
  ],
  [AgentStatus.RUNNING]: [
    AgentStatus.IDLE,
    AgentStatus.PAUSED,
    AgentStatus.ERROR,
    AgentStatus.STOPPED,
    AgentStatus.MAINTENANCE,
  ],
  [AgentStatus.PAUSED]: [
    AgentStatus.RUNNING,
    AgentStatus.STOPPED,
    AgentStatus.ERROR,
    AgentStatus.MAINTENANCE,
  ],
  [AgentStatus.ERROR]: [
    AgentStatus.IDLE,
    AgentStatus.INITIALIZING,
    AgentStatus.STOPPED,
    AgentStatus.MAINTENANCE,
  ],
  [AgentStatus.STOPPED]: [
    AgentStatus.INITIALIZING,
    AgentStatus.IDLE,
  ],
  [AgentStatus.MAINTENANCE]: [
    AgentStatus.IDLE,
    AgentStatus.STOPPED,
    AgentStatus.RUNNING,
  ],
};
