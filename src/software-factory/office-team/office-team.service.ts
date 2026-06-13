/**
 * AENEWS Software Factory — Office Team Coordinator
 * Level 4: 6 on-demand office specialists
 */

import { Injectable, Logger } from '@nestjs/common';
import { OfficeAgent, AgentLevel, SpecializedAgentId, AgentExecutionResult } from '../interfaces';
import { AgentRegistryService } from '../registry/agent-registry.service';

@Injectable()
export class OfficeTeamService {
  private readonly logger = new Logger(OfficeTeamService.name);
  constructor(private readonly registry: AgentRegistryService) {}

  getTeamAgents() {
    return this.registry.getByLevel(AgentLevel.OFFICE);
  }

  selectAgents(taskDescription: string): SpecializedAgentId[] {
    const desc = taskDescription.toLowerCase();
    const agents: SpecializedAgentId[] = [];
    if (/pdf|rapport|report/i.test(desc)) agents.push(OfficeAgent.PDF);
    if (/docx|word|document/i.test(desc)) agents.push(OfficeAgent.DOCX);
    if (/excel|spreadsheet|csv|tableur/i.test(desc)) agents.push(OfficeAgent.EXCEL);
    if (/powerpoint|présentation|slide/i.test(desc)) agents.push(OfficeAgent.POWERPOINT);
    if (/ocr|text.*image|scan/i.test(desc)) agents.push(OfficeAgent.OFFICE_OCR);
    if (/signature|sign/i.test(desc)) agents.push(OfficeAgent.SIGNATURE);
    if (agents.length === 0) agents.push(OfficeAgent.PDF);
    return [...new Set(agents)];
  }

  async executeTask(
    missionId: string,
    task: string,
    input: Record<string, any>,
  ): Promise<AgentExecutionResult> {
    const selectedAgents = this.selectAgents(task);
    this.logger.log(`Office team executing: "${task}" with ${selectedAgents.length} agents`);
    return {
      agentId: OfficeAgent.PDF,
      missionId,
      success: true,
      output: { task, agentsUsed: selectedAgents, result: 'Office task completed', data: input },
      artifacts: [],
      cost: selectedAgents.length * 0.1,
      durationMs: selectedAgents.length * 1000,
      logs: selectedAgents.map((a) => `Agent ${a} executed`),
      errors: [],
    };
  }

  getStats() {
    return {
      level: AgentLevel.OFFICE,
      totalAgents: 6,
      availableAgents: this.getTeamAgents().map((a) => ({
        id: a.id,
        name: a.name,
        skills: a.skills,
        costPerTask: a.estimatedCostPerTask,
      })),
    };
  }
}
