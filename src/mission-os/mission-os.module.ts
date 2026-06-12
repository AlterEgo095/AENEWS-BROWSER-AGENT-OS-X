/**
 * AENEWS Agent OS X - Mission OS Module
 * The top-level cognitive operating system layer that transforms
 * the agent platform into a self-governing AI Software Factory.
 *
 * Components:
 *   1. Capability Registry  - Dynamic capability publication & discovery
 *   2. Skill Graph           - Agent skills with level/cost/latency/success rate
 *   3. World Model           - Global state representation
 *   4. Constitutional AI     - Permanent rules enforcement
 *   5. Mission Graph         - Hierarchical mission decomposition
 *   6. Long Horizon Planning - Multi-level planning engine
 *   7. Simulation Engine     - Pre-execution simulation & risk assessment
 *   8. Human Approval Layer  - Critical action validation gate
 *   9. Digital Twin          - Infrastructure mirror & sync
 *  10. Temporal Memory       - Chronological memory system
 *  11. Resource Optimizer    - Dynamic resource allocation
 *  12. Observability Center  - Unified monitoring dashboard
 *  13. Auto Recovery         - Agent failure detection & self-healing
 *  14. Agent Marketplace     - Plugin-based cluster system
 */

import { Module } from '@nestjs/common';
import { CapabilityRegistryService } from './capability-registry/capability-registry.service';
import { SkillGraphService } from './skill-graph/skill-graph.service';
import { WorldModelService } from './world-model/world-model.service';
import { ConstitutionalAiService } from './constitutional/constitutional-ai.service';
import { MissionGraphService } from './mission-graph/mission-graph.service';
import { LongHorizonPlanningService } from './long-horizon-planning/long-horizon-planning.service';
import { SimulationEngineService } from './simulation/simulation-engine.service';
import { HumanApprovalService } from './human-approval/human-approval.service';
import { DigitalTwinService } from './digital-twin/digital-twin.service';
import { TemporalMemoryService } from './temporal-memory/temporal-memory.service';
import { ResourceOptimizerService } from './resource-optimizer/resource-optimizer.service';
import { ObservabilityCenterService } from './observability/observability-center.service';
import { AutoRecoveryService } from './auto-recovery/auto-recovery.service';
import { MarketplaceService } from './marketplace/marketplace.service';

@Module({
  providers: [
    // ─── Capability & Skill Discovery ──────────────────────────────
    CapabilityRegistryService,
    SkillGraphService,

    // ─── World Model & Governance ──────────────────────────────────
    WorldModelService,
    ConstitutionalAiService,

    // ─── Mission & Planning ────────────────────────────────────────
    MissionGraphService,
    LongHorizonPlanningService,
    SimulationEngineService,

    // ─── Safety & Approval ─────────────────────────────────────────
    HumanApprovalService,

    // ─── Infrastructure Intelligence ───────────────────────────────
    DigitalTwinService,
    TemporalMemoryService,
    ResourceOptimizerService,

    // ─── Observability & Recovery ──────────────────────────────────
    ObservabilityCenterService,
    AutoRecoveryService,

    // ─── Extensibility ────────────────────────────────────────────
    MarketplaceService,
  ],
  exports: [
    CapabilityRegistryService,
    SkillGraphService,
    WorldModelService,
    ConstitutionalAiService,
    MissionGraphService,
    LongHorizonPlanningService,
    SimulationEngineService,
    HumanApprovalService,
    DigitalTwinService,
    TemporalMemoryService,
    ResourceOptimizerService,
    ObservabilityCenterService,
    AutoRecoveryService,
    MarketplaceService,
  ],
})
export class MissionOsModule {}
