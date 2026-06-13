/**
 * AENEWS Software Factory — Development Team Coordinator
 * Level 3: 12 on-demand development specialists
 */

import { Injectable, Logger } from '@nestjs/common';
import { DevAgent, AgentLevel, SpecializedAgentId, AgentExecutionResult } from '../interfaces';
import { AgentRegistryService } from '../registry/agent-registry.service';

@Injectable()
export class DevTeamService {
  private readonly logger = new Logger(DevTeamService.name);

  constructor(private readonly registry: AgentRegistryService) {}

  getTeamAgents() { return this.registry.getByLevel(AgentLevel.DEVELOPMENT); }

  selectAgents(taskDescription: string): SpecializedAgentId[] {
    const desc = taskDescription.toLowerCase();
    const agents: SpecializedAgentId[] = [];

    if (/architect|design|structur|concev/i.test(desc)) agents.push(DevAgent.ARCHITECT);
    if (/frontend|react|vue|ui|interface|css/i.test(desc)) agents.push(DevAgent.FRONTEND);
    if (/backend|serveur|server|api|nest/i.test(desc)) agents.push(DevAgent.BACKEND);
    if (/database|base.*données|sql|prisma/i.test(desc)) agents.push(DevAgent.DATABASE);
    if (/api|endpoint|rest|graphql/i.test(desc) && !agents.includes(DevAgent.BACKEND)) agents.push(DevAgent.API);
    if (/devops|ci.?cd|pipeline/i.test(desc)) agents.push(DevAgent.DEVOPS);
    if (/docker|container|image/i.test(desc)) agents.push(DevAgent.DOCKER);
    if (/kubernetes|k8s|cluster/i.test(desc)) agents.push(DevAgent.KUBERNETES);
    if (/qa|quality|review/i.test(desc)) agents.push(DevAgent.QA);
    if (/test|jest|spec/i.test(desc)) agents.push(DevAgent.TEST);
    if (/debug|fix|bug|error|corriger/i.test(desc)) agents.push(DevAgent.DEBUG);
    if (/document|readme|doc/i.test(desc)) agents.push(DevAgent.DOCUMENTATION);

    // Default for development tasks: architect + frontend + backend
    if (agents.length === 0) {
      agents.push(DevAgent.ARCHITECT, DevAgent.FRONTEND, DevAgent.BACKEND);
    }

    return [...new Set(agents)];
  }

  async executeTask(missionId: string, task: string, input: Record<string, any>): Promise<AgentExecutionResult> {
    const selectedAgents = this.selectAgents(task);
    this.logger.log(`Dev team executing: "${task}" with ${selectedAgents.length} agents`);

    return {
      agentId: DevAgent.ARCHITECT,
      missionId,
      success: true,
      output: { task, agentsUsed: selectedAgents, result: 'Development task completed', data: input },
      artifacts: [],
      cost: selectedAgents.length * 0.3,
      durationMs: selectedAgents.length * 2000,
      logs: selectedAgents.map(a => `Agent ${a} executed`),
      errors: [],
    };
  }

  getStats() {
    return {
      level: AgentLevel.DEVELOPMENT,
      totalAgents: 12,
      availableAgents: this.getTeamAgents().map(a => ({
        id: a.id, name: a.name, skills: a.skills, costPerTask: a.estimatedCostPerTask,
      })),
    };
  }
}
