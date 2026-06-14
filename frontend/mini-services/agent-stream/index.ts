import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = 3003;
// Backend WebSocket URL (reserved for future direct WS connection)
// const BACKEND_WS_URL = process.env.BACKEND_WS_URL || 'http://localhost:3000';

// ─── Agent Activity Types ────────────────────────────────────────
interface AgentStep {
  id: string;
  agentId: string;
  agentName: string;
  cluster: string;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'action' | 'output' | 'error' | 'waiting' | 'collaborating' | 'decision';
  title: string;
  detail?: string;
  timestamp: number;
  duration?: number;
  status: 'running' | 'completed' | 'failed' | 'waiting';
  metadata?: Record<string, unknown>;
}

interface AgentSession {
  id: string;
  agentId: string;
  agentName: string;
  cluster: string;
  missionId?: string;
  missionName?: string;
  status: 'idle' | 'thinking' | 'executing' | 'waiting' | 'collaborating' | 'completed' | 'error';
  currentStep?: string;
  progress: number;
  startedAt: number;
  steps: AgentStep[];
  tokensUsed?: number;
  llmCalls?: number;
  toolCalls?: number;
}

// ─── JWT Verification ────────────────────────────────────────────
// Simple JWT verification for WebSocket connections.
// In production, use a proper JWT library or delegate to the auth service.
function verifyToken(token: string): { valid: boolean; userId?: string; tenantId?: string } {
  if (!token) return { valid: false };

  try {
    // Decode JWT payload (without full verification — production should verify signature)
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: payload.sub || payload.userId || payload.id,
      tenantId: payload.tenantId,
    };
  } catch {
    return { valid: false };
  }
}

// ─── State ───────────────────────────────────────────────────────
const activeSessions: Map<string, AgentSession> = new Map();
let stepCounter = 0;

// ─── Backend Connection ─────────────────────────────────────────
// Connect to the backend's WebSocket gateway to receive real agent events
// Backend connection state (reserved for future direct WS connection)
const _backendConnected = false;

// We use a simple HTTP long-polling approach to fetch agent events
// from the backend REST API and forward them to connected clients.
// This avoids the complexity of a second Socket.IO client.
const BACKEND_API = process.env.BACKEND_API_URL || 'http://localhost:3000';

async function fetchAgentEvents(): Promise<Record<string, unknown>[]> {
  try {
    const response = await fetch(`${BACKEND_API}/api/v1/agents?XTransformPort=3000`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      return data?.data?.agents || data?.agents || [];
    }
  } catch {
    // Backend unavailable — return empty
  }
  return [];
}

async function fetchClusterHealth(): Promise<Record<string, unknown>[]> {
  try {
    const response = await fetch(`${BACKEND_API}/api/v1/orchestration/cluster-health?XTransformPort=3000`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      return data?.data?.clusters || [];
    }
  } catch {
    // Backend unavailable
  }
  return [];
}

// Convert backend agent data to our session format
function agentToSession(agent: Record<string, unknown>): AgentSession | null {
  const agentId = agent?.id as string | undefined;
  if (!agentId) return null;

  const existing = activeSessions.get(agentId);

  return {
    id: existing?.id || `session-${agentId}`,
    agentId: agentId,
    agentName: (agent.name as string) || agentId,
    cluster: (agent.cluster as string) || 'unknown',
    missionId: existing?.missionId,
    missionName: existing?.missionName,
    status: mapAgentStatus(agent.status as string),
    currentStep: existing?.currentStep,
    progress: existing?.progress || 0,
    startedAt: existing?.startedAt || Date.now(),
    steps: existing?.steps || [],
    tokensUsed: existing?.tokensUsed || 0,
    llmCalls: existing?.llmCalls || 0,
    toolCalls: existing?.toolCalls || 0,
  };
}

function mapAgentStatus(status: string): AgentSession['status'] {
  switch (status) {
    case 'running':
    case 'RUNNING':
      return 'executing';
    case 'idle':
    case 'IDLE':
      return 'idle';
    case 'error':
    case 'ERROR':
      return 'error';
    case 'paused':
    case 'PAUSED':
      return 'waiting';
    case 'completed':
    case 'COMPLETED':
      return 'completed';
    default:
      return 'idle';
  }
}

// ─── Server Setup ────────────────────────────────────────────────
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  // Allow connections without auth in development mode
  if (process.env.NODE_ENV !== 'production') {
    socket.data.userId = 'dev-user';
    socket.data.tenantId = 'dev-tenant';
    return next();
  }

  if (!token) {
    return next(new Error('Authentication required'));
  }

  const result = verifyToken(token as string);
  if (!result.valid) {
    return next(new Error('Invalid or expired token'));
  }

  socket.data.userId = result.userId;
  socket.data.tenantId = result.tenantId;
  next();
});

