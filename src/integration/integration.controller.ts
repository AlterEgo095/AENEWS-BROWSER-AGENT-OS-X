/**
 * AENEWS Agent OS X - Integration Controller
 *
 * REST API for cross-module integration endpoints:
 *   - Integrated mission execution (with Security + Constitutional + Human Approval)
 *   - Unified observability snapshot
 *   - Integration statistics
 *   - Constitutional compliance checks
 *   - Action validation (Security + Constitutional)
 */

import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  IntegrationService,
  MissionIntegrationContext,
} from './integration.service';

@Controller('api/integration')
export class IntegrationController {
  constructor(private readonly integration: IntegrationService) {}

  // ═══════════════════════════════════════════════════════════════
  //  INTEGRATED MISSION EXECUTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Execute a mission with FULL cross-module integration:
   * Security Gateway → Constitutional AI → Human Approval → Mission Graph →
   * Resource Allocation → Runtime Engine → Realtime → Metrics → Observability →
   * Auto-Recovery → Temporal Memory
   *
   * POST /api/integration/missions/execute
   */
  @Post('missions/execute')
  @HttpCode(HttpStatus.ACCEPTED)
  async executeIntegratedMission(
    @Body()
    body: {
      instruction: string;
      description?: string;
      quality?: string;
      budgetMaxUsd?: number;
      submittedBy?: string;
      tenantId?: string;
    },
  ): Promise<{ success: boolean; data: MissionIntegrationContext }> {
    const context = await this.integration.executeIntegratedMission(body);
    return {
      success: context.status !== 'failed',
      data: context,
    };
  }

  /**
   * Get context for an integrated mission
   * GET /api/integration/missions/:id
   */
  @Get('missions/:id')
  getMissionContext(@Body('id') id: string) {
    const context = this.integration.getMissionContext(id);
    if (!context) return { success: false, error: 'Mission context not found' };
    return { success: true, data: context };
  }

  /**
   * Get all active integrated mission contexts
   * GET /api/integration/missions/active
   */
  @Get('missions/active')
  getActiveMissions() {
    return {
      success: true,
      data: this.integration.getAllActiveContexts(),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  UNIFIED OBSERVABILITY
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get unified observability snapshot across all modules
   * GET /api/integration/observability
   */
  @Get('observability')
  async getUnifiedSnapshot() {
    const snapshot = await this.integration.getUnifiedSnapshot();
    return { success: true, data: snapshot };
  }

  // ═══════════════════════════════════════════════════════════════
  //  INTEGRATION STATS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get integration service statistics
   * GET /api/integration/stats
   */
  @Get('stats')
  getIntegrationStats() {
    return {
      success: true,
      data: this.integration.getIntegrationStats(),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  CONSTITUTIONAL COMPLIANCE CHECK
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if a prompt/action complies with Constitutional AI rules
   * POST /api/integration/constitutional/check
   */
  @Post('constitutional/check')
  async checkConstitutionalCompliance(
    @Body() body: { prompt: string },
  ) {
    const result = await this.integration.checkConstitutionalCompliance(body.prompt);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════
  //  ACTION VALIDATION (Security + Constitutional)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate an action through both Security Gateway and Constitutional AI
   * POST /api/integration/validate
   */
  @Post('validate')
  async validateAction(
    @Body() body: { agentId: string; action: string; resource: string; input: any },
  ) {
    const result = await this.integration.validateAction(
      body.agentId,
      body.action,
      body.resource,
      body.input,
    );
    return { success: result.allowed, data: result };
  }
}
