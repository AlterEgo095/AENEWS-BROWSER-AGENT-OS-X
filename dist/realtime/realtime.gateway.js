"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RealtimeGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeGateway = exports.RealtimeEventType = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const event_bus_service_1 = require("../agents/events/event-bus.service");
const agent_event_interface_1 = require("../agents/interfaces/agent-event.interface");
var RealtimeEventType;
(function (RealtimeEventType) {
    RealtimeEventType["MISSION_SUBMITTED"] = "mission:submitted";
    RealtimeEventType["MISSION_RUNNING"] = "mission:running";
    RealtimeEventType["MISSION_COMPLETED"] = "mission:completed";
    RealtimeEventType["MISSION_FAILED"] = "mission:failed";
    RealtimeEventType["MISSION_CANCELLED"] = "mission:cancelled";
    RealtimeEventType["MISSION_QUALITY_GATE"] = "mission:quality_gate";
    RealtimeEventType["MISSION_ARTIFACT"] = "mission:artifact";
    RealtimeEventType["AGENT_STARTED"] = "agent:started";
    RealtimeEventType["AGENT_STOPPED"] = "agent:stopped";
    RealtimeEventType["AGENT_ERROR"] = "agent:error";
    RealtimeEventType["AGENT_METRICS"] = "agent:metrics";
    RealtimeEventType["ORCH_DECOMPOSE"] = "orchestration:decompose";
    RealtimeEventType["ORCH_PLAN"] = "orchestration:plan";
    RealtimeEventType["ORCH_EXECUTE"] = "orchestration:execute";
    RealtimeEventType["ORCH_CRITIQUE"] = "orchestration:critique";
    RealtimeEventType["ORCH_REPAIR"] = "orchestration:repair";
    RealtimeEventType["ORCH_VALIDATE"] = "orchestration:validate";
    RealtimeEventType["ORCH_DELIVER"] = "orchestration:deliver";
    RealtimeEventType["CONNECTOR_EXECUTING"] = "connector:executing";
    RealtimeEventType["CONNECTOR_COMPLETED"] = "connector:completed";
    RealtimeEventType["CONNECTOR_FAILED"] = "connector:failed";
    RealtimeEventType["SYSTEM_ALERT"] = "system:alert";
    RealtimeEventType["SYSTEM_HEALTH"] = "system:health";
    RealtimeEventType["OBSERVABILITY_SNAPSHOT"] = "observability:snapshot";
})(RealtimeEventType || (exports.RealtimeEventType = RealtimeEventType = {}));
let RealtimeGateway = RealtimeGateway_1 = class RealtimeGateway {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.logger = new common_1.Logger(RealtimeGateway_1.name);
        this.clientRooms = new Map();
        this.totalConnections = 0;
        this.totalEventsEmitted = 0;
    }
    async afterInit(server) {
        this.logger.log('Real-time WebSocket Gateway initialized');
        this.eventBus.subscribeTo('*', async (event) => {
            await this.relayEvent(event);
        });
        this.logger.log('Event bus relay active — all agent events → WebSocket clients');
    }
    async handleConnection(client) {
        this.totalConnections++;
        this.clientRooms.set(client.id, new Set());
        this.logger.debug(`Client connected: ${client.id} (total: ${this.getClientCount()})`);
        client.emit('connected', {
            message: 'AENEWS Agent OS X — Real-time Gateway',
            timestamp: new Date(),
            rooms: ['missions', 'agents', 'orchestration', 'observability'],
        });
    }
    async handleDisconnect(client) {
        this.clientRooms.delete(client.id);
        this.logger.debug(`Client disconnected: ${client.id} (total: ${this.getClientCount()})`);
    }
    handleSubscribe(client, payload) {
        const rooms = payload.rooms || [];
        const clientRoomSet = this.clientRooms.get(client.id) || new Set();
        for (const room of rooms) {
            client.join(room);
            clientRoomSet.add(room);
        }
        this.clientRooms.set(client.id, clientRoomSet);
        client.emit('subscribed', { rooms, timestamp: new Date() });
        this.logger.debug(`Client ${client.id} subscribed to: ${rooms.join(', ')}`);
    }
    handleUnsubscribe(client, payload) {
        const rooms = payload.rooms || [];
        const clientRoomSet = this.clientRooms.get(client.id);
        for (const room of rooms) {
            client.leave(room);
            clientRoomSet?.delete(room);
        }
        client.emit('unsubscribed', { rooms, timestamp: new Date() });
    }
    handleGetStatus(client) {
        client.emit('status', {
            connectedClients: this.getClientCount(),
            totalConnections: this.totalConnections,
            totalEventsEmitted: this.totalEventsEmitted,
            availableRooms: ['missions', 'agents', 'orchestration', 'observability'],
            serverTime: new Date(),
        });
    }
    pushMissionEvent(missionId, eventType, data) {
        const payload = {
            type: eventType,
            timestamp: new Date(),
            data,
            missionId,
        };
        this.server.to('missions').emit(eventType, payload);
        this.server.to(`mission:${missionId}`).emit(eventType, payload);
        this.totalEventsEmitted++;
    }
    pushAgentEvent(agentId, cluster, eventType, data) {
        const payload = {
            type: eventType,
            timestamp: new Date(),
            data,
            agentId,
            cluster,
        };
        this.server.to('agents').emit(eventType, payload);
        this.server.to(`agent:${agentId}`).emit(eventType, payload);
        this.totalEventsEmitted++;
    }
    pushOrchestrationEvent(missionId, eventType, data) {
        const payload = {
            type: eventType,
            timestamp: new Date(),
            data,
            missionId,
        };
        this.server.to('orchestration').emit(eventType, payload);
        this.server.to(`mission:${missionId}`).emit(eventType, payload);
        this.totalEventsEmitted++;
    }
    pushSystemEvent(eventType, data) {
        const payload = {
            type: eventType,
            timestamp: new Date(),
            data,
        };
        this.server.to('observability').emit(eventType, payload);
        this.totalEventsEmitted++;
    }
    pushConnectorEvent(missionId, connectorName, eventType, data) {
        const payload = {
            type: eventType,
            timestamp: new Date(),
            data: { ...data, connectorName },
            missionId,
        };
        this.server.to('missions').emit(eventType, payload);
        this.server.to(`mission:${missionId}`).emit(eventType, payload);
        this.totalEventsEmitted++;
    }
    async relayEvent(event) {
        try {
            const realtimeType = this.mapEventType(event.type);
            if (!realtimeType)
                return;
            const payload = {
                type: realtimeType,
                timestamp: event.timestamp || new Date(),
                data: event.payload,
                missionId: event.payload?.missionId,
                agentId: event.sourceAgentId,
                cluster: event.cluster,
            };
            if (event.type.startsWith('orchestration.') || event.type.startsWith('ORCHESTRATION_')) {
                this.server.to('orchestration').emit(realtimeType, payload);
                if (payload.missionId) {
                    this.server.to(`mission:${payload.missionId}`).emit(realtimeType, payload);
                }
            }
            else if (event.type.startsWith('agent.') ||
                event.type.startsWith('AGENT_') ||
                event.type.startsWith('TASK_')) {
                this.server.to('agents').emit(realtimeType, payload);
                if (payload.agentId) {
                    this.server.to(`agent:${payload.agentId}`).emit(realtimeType, payload);
                }
            }
            else if (event.type.startsWith('mission.') || event.type.startsWith('MISSION_')) {
                this.server.to('missions').emit(realtimeType, payload);
                if (payload.missionId) {
                    this.server.to(`mission:${payload.missionId}`).emit(realtimeType, payload);
                }
            }
            this.totalEventsEmitted++;
        }
        catch (error) {
            this.logger.error(`Error relaying event: ${error.message}`);
        }
    }
    mapEventType(agentEventType) {
        const mapping = {
            [agent_event_interface_1.AgentEventType.ORCHESTRATION_STARTED]: RealtimeEventType.ORCH_DECOMPOSE,
            [agent_event_interface_1.AgentEventType.ORCHESTRATION_PLANNED]: RealtimeEventType.ORCH_PLAN,
            [agent_event_interface_1.AgentEventType.ORCHESTRATION_COMPLETED]: RealtimeEventType.ORCH_DELIVER,
            [agent_event_interface_1.AgentEventType.ORCHESTRATION_FAILED]: RealtimeEventType.MISSION_FAILED,
            [agent_event_interface_1.AgentEventType.TASK_CREATED]: RealtimeEventType.AGENT_STARTED,
            [agent_event_interface_1.AgentEventType.TASK_COMPLETED]: RealtimeEventType.AGENT_STOPPED,
            [agent_event_interface_1.AgentEventType.TASK_FAILED]: RealtimeEventType.AGENT_ERROR,
            [agent_event_interface_1.AgentEventType.TASK_CANCELLED]: RealtimeEventType.MISSION_CANCELLED,
            [agent_event_interface_1.AgentEventType.AGENT_STARTED]: RealtimeEventType.AGENT_STARTED,
            [agent_event_interface_1.AgentEventType.AGENT_STOPPED]: RealtimeEventType.AGENT_STOPPED,
            [agent_event_interface_1.AgentEventType.AGENT_ERROR]: RealtimeEventType.AGENT_ERROR,
            [agent_event_interface_1.AgentEventType.MESSAGE_SENT]: RealtimeEventType.AGENT_METRICS,
            [agent_event_interface_1.AgentEventType.MESSAGE_RECEIVED]: RealtimeEventType.AGENT_METRICS,
        };
        return mapping[agentEventType] || null;
    }
    getClientCount() {
        return this.server.sockets.sockets.size;
    }
};
exports.RealtimeGateway = RealtimeGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RealtimeGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleSubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleUnsubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get_status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleGetStatus", null);
exports.RealtimeGateway = RealtimeGateway = RealtimeGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
        namespace: '/realtime',
        transports: ['websocket', 'polling'],
    }),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService])
], RealtimeGateway);
//# sourceMappingURL=realtime.gateway.js.map