/**
 * AENEWS Software Factory — Mission State Machine Interface
 *
 * Lifecycle: DRAFT → PLANNED → RESEARCH → BUILDING → TESTING →
 *            AUDITING → CERTIFYING → DELIVERING → COMPLETED → ARCHIVED
 */

export enum MissionState {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  RESEARCH = 'RESEARCH',
  BUILDING = 'BUILDING',
  TESTING = 'TESTING',
  AUDITING = 'AUDITING',
  CERTIFYING = 'CERTIFYING',
  DELIVERING = 'DELIVERING',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum TransitionTrigger {
  SUBMIT = 'SUBMIT',
  APPROVE_PLAN = 'APPROVE_PLAN',
  START_RESEARCH = 'START_RESEARCH',
  START_BUILD = 'START_BUILD',
  START_TESTING = 'START_TESTING',
  START_AUDIT = 'START_AUDIT',
  START_CERTIFICATION = 'START_CERTIFICATION',
  START_DELIVERY = 'START_DELIVERY',
  MARK_COMPLETE = 'MARK_COMPLETE',
  ARCHIVE = 'ARCHIVE',
  REJECT = 'REJECT',
  FAIL = 'FAIL',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  ROLLBACK = 'ROLLBACK',
}

export interface StateTransition {
  from: MissionState;
  to: MissionState;
  trigger: TransitionTrigger;
  guard?: TransitionGuard;
  onTransition?: string; // event name to emit
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
  duration?: number; // ms
  trigger: TransitionTrigger;
  agentId?: string;
  notes: string;
  artifacts: string[];
}

export interface MissionTimeline {
  missionId: string;
  entries: MissionTimelineEntry[];
  currentState: MissionState;
  totalDuration?: number; // ms
  stateDurations: Record<MissionState, number>; // ms per state
}

export const VALID_TRANSITIONS: StateTransition[] = [
  {
    from: MissionState.DRAFT,
    to: MissionState.PLANNED,
    trigger: TransitionTrigger.SUBMIT,
    description: 'Mission submitted for planning',
  },
  {
    from: MissionState.PLANNED,
    to: MissionState.RESEARCH,
    trigger: TransitionTrigger.START_RESEARCH,
    description: 'Plan approved, starting research',
  },
  {
    from: MissionState.PLANNED,
    to: MissionState.DRAFT,
    trigger: TransitionTrigger.REJECT,
    description: 'Plan rejected, back to draft',
  },
  {
    from: MissionState.RESEARCH,
    to: MissionState.BUILDING,
    trigger: TransitionTrigger.START_BUILD,
    description: 'Research complete, starting build',
  },
  {
    from: MissionState.RESEARCH,
    to: MissionState.PLANNED,
    trigger: TransitionTrigger.ROLLBACK,
    description: 'Research insufficient, re-planning',
  },
  {
    from: MissionState.BUILDING,
    to: MissionState.TESTING,
    trigger: TransitionTrigger.START_TESTING,
    description: 'Build complete, starting tests',
  },
  {
    from: MissionState.BUILDING,
    to: MissionState.RESEARCH,
    trigger: TransitionTrigger.ROLLBACK,
    description: 'Build blocked, need more research',
  },
  {
    from: MissionState.TESTING,
    to: MissionState.AUDITING,
    trigger: TransitionTrigger.START_AUDIT,
    description: 'Tests passing, starting audit',
  },
  {
    from: MissionState.TESTING,
    to: MissionState.BUILDING,
    trigger: TransitionTrigger.ROLLBACK,
    description: 'Tests failed, back to building',
  },
  {
    from: MissionState.AUDITING,
    to: MissionState.CERTIFYING,
    trigger: TransitionTrigger.START_CERTIFICATION,
    description: 'Audit passed, certifying',
  },
  {
    from: MissionState.AUDITING,
    to: MissionState.BUILDING,
    trigger: TransitionTrigger.ROLLBACK,
    description: 'Audit found issues, back to building',
  },
  {
    from: MissionState.CERTIFYING,
    to: MissionState.DELIVERING,
    trigger: TransitionTrigger.START_DELIVERY,
    description: 'Certified, starting delivery',
  },
  {
    from: MissionState.CERTIFYING,
    to: MissionState.AUDITING,
    trigger: TransitionTrigger.ROLLBACK,
    description: 'Certification failed, re-auditing',
  },
  {
    from: MissionState.DELIVERING,
    to: MissionState.COMPLETED,
    trigger: TransitionTrigger.MARK_COMPLETE,
    description: 'Delivered, mission complete',
  },
  {
    from: MissionState.DELIVERING,
    to: MissionState.CERTIFYING,
    trigger: TransitionTrigger.ROLLBACK,
    description: 'Delivery failed, re-certifying',
  },
  {
    from: MissionState.COMPLETED,
    to: MissionState.ARCHIVED,
    trigger: TransitionTrigger.ARCHIVE,
    description: 'Mission archived',
  },
];

// Any state can transition to these via special triggers
export const GLOBAL_TRANSITIONS: StateTransition[] = [
  {
    from: MissionState.DRAFT,
    to: MissionState.DRAFT,
    trigger: TransitionTrigger.PAUSE,
    description: 'Mission paused',
  },
  {
    from: MissionState.PLANNED,
    to: MissionState.PLANNED,
    trigger: TransitionTrigger.PAUSE,
    description: 'Mission paused',
  },
  {
    from: MissionState.RESEARCH,
    to: MissionState.RESEARCH,
    trigger: TransitionTrigger.PAUSE,
    description: 'Mission paused',
  },
  {
    from: MissionState.BUILDING,
    to: MissionState.BUILDING,
    trigger: TransitionTrigger.PAUSE,
    description: 'Mission paused',
  },
  {
    from: MissionState.TESTING,
    to: MissionState.TESTING,
    trigger: TransitionTrigger.PAUSE,
    description: 'Mission paused',
  },
];
