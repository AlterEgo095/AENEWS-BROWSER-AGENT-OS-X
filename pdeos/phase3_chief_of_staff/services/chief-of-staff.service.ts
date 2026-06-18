/**
 * PDEOS Phase 3 — Chief Of Staff service + controller + module
 */
import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ChiefOfStaffAgent } from './agents/chief-of-staff.agent';
import { MissionRequestDto, MissionResult } from './dto/mission-request.dto';

@Injectable()
export class ChiefOfStaffService {
  private logger = new Logger(ChiefOfStaffService.name);
  constructor(private cos: ChiefOfStaffAgent) {}

  async executeMission(req: MissionRequestDto, user: { id: string; tenantId: string; email: string }): Promise<MissionResult> {
    const correlationId = `cos_${uuidv4()}`;
    const result = await this.cos.execute(req, { userId: user.id, tenantId: user.tenantId, correlationId });
    this.logger.log(`[${correlationId}] Mission ${result.missionId}: ${result.status} cost=$${result.metrics.costUSD.toFixed(2)}`);
    return result;
  }

  async generateDailyBriefing(_userId: string, _tenantId: string) {
    return {
      date: new Date().toISOString(),
      sections: [{
        title: 'Synthèse exécutive',
        content: 'PDEOS opérationnel. Aucun incident critique. En attente Memory Engine (Phase 4) pour briefing complet.',
        priority: 'info',
      }],
    };
  }
}
