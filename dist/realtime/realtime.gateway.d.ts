import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventBusService } from '../agents/events/event-bus.service';
export declare enum RealtimeEventType {
    MISSION_SUBMITTED = "mission:submitted",
    MISSION_RUNNING = "mission:running",
    MISSION_COMPLETED = "mission:completed",
    MISSION_FAILED = "mission:failed",
    MISSION_CANCELLED = "mission:cancelled",
    MISSION_QUALITY_GATE = "mission:quality_gate",
    MISSION_ARTIFACT = "mission:artifact",
    AGENT_STARTED = "agent:started",
    AGENT_STOPPED = "agent:stopped",
    AGENT_ERROR = "agent:error",
    AGENT_METRICS = "agent:metrics",
    ORCH_DECOMPOSE = "orchestration:decompose",
    ORCH_PLAN = "orchestration:plan",
    ORCH_EXECUTE = "orchestration:execute",
    ORCH_CRITIQUE = "orchestration:critique",
    ORCH_REPAIR = "orchestration:repair",
    ORCH_VALIDATE = "orchestration:validate",
    ORCH_DELIVER = "orchestration:deliver",
    CONNECTOR_EXECUTING = "connector:executing",
    CONNECTOR_COMPLETED = "connector:completed",
    CONNECTOR_FAILED = "connector:failed",
    SYSTEM_ALERT = "system:alert",
    SYSTEM_HEALTH = "system:health",
    OBSERVABILITY_SNAPSHOT = "observability:snapshot"
}
export interface RealtimePayload {
    type: RealtimeEventType;
    timestamp: Date;
    data: any;
    missionId?: string;
    agentId?: string;
    cluster?: string;
}
export declare class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly eventBus;
    private readonly logger;
    server: Server;
    private readonly clientRooms;
    private totalConnections;
    private totalEventsEmitted;
    constructor(eventBus: EventBusService);
    afterInit(server: Server): Promise<void>;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handleSubscribe(client: Socket, payload: {
        rooms: string[];
    }): void;
    handleUnsubscribe(client: Socket, payload: {
        rooms: string[];
    }): void;
    handleGetStatus(client: Socket): void;
    pushMissionEvent(missionId: string, eventType: RealtimeEventType, data: any): void;
    pushAgentEvent(agentId: string, cluster: string, eventType: RealtimeEventType, data: any): void;
    pushOrchestrationEvent(missionId: string, eventType: RealtimeEventType, data: any): void;
    pushSystemEvent(eventType: RealtimeEventType, data: any): void;
    pushConnectorEvent(missionId: string, connectorName: string, eventType: RealtimeEventType, data: any): void;
    private relayEvent;
    private mapEventType;
    private getClientCount;
}
