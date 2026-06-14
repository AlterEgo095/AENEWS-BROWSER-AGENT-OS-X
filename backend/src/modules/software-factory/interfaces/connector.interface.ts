/**
 * AENEWS Software Factory — Connector Interface
 *
 * Defines the connector contract for software capability execution.
 * Each connector bridges abstract capabilities to concrete tool invocations.
 */

import { CapabilityId, CapabilityPack } from './mission.interface';

// ─── Connector Input ──────────────────────────────────────────

export interface ConnectorInput {
  missionId: string;
  instruction: string;
  workspaceDir: string;
  parameters: Record<string, any>;
  previousResults: Map<string, ConnectorOutput>;
  tools: string[];
}

// ─── Connector Output ─────────────────────────────────────────

export interface ConnectorOutput {
  success: boolean;
  artifacts: GeneratedArtifact[];
  output: any;
  costUsd: number;
  durationMs: number;
  error?: string;
}

// ─── Generated Artifact ───────────────────────────────────────

export interface GeneratedArtifact {
  name: string;
  type: 'source' | 'test' | 'document' | 'config' | 'archive' | 'report' | 'screenshot' | 'log';
  path: string;
  size: number;
  content?: string;
}

// ─── Connector Contract ───────────────────────────────────────

export interface ICapabilityConnector {
  readonly name: string;
  readonly supportedPack: CapabilityPack;
  execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput>;
  supports(capabilityId: CapabilityId): boolean;
}

// ─── Connector Registration Info ──────────────────────────────

export interface ConnectorInfo {
  name: string;
  pack: CapabilityPack;
  capabilities: string[];
  status: 'active' | 'degraded' | 'offline';
}
