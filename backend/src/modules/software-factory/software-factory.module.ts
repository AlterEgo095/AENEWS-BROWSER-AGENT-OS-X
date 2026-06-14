/**
 * AENEWS Software Factory Module
 *
 * Wires all Software Factory services into the NestJS application:
 *
 *   - MissionContractService: Contract creation, validation, tracking
 *   - MissionStateMachineService: Lifecycle FSM with events
 *   - MissionOrchestratorService: Central orchestration (start/pause/resume/cancel)
 *   - MissionRuntimeEngine: Step execution, retries, evaluation
 *   - ConnectorRegistryService: Connector registration and routing
 *   - BrowserConnectorService: Browser capability execution
 *   - ComputerConnectorService: Dev/Office/Business/Cert/Delivery execution
 *   - PlanningTeamService: Plan creation, research
 *   - ExecutionTeamService: Code generation, browser ops, deployment
 *   - CertificationTeamService: Testing, auditing, certification
 *
 * Controllers:
 *   - SoftwareFactoryController: Mission CRUD, lifecycle, contracts
 *   - ConnectorController: Connector listing and execution
 *
 * Imports: AgentFrameworkModule (for AgentOrchestratorService, AgentEventBusService, AgentRegistryService)
 * Exports: MissionOrchestratorService, ConnectorRegistryService, team services
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentFrameworkModule } from '../agent-framework/agent-framework.module';

// Entities
import { Mission } from './entities/mission.entity';
import { MissionContract } from './entities/mission-contract.entity';

// Controllers
import { SoftwareFactoryController, ConnectorController } from './software-factory.controller';

// Services
import { MissionContractService } from './services/mission-contract.service';
import { MissionStateMachineService } from './services/mission-state-machine.service';
import { MissionOrchestratorService } from './services/mission-orchestrator.service';
import { MissionRuntimeEngine } from './services/mission-runtime.engine';
import { ConnectorRegistryService } from './services/connector-registry.service';

// Connectors
import { BrowserConnectorService } from './services/connectors/browser-connector.service';
import { ComputerConnectorService } from './services/connectors/computer-connector.service';

// Teams
import { PlanningTeamService } from './services/teams/planning-team.service';
import { ExecutionTeamService } from './services/teams/execution-team.service';
import { CertificationTeamService } from './services/teams/certification-team.service';

@Module({
  imports: [
    AgentFrameworkModule,
    TypeOrmModule.forFeature([Mission, MissionContract]),
  ],
  controllers: [SoftwareFactoryController, ConnectorController],
  providers: [
    // Core Services
    MissionContractService,
    MissionStateMachineService,
    MissionOrchestratorService,
    MissionRuntimeEngine,
    ConnectorRegistryService,

    // Connectors
    BrowserConnectorService,
    ComputerConnectorService,

    // Teams
    PlanningTeamService,
    ExecutionTeamService,
    CertificationTeamService,
  ],
  exports: [
    // Core Services (exported for use by other modules)
    MissionOrchestratorService,
    MissionContractService,
    MissionStateMachineService,
    MissionRuntimeEngine,
    ConnectorRegistryService,

    // Connectors
    BrowserConnectorService,
    ComputerConnectorService,

    // Teams
    PlanningTeamService,
    ExecutionTeamService,
    CertificationTeamService,
  ],
})
export class SoftwareFactoryModule {}
