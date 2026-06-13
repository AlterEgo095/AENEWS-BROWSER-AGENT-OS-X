import { AgentEventType, EventFilter } from '../interfaces/agent-event.interface';
export declare const EVENT_HANDLER_METADATA_KEY = "agent:event_handler";
export declare const EVENT_HANDLERS_METADATA_KEY = "agent:event_handlers";
export interface EventHandlerMetadata {
    eventType: AgentEventType | string;
    filter?: EventFilter;
    methodName: string;
    priority?: number;
}
export interface OnAgentEventOptions {
    eventType: AgentEventType | string;
    filter?: EventFilter;
    priority?: number;
}
export declare function OnAgentEvent(options: OnAgentEventOptions): MethodDecorator;
export declare function OnAgentEvent(eventType: AgentEventType | string): MethodDecorator;
export declare function getEventHandlerMetadata(target: Function): EventHandlerMetadata[];
export declare function OnAgentStarted(filter?: EventFilter): MethodDecorator;
export declare function OnTaskCompleted(filter?: EventFilter): MethodDecorator;
export declare function OnTaskFailed(filter?: EventFilter): MethodDecorator;
export declare function OnAgentError(filter?: EventFilter): MethodDecorator;
export declare function OnSystemAlert(filter?: EventFilter): MethodDecorator;
export declare function OnOrchestrationCompleted(filter?: EventFilter): MethodDecorator;
export declare function OnCircuitBreakerOpened(filter?: EventFilter): MethodDecorator;
