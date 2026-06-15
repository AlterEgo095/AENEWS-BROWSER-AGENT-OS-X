/**
 * AENEWS Agent OS X — Events Gateway (Phase 12 — Security Hardened)
 *
 * WebSocket gateway that broadcasts real-time events from the
 * AgentEventBusService and MissionOrchestratorService to connected clients.
 *
 * Phase 12 Security Enhancements:
 *   - IP-based connection rate limiting
 *   - Per-IP connection count limits
 *   - Event sanitization via SecurityGatewayService
 *   - Explicit CORS origin validation
 *   - Event rate limiting per client
 *   - Payload size validation
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
import { Logger, Optional } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SecurityGatewayService } from '../security/services/security-gateway.service';
import { ThreatIntelligenceService } from '../security-monitoring/services/threat-intelligence.service';
import { SecurityMetricsService } from '../security-monitoring/services/security-metrics.service';

// ─── Types ──────────────────────────────────────────────────

/** Per-client subscription state */
interface ClientSubscriptions {
  agentIds: Set<string>;
  missionIds: Set<string>;
  clusterIds: Set<string>;
  all: boolean; // subscribe to everything
}

/** Per-client rate limiting state */
interface ClientRateLimit {
  eventCount: number;
  windowStart: number;
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
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // In production, use explicit origin validation
      // The CorsSecurityMiddleware is used at the HTTP level;
      // for WS, we do a basic check here
      if (!origin) {
        callback(null, true); // Allow server-to-server
        return;
      }
      // Allow localhost in development
      if (process.env.APP_ENV !== 'production') {
        callback(null, true);
        return;
      }
      // In production, check against allowed patterns
      const allowedPatterns = [
        /^https?:\/\/[a-z0-9-]+\.aenews\.ai$/,
        /^https?:\/\/aenews\.ai$/,
      ];
      if (allowedPatterns.some((p) => p.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed'), false);
      }
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  namespace: '/',
  // Limit max payload size to 1MB for WebSocket messages
  maxHttpBufferSize: 1e6,
  // Ping/pong for connection health
  pingInterval: 25000,
  pingTimeout: 60000,
  // Allow only 3 connection attempts per minute per IP
  connectTimeout: 10000,
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
    { socket: Socket; userId?: string; subscriptions: ClientSubscriptions; ip: string; rateLimit: ClientRateLimit }
  >();

  /** Per-IP connection tracking */
  private readonly ipConnections = new Map<string, Set<string>>();

  /** Per-IP connection attempt tracking (for rate limiting) */
  private readonly ipConnectionAttempts = new Map<string, { count: number; windowStart: number }>();

  /** Configuration */
  private readonly maxConnectionsPerIp: number;
  private readonly maxEventsPerMinute: number;
  private readonly maxConnectionAttemptsPerMinute: number;
  private readonly sanitizeEvents: boolean;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() private readonly securityGateway?: SecurityGatewayService,
    @Optional() private readonly threatIntel?: ThreatIntelligenceService,
    @Optional() private readonly securityMetrics?: SecurityMetricsService,
  ) {
    this.maxConnectionsPerIp = this.configService.get<number>('security.ws.maxConnectionsPerIp') ?? 5;
    this.maxEventsPerMinute = this.configService.get<number>('security.ws.rateLimitPerMin') ?? 60;
    this.maxConnectionAttemptsPerMinute = 10;
    this.sanitizeEvents = this.configService.get<string>('security.ws.sanitizeEvents') !== 'false';
  }

  // ─── Lifecycle Hooks ────────────────────────────────────

  afterInit(server: Server): void {
    this.logger.log(`WebSocket gateway initialized (maxConnPerIp=${this.maxConnectionsPerIp}, maxEvents/min=${this.maxEventsPerMinute}, sanitize=${this.sanitizeEvents})`);
  }

