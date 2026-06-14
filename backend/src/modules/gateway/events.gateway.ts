/**
 * AENEWS Agent OS X — Events Gateway
 *
 * WebSocket gateway that broadcasts real-time events from the
 * AgentEventBusService and MissionOrchestratorService to connected clients.
 *
 * Event channels:
 *   - agent:state      — Agent state changes (IDLE, RUNNING, PAUSED, etc.)
 *   - agent:execution  — Agent execution results
 *   - agent:health     — Agent health alerts
 *   - mission:state    — Mission state machine transitions
 *   - mission:progress — Mission progress updates
 *   - mission:step     — Mission step completion
 *   - system:notification — System-wide notifications
 *
 * Authentication: JWT token passed as `token` query param during handshake.
 * Subscription model: clients subscribe to specific agents / missions / clusters.
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// ─── Types ──────────────────────────────────────────────────

/** Per-client subscription state */
interface ClientSubscriptions {
  agentIds: Set<string>;
  missionIds: Set<string>;
  clusterIds: Set<string>;
  all: boolean; // subscribe to everything
}

/** Standardised WS event envelope */
export interface WsEventEnvelope {
  type: string;
  payload: any;
  timestamp: number;
}

// ─── Gateway ────────────────────────────────────────────────

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow all origins in development; tighten in production
      callback(null, true);
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  /** Connected clients keyed by socket id */
  private readonly clients = new Map<
    string,
    { socket: Socket; userId?: string; subscriptions: ClientSubscriptions }
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Lifecycle Hooks ────────────────────────────────────

  afterInit(server: Server): void {
    this.logger.log('WebSocket gateway initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(
        `Client ${client.id} connected without token — disconnecting`,
      );
      client.emit('error', { message: 'Authentication required' });
      client.disconnect(true);
      return;
    }

    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const userId = decoded.sub || decoded.userId || decoded.id;

      this.clients.set(client.id, {
        socket: client,
        userId,
        subscriptions: {
          agentIds: new Set(),
          missionIds: new Set(),
          clusterIds: new Set(),
          all: false,
        },
      });

      this.logger.log(
        `Client ${client.id} connected (userId: ${userId}) — total: ${this.clients.size}`,
      );

      // Send welcome event
      client.emit('connected', {
        message: 'Connected to AENEWS Agent OS X events',
        userId,
        timestamp: Date.now(),
      });
    } catch (err) {
      this.logger.warn(
        `Client ${client.id} provided invalid token — disconnecting`,
      );
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const existed = this.clients.delete(client.id);
    if (existed) {
      this.logger.log(
        `Client ${client.id} disconnected — total: ${this.clients.size}`,
      );
    }
  }

  // ─── Subscribe Messages ─────────────────────────────────

  @SubscribeMessage('subscribe:agent')
  handleSubscribeAgent(
    @MessageBody() data: { agentId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const entry = this.clients.get(client.id);
    if (!entry) return;

    entry.subscriptions.agentIds.add(data.agentId);
    this.logger.debug(
      `Client ${client.id} subscribed to agent ${data.agentId}`,
    );

    client.emit('subscribed', {
      channel: 'agent',
      agentId: data.agentId,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('subscribe:mission')
  handleSubscribeMission(
    @MessageBody() data: { missionId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const entry = this.clients.get(client.id);
    if (!entry) return;

    entry.subscriptions.missionIds.add(data.missionId);
    this.logger.debug(
      `Client ${client.id} subscribed to mission ${data.missionId}`,
    );

    client.emit('subscribed', {
      channel: 'mission',
      missionId: data.missionId,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('subscribe:cluster')
  handleSubscribeCluster(
    @MessageBody() data: { clusterId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const entry = this.clients.get(client.id);
    if (!entry) return;

    entry.subscriptions.clusterIds.add(data.clusterId);
    this.logger.debug(
      `Client ${client.id} subscribed to cluster ${data.clusterId}`,
    );

    client.emit('subscribed', {
      channel: 'cluster',
      clusterId: data.clusterId,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('ping')
  handlePing(
    @ConnectedSocket() client: Socket,
  ): void {
    client.emit('pong', { timestamp: Date.now() });
  }

  // ─── Broadcast Methods ──────────────────────────────────

  /**
   * Broadcast an event to all connected clients that are subscribed
   * to the relevant channel.  If no clients are connected, this is
   * effectively a no-op (graceful degradation).
   */
  broadcastEvent(eventType: string, payload: any): void {
    if (this.clients.size === 0) return;

    const envelope: WsEventEnvelope = {
      type: eventType,
      payload,
      timestamp: Date.now(),
    };

    // Determine the channel context from the event type
    const { channel, id } = this.parseEventContext(eventType, payload);

    for (const [, entry] of this.clients) {
      // Check if this client should receive the event
      if (this.shouldReceive(entry.subscriptions, channel, id)) {
        entry.socket.emit(eventType, envelope);
      }
    }

    this.logger.debug(
      `Broadcast ${eventType} to ${this.clients.size} client(s)`,
    );
  }

  /**
   * Broadcast an agent event (shorthand).
   */
  broadcastAgentEvent(subType: string, agentId: string, data: any): void {
    this.broadcastEvent(`agent:${subType}`, { agentId, ...data });
  }

  /**
   * Broadcast a mission event (shorthand).
   */
  broadcastMissionEvent(subType: string, missionId: string, data: any): void {
    this.broadcastEvent(`mission:${subType}`, { missionId, ...data });
  }

  /**
   * Broadcast a system notification to all connected clients.
   */
  broadcastSystemNotification(notification: {
    level: 'info' | 'warn' | 'error';
    title: string;
    message: string;
    metadata?: Record<string, any>;
  }): void {
    this.broadcastEvent('system:notification', notification);
  }

  /**
   * Get the number of connected clients.
   */
  getConnectedCount(): number {
    return this.clients.size;
  }

  // ─── Private Helpers ────────────────────────────────────

  private extractToken(client: Socket): string | null {
    // 1. Query param: ?token=xxx
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }

    // 2. Auth header from handshake headers
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }

  /**
   * Parse an event type to determine which subscription channel
   * and entity ID it relates to.
   */
  private parseEventContext(
    eventType: string,
    payload: any,
  ): { channel: string; id?: string } {
    if (eventType.startsWith('agent:')) {
      return { channel: 'agent', id: payload?.agentId };
    }
    if (eventType.startsWith('mission:')) {
      return { channel: 'mission', id: payload?.missionId };
    }
    if (eventType.startsWith('system:')) {
      return { channel: 'system' };
    }
    return { channel: 'unknown' };
  }

  /**
   * Check whether a client subscription set should receive a given event.
   */
  private shouldReceive(
    subs: ClientSubscriptions,
    channel: string,
    id?: string,
  ): boolean {
    // "all" subscription receives everything
    if (subs.all) return true;

    switch (channel) {
      case 'agent':
        return !id || subs.agentIds.has(id);
      case 'mission':
        return !id || subs.missionIds.has(id);
      case 'system':
        return true; // system events go to all connected clients
      default:
        return true;
    }
  }
}
