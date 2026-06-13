/**
 * AENEWS Agent OS X - Real-Time WebSocket Gateway
 *
 * Provides real-time updates for:
 *   - Mission lifecycle events (submitted, running, completed, failed)
 *   - Agent status changes (started, stopped, error)
 *   - Orchestration pipeline progress (decompose, plan, execute, critique, repair, validate, deliver)
 *   - Connector execution results
 *   - System observability alerts
 *
 * Rooms:
 *   - "missions"     — all mission lifecycle events
 *   - "agents"       — agent status changes
 *   - "orchestration" — pipeline progress
 *   - "observability" — system health alerts
 *   - "mission:{id}" — events for a specific mission
 *   - "agent:{id}"   — events for a specific agent
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventBusService } from '../agents/events/event-bus.service';
import { AgentEventType, AgentEvent } from '../agents/interfaces/agent-event.interface';

// ─── Event Types Emitted to Clients ────────────────────────────────
export enum RealtimeEventType {
  // Mission events
  MISSION_SUBMITTED = 'mission:submitted',
  MISSION_RUNNING = 'mission:running',
  MISSION_COMPLETED = 'mission:completed',
  MISSION_FAILED = 'mission:failed',
  MISSION_CANCELLED = 'mission:cancelled',
  MISSION_QUALITY_GATE = 'mission:quality_gate',
  MISSION_ARTIFACT = 'mission:artifact',

  // Agent events
  AGENT_STARTED = 'agent:started',
  AGENT_STOPPED = 'agent:stopped',
  AGENT_ERROR = 'agent:error',
  AGENT_METRICS = 'agent:metrics',

  // Orchestration events
  ORCH_DECOMPOSE = 'orchestration:decompose',
  ORCH_PLAN = 'orchestration:plan',
  ORCH_EXECUTE = 'orchestration:execute',
  ORCH_CRITIQUE = 'orchestration:critique',
  ORCH_REPAIR = 'orchestration:repair',
  ORCH_VALIDATE = 'orchestration:validate',
  ORCH_DELIVER = 'orchestration:deliver',

  // Connector events
  CONNECTOR_EXECUTING = 'connector:executing',
  CONNECTOR_COMPLETED = 'connector:completed',
  CONNECTOR_FAILED = 'connector:failed',

  // System events
  SYSTEM_ALERT = 'system:alert',
  SYSTEM_HEALTH = 'system:health',
  OBSERVABILITY_SNAPSHOT = 'observability:snapshot',
}

// ─── Realtime Payload ──────────────────────────────────────────────
export interface RealtimePayload {
  type: RealtimeEventType;
  timestamp: Date;
  data: any;
  missionId?: string;
  agentId?: string;
  cluster?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  /** Track connected clients and their subscribed rooms */
  private readonly clientRooms: Map<string, Set<string>> = new Map();

  /** Metrics */
  private totalConnections = 0;
  private totalEventsEmitted = 0;

  constructor(private readonly eventBus: EventBusService) {}

  async afterInit(server: Server): Promise<void> {
    this.logger.log('Real-time WebSocket Gateway initialized');

    // Subscribe to all agent events and relay them to WebSocket clients
    this.eventBus.subscribeTo('*', async (event: AgentEvent) => {
      await this.relayEvent(event);
    });

    this.logger.log('Event bus relay active — all agent events → WebSocket clients');
  }

  async handleConnection(client: Socket): Promise<void> {
    this.totalConnections++;
    this.clientRooms.set(client.id, new Set());
    this.logger.debug(`Client connected: ${client.id} (total: ${this.getClientCount()})`);

    // Send welcome with system status
    client.emit('connected', {
      message: 'AENEWS Agent OS X — Real-time Gateway',
      timestamp: new Date(),
      rooms: ['missions', 'agents', 'orchestration', 'observability'],
    });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.clientRooms.delete(client.id);
    this.logger.debug(`Client disconnected: ${client.id} (total: ${this.getClientCount()})`);
  }

  // ─── Subscription Management ────────────────────────────────────

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { rooms: string[] }): void {
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

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, payload: { rooms: string[] }): void {
    const rooms = payload.rooms || [];
    const clientRoomSet = this.clientRooms.get(client.id);

    for (const room of rooms) {
      client.leave(room);
      clientRoomSet?.delete(room);
    }

    client.emit('unsubscribed', { rooms, timestamp: new Date() });
  }

  // ─── Direct Client Requests ─────────────────────────────────────

  @SubscribeMessage('get_status')
  handleGetStatus(client: Socket): void {
    client.emit('status', {
      connectedClients: this.getClientCount(),
      totalConnections: this.totalConnections,
      totalEventsEmitted: this.totalEventsEmitted,
      availableRooms: ['missions', 'agents', 'orchestration', 'observability'],
      serverTime: new Date(),
    });
  }

  // ─── Public Methods for Service Push ────────────────────────────

  /**
   * Push a mission event to all clients in the "missions" room
   * and the specific "mission:{id}" room.
   */
  pushMissionEvent(missionId: string, eventType: RealtimeEventType, data: any): void {
    const payload: RealtimePayload = {
      type: eventType,
      timestamp: new Date(),
      data,
      missionId,
    };

    this.server.to('missions').emit(eventType, payload);
    this.server.to(`mission:${missionId}`).emit(eventType, payload);
    this.totalEventsEmitted++;
  }

  /**
   * Push an agent event to all clients in the "agents" room
   * and the specific "agent:{id}" room.
   */
  pushAgentEvent(agentId: string, cluster: string, eventType: RealtimeEventType, data: any): void {
    const payload: RealtimePayload = {
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

  /**
   * Push an orchestration progress event.
   */
  pushOrchestrationEvent(missionId: string, eventType: RealtimeEventType, data: any): void {
    const payload: RealtimePayload = {
      type: eventType,
      timestamp: new Date(),
      data,
      missionId,
    };

    this.server.to('orchestration').emit(eventType, payload);
    this.server.to(`mission:${missionId}`).emit(eventType, payload);
    this.totalEventsEmitted++;
  }

  /**
   * Push a system alert or health update.
   */
  pushSystemEvent(eventType: RealtimeEventType, data: any): void {
    const payload: RealtimePayload = {
      type: eventType,
      timestamp: new Date(),
      data,
    };

    this.server.to('observability').emit(eventType, payload);
    this.totalEventsEmitted++;
  }

  /**
   * Push a connector execution event.
   */
  pushConnectorEvent(
    missionId: string,
    connectorName: string,
    eventType: RealtimeEventType,
    data: any,
  ): void {
    const payload: RealtimePayload = {
      type: eventType,
      timestamp: new Date(),
      data: { ...data, connectorName },
      missionId,
    };

    this.server.to('missions').emit(eventType, payload);
    this.server.to(`mission:${missionId}`).emit(eventType, payload);
    this.totalEventsEmitted++;
  }

  // ─── Private Methods ────────────────────────────────────────────

  /**
   * Relay an agent event from the EventBus to WebSocket clients.
   */
  private async relayEvent(event: AgentEvent): Promise<void> {
    try {
      // Map agent event types to realtime event types
      const realtimeType = this.mapEventType(event.type);
      if (!realtimeType) return;

      const payload: RealtimePayload = {
        type: realtimeType,
        timestamp: event.timestamp || new Date(),
        data: event.payload,
        missionId: event.payload?.missionId,
        agentId: event.sourceAgentId,
        cluster: event.cluster,
      };

      // Emit to appropriate rooms based on event category
      if (event.type.startsWith('orchestration.') || event.type.startsWith('ORCHESTRATION_')) {
        this.server.to('orchestration').emit(realtimeType, payload);
        if (payload.missionId) {
          this.server.to(`mission:${payload.missionId}`).emit(realtimeType, payload);
        }
      } else if (
        event.type.startsWith('agent.') ||
        event.type.startsWith('AGENT_') ||
        event.type.startsWith('TASK_')
      ) {
        this.server.to('agents').emit(realtimeType, payload);
        if (payload.agentId) {
          this.server.to(`agent:${payload.agentId}`).emit(realtimeType, payload);
        }
      } else if (event.type.startsWith('mission.') || event.type.startsWith('MISSION_')) {
        this.server.to('missions').emit(realtimeType, payload);
        if (payload.missionId) {
          this.server.to(`mission:${payload.missionId}`).emit(realtimeType, payload);
        }
      }

      this.totalEventsEmitted++;
    } catch (error) {
      this.logger.error(`Error relaying event: ${(error as Error).message}`);
    }
  }

  /**
   * Map internal event types to realtime event types.
   */
  private mapEventType(agentEventType: string): RealtimeEventType | null {
    const mapping: Record<string, RealtimeEventType> = {
      // Orchestration events
      [AgentEventType.ORCHESTRATION_STARTED]: RealtimeEventType.ORCH_DECOMPOSE,
      [AgentEventType.ORCHESTRATION_PLANNED]: RealtimeEventType.ORCH_PLAN,
      [AgentEventType.ORCHESTRATION_COMPLETED]: RealtimeEventType.ORCH_DELIVER,
      [AgentEventType.ORCHESTRATION_FAILED]: RealtimeEventType.MISSION_FAILED,

      // Task events
      [AgentEventType.TASK_CREATED]: RealtimeEventType.AGENT_STARTED,
      [AgentEventType.TASK_COMPLETED]: RealtimeEventType.AGENT_STOPPED,
      [AgentEventType.TASK_FAILED]: RealtimeEventType.AGENT_ERROR,
      [AgentEventType.TASK_CANCELLED]: RealtimeEventType.MISSION_CANCELLED,

      // Agent lifecycle events
      [AgentEventType.AGENT_STARTED]: RealtimeEventType.AGENT_STARTED,
      [AgentEventType.AGENT_STOPPED]: RealtimeEventType.AGENT_STOPPED,
      [AgentEventType.AGENT_ERROR]: RealtimeEventType.AGENT_ERROR,

      // Message events
      [AgentEventType.MESSAGE_SENT]: RealtimeEventType.AGENT_METRICS,
      [AgentEventType.MESSAGE_RECEIVED]: RealtimeEventType.AGENT_METRICS,
    };

    return mapping[agentEventType] || null;
  }

  private getClientCount(): number {
    return this.server.sockets.sockets.size;
  }
}
