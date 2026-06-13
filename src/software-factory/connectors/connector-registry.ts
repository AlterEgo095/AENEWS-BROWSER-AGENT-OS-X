/**
 * AENEWS Software Factory — Connector Registry
 *
 * Central registry that maps capability packs to their connectors.
 * The WorkerFactory uses this to route capability execution to the right connector.
 *
 * Sprint 2 architecture:
 *   WorkerFactory.executeCapability(capId)
 *     → ConnectorRegistry.getConnector(capId)
 *     → [Pack-specific connector].execute(capId, input)
 *     → Real tool invocation (LLM, Playwright, Shell, FS, etc.)
 *     → ConnectorOutput (real artifacts, real cost, real duration)
 */

import { Injectable, Logger } from '@nestjs/common';
import { CapabilityId, CapabilityPack } from '../interfaces';
import { ICapabilityConnector } from './connector.interface';
import { DevelopmentConnector } from './development-connector';
import { BrowserConnector } from './browser-connector';
import { CertificationConnector } from './certification-connector';
import { DeliveryConnector } from './delivery-connector';
import { OfficeConnector } from './office-connector';
import { BusinessConnector } from './business-connector';

@Injectable()
export class ConnectorRegistry {
  private readonly logger = new Logger(ConnectorRegistry.name);
  private readonly packConnectors = new Map<CapabilityPack, ICapabilityConnector>();
  private readonly idConnectors = new Map<string, ICapabilityConnector>();

  constructor(
    private readonly devConnector: DevelopmentConnector,
    private readonly browserConnector: BrowserConnector,
    private readonly certConnector: CertificationConnector,
    private readonly deliveryConnector: DeliveryConnector,
    private readonly officeConnector: OfficeConnector,
    private readonly businessConnector: BusinessConnector,
  ) {
    // Register all connectors by pack
    this.registerConnector(this.devConnector);
    this.registerConnector(this.browserConnector);
    this.registerConnector(this.certConnector);
    this.registerConnector(this.deliveryConnector);
    this.registerConnector(this.officeConnector);
    this.registerConnector(this.businessConnector);

    this.logger.log(`Connector Registry initialized with ${this.packConnectors.size} connectors`);
  }

  /**
   * Get the connector for a specific capability ID
   */
  getConnector(capabilityId: CapabilityId): ICapabilityConnector | undefined {
    // Direct lookup by ID first
    const direct = this.idConnectors.get(capabilityId as string);
    if (direct) return direct;

    // Fallback: find by pack
    for (const connector of this.packConnectors.values()) {
      if (connector.supports(capabilityId)) {
        return connector;
      }
    }

    this.logger.warn(`No connector found for capability: ${capabilityId}`);
    return undefined;
  }

  /**
   * Get connector by pack
   */
  getConnectorByPack(pack: CapabilityPack): ICapabilityConnector | undefined {
    return this.packConnectors.get(pack);
  }

  /**
   * Check if a capability has a real connector (not just a stub)
   */
  hasConnector(capabilityId: CapabilityId): boolean {
    return this.getConnector(capabilityId) !== undefined;
  }

  /**
   * Get all registered connectors
   */
  getAllConnectors(): ICapabilityConnector[] {
    return Array.from(this.packConnectors.values());
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalConnectors: number;
    packs: string[];
    capabilitiesCovered: number;
  } {
    return {
      totalConnectors: this.packConnectors.size,
      packs: Array.from(this.packConnectors.keys()),
      capabilitiesCovered: this.idConnectors.size,
    };
  }

  // ─── Private ─────────────────────────────────────────────

  private registerConnector(connector: ICapabilityConnector): void {
    this.packConnectors.set(connector.supportedPack, connector);

    // Also register by all capability IDs in this pack
    // We determine which IDs belong to this pack by checking support()
    const allCapIds = this.getCapabilityIdsForPack(connector.supportedPack);
    for (const capId of allCapIds) {
      if (connector.supports(capId)) {
        this.idConnectors.set(capId as string, connector);
      }
    }
  }

  private getCapabilityIdsForPack(pack: CapabilityPack): CapabilityId[] {
    // Import capability enums and filter by pack prefix
    const {
      BrowserCapability,
      DevCapability,
      OfficeCapability,
      BusinessCapability,
      CertCapability,
      DeliveryCapability,
    } = require('../interfaces');

    const packMap: Record<string, any> = {
      [CapabilityPack.BROWSER]: BrowserCapability,
      [CapabilityPack.DEVELOPMENT]: DevCapability,
      [CapabilityPack.OFFICE]: OfficeCapability,
      [CapabilityPack.BUSINESS]: BusinessCapability,
      [CapabilityPack.CERTIFICATION]: CertCapability,
      [CapabilityPack.DELIVERY]: DeliveryCapability,
    };

    const enumObj = packMap[pack];
    if (!enumObj) return [];
    return Object.values(enumObj) as CapabilityId[];
  }
}
