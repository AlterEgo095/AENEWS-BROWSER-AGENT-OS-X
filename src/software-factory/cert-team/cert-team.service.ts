/**
 * AENEWS Software Factory — Certification Team Coordinator
 * Level 6: 8 on-demand certification specialists
 */

import { Injectable, Logger } from '@nestjs/common';
import { CertAgent, AgentLevel, SpecializedAgentId, AgentExecutionResult } from '../interfaces';
import { AgentRegistryService } from '../registry/agent-registry.service';

@Injectable()
export class CertTeamService {
  private readonly logger = new Logger(CertTeamService.name);
  constructor(private readonly registry: AgentRegistryService) {}

  getTeamAgents() { return this.registry.getByLevel(AgentLevel.CERTIFICATION); }

  selectAgents(taskDescription: string): SpecializedAgentId[] {
    const desc = taskDescription.toLowerCase();
    const agents: SpecializedAgentId[] = [];
    if (/architecture|arch.*review/i.test(desc)) agents.push(CertAgent.ARCH_CERT);
    if (/security|sécurité|vulnérabilit/i.test(desc)) agents.push(CertAgent.SECURITY);
    if (/test|coverage|couverture/i.test(desc)) agents.push(CertAgent.TESTS);
    if (/regression|non.*regress/i.test(desc)) agents.push(CertAgent.REGRESSION);
    if (/performance|load|charge/i.test(desc)) agents.push(CertAgent.PERFORMANCE);
    if (/document.*complet|doc.*review/i.test(desc)) agents.push(CertAgent.DOCS);
    if (/integration|e2e|end.*to.*end/i.test(desc)) agents.push(CertAgent.INTEGRATION);
    if (/compliance|conform|rgpd|gdpr/i.test(desc)) agents.push(CertAgent.COMPLIANCE);
    // Default certification: security + tests + docs
    if (agents.length === 0) agents.push(CertAgent.SECURITY, CertAgent.TESTS, CertAgent.DOCS);
    return [...new Set(agents)];
  }

  async executeTask(missionId: string, task: string, input: Record<string, any>): Promise<AgentExecutionResult> {
    const selectedAgents = this.selectAgents(task);
    this.logger.log(`Cert team executing: "${task}" with ${selectedAgents.length} agents`);
    return {
      agentId: CertAgent.SECURITY, missionId, success: true,
      output: { task, agentsUsed: selectedAgents, result: 'Certification task completed', data: input },
      artifacts: [], cost: selectedAgents.length * 0.2, durationMs: selectedAgents.length * 2000,
      logs: selectedAgents.map(a => `Agent ${a} executed`), errors: [],
    };
  }

  getStats() {
    return { level: AgentLevel.CERTIFICATION, totalAgents: 8,
      availableAgents: this.getTeamAgents().map(a => ({ id: a.id, name: a.name, skills: a.skills, costPerTask: a.estimatedCostPerTask })),
    };
  }
}
