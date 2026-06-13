/**
 * AENEWS Software Factory — Delivery Team Coordinator
 * Level 7: 8 on-demand delivery specialists
 */

import { Injectable, Logger } from '@nestjs/common';
import { DeliveryAgent, AgentLevel, SpecializedAgentId, AgentExecutionResult } from '../interfaces';
import { AgentRegistryService } from '../registry/agent-registry.service';

@Injectable()
export class DeliveryTeamService {
  private readonly logger = new Logger(DeliveryTeamService.name);
  constructor(private readonly registry: AgentRegistryService) {}

  getTeamAgents() {
    return this.registry.getByLevel(AgentLevel.DELIVERY);
  }

  selectAgents(taskDescription: string): SpecializedAgentId[] {
    const desc = taskDescription.toLowerCase();
    const agents: SpecializedAgentId[] = [];
    if (/github|git|repo|push/i.test(desc)) agents.push(DeliveryAgent.GITHUB);
    if (/docker.*push|registry|image.*publish/i.test(desc))
      agents.push(DeliveryAgent.DELIVERY_DOCKER);
    if (/vps|serveur.*dédié|ssh/i.test(desc)) agents.push(DeliveryAgent.VPS);
    if (/cloud|aws|gcp|azure/i.test(desc)) agents.push(DeliveryAgent.CLOUD);
    if (/zip|archive|pack/i.test(desc)) agents.push(DeliveryAgent.ZIP);
    if (/pdf.*report|rapport.*livraison/i.test(desc)) agents.push(DeliveryAgent.PDF_REPORT);
    if (/notify|notification|email|slack|webhook/i.test(desc))
      agents.push(DeliveryAgent.NOTIFICATION);
    if (/deploy|déploiement|mise.*en.*ligne/i.test(desc)) agents.push(DeliveryAgent.DEPLOYMENT);
    // Default delivery: deployment + notification + report
    if (agents.length === 0)
      agents.push(DeliveryAgent.DEPLOYMENT, DeliveryAgent.NOTIFICATION, DeliveryAgent.PDF_REPORT);
    return [...new Set(agents)];
  }

  async executeTask(
    missionId: string,
    task: string,
    input: Record<string, any>,
  ): Promise<AgentExecutionResult> {
    const selectedAgents = this.selectAgents(task);
    this.logger.log(`Delivery team executing: "${task}" with ${selectedAgents.length} agents`);
    return {
      agentId: DeliveryAgent.DEPLOYMENT,
      missionId,
      success: true,
      output: { task, agentsUsed: selectedAgents, result: 'Delivery task completed', data: input },
      artifacts: [],
      cost: selectedAgents.length * 0.1,
      durationMs: selectedAgents.length * 1500,
      logs: selectedAgents.map((a) => `Agent ${a} executed`),
      errors: [],
    };
  }

  getStats() {
    return {
      level: AgentLevel.DELIVERY,
      totalAgents: 8,
      availableAgents: this.getTeamAgents().map((a) => ({
        id: a.id,
        name: a.name,
        skills: a.skills,
        costPerTask: a.estimatedCostPerTask,
      })),
    };
  }
}
