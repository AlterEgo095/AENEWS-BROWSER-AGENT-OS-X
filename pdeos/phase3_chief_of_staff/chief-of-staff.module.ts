/**
 * PDEOS Phase 3 — Module wiring
 * Adapter pattern: wraps existing AgentOrchestratorService + AgentRegistryService + HyperOrchestrator.
 *
 * In app.module.ts, add ChiefOfStaffModule to imports.
 * Adapter providers must be configured to map existing services to the interfaces.
 */
import { Module } from '@nestjs/common';
import { LLMModule } from '../llm/llm.module';
import { ChiefOfStaffAgent, IOrchestrator } from './agents/chief-of-staff.agent';
import { PlannerAgent } from './agents/planner.agent';
import { CoordinatorAgent, IAgentRegistry, IHyperOrchestrator } from './agents/coordinator.agent';
import { DeliveryAgent } from './agents/delivery.agent';
import { ChiefOfStaffService } from './services/chief-of-staff.service';
import { ChiefOfStaffController } from './controllers/chief-of-staff.controller';

@Module({
  imports: [LLMModule],
  controllers: [ChiefOfStaffController],
  providers: [
    ChiefOfStaffAgent, PlannerAgent, CoordinatorAgent, DeliveryAgent, ChiefOfStaffService,
    // Adapter providers — bind existing services to interfaces
    // { provide: IOrchestrator, useExisting: AgentOrchestratorService },
    // { provide: IAgentRegistry, useExisting: AgentRegistryService },
    // { provide: IHyperOrchestrator, useExisting: HyperOrchestrator },
    // Uncomment + adjust imports above once app integration is done
  ],
  exports: [ChiefOfStaffAgent, ChiefOfStaffService],
})
export class ChiefOfStaffModule {}
