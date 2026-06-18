/**
 * PDEOS Phase 2 — Security Fix
 * File: backend/src/modules/gateway/events.gateway.ts (shouldReceive patch)
 * Fix H4: tenant filter in WebSocket broadcast
 */
import { WebSocketGateway, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AuthSocket extends Socket {
  userId?: string;
  tenantId?: string;
  subscribedAgentIds?: Set<string>;
}

@WebSocketGateway({ namespace: 'events', cors: { origin: process.env.CORS_ORIGIN?.split(',') || [] } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthSocket) {
    try {
      const token = (client.handshake.query.token as string) || client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) { client.disconnect(); return; }
      const payload = await this.jwtService.verifyAsync(token);
      client.userId = payload.sub;
      client.tenantId = payload.tenantId;
      client.subscribedAgentIds = new Set();
      // FIX H4: join tenant room for broadcast filtering
      client.join(`tenant:${client.tenantId}`);
      this.logger.log(`Client connected: user=${client.userId} tenant=${client.tenantId}`);
    } catch (err) {
      this.logger.warn(`Connection rejected: ${err.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthSocket) {
    this.logger.log(`Client disconnected: ${client.userId}`);
  }

  // FIX H4: tenant-isolated broadcast
  async broadcastEvent(event: { type: string; payload: any; tenantId: string; agentId?: string }) {
    // Emit only to the tenant room — guarantees tenant isolation
    if (!this.server) return;
    this.server.to(`tenant:${event.tenantId}`).emit(event.type, {
      ...event.payload,
      _meta: { agentId: event.agentId, tenantId: event.tenantId, emittedAt: new Date().toISOString() },
    });
  }

  @SubscribeMessage('subscribe:agent')
  handleSubscribeAgent(client: AuthSocket, payload: { agentId: string }) {
    client.subscribedAgentIds?.add(payload.agentId);
    client.join(`agent:${payload.agentId}`);
    return { success: true, agentId: payload.agentId };
  }

  private server: any;
}