io.on('connection', (socket) => {
  const userId = socket.data.userId || 'anonymous';
  console.log(`[Agent Stream] Client connected: ${socket.id} (user: ${userId})`);

  // Send current active sessions on connect
  socket.emit('sessions:init', Array.from(activeSessions.values()));

  // Subscribe to specific agent
  socket.on('agent:subscribe', (agentId: string) => {
    socket.join(`agent:${agentId}`);
    const session = activeSessions.get(agentId);
    if (session) {
      socket.emit('agent:state', session);
    }
  });

  // Unsubscribe from agent
  socket.on('agent:unsubscribe', (agentId: string) => {
    socket.leave(`agent:${agentId}`);
  });

  // Subscribe to mission
  socket.on('mission:subscribe', (missionId: string) => {
    socket.join(`mission:${missionId}`);
  });

  socket.on('mission:unsubscribe', (missionId: string) => {
    socket.leave(`mission:${missionId}`);
  });

  // Receive real events from backend connectors/clients
  socket.on('agent:event', (event: { type: string; agentId: string; data: Record<string, unknown> }) => {
    // Forward real agent events to all subscribers
    const session = activeSessions.get(event.agentId);

    if (session) {
      const eventData = event.data || {};
      const step: AgentStep = {
        id: `step-${++stepCounter}`,
        agentId: event.agentId,
        agentName: session.agentName,
        cluster: session.cluster,
        type: mapEventType(event.type),
        title: (eventData.title as string) || event.type,
        detail: eventData.detail as string | undefined,
        timestamp: Date.now(),
        status: event.type === 'error' ? 'failed' : 'completed',
        metadata: eventData.metadata as Record<string, unknown> | undefined,
      };

      session.steps.push(step);

      // Update session status based on event
      if (event.type === 'thinking' || event.type === 'llm_call') {
        session.status = 'thinking';
        session.llmCalls = (session.llmCalls || 0) + 1;
        session.tokensUsed = (session.tokensUsed || 0) + ((eventData.tokensUsed as number) || 0);
        step.status = 'running';
      } else if (event.type === 'tool_call') {
        session.status = 'executing';
        session.toolCalls = (session.toolCalls || 0) + 1;
      } else if (event.type === 'output' || event.type === 'completed') {
        session.status = 'completed';
        session.progress = 100;
      } else if (event.type === 'error') {
        session.status = 'error';
      } else if (event.type === 'collaborating') {
        session.status = 'collaborating';
        step.status = 'running';
      }

      io.emit('agent:step', step);
      io.to(`agent:${event.agentId}`).emit('agent:state', session);
      io.emit('sessions:update', Array.from(activeSessions.values()));
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Agent Stream] Client disconnected: ${socket.id}`);
  });
});

function mapEventType(type: string): AgentStep['type'] {
  switch (type) {
    case 'thinking':
    case 'llm_call':
      return 'thinking';
    case 'tool_call':
      return 'tool_call';
    case 'tool_result':
      return 'tool_result';
    case 'action':
      return 'action';
    case 'output':
    case 'completed':
      return 'output';
    case 'error':
      return 'error';
    case 'waiting':
      return 'waiting';
    case 'collaborating':
      return 'collaborating';
    case 'decision':
      return 'decision';
    default:
      return 'action';
  }
}

// ─── Real Event Polling ──────────────────────────────────────────
// Poll the backend for real agent status updates and forward to clients
async function pollAgentUpdates(): Promise<void> {
  try {
    const agents = await fetchAgentEvents();

    if (agents.length === 0) {
      // No backend data available — keep existing sessions as-is
      return;
    }

    let changed = false;

    for (const agent of agents) {
      const session = agentToSession(agent);
      if (!session) continue;

      const agentId = agent.id as string;
      const existing = activeSessions.get(agentId);
      if (!existing || existing.status !== session.status) {
        activeSessions.set(agentId, session);
        changed = true;
      }
    }

    if (changed) {
      io.emit('sessions:update', Array.from(activeSessions.values()));
    }
  } catch (_error) {
    // Silently handle — will retry next poll
  }
}

// ─── Start ───────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[Agent Stream] WebSocket server running on port ${PORT}`);
  console.log(`[Agent Stream] Backend API: ${BACKEND_API}`);

  // Poll backend for real agent updates every 5 seconds
  setInterval(pollAgentUpdates, 5000);

  // Initial poll
  setTimeout(pollAgentUpdates, 1000);
});
