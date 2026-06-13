"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_TRANSITIONS = exports.VALID_TRANSITIONS = exports.TransitionTrigger = exports.MissionState = void 0;
var MissionState;
(function (MissionState) {
    MissionState["DRAFT"] = "DRAFT";
    MissionState["PLANNED"] = "PLANNED";
    MissionState["RESEARCH"] = "RESEARCH";
    MissionState["BUILDING"] = "BUILDING";
    MissionState["TESTING"] = "TESTING";
    MissionState["AUDITING"] = "AUDITING";
    MissionState["CERTIFYING"] = "CERTIFYING";
    MissionState["DELIVERING"] = "DELIVERING";
    MissionState["COMPLETED"] = "COMPLETED";
    MissionState["ARCHIVED"] = "ARCHIVED";
})(MissionState || (exports.MissionState = MissionState = {}));
var TransitionTrigger;
(function (TransitionTrigger) {
    TransitionTrigger["SUBMIT"] = "SUBMIT";
    TransitionTrigger["APPROVE_PLAN"] = "APPROVE_PLAN";
    TransitionTrigger["START_RESEARCH"] = "START_RESEARCH";
    TransitionTrigger["START_BUILD"] = "START_BUILD";
    TransitionTrigger["START_TESTING"] = "START_TESTING";
    TransitionTrigger["START_AUDIT"] = "START_AUDIT";
    TransitionTrigger["START_CERTIFICATION"] = "START_CERTIFICATION";
    TransitionTrigger["START_DELIVERY"] = "START_DELIVERY";
    TransitionTrigger["MARK_COMPLETE"] = "MARK_COMPLETE";
    TransitionTrigger["ARCHIVE"] = "ARCHIVE";
    TransitionTrigger["REJECT"] = "REJECT";
    TransitionTrigger["FAIL"] = "FAIL";
    TransitionTrigger["PAUSE"] = "PAUSE";
    TransitionTrigger["RESUME"] = "RESUME";
    TransitionTrigger["ROLLBACK"] = "ROLLBACK";
})(TransitionTrigger || (exports.TransitionTrigger = TransitionTrigger = {}));
exports.VALID_TRANSITIONS = [
    { from: MissionState.DRAFT, to: MissionState.PLANNED, trigger: TransitionTrigger.SUBMIT, description: 'Mission submitted for planning' },
    { from: MissionState.PLANNED, to: MissionState.RESEARCH, trigger: TransitionTrigger.START_RESEARCH, description: 'Plan approved, starting research' },
    { from: MissionState.PLANNED, to: MissionState.DRAFT, trigger: TransitionTrigger.REJECT, description: 'Plan rejected, back to draft' },
    { from: MissionState.RESEARCH, to: MissionState.BUILDING, trigger: TransitionTrigger.START_BUILD, description: 'Research complete, starting build' },
    { from: MissionState.RESEARCH, to: MissionState.PLANNED, trigger: TransitionTrigger.ROLLBACK, description: 'Research insufficient, re-planning' },
    { from: MissionState.BUILDING, to: MissionState.TESTING, trigger: TransitionTrigger.START_TESTING, description: 'Build complete, starting tests' },
    { from: MissionState.BUILDING, to: MissionState.RESEARCH, trigger: TransitionTrigger.ROLLBACK, description: 'Build blocked, need more research' },
    { from: MissionState.TESTING, to: MissionState.AUDITING, trigger: TransitionTrigger.START_AUDIT, description: 'Tests passing, starting audit' },
    { from: MissionState.TESTING, to: MissionState.BUILDING, trigger: TransitionTrigger.ROLLBACK, description: 'Tests failed, back to building' },
    { from: MissionState.AUDITING, to: MissionState.CERTIFYING, trigger: TransitionTrigger.START_CERTIFICATION, description: 'Audit passed, certifying' },
    { from: MissionState.AUDITING, to: MissionState.BUILDING, trigger: TransitionTrigger.ROLLBACK, description: 'Audit found issues, back to building' },
    { from: MissionState.CERTIFYING, to: MissionState.DELIVERING, trigger: TransitionTrigger.START_DELIVERY, description: 'Certified, starting delivery' },
    { from: MissionState.CERTIFYING, to: MissionState.AUDITING, trigger: TransitionTrigger.ROLLBACK, description: 'Certification failed, re-auditing' },
    { from: MissionState.DELIVERING, to: MissionState.COMPLETED, trigger: TransitionTrigger.MARK_COMPLETE, description: 'Delivered, mission complete' },
    { from: MissionState.DELIVERING, to: MissionState.CERTIFYING, trigger: TransitionTrigger.ROLLBACK, description: 'Delivery failed, re-certifying' },
    { from: MissionState.COMPLETED, to: MissionState.ARCHIVED, trigger: TransitionTrigger.ARCHIVE, description: 'Mission archived' },
];
exports.GLOBAL_TRANSITIONS = [
    { from: MissionState.DRAFT, to: MissionState.DRAFT, trigger: TransitionTrigger.PAUSE, description: 'Mission paused' },
    { from: MissionState.PLANNED, to: MissionState.PLANNED, trigger: TransitionTrigger.PAUSE, description: 'Mission paused' },
    { from: MissionState.RESEARCH, to: MissionState.RESEARCH, trigger: TransitionTrigger.PAUSE, description: 'Mission paused' },
    { from: MissionState.BUILDING, to: MissionState.BUILDING, trigger: TransitionTrigger.PAUSE, description: 'Mission paused' },
    { from: MissionState.TESTING, to: MissionState.TESTING, trigger: TransitionTrigger.PAUSE, description: 'Mission paused' },
];
//# sourceMappingURL=mission-state.interface.js.map