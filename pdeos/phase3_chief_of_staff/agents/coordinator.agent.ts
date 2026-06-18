/**
 * PDEOS Phase 3 — Coordinator Agent
 * Maps subtasks to concrete agents via existing AgentRegistryService + HyperOrchestrator.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PlannerAgent, ExecutionPlan, Subtask } from './planner.agent';

export interface AgentAssignment {
  subtaskId: string; agentId: string; agentName: string;
  cluster: string; department: string; priority: number;
  estimatedDurationMs: number; estimatedCostUSD: number;
}

// Abstracted registry interface — adapter to existing AgentRegistryService
export interface IAgentRegistry {
  findByCluster(cluster: string): Promise<Array<{ id: string; name: string }>>;
}
export interface IHyperOrchestrator {
  routeByCapabilities(caps: string[], clusters: string[]): Promise<string>;
}

@Injectable()
export class CoordinatorAgent {
  private logger = new Logger(CoordinatorAgent.name);

  constructor(private registry: IAgentRegistry, private hyperOrch: IHyperOrchestrator) {}

  async assignAgents(plan: ExecutionPlan, ctx: { correlationId: string }): Promise<AgentAssignment[]> {
    const out: AgentAssignment[] = [];
    for (let i = 0; i < plan.subtasks.length; i++) {
      const s = plan.subtasks[i];
      const candidateClusters = PlannerAgent.getClustersForDepartment(s.department);
      let cluster: string;
      if (candidateClusters.length > 0) {
        cluster = await this.hyperOrch.routeByCapabilities(s.requiredCapabilities, candidateClusters).catch(() => candidateClusters[0]);
      } else {
        cluster = 'intelligent-orchestration';
      }
      const agents = await this.registry.findByCluster(cluster).catch(() => []);
      const agent = agents[0] || { id: 'mega-orchestrator', name: 'MegaOrchestratorAgent' };
      out.push({
        subtaskId: s.id, agentId: agent.id, agentName: agent.name,
        cluster, department: s.department, priority: i + 1,
        estimatedDurationMs: s.estimatedDurationMs, estimatedCostUSD: s.estimatedCostUSD,
      });
    }
    return out;
  }
}
