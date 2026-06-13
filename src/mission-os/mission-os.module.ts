/**
 * AENEWS Agent OS X - Mission OS Support Module
 * Practical support services retained from the Mission OS layer.
 * Abstract components removed: Digital Twin, Marketplace, World Model,
 * Simulation Engine, Skill Graph, Long Horizon Planning, Capability Registry.
 *
 * Retained practical services:
 *   1. Constitutional AI    - Permanent rules enforcement
 *   2. Human Approval Layer - Critical action validation gate
 *   3. Temporal Memory      - Chronological memory system
 *   4. Resource Optimizer   - Dynamic resource allocation
 *   5. Observability Center - Unified monitoring dashboard
 *   6. Auto Recovery        - Agent failure detection & self-healing
 *   7. Mission Graph        - Hierarchical mission decomposition
 */

import { Module } from '@nestjs/common';
import { ConstitutionalAiService } from './constitutional/constitutional-ai.service';
import { MissionGraphService } from './mission-graph/mission-graph.service';
import { HumanApprovalService } from './human-approval/human-approval.service';
import { TemporalMemoryService } from './temporal-memory/temporal-memory.service';
import { ResourceOptimizerService } from './resource-optimizer/resource-optimizer.service';
import { ObservabilityCenterService } from './observability/observability-center.service';
import { AutoRecoveryService } from './auto-recovery/auto-recovery.service';

@Module({
  providers: [
    // ─── Governance ────────────────────────────────────────────────
    ConstitutionalAiService,
    HumanApprovalService,

    // ─── Mission Structure ─────────────────────────────────────────
    MissionGraphService,

    // ─── Memory & Resources ────────────────────────────────────────
    TemporalMemoryService,
    ResourceOptimizerService,

    // ─── Observability & Recovery ──────────────────────────────────
    ObservabilityCenterService,
    AutoRecoveryService,
  ],
  exports: [
    ConstitutionalAiService,
    HumanApprovalService,
    MissionGraphService,
    TemporalMemoryService,
    ResourceOptimizerService,
    ObservabilityCenterService,
    AutoRecoveryService,
  ],
})
export class MissionOsModule {}
