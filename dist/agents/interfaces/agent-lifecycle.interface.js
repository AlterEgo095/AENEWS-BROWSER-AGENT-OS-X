"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_TRANSITIONS = exports.LifecyclePhase = void 0;
const agent_interface_1 = require("./agent.interface");
var LifecyclePhase;
(function (LifecyclePhase) {
    LifecyclePhase["PRE_INITIALIZE"] = "pre_initialize";
    LifecyclePhase["POST_INITIALIZE"] = "post_initialize";
    LifecyclePhase["PRE_START"] = "pre_start";
    LifecyclePhase["POST_START"] = "post_start";
    LifecyclePhase["PRE_EXECUTE"] = "pre_execute";
    LifecyclePhase["POST_EXECUTE"] = "post_execute";
    LifecyclePhase["PRE_PAUSE"] = "pre_pause";
    LifecyclePhase["POST_PAUSE"] = "post_pause";
    LifecyclePhase["PRE_RESUME"] = "pre_resume";
    LifecyclePhase["POST_RESUME"] = "post_resume";
    LifecyclePhase["PRE_STOP"] = "pre_stop";
    LifecyclePhase["POST_STOP"] = "post_stop";
    LifecyclePhase["PRE_DESTROY"] = "pre_destroy";
    LifecyclePhase["POST_DESTROY"] = "post_destroy";
    LifecyclePhase["ON_ERROR"] = "on_error";
    LifecyclePhase["ON_HEALTH_CHECK"] = "on_health_check";
})(LifecyclePhase || (exports.LifecyclePhase = LifecyclePhase = {}));
exports.VALID_TRANSITIONS = {
    [agent_interface_1.AgentStatus.IDLE]: [
        agent_interface_1.AgentStatus.INITIALIZING,
        agent_interface_1.AgentStatus.RUNNING,
        agent_interface_1.AgentStatus.STOPPED,
        agent_interface_1.AgentStatus.MAINTENANCE,
    ],
    [agent_interface_1.AgentStatus.INITIALIZING]: [
        agent_interface_1.AgentStatus.IDLE,
        agent_interface_1.AgentStatus.RUNNING,
        agent_interface_1.AgentStatus.ERROR,
        agent_interface_1.AgentStatus.STOPPED,
    ],
    [agent_interface_1.AgentStatus.RUNNING]: [
        agent_interface_1.AgentStatus.IDLE,
        agent_interface_1.AgentStatus.PAUSED,
        agent_interface_1.AgentStatus.ERROR,
        agent_interface_1.AgentStatus.STOPPED,
        agent_interface_1.AgentStatus.MAINTENANCE,
    ],
    [agent_interface_1.AgentStatus.PAUSED]: [
        agent_interface_1.AgentStatus.RUNNING,
        agent_interface_1.AgentStatus.STOPPED,
        agent_interface_1.AgentStatus.ERROR,
        agent_interface_1.AgentStatus.MAINTENANCE,
    ],
    [agent_interface_1.AgentStatus.ERROR]: [
        agent_interface_1.AgentStatus.IDLE,
        agent_interface_1.AgentStatus.INITIALIZING,
        agent_interface_1.AgentStatus.STOPPED,
        agent_interface_1.AgentStatus.MAINTENANCE,
    ],
    [agent_interface_1.AgentStatus.STOPPED]: [
        agent_interface_1.AgentStatus.INITIALIZING,
        agent_interface_1.AgentStatus.IDLE,
    ],
    [agent_interface_1.AgentStatus.MAINTENANCE]: [
        agent_interface_1.AgentStatus.IDLE,
        agent_interface_1.AgentStatus.STOPPED,
        agent_interface_1.AgentStatus.RUNNING,
    ],
};
//# sourceMappingURL=agent-lifecycle.interface.js.map