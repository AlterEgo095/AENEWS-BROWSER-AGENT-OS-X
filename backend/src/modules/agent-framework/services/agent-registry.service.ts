/**
 * AENEWS Agent OS X — Agent Registry Service
 *
 * Registry for tracking available agents and their capabilities.
 * Stub implementation — will be enhanced by the agent-framework team.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Trace } from '../../observability/decorators/trace.decorator';

export interface AgentInfo {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
  status: 'idle' | 'busy' | 'offline';
  maxConcurrentTasks: number;
  currentTasks: number;
}

@Injectable()
export class AgentRegistryService {
  private readonly logger = new Logger(AgentRegistryService.name);
  private readonly agents = new Map<string, AgentInfo>();

  /**
   * Register an agent
   */
  @Trace('registry.register')
  register(agent: AgentInfo): void {
    this.agents.set(agent.id, agent);
    this.logger.log(`Agent registered: ${agent.name} (${agent.type})`);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentInfo | undefined {
    return this.agents.get(agentId);
  }

  /**
   * List all registered agents
   */
  listAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find agents by capability
   */
  @Trace('registry.findByCapability')
  findByCapability(capability: string): AgentInfo[] {
    return Array.from(this.agents.values()).filter(
      (a) => a.capabilities.includes(capability) && a.status === 'idle',
    );
  }

  /**
   * Update agent status
   */
  updateStatus(agentId: string, status: 'idle' | 'busy' | 'offline'): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.status = status;
    this.agents.set(agentId, agent);
    return true;
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): boolean {
    return this.agents.delete(agentId);
  }
}
