"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_HANDLERS_METADATA_KEY = exports.EVENT_HANDLER_METADATA_KEY = void 0;
exports.OnAgentEvent = OnAgentEvent;
exports.getEventHandlerMetadata = getEventHandlerMetadata;
exports.OnAgentStarted = OnAgentStarted;
exports.OnTaskCompleted = OnTaskCompleted;
exports.OnTaskFailed = OnTaskFailed;
exports.OnAgentError = OnAgentError;
exports.OnSystemAlert = OnSystemAlert;
exports.OnOrchestrationCompleted = OnOrchestrationCompleted;
exports.OnCircuitBreakerOpened = OnCircuitBreakerOpened;
const common_1 = require("@nestjs/common");
const agent_event_interface_1 = require("../interfaces/agent-event.interface");
exports.EVENT_HANDLER_METADATA_KEY = 'agent:event_handler';
exports.EVENT_HANDLERS_METADATA_KEY = 'agent:event_handlers';
function OnAgentEvent(optionsOrEventType) {
    return (target, propertyKey, descriptor) => {
        const methodName = typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey;
        let metadata;
        if (typeof optionsOrEventType === 'string') {
            metadata = {
                eventType: optionsOrEventType,
                methodName,
                priority: 0,
            };
        }
        else {
            metadata = {
                eventType: optionsOrEventType.eventType,
                filter: optionsOrEventType.filter,
                methodName,
                priority: optionsOrEventType.priority || 0,
            };
        }
        (0, common_1.SetMetadata)(exports.EVENT_HANDLER_METADATA_KEY, metadata)(target, propertyKey, descriptor);
        const existingHandlers = Reflect.getMetadata(exports.EVENT_HANDLERS_METADATA_KEY, target.constructor) || [];
        existingHandlers.push(metadata);
        Reflect.defineMetadata(exports.EVENT_HANDLERS_METADATA_KEY, existingHandlers, target.constructor);
        if (!target.constructor.__eventHandlers) {
            target.constructor.__eventHandlers = [];
        }
        target.constructor.__eventHandlers.push(metadata);
        return descriptor;
    };
}
function getEventHandlerMetadata(target) {
    return (target.__eventHandlers ||
        Reflect.getMetadata(exports.EVENT_HANDLERS_METADATA_KEY, target) ||
        []);
}
function OnAgentStarted(filter) {
    return OnAgentEvent({
        eventType: agent_event_interface_1.AgentEventType.AGENT_STARTED,
        filter,
    });
}
function OnTaskCompleted(filter) {
    return OnAgentEvent({
        eventType: agent_event_interface_1.AgentEventType.TASK_COMPLETED,
        filter,
    });
}
function OnTaskFailed(filter) {
    return OnAgentEvent({
        eventType: agent_event_interface_1.AgentEventType.TASK_FAILED,
        filter,
    });
}
function OnAgentError(filter) {
    return OnAgentEvent({
        eventType: agent_event_interface_1.AgentEventType.AGENT_ERROR,
        filter,
    });
}
function OnSystemAlert(filter) {
    return OnAgentEvent({
        eventType: agent_event_interface_1.AgentEventType.SYSTEM_ALERT,
        filter,
    });
}
function OnOrchestrationCompleted(filter) {
    return OnAgentEvent({
        eventType: agent_event_interface_1.AgentEventType.ORCHESTRATION_COMPLETED,
        filter,
    });
}
function OnCircuitBreakerOpened(filter) {
    return OnAgentEvent({
        eventType: agent_event_interface_1.AgentEventType.CIRCUIT_BREAKER_OPENED,
        filter,
    });
}
//# sourceMappingURL=event.decorator.js.map