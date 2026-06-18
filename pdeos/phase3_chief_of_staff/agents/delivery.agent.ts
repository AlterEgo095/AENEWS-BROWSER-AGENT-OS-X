/**
 * PDEOS Phase 3 — Delivery Agent
 * Synthesizes execution output into a single coherent MissionResult.
 */
import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../../llm/llm.service';
import { MissionResult } from '../dto/mission-request.dto';

@Injectable()
export class DeliveryAgent {
  private logger = new Logger(DeliveryAgent.name);
  constructor(private llm: LLMService) {}

  async deliver(input: {
    missionId: string; reformulated: any; execution: any; critique: any;
    startedAt: number; correlationId: string;
  }): Promise<MissionResult> {
    const durationMs = Date.now() - input.startedAt;
    const costUSD = (input.execution.artifacts || []).reduce((s: number, a: any) => s + (a.costUSD || 0), 0);
    const summary = await this.generateSummary(input);
    const deliverables = this.extractDeliverables(input);

    return {
      missionId: input.missionId, status: input.execution.status,
      summary, deliverables,
      metrics: {
        durationMs, costUSD,
        agentsInvolved: (input.execution.artifacts || []).map((a: any) => a.agentId),
        subtasksExecuted: (input.execution.artifacts || []).length,
        retries: input.execution.retries || 0, fallbacks: input.execution.fallbacks || 0,
      },
      learningFeedback: {
        qualityScore: input.critique.qualityScore,
        improvementSuggestions: input.critique.suggestions,
      },
      correlationId: input.correlationId, timestamp: new Date().toISOString(),
    };
  }

  private async generateSummary(input: any): Promise<string> {
    const artifacts = (input.execution.artifacts || [])
      .map((a: any, i: number) => `[${i + 1}] ${a.agentName}: ${JSON.stringify(a.output).substring(0, 200)}`)
      .join('\n');
    const prompt = `Synthesize mission result into a 2-5 paragraph summary (French).
MISSION: ${input.reformulated.title}
STATUS: ${input.execution.status}
ARTIFACTS:\n${artifacts}
Respond with summary text only.`;
    try {
      const r = await this.llm.complete({ prompt, temperature: 0.4, maxTokens: 800 } as any);
      return r.text.trim();
    } catch {
      return `Mission ${input.missionId} terminée: ${input.execution.status}. ${input.execution.artifacts?.length || 0} artefacts produits.`;
    }
  }

  private extractDeliverables(input: any) {
    const out: any[] = [];
    for (const a of (input.execution.artifacts || [])) {
      const o = a.output;
      if (!o) continue;
      if (o.file || o.path || o.url) out.push({ type: o.type || 'file', name: o.name || `${a.agentName} output`, location: o.file || o.path || o.url });
      else if (o.content || o.text || o.code) out.push({ type: o.type || 'message', name: o.name || `${a.agentName} output`, content: String(o.content || o.text || o.code).substring(0, 5000) });
    }
    return out;
  }
}
