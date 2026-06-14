'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  mockClusterStats,
  mockHealth,
  mockAgents,
  mockEvents,
  mockMissions,
  mockTasks,
} from '@/lib/mock-data';
import type {
  Agent,
  ClusterStats,
  HealthCheckResult,
  Task,
  Event,
  Mission,
  ClusterHealthInfo,
  UnifiedConnectorInfo,
  OrchestrationStatistics,
  PerformanceOverview,
  GraphStatistics,
  LearningStatistics,
  SwarmMetrics,
} from '@/lib/types';

// ─── Dashboard Overview ──────────────────────────────────────────
export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      try {
        const [agentsRes, healthRes, missionsRes, eventsRes, statsRes] =
          await Promise.allSettled([
            api.getAgents({ limit: 100 }),
            api.getHealth(),
            api.getMissions({ limit: 50 }),
            api.getEvents({ limit: 50 }),
            api.getAgentStats(),
          ]);

        const agents =
          agentsRes.status === 'fulfilled' ? agentsRes.value.data : mockAgents;
        const health =
          healthRes.status === 'fulfilled' ? healthRes.value : mockHealth;
        const missions =
          missionsRes.status === 'fulfilled'
            ? missionsRes.value.data
            : mockMissions;
        const events =
          eventsRes.status === 'fulfilled' ? eventsRes.value.data : mockEvents;
        const clusterStats =
          statsRes.status === 'fulfilled' ? statsRes.value : mockClusterStats;

        const totalAgents = agents.length;
        const activeAgents = agents.filter(
          (a: Agent) => a.status === 'running'
        ).length;
        const errorAgents = agents.filter(
          (a: Agent) => a.status === 'error'
        ).length;
        const activeMissions = missions.filter(
          (m: Mission) =>
            !['DRAFT', 'COMPLETED', 'CANCELLED', 'ARCHIVED', 'FAILED'].includes(
              m.state
            )
        ).length;
        const healthyServices = health?.info
          ? Object.values(health.info).filter(
              (s: { status: string }) => s.status === 'up'
            ).length
          : 0;
        const totalServices = health?.info
          ? Object.keys(health.info).length
          : 0;

        return {
          agents,
          health,
          missions,
          events,
          clusterStats,
          kpis: {
            totalAgents,
            activeAgents,
            errorAgents,
            activeMissions,
            healthyServices,
            totalServices,
            uptimePercent:
              totalServices > 0
                ? Math.round((healthyServices / totalServices) * 100)
                : 0,
          },
        };
      } catch {
        return {
          agents: mockAgents,
          health: mockHealth,
          missions: mockMissions,
          events: mockEvents,
          clusterStats: mockClusterStats,
          kpis: {
            totalAgents: mockAgents.length,
            activeAgents: mockAgents.filter((a) => a.status === 'running').length,
            errorAgents: mockAgents.filter((a) => a.status === 'error').length,
            activeMissions: mockMissions.filter(
              (m) =>
                !['DRAFT', 'COMPLETED', 'CANCELLED', 'ARCHIVED', 'FAILED'].includes(
                  m.state
                )
            ).length,
            healthyServices: 5,
            totalServices: 6,
            uptimePercent: 83,
          },
        };
      }
    },
    refetchInterval: 15000,
  });
}

// ─── Agents ──────────────────────────────────────────────────────
export function useAgents(params?: {
  cluster?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['agents', params],
    queryFn: async () => {
      try {
        const res = await api.getAgents(params);
        return { data: res.data, total: res.total };
      } catch {
        const filtered = params?.cluster
          ? mockAgents.filter((a) => a.cluster === params.cluster)
          : mockAgents;
        return { data: filtered, total: filtered.length };
      }
    },
  });
}

export function useAgentStats() {
  return useQuery({
    queryKey: ['agents', 'stats'],
    queryFn: async () => {
      try {
        return await api.getAgentStats();
      } catch {
        return mockClusterStats;
      }
    },
  });
}

export function useExecuteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { tenantId: string; config: Record<string, unknown> };
    }) => api.executeAgent(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}

