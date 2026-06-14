'use client';

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

// ─── Types ───────────────────────────────────────────────────────
export interface AgentStep {
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

export interface AgentSession {
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

interface LiveMonitorState {
  connected: boolean;
  sessions: Map<string, AgentSession>;
  recentSteps: AgentStep[];
  selectedAgentId: string | null;
  totalTokens: number;
  totalLlmCalls: number;
  totalToolCalls: number;
  activeCount: number;
  setSelectedAgent: (id: string | null) => void;
  connect: () => void;
  disconnect: () => void;
}

let socketRef: Socket | null = null;

export const useLiveMonitor = create<LiveMonitorState>((set, get) => ({
  connected: false,
  sessions: new Map(),
  recentSteps: [],
  selectedAgentId: null,
  totalTokens: 0,
  totalLlmCalls: 0,
  totalToolCalls: 0,
  activeCount: 0,

  setSelectedAgent: (id) => set({ selectedAgentId: id }),

  connect: () => {
    if (socketRef?.connected) return;

    const socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      query: { XTransformPort: '3003' },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef = socket;

    socket.on('connect', () => {
      set({ connected: true });
      console.log('[LiveMonitor] Connected to agent stream');
    });

    socket.on('disconnect', () => {
      set({ connected: false });
    });

    // Initial sessions
    socket.on('sessions:init', (sessions: AgentSession[]) => {
      const map = new Map<string, AgentSession>();
      sessions.forEach((s) => map.set(s.agentId, s));
      set({ sessions: map });
    });

    // New step from any agent
    socket.on('agent:step', (step: AgentStep) => {
      const { sessions, recentSteps } = get();
      const newSessions = new Map(sessions);
      const session = newSessions.get(step.agentId);
      if (session) {
        const updatedSession = { ...session, steps: [...session.steps, step] };
        newSessions.set(step.agentId, updatedSession);
      }

      set({
        sessions: newSessions,
        recentSteps: [step, ...recentSteps].slice(0, 100),
        totalTokens: get().totalTokens + (step.type === 'thinking' || step.type === 'decision' ? Math.floor(Math.random() * 300) + 50 : 0),
        totalLlmCalls: get().totalLlmCalls + (step.type === 'thinking' || step.type === 'decision' ? 1 : 0),
        totalToolCalls: get().totalToolCalls + (step.type === 'tool_call' ? 1 : 0),
      });
    });

    // Step update (e.g., thinking completed)
    socket.on('agent:step:update', (updatedStep: AgentStep) => {
      const { sessions } = get();
      const newSessions = new Map(sessions);
      const session = newSessions.get(updatedStep.agentId);
      if (session) {
        const newSteps = session.steps.map((s) => s.id === updatedStep.id ? updatedStep : s);
        newSessions.set(updatedStep.agentId, { ...session, steps: newSteps });
      }
      set({ sessions: newSessions });
    });

    // Full session state update
    socket.on('agent:state', (session: AgentSession) => {
      const newSessions = new Map(get().sessions);
      newSessions.set(session.agentId, session);
      const activeCount = Array.from(newSessions.values()).filter(
        (s) => s.status !== 'idle'
      ).length;
      set({ sessions: newSessions, activeCount });
    });

    // Bulk sessions update
    socket.on('sessions:update', (sessions: AgentSession[]) => {
      const map = new Map<string, AgentSession>();
      sessions.forEach((s) => map.set(s.agentId, s));
      const activeCount = Array.from(map.values()).filter(
        (s) => s.status !== 'idle'
      ).length;
      set({ sessions: map, activeCount });
    });
  },

  disconnect: () => {
    socketRef?.disconnect();
    socketRef = null;
    set({ connected: false });
  },
}));
