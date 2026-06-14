/**
 * AENEWS Software Factory — Base Connector Interface
 *
 * Defines the common interface that all software connectors must implement.
 * Connectors bridge abstract capabilities to concrete tool invocations.
 */

import { ICapabilityConnector, ConnectorInput, ConnectorOutput } from '../../interfaces/connector.interface';
import { CapabilityId, CapabilityPack } from '../../interfaces/mission.interface';
import { Logger } from '@nestjs/common';

export abstract class BaseConnector implements ICapabilityConnector {
  abstract readonly name: string;
  abstract readonly supportedPack: CapabilityPack;
  protected readonly logger: Logger;
  protected readonly supportedCapabilities: Set<string>;

  constructor(loggerName: string, capabilities: string[]) {
    this.logger = new Logger(loggerName);
    this.supportedCapabilities = new Set(capabilities);
  }

  /**
   * Check if a specific capability ID is supported by this connector
   */
  supports(capabilityId: CapabilityId): boolean {
    return this.supportedCapabilities.has(capabilityId as string);
  }

  /**
   * Execute a specific capability within this connector's pack
   */
  abstract execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput>;

  /**
   * Get list of supported capability IDs
   */
  getSupportedCapabilities(): string[] {
    return Array.from(this.supportedCapabilities);
  }

  /**
   * Create a success output
   */
  protected createSuccessOutput(
    output: any,
    artifacts: ConnectorOutput['artifacts'],
    durationMs: number,
    costUsd: number = 0.5,
  ): ConnectorOutput {
    return {
      success: true,
      artifacts,
      output,
      costUsd,
      durationMs,
    };
  }

  /**
   * Create a failure output
   */
  protected createFailureOutput(
    error: string,
    durationMs: number,
  ): ConnectorOutput {
    return {
      success: false,
      artifacts: [],
      output: null,
      costUsd: 0,
      durationMs,
      error,
    };
  }
}
