/**
 * AENEWS Agent OS X — Office Connector Module
 *
 * NestJS module that provides real office automation capabilities.
 *
 * Provides:
 *   - OfficeConnectorService: Document generation, email, calendar, spreadsheets, tasks
 *
 * On module init:
 *   - Registers the office connector with AgentBridgeService
 *     (replaces the simulation connector)
 *
 * Configuration via environment variables:
 *   OFFICE_ENABLED=true
 *   SMTP_HOST=
 *   SMTP_PORT=587
 *   SMTP_USER=
 *   SMTP_PASSWORD=
 *   SMTP_FROM=noreply@aenews.io
 */

import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { OfficeConnectorService } from './office-connector.service';
import { AgentBridgeService } from '../../agent-framework/services/agent-bridge.service';
import { AgentFrameworkModule } from '../../agent-framework/agent-framework.module';

// ─── Office Bridge Connector ─────────────────────────────────────

class OfficeBridgeConnector implements SoftwareFactoryConnector {
  readonly name = 'office';
  readonly description = 'Office automation — documents, spreadsheets, email, calendar, tasks';
  readonly actions = [
    'generateMarkdown', 'generateHtml', 'generatePdf', 'generateDocx',
    'sendEmail', 'sendTemplateEmail',
    'createEvent', 'listEvents',
    'generateCsv', 'parseCsv', 'generateXlsx',
    'createTask', 'listTasks', 'updateTask',
  ];

  constructor(private readonly officeService: OfficeConnectorService) {}

  async execute(action: string, params: Record<string, any>): Promise<any> {
    return this.officeService.executeAction(action, params);
  }
}

// Need to import the interface
import { SoftwareFactoryConnector } from '../../agent-framework/services/agent-bridge.service';

@Module({
  imports: [AgentFrameworkModule],
  providers: [OfficeConnectorService],
  exports: [OfficeConnectorService],
})
export class OfficeConnectorModule implements OnModuleInit {
  private readonly logger = new Logger(OfficeConnectorModule.name);

  constructor(
    private readonly officeService: OfficeConnectorService,
    private readonly agentBridge: AgentBridgeService,
  ) {}

  async onModuleInit(): Promise<void> {
    const mode = this.officeService.getSupportedActions().length > 0 ? 'real' : 'simulation';

    this.agentBridge.registerConnector('office', new OfficeBridgeConnector(this.officeService), mode as 'simulation' | 'real');

    this.logger.log(
      `Office connector registered with AgentBridge ` +
        `(mode: ${mode}, actions: ${this.officeService.getSupportedActions().length})`,
    );
  }
}
