/**
 * AENEWS Software Factory — Connector Registry Service
 *
 * Central registry that maps capability packs to their connectors.
 * Routes capability execution to the right connector.
 *
 * Pre-registers simulation connectors:
 *   - BrowserConnector
 *   - ComputerConnector (covers Dev, Office, Business, Cert, Delivery)
 *   - CodingConnector
 *   - OfficeConnector
 *   - MarketingConnector
 *   - BusinessConnector
 */

import { Injectable, Logger } from '@nestjs/common';
import { CapabilityId, CapabilityPack } from '../interfaces/mission.interface';
import { ICapabilityConnector, ConnectorInfo } from '../interfaces/connector.interface';
import { BrowserConnectorService } from './connectors/browser-connector.service';
import { ComputerConnectorService } from './connectors/computer-connector.service';
import { AgentEventBusService } from '../../agent-framework/services/agent-event-bus.service';

@Injectable()
export class ConnectorRegistryService {
  private readonly logger = new Logger(ConnectorRegistryService.name);
  private readonly connectors = new Map<string, ICapabilityConnector>();
  private readonly packConnectors = new Map<CapabilityPack, ICapabilityConnector>();

  constructor(
    private readonly browserConnector: BrowserConnectorService,
    private readonly computerConnector: ComputerConnectorService,
    private readonly eventBus: AgentEventBusService,
  ) {
    // Pre-register simulation connectors
    this.registerConnector(this.browserConnector);
    this.registerConnector(this.computerConnector);

    // Register alias connectors for the 6 capability packs
    // ComputerConnector handles multiple packs in simulation mode
    this.packConnectors.set(CapabilityPack.BROWSER, this.browserConnector);
    this.packConnectors.set(CapabilityPack.DEVELOPMENT, this.computerConnector);
    this.packConnectors.set(CapabilityPack.OFFICE, this.computerConnector);
    this.packConnectors.set(CapabilityPack.BUSINESS, this.computerConnector);
    this.packConnectors.set(CapabilityPack.CERTIFICATION, this.computerConnector);
    this.packConnectors.set(CapabilityPack.DELIVERY, this.computerConnector);

    this.logger.log(
      `Connector Registry initialized with ${this.connectors.size} connectors covering ${this.packConnectors.size} packs`,
    );
  }

  /**
   * Register a connector
   */
  registerConnector(connector: ICapabilityConnector): void {
    this.connectors.set(connector.name, connector);
    this.packConnectors.set(connector.supportedPack, connector);
    this.logger.log(`Registered connector: ${connector.name} (pack: ${connector.supportedPack})`);
  }

  /**
   * Get a connector by name
   */
  getConnector(name: string): ICapabilityConnector | undefined {
    return this.connectors.get(name);
  }

  /**
   * Get a connector for a specific capability ID
   */
  getConnectorForCapability(capabilityId: CapabilityId): ICapabilityConnector | undefined {
    // Direct lookup by checking which connector supports this capability
    for (const connector of this.connectors.values()) {
      if (connector.supports(capabilityId)) {
        return connector;
      }
    }

    // Fallback: find by pack prefix
    const prefix = (capabilityId as string).split('.')[0].toUpperCase();
    const packMap: Record<string, CapabilityPack> = {
      BROWSER: CapabilityPack.BROWSER,
      DEV: CapabilityPack.DEVELOPMENT,
      OFFICE: CapabilityPack.OFFICE,
      BUSINESS: CapabilityPack.BUSINESS,
      CERT: CapabilityPack.CERTIFICATION,
      DELIVERY: CapabilityPack.DELIVERY,
    };

    const pack = packMap[prefix];
    if (pack) {
      return this.packConnectors.get(pack);
    }

    this.logger.warn(`No connector found for capability: ${capabilityId}`);
    return undefined;
  }

  /**
   * List all registered connectors
   */
  listConnectors(): ConnectorInfo[] {
    const infos: ConnectorInfo[] = [];

    for (const [name, connector] of this.connectors) {
      const capabilities: string[] = [];
      // Collect supported capabilities from the connector
      if ('getSupportedCapabilities' in connector) {
        capabilities.push(...(connector as any).getSupportedCapabilities());
      }

      infos.push({
        name,
        pack: connector.supportedPack,
        capabilities,
        status: 'active',
      });
    }

    return infos;
  }

  /**
   * Execute an action via a named connector
   */
  async executeAction(
    connectorName: string,
    action: string,
    params: Record<string, any>,
  ): Promise<{
    success: boolean;
    output: any;
    costUsd: number;
    durationMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    const connector = this.connectors.get(connectorName);

    if (!connector) {
      return {
        success: false,
        output: null,
        costUsd: 0,
        durationMs: Date.now() - startTime,
        error: `Connector not found: ${connectorName}`,
      };
    }

    try {
      const result = await connector.execute(action as CapabilityId, {
        missionId: params.missionId || 'unknown',
        instruction: params.instruction || '',
        workspaceDir: params.workspaceDir || '/tmp/workspace',
        parameters: params,
        previousResults: new Map(),
        tools: [],
      });

      // Emit connector execution event
      await this.eventBus.emitConnectorEvent(
        connectorName,
        action,
        result.success,
        result.durationMs,
        { costUsd: result.costUsd },
      );

      return {
        success: result.success,
        output: result.output,
        costUsd: result.costUsd,
        durationMs: result.durationMs,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        costUsd: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check if a capability has a connector registered
   */
  hasConnector(capabilityId: CapabilityId): boolean {
    return this.getConnectorForCapability(capabilityId) !== undefined;
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalConnectors: number;
    packs: string[];
    capabilitiesCovered: number;
  } {
    let capabilitiesCovered = 0;
    for (const connector of this.connectors.values()) {
      if ('getSupportedCapabilities' in connector) {
        capabilitiesCovered += (connector as any).getSupportedCapabilities().length;
      }
    }

    return {
      totalConnectors: this.connectors.size,
      packs: Array.from(this.packConnectors.keys()),
      capabilitiesCovered,
    };
  }
}
