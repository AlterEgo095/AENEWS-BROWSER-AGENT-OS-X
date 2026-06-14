/**
 * AENEWS Agent OS X — Infrastructure Connector Module
 *
 * NestJS module that provides real infrastructure management capabilities.
 *
 * Provides:
 *   - InfrastructureConnectorService: Docker, processes, system monitoring, deployment
 *
 * On module init:
 *   - Registers the infrastructure connector with AgentBridgeService
 *
 * Configuration via environment variables:
 *   INFRA_ENABLED=true
 *   DOCKER_SOCKET=/var/run/docker.sock
 */

import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { InfrastructureConnectorService } from './infrastructure-connector.service';
import { AgentBridgeService, SoftwareFactoryConnector } from '../../agent-framework/services/agent-bridge.service';
import { AgentFrameworkModule } from '../../agent-framework/agent-framework.module';

// ─── Infrastructure Bridge Connector ──────────────────────────────

class InfrastructureBridgeConnector implements SoftwareFactoryConnector {
  readonly name = 'infrastructure';
  readonly description = 'Infrastructure management — Docker containers, processes, system monitoring, deployment';
  readonly actions = [
    'listContainers', 'getContainer', 'startContainer', 'stopContainer',
    'restartContainer', 'getContainerLogs', 'getContainerStats',
    'listImages', 'pullImage',
    'listProcesses', 'getProcess', 'killProcess',
    'getSystemInfo', 'getNetworkInterfaces', 'getDiskUsage',
    'deployContainer', 'scaleService',
  ];

  constructor(private readonly infraService: InfrastructureConnectorService) {}

  async execute(action: string, params: Record<string, any>): Promise<any> {
    return this.infraService.executeAction(action, params);
  }
}

@Module({
  imports: [AgentFrameworkModule],
  providers: [InfrastructureConnectorService],
  exports: [InfrastructureConnectorService],
})
export class InfrastructureConnectorModule implements OnModuleInit {
  private readonly logger = new Logger(InfrastructureConnectorModule.name);

  constructor(
    private readonly infraService: InfrastructureConnectorService,
    private readonly agentBridge: AgentBridgeService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.agentBridge.registerConnector(
      'infrastructure',
      new InfrastructureBridgeConnector(this.infraService),
      'real',
    );

    this.logger.log(
      `Infrastructure connector registered with AgentBridge ` +
        `(actions: ${this.infraService.getSupportedActions().length})`,
    );
  }
}