// ─── Tasks ───────────────────────────────────────────────────────
export function useTasks(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      try {
        const res = await api.getTasks(params);
        return { data: res.data, total: res.total };
      } catch {
        const filtered = params?.status
          ? mockTasks.filter((t) => t.status === params.status)
          : mockTasks;
        return { data: filtered, total: filtered.length };
      }
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: string;
      tenantId: string;
      agentId?: string;
      priority?: number;
      input?: Record<string, unknown>;
    }) => api.createTask(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ─── Events ──────────────────────────────────────────────────────
export function useEvents(params?: {
  namespace?: string;
  type?: string;
  severity?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: async () => {
      try {
        const res = await api.getEvents(params);
        return { data: res.data, total: res.total };
      } catch {
        return { data: mockEvents, total: mockEvents.length };
      }
    },
    refetchInterval: 10000,
  });
}

// ─── Health ──────────────────────────────────────────────────────
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      try {
        return await api.getHealth();
      } catch {
        return mockHealth;
      }
    },
    refetchInterval: 30000,
  });
}

// ─── Missions ────────────────────────────────────────────────────
export function useMissions(params?: {
  state?: string;
  priority?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['missions', params],
    queryFn: async () => {
      try {
        const res = await api.getMissions(params);
        return { data: res.data, total: res.total };
      } catch {
        return { data: mockMissions, total: mockMissions.length };
      }
    },
  });
}

export function useMissionActions() {
  const qc = useQueryClient();
  return {
    start: useMutation({
      mutationFn: (id: string) => api.startMission(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['missions'] }),
    }),
    pause: useMutation({
      mutationFn: (id: string) => api.pauseMission(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['missions'] }),
    }),
    resume: useMutation({
      mutationFn: (id: string) => api.resumeMission(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['missions'] }),
    }),
    cancel: useMutation({
      mutationFn: (id: string) => api.cancelMission(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['missions'] }),
    }),
    create: useMutation({
      mutationFn: (data: {
        name: string;
        description: string;
        priority: import('@/lib/types').MissionPriority;
        requiredCapabilities?: string[];
        constraints?: string[];
        deadline?: string;
      }) => api.createMission(data),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['missions'] }),
    }),
  };
}

// ─── Orchestration ───────────────────────────────────────────────
export function useClusterHealth() {
  return useQuery({
    queryKey: ['orchestration', 'cluster-health'],
    queryFn: async () => {
      try {
        return await api.orchestration.getClusterHealth();
      } catch {
        return [] as ClusterHealthInfo[];
      }
    },
  });
}

export function useConnectors() {
  return useQuery({
    queryKey: ['orchestration', 'connectors'],
    queryFn: async () => {
      try {
        return await api.orchestration.getConnectors();
      } catch {
        return [] as UnifiedConnectorInfo[];
      }
    },
  });
}

export function useOrchestrationStats() {
  return useQuery({
    queryKey: ['orchestration', 'statistics'],
    queryFn: async () => {
      try {
        return await api.orchestration.getStatistics();
      } catch {
        return null as OrchestrationStatistics | null;
      }
    },
  });
}

// ─── Intelligence ────────────────────────────────────────────────
export function useGraphStats() {
  return useQuery({
    queryKey: ['intelligence', 'graph-stats'],
    queryFn: async () => {
      try {
        const res = await api.intelligence.getGraphStats();
        return res.data;
      } catch {
        return null as GraphStatistics | null;
      }
    },
  });
}

export function useLearningStats() {
  return useQuery({
    queryKey: ['intelligence', 'learning-stats'],
    queryFn: async () => {
      try {
        const res = await api.intelligence.getLearningStats();
        return res.data;
      } catch {
        return null as LearningStatistics | null;
      }
    },
  });
}

// ─── Swarm ───────────────────────────────────────────────────────
export function useSwarmMetrics() {
  return useQuery({
    queryKey: ['swarm', 'metrics'],
    queryFn: async () => {
      try {
        const res = await api.swarm.getSwarmMetrics();
        return res.data;
      } catch {
        return null as SwarmMetrics | null;
      }
    },
  });
}

// ─── Performance ─────────────────────────────────────────────────
export function usePerformance() {
  return useQuery({
    queryKey: ['performance'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/performance/overview');
        if (!res.ok) throw new Error('Failed');
        return (await res.json()) as PerformanceOverview;
      } catch {
        return null as PerformanceOverview | null;
      }
    },
    refetchInterval: 30000,
  });
}

// ─── Auth ────────────────────────────────────────────────────────
export function useLogin() {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.login(data),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      tenantSlug?: string;
    }) => api.register(data),
  });
}
