/**
 * AENEWS Agent OS X - Integration Module
 *
 * The cross-module integration hub that bridges:
 *   SoftwareFactory ↔ Agents ↔ MissionOS ↔ Gateway ↔ Realtime
 *
 * This is the ONLY module that imports from all other modules.
 * All cross-module communication flows through IntegrationService.
 */

import { Module } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationController } from './integration.controller';
import { SoftwareFactoryModule } from '../software-factory/software-factory.module';
import { AgentsModule } from '../agents/agents.module';
import { MissionOsModule } from '../mission-os/mission-os.module';
import { GatewayModule } from '../gateway/gateway.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    SoftwareFactoryModule,
    AgentsModule,
    MissionOsModule,
    GatewayModule,
    RealtimeModule,
  ],
  providers: [IntegrationService],
  controllers: [IntegrationController],
  exports: [IntegrationService],
})
export class IntegrationModule {}
