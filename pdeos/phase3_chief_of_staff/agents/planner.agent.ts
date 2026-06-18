/**
 * PDEOS Phase 3 — Planner Agent
 * Decomposes mission into DAG of subtasks, routes to 10 PDEOS departments.
 */
import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../../llm/llm.service';
import { MissionPriority, MissionDepth } from '../dto/mission-request.dto';

export interface Subtask {
  id: string; description: string; department: string;
  requiredCapabilities: string[]; dependencies: string[];
  estimatedDurationMs: number; estimatedCostUSD: number; parallelizable: boolean;
}
export interface ExecutionPlan {
  missionId: string; title: string; subtasks: Subtask[];
  parallelizable: boolean; totalEstimatedDurationMs: number; totalEstimatedCostUSD: number;
}

@Injectable()
export class PlannerAgent {
  private logger = new Logger(PlannerAgent.name);
  private static DEPT_TO_CLUSTER: Record<string, string[]> = {
    'chief-of-staff': ['intelligent-orchestration', 'llm-intelligence'],
    'research': ['meta-intelligence', 'data-intelligence'],
    'software-factory': ['coding'],
    'personal-automation': ['office', 'communication'],
    'infrastructure': ['computer', 'infrastructure'],
    'content-factory': ['marketing'],
    'browser-automation': ['browser'],
    'security': ['security'],
    'github-ops': [], 'connectors': [],
  };

  constructor(private llm: LLMService) {}

  async plan(mission: any, ctx: { correlationId: string }): Promise<ExecutionPlan> {
    const prompt = `Decompose mission into 1-15 subtasks. Each assigned to one of 10 departments:
chief-of-staff, research, software-factory, personal-automation, infrastructure, content-factory, browser-automation, security, github-ops, connectors.

MISSION: ${JSON.stringify(mission)}
JSON: { "subtasks": [{ "id": "st-1", "description": "...", "department": "research", "requiredCapabilities": [...], "dependencies": [], "estimatedDurationMs": N, "estimatedCostUSD": N, "parallelizable": bool }] }`;
    const r = await this.llm.complete({ prompt, temperature: 0.2, maxTokens: 2000 } as any);
    let parsed: any;
    try { parsed = JSON.parse(r.text); }
    catch { parsed = { subtasks: [{ id: 'st-1', description: mission.title, department: 'chief-of-staff', requiredCapabilities: [], dependencies: [], estimatedDurationMs: 60000, estimatedCostUSD: 1, parallelizable: false }] }; }

    const subtasks: Subtask[] = (parsed.subtasks || []).map((s: any) => ({
      id: String(s.id), description: String(s.description),
      department: this.normalizeDept(s.department),
      requiredCapabilities: s.requiredCapabilities || [], dependencies: s.dependencies || [],
      estimatedDurationMs: +s.estimatedDurationMs || 60000,
      estimatedCostUSD: +s.estimatedCostUSD || 0.5, parallelizable: Boolean(s.parallelizable),
    }));
    const parallelizable = subtasks.some((s) => s.parallelizable && s.dependencies.length === 0);
    return {
      missionId: '', title: mission.title, subtasks, parallelizable,
      totalEstimatedDurationMs: parallelizable ? Math.max(...subtasks.map((s) => s.estimatedDurationMs), 0) : subtasks.reduce((s, t) => s + t.estimatedDurationMs, 0),
      totalEstimatedCostUSD: subtasks.reduce((s, t) => s + t.estimatedCostUSD, 0),
    };
  }

  private normalizeDept(d: string): string {
    const n = String(d).toLowerCase().trim();
    return Object.keys(PlannerAgent.DEPT_TO_CLUSTER).includes(n) ? n : 'chief-of-staff';
  }

  static getClustersForDepartment(dept: string): string[] {
    return PlannerAgent.DEPT_TO_CLUSTER[dept] || [];
  }
}