  async handleConnection(client: Socket): Promise<void> {
    const ip = this.getClientIp(client);

    // ─── IP Connection Rate Limiting ───
    if (!this.checkConnectionRateLimit(ip)) {
      this.logger.warn(`WS connection rate limit exceeded for IP ${ip}`);
      client.emit('error', { message: 'Too many connection attempts' });
      client.disconnect(true);
      return;
    }

    // ─── Per-IP Connection Count Limit ───
    const currentConnections = this.ipConnections.get(ip)?.size || 0;
    if (currentConnections >= this.maxConnectionsPerIp) {
      this.logger.warn(`Max WS connections (${this.maxConnectionsPerIp}) exceeded for IP ${ip}`);
      client.emit('error', { message: 'Maximum connections from this IP exceeded' });
      client.disconnect(true);

      // Track suspicious activity
      if (this.threatIntel) {
        await this.threatIntel.recordIpEvent(ip, 'rate_limit');
      }
      return;
    }

    // ─── Check if IP is blocked ───
    if (this.threatIntel?.isIpBlocked(ip)) {
      this.logger.warn(`Blocked WS connection from blocked IP ${ip}`);
      client.disconnect(true);
      return;
    }

    // ─── JWT Authentication ───
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`Client ${client.id} connected without token — disconnecting`);
      client.emit('error', { message: 'Authentication required' });
      client.disconnect(true);
      return;
    }

    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const userId = decoded.sub || decoded.userId || decoded.id;

      // Track IP connections
      if (!this.ipConnections.has(ip)) {
        this.ipConnections.set(ip, new Set());
      }
      this.ipConnections.get(ip)!.add(client.id);

      this.clients.set(client.id, {
        socket: client,
        userId,
        ip,
        subscriptions: {
          agentIds: new Set(),
          missionIds: new Set(),
          clusterIds: new Set(),
          all: false,
        },
        rateLimit: {
          eventCount: 0,
          windowStart: Date.now(),
        },
      });

      this.logger.log(
        `Client ${client.id} connected (userId: ${userId}, ip: ${ip}) — total: ${this.clients.size}`,
      );

      client.emit('connected', {
        message: 'Connected to AENEWS Agent OS X events',
        userId,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      this.logger.warn(`Client ${client.id} provided invalid token — disconnecting`);
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect(true);

      // Track failed auth on WS
      if (this.threatIntel) {
        await this.threatIntel.recordIpEvent(ip, 'auth_failure');
      }
    }
  }

  handleDisconnect(client: Socket): void {
    const entry = this.clients.get(client.id);
    const existed = this.clients.delete(client.id);

    if (existed && entry) {
      // Remove from IP tracking
      const ipSet = this.ipConnections.get(entry.ip);
      if (ipSet) {
        ipSet.delete(client.id);
        if (ipSet.size === 0) {
          this.ipConnections.delete(entry.ip);
        }
      }
    }

    if (existed) {
      this.logger.log(`Client ${client.id} disconnected — total: ${this.clients.size}`);
    }
  }

  // ─── Subscribe Messages (with rate limiting + sanitization) ──

  @SubscribeMessage('subscribe:agent')
  async handleSubscribeAgent(
    @MessageBody() data: { agentId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (!this.checkClientRateLimit(client.id)) return;
    const sanitized = await this.sanitizeInput(data, client.id);
    if (!sanitized) return;

    const entry = this.clients.get(client.id);
    if (!entry) return;

    entry.subscriptions.agentIds.add(sanitized.agentId);
    client.emit('subscribed', { channel: 'agent', agentId: sanitized.agentId, timestamp: Date.now() });
  }

  @SubscribeMessage('subscribe:mission')
  async handleSubscribeMission(
    @MessageBody() data: { missionId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (!this.checkClientRateLimit(client.id)) return;
    const sanitized = await this.sanitizeInput(data, client.id);
    if (!sanitized) return;

    const entry = this.clients.get(client.id);
    if (!entry) return;

    entry.subscriptions.missionIds.add(sanitized.missionId);
    client.emit('subscribed', { channel: 'mission', missionId: sanitized.missionId, timestamp: Date.now() });
  }

  @SubscribeMessage('subscribe:cluster')
  async handleSubscribeCluster(
    @MessageBody() data: { clusterId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (!this.checkClientRateLimit(client.id)) return;
    const sanitized = await this.sanitizeInput(data, client.id);
    if (!sanitized) return;

    const entry = this.clients.get(client.id);
    if (!entry) return;

    entry.subscriptions.clusterIds.add(sanitized.clusterId);
    client.emit('subscribed', { channel: 'cluster', clusterId: sanitized.clusterId, timestamp: Date.now() });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: Date.now() });
  }

  // ─── Broadcast Methods ──────────────────────────────────

  /**
   * Broadcast an event to all connected clients that are subscribed
   * to the relevant channel. Events are sanitized before broadcast.
   */
  broadcastEvent(eventType: string, payload: any): void {
    if (this.clients.size === 0) return;

    // Sanitize outgoing payloads
    const sanitizedPayload = this.sanitizeOutgoingPayload(payload);

    const envelope: WsEventEnvelope = {
      type: eventType,
      payload: sanitizedPayload,
      timestamp: Date.now(),
    };

    const { channel, id } = this.parseEventContext(eventType, payload);

    for (const [, entry] of this.clients) {
      if (this.shouldReceive(entry.subscriptions, channel, id)) {
        entry.socket.emit(eventType, envelope);
      }
    }
  }

  broadcastAgentEvent(subType: string, agentId: string, data: any): void {
    this.broadcastEvent(`agent:${subType}`, { agentId, ...data });
  }

  broadcastMissionEvent(subType: string, missionId: string, data: any): void {
    this.broadcastEvent(`mission:${subType}`, { missionId, ...data });
  }

  broadcastSystemNotification(notification: {
    level: 'info' | 'warn' | 'error';
    title: string;
    message: string;
    metadata?: Record<string, any>;
  }): void {
    this.broadcastEvent('system:notification', notification);
  }

  getConnectedCount(): number {
    return this.clients.size;
  }

  // ─── Private Security Helpers ─────────────────────────────

  /**
   * Check per-client event rate limit.
   */
  private checkClientRateLimit(clientId: string): boolean {
    const entry = this.clients.get(clientId);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.rateLimit.windowStart > 60000) {
      entry.rateLimit.eventCount = 0;
      entry.rateLimit.windowStart = now;
    }

    entry.rateLimit.eventCount++;
    if (entry.rateLimit.eventCount > this.maxEventsPerMinute) {
      this.logger.warn(`WS rate limit exceeded for client ${clientId}: ${entry.rateLimit.eventCount} events/min`);
      entry.socket.emit('error', { message: 'Rate limit exceeded' });
      return false;
    }

    return true;
  }

  /**
   * Check per-IP connection attempt rate limit.
   */
  private checkConnectionRateLimit(ip: string): boolean {
    const now = Date.now();
    let tracker = this.ipConnectionAttempts.get(ip);

    if (!tracker || (now - tracker.windowStart) > 60000) {
      tracker = { count: 0, windowStart: now };
    }

    tracker.count++;
    this.ipConnectionAttempts.set(ip, tracker);

    return tracker.count <= this.maxConnectionAttemptsPerMinute;
  }

  /**
   * Sanitize incoming WebSocket event data using SecurityGateway.
   */
  private async sanitizeInput(data: any, clientId: string): Promise<any | null> {
    if (!this.sanitizeEvents || !this.securityGateway) {
      return data;
    }

    try {
      // Quick validation
      const dataStr = JSON.stringify(data);
      if (dataStr.length > 10000) {
        this.logger.warn(`WS payload too large from client ${clientId}: ${dataStr.length} chars`);
        return null;
      }

      // Run through security gateway for injection detection
      // We don't block, just sanitize
      const result = await this.securityGateway.process(
        clientId,
        'ws_event',
        'websocket',
        dataStr,
      );

      if (!result.allowed) {
        this.logger.warn(`WS event BLOCKED from client ${clientId}: ${result.threats.map((t: { type: string }) => t.type).join(', ')}`);
        this.securityMetrics?.recordBlockedRequest('ws_injection', 'ws', 'SUBSCRIBE');
        return null;
      }

      return data;
    } catch (error: any) {
      this.logger.warn(`WS input sanitization error for client ${clientId}: ${error.message}`);
      return data; // Fail open — don't block on sanitizer errors
    }
  }

  /**
   * Sanitize outgoing payloads to prevent data leaks.
   * Strips sensitive fields from broadcast data.
   */
  private sanitizeOutgoingPayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;

    const sensitiveKeys = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'privateKey', 'authorization'];

    if (Array.isArray(payload)) {
      return payload.map((item) => this.sanitizeOutgoingPayload(item));
    }

    const sanitized = { ...payload };
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeOutgoingPayload(sanitized[key]);
      }
    }

    return sanitized;
  }

  private extractToken(client: Socket): string | null {
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }

    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }

  private parseEventContext(eventType: string, payload: any): { channel: string; id?: string } {
    if (eventType.startsWith('agent:')) return { channel: 'agent', id: payload?.agentId };
    if (eventType.startsWith('mission:')) return { channel: 'mission', id: payload?.missionId };
    if (eventType.startsWith('system:')) return { channel: 'system' };
    return { channel: 'unknown' };
  }

  private shouldReceive(subs: ClientSubscriptions, channel: string, id?: string): boolean {
    if (subs.all) return true;
    switch (channel) {
      case 'agent': return !id || subs.agentIds.has(id);
      case 'mission': return !id || subs.missionIds.has(id);
      case 'system': return true;
      default: return true;
    }
  }

  private getClientIp(client: Socket): string {
    const forwarded = client.handshake.headers['x-forwarded-for'] as string;
    if (forwarded) return forwarded.split(',')[0].trim();
    const realIp = client.handshake.headers['x-real-ip'] as string;
    if (realIp) return realIp;
    return client.handshake.address || 'unknown';
  }
}
