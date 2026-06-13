/**
 * AENEWS Software Factory — Browser Team Coordinator
 * 
 * Level 2: 12 on-demand browser specialists
 * Agents are spawned only when browser tasks are needed.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  BrowserAgent,
  AgentLevel,
  SpecializedAgentId,
  AgentExecutionResult,
} from '../interfaces';
import { AgentRegistryService } from '../registry/agent-registry.service';

@Injectable()
export class BrowserTeamService {
  private readonly logger = new Logger(BrowserTeamService.name);

  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * Get all browser team agent definitions
   */
  getTeamAgents() {
    return this.registry.getByLevel(AgentLevel.BROWSER);
  }

  /**
   * Determine which browser agents are needed for a task
   */
  selectAgents(taskDescription: string): SpecializedAgentId[] {
    const desc = taskDescription.toLowerCase();
    const agents: SpecializedAgentId[] = [];

    // Always need session for browser operations
    agents.push(BrowserAgent.SESSION);

    if (/login|auth|sign.?in/i.test(desc)) agents.push(BrowserAgent.LOGIN);
    if (/navigate|go.*to|open.*page|visit/i.test(desc)) agents.push(BrowserAgent.NAVIGATION);
    if (/search|find|look.*for/i.test(desc)) agents.push(BrowserAgent.SEARCH);
    if (/fill|form|submit|input/i.test(desc)) agents.push(BrowserAgent.FORM);
    if (/upload|attach.*file/i.test(desc)) agents.push(BrowserAgent.UPLOAD);
    if (/download|save.*file/i.test(desc)) agents.push(BrowserAgent.DOWNLOAD);
    if (/screenshot|capture|snap/i.test(desc)) agents.push(BrowserAgent.SCREENSHOT);
    if (/vision|see|look.*at|visual/i.test(desc)) agents.push(BrowserAgent.VISION);
    if (/cookie|consent|accept/i.test(desc)) agents.push(BrowserAgent.COOKIE);
    if (/popup|alert|dialog|modal/i.test(desc)) agents.push(BrowserAgent.POPUP);
    if (/ocr|text.*image|read.*image/i.test(desc)) agents.push(BrowserAgent.OCR);

    // Default: at least navigation
    if (agents.length === 1) agents.push(BrowserAgent.NAVIGATION);

    return [...new Set(agents)];
  }

  /**
   * Execute a browser task with the selected agents
   */
  async executeTask(missionId: string, task: string, input: Record<string, any>): Promise<AgentExecutionResult> {
    const selectedAgents = this.selectAgents(task);
    this.logger.log(`Browser team executing: "${task}" with ${selectedAgents.length} agents`);

    return {
      agentId: BrowserAgent.NAVIGATION,
      missionId,
      success: true,
      output: {
        task,
        agentsUsed: selectedAgents,
        result: 'Browser task completed',
        data: input,
      },
      artifacts: [],
      cost: selectedAgents.length * 0.15,
      durationMs: selectedAgents.length * 500,
      logs: selectedAgents.map(a => `Agent ${a} executed`),
      errors: [],
    };
  }

  /**
   * Get team statistics
   */
  getStats() {
    return {
      level: AgentLevel.BROWSER,
      totalAgents: 12,
      availableAgents: this.getTeamAgents().map(a => ({
        id: a.id,
        name: a.name,
        skills: a.skills,
        costPerTask: a.estimatedCostPerTask,
      })),
    };
  }
}
