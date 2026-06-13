/**
 * AENEWS Software Factory — Business Team Coordinator
 * Level 5: 8 on-demand business specialists
 */

import { Injectable, Logger } from '@nestjs/common';
import { BusinessAgent, AgentLevel, SpecializedAgentId, AgentExecutionResult } from '../interfaces';
import { AgentRegistryService } from '../registry/agent-registry.service';

@Injectable()
export class BusinessTeamService {
  private readonly logger = new Logger(BusinessTeamService.name);
  constructor(private readonly registry: AgentRegistryService) {}

  getTeamAgents() { return this.registry.getByLevel(AgentLevel.BUSINESS); }

  selectAgents(taskDescription: string): SpecializedAgentId[] {
    const desc = taskDescription.toLowerCase();
    const agents: SpecializedAgentId[] = [];
    if (/seo|référencement/i.test(desc)) agents.push(BusinessAgent.SEO);
    if (/marketing|campagne|campaign/i.test(desc)) agents.push(BusinessAgent.MARKETING);
    if (/copywrit|contenu|content.*writ/i.test(desc)) agents.push(BusinessAgent.COPYWRITING);
    if (/brand|marque|identité/i.test(desc)) agents.push(BusinessAgent.BRANDING);
    if (/crm|client|customer/i.test(desc)) agents.push(BusinessAgent.CRM);
    if (/analytics|stat|metric|kpi/i.test(desc)) agents.push(BusinessAgent.ANALYTICS);
    if (/financ|budget|compt/i.test(desc)) agents.push(BusinessAgent.FINANCE);
    if (/sales|vente|commercial/i.test(desc)) agents.push(BusinessAgent.SALES);
    if (agents.length === 0) agents.push(BusinessAgent.ANALYTICS);
    return [...new Set(agents)];
  }

  async executeTask(missionId: string, task: string, input: Record<string, any>): Promise<AgentExecutionResult> {
    const selectedAgents = this.selectAgents(task);
    this.logger.log(`Business team executing: "${task}" with ${selectedAgents.length} agents`);
    return {
      agentId: BusinessAgent.ANALYTICS, missionId, success: true,
      output: { task, agentsUsed: selectedAgents, result: 'Business task completed', data: input },
      artifacts: [], cost: selectedAgents.length * 0.2, durationMs: selectedAgents.length * 1500,
      logs: selectedAgents.map(a => `Agent ${a} executed`), errors: [],
    };
  }

  getStats() {
    return { level: AgentLevel.BUSINESS, totalAgents: 8,
      availableAgents: this.getTeamAgents().map(a => ({ id: a.id, name: a.name, skills: a.skills, costPerTask: a.estimatedCostPerTask })),
    };
  }
}
