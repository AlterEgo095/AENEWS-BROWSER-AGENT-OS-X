/**
 * AENEWS Software Factory — Capability Resolver
 * 
 * Matches mission requirements to available capabilities in the registry.
 * This is MORE important than an agent registry — it resolves what the
 * platform CAN DO, not what agents EXIST.
 * 
 * Mission → Planner → Execution Graph → Capability Resolver → Worker Factory
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  CapabilityId,
  CapabilityPack,
  CapabilityDefinition,
  CapabilityResolution,
  ResolvedCapability,
} from '../interfaces';
import { CapabilityRegistryService } from '../capability-registry/capability-registry.service';

export interface MissionRequirements {
  missionId: string;
  instruction: string;
  explicitCapabilities?: CapabilityId[];
  inferredPacks?: CapabilityPack[];
}

@Injectable()
export class CapabilityResolverService {
  private readonly logger = new Logger(CapabilityResolverService.name);

  constructor(private readonly registry: CapabilityRegistryService) {}

  /**
   * Resolve all capabilities needed for a mission
   * This is the core method that replaces "agent recommendation"
   */
  resolve(requirements: MissionRequirements): CapabilityResolution {
    this.logger.log(`Resolving capabilities for mission ${requirements.missionId}`);

    const resolved: ResolvedCapability[] = [];
    const packsNeeded = new Set<CapabilityPack>();

    // Step 1: Add explicitly requested capabilities
    if (requirements.explicitCapabilities) {
      for (const capId of requirements.explicitCapabilities) {
        const definition = this.registry.getCapability(capId);
        if (definition) {
          resolved.push({
            capabilityId: capId,
            definition,
            priority: 1,
            reason: 'Explicitly requested',
            dependencies: this.resolveDependencies(capId),
          });
          packsNeeded.add(definition.pack);
        }
      }
    }

    // Step 2: Infer capabilities from mission text
    const inferred = this.inferFromMissionText(requirements.instruction);
    for (const cap of inferred) {
      // Avoid duplicates
      if (!resolved.find(r => r.capabilityId === cap.id)) {
        resolved.push({
          capabilityId: cap.id,
          definition: cap,
          priority: this.calculatePriority(cap.id, requirements.instruction),
          reason: `Inferred from mission: "${this.getMatchingKeyword(cap, requirements.instruction)}"`,
          dependencies: this.resolveDependencies(cap.id),
        });
        packsNeeded.add(cap.pack);
      }
    }

    // Step 3: Add implied capabilities (if you need frontend, you probably need architecture too)
    const implied = this.resolveImpliedCapabilities(resolved.map(r => r.capabilityId));
    for (const capId of implied) {
      if (!resolved.find(r => r.capabilityId === capId)) {
        const definition = this.registry.getCapability(capId);
        if (definition) {
          resolved.push({
            capabilityId: capId,
            definition,
            priority: 5,
            reason: 'Implied by other capabilities',
            dependencies: this.resolveDependencies(capId),
          });
          packsNeeded.add(definition.pack);
        }
      }
    }

    // Step 4: Always add certification and delivery for non-trivial missions
    if (resolved.length >= 3) {
      this.addDefaultCertificationCapabilities(resolved, packsNeeded, requirements.instruction);
      this.addDefaultDeliveryCapabilities(resolved, packsNeeded, requirements.instruction);
    }

    // Sort by priority
    resolved.sort((a, b) => a.priority - b.priority);

    // Calculate estimates
    const totalCost = resolved.reduce((sum, r) => sum + r.definition.cost.estimatedUsdPerExecution, 0);
    const maxLatency = Math.max(...resolved.map(r => r.definition.latency.estimatedMs));
    const confidence = this.calculateConfidence(resolved, requirements.instruction);

    const resolution: CapabilityResolution = {
      missionId: requirements.missionId,
      requiredCapabilities: resolved,
      packsNeeded: Array.from(packsNeeded),
      estimatedTotalCost: totalCost,
      estimatedTotalDurationMs: maxLatency,
      confidence,
    };

    this.logger.log(
      `Resolved ${resolved.length} capabilities across ${packsNeeded.size} packs (confidence: ${(confidence * 100).toFixed(0)}%)`,
    );

    return resolution;
  }

  /**
   * Get only the capability IDs needed for a mission
   */
  resolveIds(requirements: MissionRequirements): CapabilityId[] {
    const resolution = this.resolve(requirements);
    return resolution.requiredCapabilities.map(r => r.capabilityId);
  }

  // ─── Inference Engine ───────────────────────────────────────

  private inferFromMissionText(text: string): CapabilityDefinition[] {
    return this.registry.findCapabilitiesForMission(text);
  }

  private getMatchingKeyword(cap: CapabilityDefinition, text: string): string {
    const lower = text.toLowerCase();
    const match = cap.keywords.find(k => lower.includes(k));
    return match || cap.name;
  }

  // ─── Dependency Resolution ──────────────────────────────────

  private resolveDependencies(capabilityId: CapabilityId): CapabilityId[] {
    const deps: CapabilityId[] = [];

    // Browser capabilities generally depend on session management
    if (capabilityId.startsWith('browser.') && capabilityId !== 'browser.session') {
      deps.push('browser.session' as CapabilityId);
    }

    // Dev.test depends on dev.qa
    if (capabilityId === 'dev.test') {
      deps.push('dev.qa' as CapabilityId);
    }

    // Docker deploy depends on docker build
    if (capabilityId === 'dev.kubernetes') {
      deps.push('dev.docker' as CapabilityId);
    }

    // Delivery.deployment depends on delivery.github
    if (capabilityId === 'delivery.deployment') {
      deps.push('delivery.github' as CapabilityId);
    }

    return deps;
  }

  // ─── Implied Capabilities ───────────────────────────────────

  private resolveImpliedCapabilities(current: CapabilityId[]): CapabilityId[] {
    const implied: CapabilityId[] = [];
    const hasDevCap = current.some(c => c.startsWith('dev.'));

    // If any dev capability is needed, architecture is usually implied
    if (hasDevCap && !current.includes('dev.architecture' as CapabilityId)) {
      implied.push('dev.architecture' as CapabilityId);
    }

    // If frontend + backend are both present, API is implied
    if (current.includes('dev.frontend' as CapabilityId) && current.includes('dev.backend' as CapabilityId)) {
      if (!current.includes('dev.api' as CapabilityId)) {
        implied.push('dev.api' as CapabilityId);
      }
    }

    // If any dev capability, documentation is implied
    if (hasDevCap && !current.includes('dev.documentation' as CapabilityId)) {
      implied.push('dev.documentation' as CapabilityId);
    }

    return implied;
  }

  // ─── Default Capabilities ───────────────────────────────────

  private addDefaultCertificationCapabilities(
    resolved: ResolvedCapability[],
    packsNeeded: Set<CapabilityPack>,
    instruction: string,
  ): void {
    const defaultCertCaps: CapabilityId[] = [
      'cert.security_audit' as CapabilityId,
      'cert.test_coverage' as CapabilityId,
    ];

    const lower = instruction.toLowerCase();
    if (lower.includes('enterprise') || lower.includes('critique') || lower.includes('critical')) {
      defaultCertCaps.push(
        'cert.compliance' as CapabilityId,
        'cert.architecture_review' as CapabilityId,
      );
    }

    for (const capId of defaultCertCaps) {
      if (!resolved.find(r => r.capabilityId === capId)) {
        const definition = this.registry.getCapability(capId);
        if (definition) {
          resolved.push({
            capabilityId: capId,
            definition,
            priority: 7,
            reason: 'Default certification capability',
            dependencies: [],
          });
          packsNeeded.add(definition.pack);
        }
      }
    }
  }

  private addDefaultDeliveryCapabilities(
    resolved: ResolvedCapability[],
    packsNeeded: Set<CapabilityPack>,
    instruction: string,
  ): void {
    const defaultDeliverCaps: CapabilityId[] = [
      'delivery.zip' as CapabilityId,
      'delivery.notification' as CapabilityId,
    ];

    const lower = instruction.toLowerCase();
    if (lower.includes('github') || lower.includes('repo') || lower.includes('push')) {
      defaultDeliverCaps.push('delivery.github' as CapabilityId);
    }
    if (lower.includes('docker') || lower.includes('container') || lower.includes('image')) {
      defaultDeliverCaps.push('delivery.docker_registry' as CapabilityId);
    }
    if (lower.includes('deploy') || lower.includes('production') || lower.includes('déployer')) {
      defaultDeliverCaps.push('delivery.deployment' as CapabilityId);
    }

    // Always add PDF report
    defaultDeliverCaps.push('delivery.pdf_report' as CapabilityId);

    for (const capId of defaultDeliverCaps) {
      if (!resolved.find(r => r.capabilityId === capId)) {
        const definition = this.registry.getCapability(capId);
        if (definition) {
          resolved.push({
            capabilityId: capId,
            definition,
            priority: 8,
            reason: 'Default delivery capability',
            dependencies: [],
          });
          packsNeeded.add(definition.pack);
        }
      }
    }
  }

  // ─── Priority & Confidence ──────────────────────────────────

  private calculatePriority(capId: CapabilityId, instruction: string): number {
    const lower = instruction.toLowerCase();
    const cap = this.registry.getCapability(capId);
    if (!cap) return 5;

    // If multiple keywords match, higher priority
    const matchCount = cap.keywords.filter(k => lower.includes(k)).length;
    if (matchCount >= 3) return 1;
    if (matchCount >= 2) return 2;
    return 3;
  }

  private calculateConfidence(resolved: ResolvedCapability[], instruction: string): number {
    if (resolved.length === 0) return 0;

    // Base confidence on how many capabilities were explicitly inferred (not implied)
    const explicitCount = resolved.filter(r => r.priority <= 3).length;
    const total = resolved.length;

    const explicitRatio = explicitCount / total;
    const coverageBonus = Math.min(total / 5, 1) * 0.1; // more capabilities = more confidence

    return Math.min(1, explicitRatio * 0.8 + coverageBonus + 0.1);
  }
}
