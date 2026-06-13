/**
 * AENEWS Software Factory — Connector Interface
 *
 * Sprint 2: Real Connectors
 * Each capability pack is backed by a connector that maps
 * capability IDs to real tool invocations.
 *
 * Connector = the bridge between abstract capabilities and concrete tools.
 *   browser.*  → Playwright
 *   dev.*      → LLM (z-ai-web-dev-sdk) + Shell (node, npm, python, git, docker)
 *   office.*   → LLM + file generation
 *   business.* → LLM (content generation)
 *   cert.*     → Shell (lint, test, audit) + LLM (analysis)
 *   delivery.* → File system (ZIP) + Shell (git push, docker build)
 */

import { CapabilityId, CapabilityPack } from '../interfaces';

// ─── Connector Input ──────────────────────────────────────────

export interface ConnectorInput {
  missionId: string;
  instruction: string;
  workspaceDir: string;
  parameters: Record<string, any>;
  /** Results from previously executed capabilities in this mission */
  previousResults: Map<CapabilityId, ConnectorOutput>;
  /** The specific capability definition's tools[] */
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
  content?: string; // preview (first 500 chars)
}

// ─── Connector Contract ───────────────────────────────────────

export interface ICapabilityConnector {
  /** Which capability pack this connector handles */
  readonly supportedPack: CapabilityPack;

  /** Execute a specific capability within this pack */
  execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput>;

  /** Check if a specific capability ID is supported */
  supports(capabilityId: CapabilityId): boolean;
}

// ─── LLM Helper — shared across connectors ────────────────────

export interface LLMCallOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  retries?: number;
}

export interface LLMCallResult {
  content: string;
  costUsd: number;
  tokenCount?: number;
  retries: number;
}
