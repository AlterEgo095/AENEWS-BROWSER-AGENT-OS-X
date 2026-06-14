"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryStrategy = exports.FailureType = exports.ResourceType = exports.TimeGranularity = exports.ApprovalStatus = exports.ApprovalActionType = exports.RiskLevel = exports.TaskEdgeType = exports.MissionStatus = exports.RuleEnforcement = exports.RuleSeverity = exports.RuleType = exports.ObjectiveStatus = exports.SkillLevel = void 0;
var SkillLevel;
(function (SkillLevel) {
    SkillLevel["NOVICE"] = "NOVICE";
    SkillLevel["COMPETENT"] = "COMPETENT";
    SkillLevel["PROFICIENT"] = "PROFICIENT";
    SkillLevel["EXPERT"] = "EXPERT";
    SkillLevel["MASTER"] = "MASTER";
})(SkillLevel || (exports.SkillLevel = SkillLevel = {}));
var ObjectiveStatus;
(function (ObjectiveStatus) {
    ObjectiveStatus["PENDING"] = "PENDING";
    ObjectiveStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ObjectiveStatus["COMPLETED"] = "COMPLETED";
    ObjectiveStatus["ABANDONED"] = "ABANDONED";
})(ObjectiveStatus || (exports.ObjectiveStatus = ObjectiveStatus = {}));
var RuleType;
(function (RuleType) {
    RuleType["PROHIBITION"] = "PROHIBITION";
    RuleType["REQUIREMENT"] = "REQUIREMENT";
    RuleType["CONSTRAINT"] = "CONSTRAINT";
    RuleType["GUIDELINE"] = "GUIDELINE";
})(RuleType || (exports.RuleType = RuleType = {}));
var RuleSeverity;
(function (RuleSeverity) {
    RuleSeverity["CRITICAL"] = "CRITICAL";
    RuleSeverity["HIGH"] = "HIGH";
    RuleSeverity["MEDIUM"] = "MEDIUM";
    RuleSeverity["LOW"] = "LOW";
})(RuleSeverity || (exports.RuleSeverity = RuleSeverity = {}));
var RuleEnforcement;
(function (RuleEnforcement) {
    RuleEnforcement["BLOCK"] = "BLOCK";
    RuleEnforcement["WARN"] = "WARN";
    RuleEnforcement["LOG"] = "LOG";
})(RuleEnforcement || (exports.RuleEnforcement = RuleEnforcement = {}));
var MissionStatus;
(function (MissionStatus) {
    MissionStatus["DRAFT"] = "DRAFT";
    MissionStatus["SIMULATING"] = "SIMULATING";
    MissionStatus["APPROVED"] = "APPROVED";
    MissionStatus["IN_PROGRESS"] = "IN_PROGRESS";
    MissionStatus["PAUSED"] = "PAUSED";
    MissionStatus["COMPLETED"] = "COMPLETED";
    MissionStatus["FAILED"] = "FAILED";
    MissionStatus["CANCELLED"] = "CANCELLED";
})(MissionStatus || (exports.MissionStatus = MissionStatus = {}));
var TaskEdgeType;
(function (TaskEdgeType) {
    TaskEdgeType["HARD_DEPENDENCY"] = "HARD_DEPENDENCY";
    TaskEdgeType["SOFT_DEPENDENCY"] = "SOFT_DEPENDENCY";
    TaskEdgeType["RESOURCE_DEPENDENCY"] = "RESOURCE_DEPENDENCY";
})(TaskEdgeType || (exports.TaskEdgeType = TaskEdgeType = {}));
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["LOW"] = "LOW";
    RiskLevel["MEDIUM"] = "MEDIUM";
    RiskLevel["HIGH"] = "HIGH";
    RiskLevel["CRITICAL"] = "CRITICAL";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
var ApprovalActionType;
(function (ApprovalActionType) {
    ApprovalActionType["DELETE"] = "DELETE";
    ApprovalActionType["DEPLOY_PRODUCTION"] = "DEPLOY_PRODUCTION";
    ApprovalActionType["PAYMENT"] = "PAYMENT";
    ApprovalActionType["EMAIL_SEND"] = "EMAIL_SEND";
    ApprovalActionType["SOCIAL_MEDIA_POST"] = "SOCIAL_MEDIA_POST";
    ApprovalActionType["SSH_ACCESS"] = "SSH_ACCESS";
    ApprovalActionType["DNS_CHANGE"] = "DNS_CHANGE";
    ApprovalActionType["DATABASE_MIGRATION"] = "DATABASE_MIGRATION";
    ApprovalActionType["API_KEY_ROTATION"] = "API_KEY_ROTATION";
})(ApprovalActionType || (exports.ApprovalActionType = ApprovalActionType = {}));
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "PENDING";
    ApprovalStatus["APPROVED"] = "APPROVED";
    ApprovalStatus["REJECTED"] = "REJECTED";
    ApprovalStatus["EXPIRED"] = "EXPIRED";
    ApprovalStatus["CANCELLED"] = "CANCELLED";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
var TimeGranularity;
(function (TimeGranularity) {
    TimeGranularity["MOMENT"] = "MOMENT";
    TimeGranularity["HOUR"] = "HOUR";
    TimeGranularity["DAY"] = "DAY";
    TimeGranularity["WEEK"] = "WEEK";
    TimeGranularity["MONTH"] = "MONTH";
    TimeGranularity["QUARTER"] = "QUARTER";
    TimeGranularity["YEAR"] = "YEAR";
    TimeGranularity["PROJECT"] = "PROJECT";
    TimeGranularity["ARCHIVE"] = "ARCHIVE";
})(TimeGranularity || (exports.TimeGranularity = TimeGranularity = {}));
var ResourceType;
(function (ResourceType) {
    ResourceType["LLM"] = "LLM";
    ResourceType["BROWSER"] = "BROWSER";
    ResourceType["GPU"] = "GPU";
    ResourceType["WORKER"] = "WORKER";
    ResourceType["DATABASE"] = "DATABASE";
    ResourceType["CACHE"] = "CACHE";
    ResourceType["QUEUE"] = "QUEUE";
    ResourceType["STORAGE"] = "STORAGE";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
var FailureType;
(function (FailureType) {
    FailureType["CRASH"] = "CRASH";
    FailureType["TIMEOUT"] = "TIMEOUT";
    FailureType["OOM"] = "OOM";
    FailureType["CIRCUIT_BREAKER_OPEN"] = "CIRCUIT_BREAKER_OPEN";
    FailureType["HEALTH_CHECK_FAILED"] = "HEALTH_CHECK_FAILED";
    FailureType["UNHANDLED_EXCEPTION"] = "UNHANDLED_EXCEPTION";
    FailureType["DEADLOCK"] = "DEADLOCK";
})(FailureType || (exports.FailureType = FailureType = {}));
var RecoveryStrategy;
(function (RecoveryStrategy) {
    RecoveryStrategy["RESTART"] = "RESTART";
    RecoveryStrategy["RESTORE_MEMORY_RESUME"] = "RESTORE_MEMORY_RESUME";
    RecoveryStrategy["FAILOVER"] = "FAILOVER";
    RecoveryStrategy["SCALE_OUT"] = "SCALE_OUT";
    RecoveryStrategy["DEGRADE"] = "DEGRADE";
    RecoveryStrategy["QUARANTINE"] = "QUARANTINE";
})(RecoveryStrategy || (exports.RecoveryStrategy = RecoveryStrategy = {}));
//# sourceMappingURL=mission-os.interfaces.js.map