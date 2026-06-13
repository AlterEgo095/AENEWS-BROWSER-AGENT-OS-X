"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MissionStateMachineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionStateMachineService = exports.TransitionTrigger = exports.MissionState = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
var interfaces_2 = require("../interfaces");
Object.defineProperty(exports, "MissionState", { enumerable: true, get: function () { return interfaces_2.MissionState; } });
Object.defineProperty(exports, "TransitionTrigger", { enumerable: true, get: function () { return interfaces_2.TransitionTrigger; } });
let MissionStateMachineService = MissionStateMachineService_1 = class MissionStateMachineService {
    constructor() {
        this.logger = new common_1.Logger(MissionStateMachineService_1.name);
        this.timelines = new Map();
        this.pausedStates = new Map();
    }
    initializeMission(missionId) {
        const timeline = {
            missionId,
            entries: [
                {
                    state: interfaces_1.MissionState.DRAFT,
                    enteredAt: new Date(),
                    trigger: interfaces_1.TransitionTrigger.SUBMIT,
                    notes: 'Mission created',
                    artifacts: [],
                },
            ],
            currentState: interfaces_1.MissionState.DRAFT,
            stateDurations: Object.values(interfaces_1.MissionState).reduce((acc, state) => ({ ...acc, [state]: 0 }), {}),
        };
        this.timelines.set(missionId, timeline);
        this.logger.log(`Mission ${missionId} initialized in DRAFT state`);
        return timeline;
    }
    async transition(context) {
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
        const validTransition = interfaces_1.VALID_TRANSITIONS.find(t => t.from === timeline.currentState && t.to !== timeline.currentState && t.trigger === context.trigger);
        if (!validTransition) {
            const errorMsg = `Invalid transition: ${timeline.currentState} + ${context.trigger}`;
            this.logger.warn(errorMsg);
            return {
                success: false,
                previousState: timeline.currentState,
                newState: timeline.currentState,
                timestamp: new Date(),
                error: errorMsg,
                warnings: [`Transition ${context.trigger} is not valid from state ${timeline.currentState}`],
            };
        }
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
            }
            catch (error) {
                return {
                    success: false,
                    previousState: timeline.currentState,
                    newState: timeline.currentState,
                    timestamp: new Date(),
                    error: `Guard check failed: ${error.message}`,
                    warnings: [],
                };
            }
        }
        const currentEntry = timeline.entries[timeline.entries.length - 1];
        if (currentEntry && !currentEntry.exitedAt) {
            currentEntry.exitedAt = new Date();
            currentEntry.duration = currentEntry.exitedAt.getTime() - currentEntry.enteredAt.getTime();
            timeline.stateDurations[currentEntry.state] += currentEntry.duration;
        }
        const newEntry = {
            state: validTransition.to,
            enteredAt: new Date(),
            trigger: context.trigger,
            agentId: context.agentId,
            notes: validTransition.description,
            artifacts: context.artifacts || [],
        };
        timeline.entries.push(newEntry);
        timeline.currentState = validTransition.to;
        this.logger.log(`Mission ${context.missionId}: ${validTransition.from} → ${validTransition.to} (${context.trigger})`);
        return {
            success: true,
            previousState: validTransition.from,
            newState: validTransition.to,
            timestamp: new Date(),
            warnings: [],
        };
    }
    pause(missionId) {
        const timeline = this.timelines.get(missionId);
        if (!timeline)
            return false;
        this.pausedStates.set(missionId, timeline.currentState);
        this.logger.log(`Mission ${missionId} paused in state ${timeline.currentState}`);
        return true;
    }
    resume(missionId) {
        const pausedState = this.pausedStates.get(missionId);
        if (!pausedState)
            return null;
        this.pausedStates.delete(missionId);
        this.logger.log(`Mission ${missionId} resumed in state ${pausedState}`);
        return pausedState;
    }
    getCurrentState(missionId) {
        const timeline = this.timelines.get(missionId);
        return timeline?.currentState || null;
    }
    getTimeline(missionId) {
        return this.timelines.get(missionId);
    }
    getMissionsInState(state) {
        const missionIds = [];
        for (const [id, timeline] of this.timelines) {
            if (timeline.currentState === state) {
                missionIds.push(id);
            }
        }
        return missionIds;
    }
    getProgress(missionId) {
        const timeline = this.timelines.get(missionId);
        if (!timeline)
            return 0;
        const stateOrder = [
            interfaces_1.MissionState.DRAFT,
            interfaces_1.MissionState.PLANNED,
            interfaces_1.MissionState.RESEARCH,
            interfaces_1.MissionState.BUILDING,
            interfaces_1.MissionState.TESTING,
            interfaces_1.MissionState.AUDITING,
            interfaces_1.MissionState.CERTIFYING,
            interfaces_1.MissionState.DELIVERING,
            interfaces_1.MissionState.COMPLETED,
            interfaces_1.MissionState.ARCHIVED,
        ];
        const currentIndex = stateOrder.indexOf(timeline.currentState);
        return Math.round((currentIndex / (stateOrder.length - 1)) * 100);
    }
    getAvailableTransitions(missionId) {
        const timeline = this.timelines.get(missionId);
        if (!timeline)
            return [];
        return interfaces_1.VALID_TRANSITIONS.filter(t => t.from === timeline.currentState && t.to !== timeline.currentState);
    }
    archiveMission(missionId) {
        const timeline = this.timelines.get(missionId);
        if (!timeline)
            return null;
        const firstEntry = timeline.entries[0];
        const lastEntry = timeline.entries[timeline.entries.length - 1];
        if (firstEntry && lastEntry) {
            timeline.totalDuration = (lastEntry.exitedAt || new Date()).getTime() - firstEntry.enteredAt.getTime();
        }
        this.timelines.delete(missionId);
        this.logger.log(`Mission ${missionId} archived. Total duration: ${timeline.totalDuration || 0}ms`);
        return timeline;
    }
};
exports.MissionStateMachineService = MissionStateMachineService;
exports.MissionStateMachineService = MissionStateMachineService = MissionStateMachineService_1 = __decorate([
    (0, common_1.Injectable)()
], MissionStateMachineService);
//# sourceMappingURL=mission-state-machine.service.js.map