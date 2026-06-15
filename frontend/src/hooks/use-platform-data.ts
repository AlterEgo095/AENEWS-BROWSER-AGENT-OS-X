'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Agent,
  ClusterStats,
  HealthCheckResult,
  Mission,
} from '@/lib/types';

// ─── Dashboard Overview ──────────────────────────────────────────
export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      const [agentsRes, healthRes, missionsRes, eventsRes, statsRes] =
        await Promise.allSettled([
          api.getAgents({ limit: 100 }),
          api.getHealth(),
          api.getMissions({ limit: 50 }),
          api.getEvents({ limit: 50 }),
          api.getAgentStats(),
        ]);

      const agents: Agent[] =
        agentsRes.status === 'fulfilled' ? agentsRes.value.data : [];
      const health: HealthCheckResult | null =
        healthRes.status === 'fulfilled' ? healthRes.value : null;
      const missions: Mission[] =
        missionsRes.status === 'fulfilled'
          ? missionsRes.value.data
          : [];
      const events =
        eventsRes.status === 'fulfilled' ? eventsRes.value.data : [];
      const clusterStats: ClusterStats[] =
        statsRes.status === 'fulfilled' ? statsRes.value : [];

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
    },
    refetchInterval: 15000,
  });
}

// ─── Agent Stats ──────────────────────────────────────────────────
export function useAgentStats() {
  return useQuery({
    queryKey: ['agents', 'stats'],
    queryFn: async () => {
      return await api.getAgentStats();
    },
  });
}

// ─── Health ──────────────────────────────────────────────────────
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      return await api.getHealth();
    },
    refetchInterval: 30000,
  });
}
