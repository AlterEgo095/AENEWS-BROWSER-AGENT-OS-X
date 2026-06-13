import { MissionState, StateTransition, TransitionContext, TransitionResult, MissionTimeline } from '../interfaces';
export { MissionState, TransitionTrigger } from '../interfaces';
export declare class MissionStateMachineService {
    private readonly logger;
    private readonly timelines;
    private readonly pausedStates;
    initializeMission(missionId: string): MissionTimeline;
    transition(context: TransitionContext): Promise<TransitionResult>;
    pause(missionId: string): boolean;
    resume(missionId: string): MissionState | null;
    getCurrentState(missionId: string): MissionState | null;
    getTimeline(missionId: string): MissionTimeline | undefined;
    getMissionsInState(state: MissionState): string[];
    getProgress(missionId: string): number;
    getAvailableTransitions(missionId: string): StateTransition[];
    archiveMission(missionId: string): MissionTimeline | null;
}
