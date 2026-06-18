/**
 * PDEOS Phase 3 — Chief Of Staff AI
 * File: backend/src/modules/chief-of-staff/agents/chief-of-staff.agent.ts
 *
 * Pipeline 9 steps: Reformulate → Plan → Prioritize → Budget → Select → Execute → Critique → Memory → Deliver
 * Wraps existing AgentOrchestratorService (NO REWRITE).
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { LLMService } from '../../llm/llm.service';
import { PlannerAgent } from './planner.agent';
import { CoordinatorAgent } from './coordinator.agent';
import { DeliveryAgent } from './delivery.agent';
import { MissionRequestDto, MissionPriority, MissionDepth, MissionResult } from '../dto/mission-request.dto';

// Abstracted orchestrator interface — adapter pattern to existing AgentOrchestratorService
export interface IOrchestrator {
  executeMission(params: any): Promise<any>;
}

@Injectable()
export class ChiefOfStaffAgent {
  private readonly logger = new Logger(ChiefOfStaffAgent.name);

  constructor(
    private llmService: LLMService,
    private planner: PlannerAgent,
    private coordinator: CoordinatorAgent,
    private delivery: DeliveryAgent,
    private orchestrator: IOrchestrator,
  ) {}

  async execute(request: MissionRequestDto, ctx: { userId: string; tenantId: string; correlationId: string }): Promise<MissionResult> {
    const missionId = `mission_${uuidv4()}`;
    const startedAt = Date.now();
    this.logger.log(`[${ctx.correlationId}] Mission ${missionId}: "${request.prompt.substring(0, 80)}..."`);

    // 1. Reformulate
    const reformulated = await this.reformulate(request, ctx);

    // 2. Plan
    const plan = await this.planner.plan(reformulated, ctx);

    // 3. Budget
    const budget = request.budgetUSD ?? this.defaultBudget(reformulated.depth);

    // 4. Select agents
    const assignments = await this.coordinator.assignAgents(plan, ctx);

    // 5. Execute via existing orchestrator (wrapped)
    const timeoutMs = request.timeoutSeconds ? request.timeoutSeconds * 1000 : this.defaultTimeout(reformulated.depth);
    const execution = await this.orchestrator.executeMission({
      missionId, plan, assignments, budgetUSD: budget, timeoutMs,
      tenantId: ctx.tenantId, userId: ctx.userId, correlationId: ctx.correlationId,
    });

    // 6. Critique
    const critique = await this.critique(execution, reformulated, ctx);

    // 7. Deliver
    const result = await this.delivery.deliver({
      missionId, reformulated, execution, critique, startedAt, correlationId: ctx.correlationId,
    });

    // 8. Memory + Learning (async)
    this.persistAndLearn(result, ctx).catch((e) => this.logger.error(`Memory failed: ${e.message}`));

    return result;
  }

  private async reformulate(req: MissionRequestDto, ctx: { correlationId: string }) {
    const prompt = `You are the Chief Of Staff. Reformulate this request into a structured mission.
USER: ${req.prompt}
Context: priority=${req.priority ?? 'normal'}, depth=${req.depth ?? 'standard'}
Respond in JSON: { "title": "...", "objectives": [...], "constraints": [...], "priority": "...", "depth": "...", "expectedDeliverables": [...] }`;
    const r = await this.llmService.complete({ prompt, temperature: 0.2, maxTokens: 1000 } as any);
    try {
      const p = JSON.parse(r.text);
      return {
        title: String(p.title), objectives: p.objectives || [], constraints: p.constraints || [],
        priority: p.priority || MissionPriority.NORMAL, depth: p.depth || MissionDepth.STANDARD,
        expectedDeliverables: p.expectedDeliverables || [],
      };
    } catch { throw new BadRequestException('Reformulation failed'); }
  }

  private async critique(execution: any, reform: any, ctx: { correlationId: string }) {
    const prompt = `Critique this mission execution. Quality 0-100 + suggestions.
MISSION: ${JSON.stringify(reform).substring(0, 500)}
EXEC: ${JSON.stringify(execution).substring(0, 2000)}
JSON: { "qualityScore": N, "suggestions": [...] }`;
    try {
      const r = await this.llmService.complete({ prompt, temperature: 0.1, maxTokens: 600 } as any);
      const p = JSON.parse(r.text);
      return { qualityScore: Math.max(0, Math.min(100, +p.qualityScore || 50)), suggestions: p.suggestions || [] };
    } catch { return { qualityScore: 50, suggestions: [] }; }
  }

  private async persistAndLearn(_result: MissionResult, ctx: { correlationId: string }) {
    // Phase 4 Memory Engine + Phase 5 Learning Engine integration
    this.logger.log(`[${ctx.correlationId}] Mission persisted (stub — wire to MemoryEngine)`);
  }

  private defaultBudget(d: MissionDepth) {
    return { simple: 0.5, standard: 2, deep: 10, very_deep: 50 }[d] ?? 2;
  }
  private defaultTimeout(d: MissionDepth) {
    return { simple: 300000, standard: 1800000, deep: 14400000, very_deep: 86400000 }[d] ?? 1800000;
  }
}
