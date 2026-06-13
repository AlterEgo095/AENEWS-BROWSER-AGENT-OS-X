/**
 * AENEWS Agent OS X — Agent-Connector Bridge Module
 *
 * Provides AgentConnectorBridge to the NestJS dependency injection system.
 * Imports SoftwareFactoryModule which exports ConnectorRegistry.
 *
 * Import this module into any agent module that needs real connector access:
 *
 *   @Module({
 *     imports: [AgentConnectorBridgeModule],
 *     providers: [MyAgent],
 *   })
 *   export class MyAgentModule {}
 *
 * Then inject in your agent:
 *   constructor(private readonly bridge: AgentConnectorBridge) {}
 */

import { Module } from '@nestjs/common';
import { SoftwareFactoryModule } from '../../software-factory/software-factory.module';
import { AgentConnectorBridge } from './agent-connector-bridge.service';

@Module({
  imports: [SoftwareFactoryModule],
  providers: [AgentConnectorBridge],
  exports: [AgentConnectorBridge],
})
export class AgentConnectorBridgeModule {}
