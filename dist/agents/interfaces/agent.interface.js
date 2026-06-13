"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskStatus = exports.TaskPriority = exports.AgentErrorCode = exports.AgentError = exports.AgentCluster = exports.AgentStatus = void 0;
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["IDLE"] = "idle";
    AgentStatus["INITIALIZING"] = "initializing";
    AgentStatus["RUNNING"] = "running";
    AgentStatus["PAUSED"] = "paused";
    AgentStatus["ERROR"] = "error";
    AgentStatus["STOPPED"] = "stopped";
    AgentStatus["MAINTENANCE"] = "maintenance";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
var AgentCluster;
(function (AgentCluster) {
    AgentCluster["BROWSER"] = "browser";
    AgentCluster["COMPUTER"] = "computer";
    AgentCluster["CODING"] = "coding";
    AgentCluster["OFFICE"] = "office";
    AgentCluster["MARKETING"] = "marketing";
    AgentCluster["BUSINESS"] = "business";
    AgentCluster["INFRASTRUCTURE"] = "infrastructure";
    AgentCluster["SECURITY"] = "security";
    AgentCluster["META_INTELLIGENCE"] = "meta_intelligence";
})(AgentCluster || (exports.AgentCluster = AgentCluster = {}));
class AgentError extends Error {
    constructor(message, code, agentId, taskId, cause) {
        super(message);
        this.code = code;
        this.agentId = agentId;
        this.taskId = taskId;
        this.cause = cause;
        this.name = 'AgentError';
    }
}
exports.AgentError = AgentError;
var AgentErrorCode;
(function (AgentErrorCode) {
    AgentErrorCode["INITIALIZATION_FAILED"] = "AGENT_INITIALIZATION_FAILED";
    AgentErrorCode["EXECUTION_FAILED"] = "AGENT_EXECUTION_FAILED";
    AgentErrorCode["TIMEOUT"] = "AGENT_TIMEOUT";
    AgentErrorCode["PERMISSION_DENIED"] = "AGENT_PERMISSION_DENIED";
    AgentErrorCode["INVALID_INPUT"] = "AGENT_INVALID_INPUT";
    AgentErrorCode["NOT_FOUND"] = "AGENT_NOT_FOUND";
    AgentErrorCode["ALREADY_RUNNING"] = "AGENT_ALREADY_RUNNING";
    AgentErrorCode["NOT_RUNNING"] = "AGENT_NOT_RUNNING";
    AgentErrorCode["PAUSE_FAILED"] = "AGENT_PAUSE_FAILED";
    AgentErrorCode["RESUME_FAILED"] = "AGENT_RESUME_FAILED";
    AgentErrorCode["STOP_FAILED"] = "AGENT_STOP_FAILED";
    AgentErrorCode["DESTROY_FAILED"] = "AGENT_DESTROY_FAILED";
    AgentErrorCode["HEALTH_CHECK_FAILED"] = "AGENT_HEALTH_CHECK_FAILED";
    AgentErrorCode["MAX_CONCURRENT_TASKS"] = "AGENT_MAX_CONCURRENT_TASKS";
    AgentErrorCode["RETRY_EXHAUSTED"] = "AGENT_RETRY_EXHAUSTED";
    AgentErrorCode["CIRCUIT_BREAKER_OPEN"] = "AGENT_CIRCUIT_BREAKER_OPEN";
    AgentErrorCode["COMMUNICATION_FAILED"] = "AGENT_COMMUNICATION_FAILED";
    AgentErrorCode["MEMORY_ERROR"] = "AGENT_MEMORY_ERROR";
})(AgentErrorCode || (exports.AgentErrorCode = AgentErrorCode = {}));
var TaskPriority;
(function (TaskPriority) {
    TaskPriority[TaskPriority["LOW"] = 0] = "LOW";
    TaskPriority[TaskPriority["NORMAL"] = 1] = "NORMAL";
    TaskPriority[TaskPriority["HIGH"] = 2] = "HIGH";
    TaskPriority[TaskPriority["CRITICAL"] = 3] = "CRITICAL";
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["DECOMPOSING"] = "decomposing";
    TaskStatus["PLANNING"] = "planning";
    TaskStatus["EXECUTING"] = "executing";
    TaskStatus["CRITIQUING"] = "critiquing";
    TaskStatus["REPAIRING"] = "repairing";
    TaskStatus["VALIDATING"] = "validating";
    TaskStatus["DELIVERING"] = "delivering";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["FAILED"] = "failed";
    TaskStatus["CANCELLED"] = "cancelled";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
//# sourceMappingURL=agent.interface.js.map