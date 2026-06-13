/**
 * AENEWS Software Factory — Mission State Machine
 *
 * Strict state machine governing mission lifecycle:
 * DRAFT → PLANNED → RESEARCH → BUILDING → TESTING →
 * AUDITING → CERTIFYING → DELIVERING → COMPLETED → ARCHIVED
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  MissionState,
  TransitionTrigger,
  StateTransition,
  TransitionContext,
  TransitionResult,
  MissionTimeline,
  MissionTimelineEntry,
  VALID_TRANSITIONS,
} from '../interfaces';

// Re-export for convenience
export { MissionState, TransitionTrigger } from '../interfaces';

@Injectable()
export class MissionStateMachineService {
  private readonly logger = new Logger(MissionStateMachineService.name);
  private readonly timelines = new Map<string, MissionTimeline>();
  private readonly pausedStates = new Map<string, MissionState>();

  /**
   * Initialize a new mission timeline
   */
  initializeMission(missionId: string): MissionTimeline {
    const timeline: MissionTimeline = {
      missionId,
      entries: [
        {
          state: MissionState.DRAFT,
          enteredAt: new Date(),
          trigger: TransitionTrigger.SUBMIT,
          notes: 'Mission created',
          artifacts: [],
        },
      ],
      currentState: MissionState.DRAFT,
      stateDurations: Object.values(MissionState).reduce(
        (acc, state) => ({ ...acc, [state]: 0 }),
        {} as Record<MissionState, number>,
      ),
    };

    this.timelines.set(missionId, timeline);
    this.logger.log(`Mission ${missionId} initialized in DRAFT state`);
    return timeline;
  }

  /**
   * Attempt a state transition
   */
  async transition(context: TransitionContext): Promise<TransitionResult> {
    const timeline = this.timelines.get(context.missionId);
    if (!timeline) {
      return {
        success: false,
        previousState: context.currentState,
        newState: context.currentState,
        timestamp: new Date(),
        error: `No timeline found for mission ${context.missionId}`,
        warnings: [],
      };
    }

    // Find valid transition
    const validTransition = VALID_TRANSITIONS.find(
      (t) =>
        t.from === timeline.currentState &&
        t.to !== timeline.currentState &&
        t.trigger === context.trigger,
    );

    if (!validTransition) {
      const errorMsg = `Invalid transition: ${timeline.currentState} + ${context.trigger}`;
      this.logger.warn(errorMsg);
      return {
        success: false,
        previousState: timeline.currentState,
        newState: timeline.currentState,
        timestamp: new Date(),
        error: errorMsg,
        warnings: [
          `Transition ${context.trigger} is not valid from state ${timeline.currentState}`,
        ],
      };
    }

    // Run guard if exists
    if (validTransition.guard) {
      try {
        const guardResult = await validTransition.guard.check(context);
        if (!guardResult) {
          this.logger.warn(`Guard blocked transition: ${validTransition.guard.errorMessage}`);
          return {
            success: false,
            previousState: timeline.currentState,
            newState: timeline.currentState,
            timestamp: new Date(),
            error: validTransition.guard.errorMessage,
            warnings: [],
          };
        }
      } catch (error) {
        return {
          success: false,
          previousState: timeline.currentState,
          newState: timeline.currentState,
          timestamp: new Date(),
          error: `Guard check failed: ${(error as Error).message}`,
          warnings: [],
        };
      }
    }

    // Close previous state entry
    const currentEntry = timeline.entries[timeline.entries.length - 1];
    if (currentEntry && !currentEntry.exitedAt) {
      currentEntry.exitedAt = new Date();
      currentEntry.duration = currentEntry.exitedAt.getTime() - currentEntry.enteredAt.getTime();
      timeline.stateDurations[currentEntry.state] += currentEntry.duration;
    }

    // Create new timeline entry
    const newEntry: MissionTimelineEntry = {
      state: validTransition.to,
      enteredAt: new Date(),
      trigger: context.trigger,
      agentId: context.agentId,
      notes: validTransition.description,
      artifacts: context.artifacts || [],
    };

    timeline.entries.push(newEntry);
    timeline.currentState = validTransition.to;

    this.logger.log(
      `Mission ${context.missionId}: ${validTransition.from} → ${validTransition.to} (${context.trigger})`,
    );

    return {
      success: true,
      previousState: validTransition.from,
      newState: validTransition.to,
      timestamp: new Date(),
      warnings: [],
    };
  }

  /**
   * Pause a mission (preserves current state)
   */
  pause(missionId: string): boolean {
    const timeline = this.timelines.get(missionId);
    if (!timeline) return false;
    this.pausedStates.set(missionId, timeline.currentState);
    this.logger.log(`Mission ${missionId} paused in state ${timeline.currentState}`);
    return true;
  }

  /**
   * Resume a paused mission
   */
  resume(missionId: string): MissionState | null {
    const pausedState = this.pausedStates.get(missionId);
    if (!pausedState) return null;
    this.pausedStates.delete(missionId);
    this.logger.log(`Mission ${missionId} resumed in state ${pausedState}`);
    return pausedState;
  }

  /**
   * Get current state of a mission
   */
  getCurrentState(missionId: string): MissionState | null {
    const timeline = this.timelines.get(missionId);
    return timeline?.currentState || null;
  }

  /**
   * Get full timeline for a mission
   */
  getTimeline(missionId: string): MissionTimeline | undefined {
    return this.timelines.get(missionId);
  }

  /**
   * Get all missions in a specific state
   */
  getMissionsInState(state: MissionState): string[] {
    const missionIds: string[] = [];
    for (const [id, timeline] of this.timelines) {
      if (timeline.currentState === state) {
        missionIds.push(id);
      }
    }
    return missionIds;
  }

  /**
   * Calculate mission progress as percentage
   */
  getProgress(missionId: string): number {
    const timeline = this.timelines.get(missionId);
    if (!timeline) return 0;

    const stateOrder = [
      MissionState.DRAFT,
      MissionState.PLANNED,
      MissionState.RESEARCH,
      MissionState.BUILDING,
      MissionState.TESTING,
      MissionState.AUDITING,
      MissionState.CERTIFYING,
      MissionState.DELIVERING,
      MissionState.COMPLETED,
      MissionState.ARCHIVED,
    ];

    const currentIndex = stateOrder.indexOf(timeline.currentState);
    return Math.round((currentIndex / (stateOrder.length - 1)) * 100);
  }

  /**
   * Get available transitions for current state
   */
  getAvailableTransitions(missionId: string): StateTransition[] {
    const timeline = this.timelines.get(missionId);
    if (!timeline) return [];

    return VALID_TRANSITIONS.filter(
      (t) => t.from === timeline.currentState && t.to !== timeline.currentState,
    );
  }

  /**
   * Archive a mission timeline (remove from active tracking)
   */
  archiveMission(missionId: string): MissionTimeline | null {
    const timeline = this.timelines.get(missionId);
    if (!timeline) return null;

    // Calculate total duration
    const firstEntry = timeline.entries[0];
    const lastEntry = timeline.entries[timeline.entries.length - 1];
    if (firstEntry && lastEntry) {
      timeline.totalDuration =
        (lastEntry.exitedAt || new Date()).getTime() - firstEntry.enteredAt.getTime();
    }

    this.timelines.delete(missionId);
    this.logger.log(
      `Mission ${missionId} archived. Total duration: ${timeline.totalDuration || 0}ms`,
    );
    return timeline;
  }
}
