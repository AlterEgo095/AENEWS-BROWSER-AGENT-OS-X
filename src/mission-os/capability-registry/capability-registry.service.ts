import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Local type definitions (to be migrated to ../interfaces/mission-os.interfaces.ts)
// ---------------------------------------------------------------------------

export interface CapabilityDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  version: string;
  deprecated: boolean;
  costEstimate: number;
  latencyEstimate: number;
  /** Optional tags for categorisation and search */
  tags?: string[];
  /** Optional category grouping */
  category?: string;
  /** Semantic version of this capability */
  semanticVersion?: string;
  /** Dependencies on other capability names */
  dependencies?: string[];
  /** Agent-reported skill level 0-1 */
  skillLevel?: number;
  /** Historical success rate 0-1 */
  successRate?: number;
  /** Current load / utilisation 0-1 */
  currentLoad?: number;
}

export interface CapabilityRegistration {
  agentId: string;
  agentName?: string;
  capabilities: CapabilityDescriptor[];
}

export interface CapabilitySearchResult {
  capability: CapabilityDescriptor;
  agentId: string;
  agentName: string;
  score: number;
}

export interface AgentSelectionCriteria {
  maxCost?: number;
  maxLatency?: number;
  minSuccessRate?: number;
  preferAgentId?: string;
  minSkillLevel?: number;
  excludeAgents?: string[];
}

export interface CapabilityGraphNode {
  capabilityName: string;
  category?: string;
  description: string;
  providers: string[]; // agent IDs
}

export interface CapabilityGraphEdge {
  from: string;
  to: string;
  type: 'dependency' | 'complementary' | 'alternative';
}

export interface CapabilityGraph {
  nodes: CapabilityGraphNode[];
  edges: CapabilityGraphEdge[];
}

export interface RegistryStats {
  totalCapabilities: number;
  totalAgents: number;
  capabilitiesByCategory: Record<string, number>;
  deprecatedCount: number;
  agentCoverage: Record<string, number>;
  averageSkillLevel: number;
  averageSuccessRate: number;
}

export interface CapabilityDetail {
  capabilityName: string;
  description: string;
  category?: string;
  providers: Array<{
    agentId: string;
    agentName: string;
    descriptor: CapabilityDescriptor;
  }>;
  totalProviders: number;
  averageCost: number;
  averageLatency: number;
  averageSuccessRate: number;
}

// ---------------------------------------------------------------------------
// Event types emitted by the registry
// ---------------------------------------------------------------------------

export const CAPABILITY_PUBLISHED = 'capability.published';
export const CAPABILITY_UNPUBLISHED = 'capability.unpublished';
export const CAPABILITY_UPDATED = 'capability.updated';
export const CAPABILITY_DEPRECATED = 'capability.deprecated';

export interface CapabilityEventPayload {
  agentId: string;
  agentName?: string;
  capabilityName?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class CapabilityRegistryService implements OnModuleInit {
  private readonly logger = new Logger(CapabilityRegistryService.name);

  /** capability name → set of agent IDs that provide it */
  private capabilityIndex: Map<string, Set<string>> = new Map();

  /** agent ID → (capability name → descriptor) */
  private agentCapabilities: Map<string, Map<string, CapabilityDescriptor>> = new Map();

  /** category → capability names */
  private capabilityCategories: Map<string, string[]> = new Map();

  /** agent ID → agent display name (for search results etc.) */
  private agentNames: Map<string, string> = new Map();

  /** Simple event listeners — in production this would use an EventBus */
  private eventListeners: Map<string, Array<(payload: CapabilityEventPayload) => void>> = new Map();

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  onModuleInit(): void {
    this.logger.log('CapabilityRegistryService initialised');
  }

  // -----------------------------------------------------------------------
  // Event helpers
  // -----------------------------------------------------------------------

  /**
   * Register a listener for a registry event.
   * Returns an unsubscribe function.
   */
  on(event: string, listener: (payload: CapabilityEventPayload) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      }
    };
  }

  private emitEvent(event: string, payload: CapabilityEventPayload): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(payload);
        } catch (err) {
          this.logger.warn(`Event listener error on "${event}": ${err}`);
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // 1. publishCapabilities
  // -----------------------------------------------------------------------

  /**
   * Register an agent's capabilities. Builds capability→agent indexes and
   * emits CAPABILITY_PUBLISHED for each capability.
   */
  publishCapabilities(agentId: string, registration: CapabilityRegistration): void {
    const { agentName, capabilities } = registration;

    // Store the agent display name
    if (agentName) {
      this.agentNames.set(agentId, agentName);
    }

    // Ensure the per-agent map exists
    if (!this.agentCapabilities.has(agentId)) {
      this.agentCapabilities.set(agentId, new Map());
    }
    const agentCaps = this.agentCapabilities.get(agentId)!;

    let added = 0;
    let updated = 0;

    for (const descriptor of capabilities) {
      const { name, category, tags } = descriptor;
      const isNew = !agentCaps.has(name);

      // Store / overwrite the descriptor for this agent
      agentCaps.set(name, {
        ...descriptor,
        // Provide sensible defaults
        skillLevel: descriptor.skillLevel ?? 0.5,
        successRate: descriptor.successRate ?? 0.5,
        currentLoad: descriptor.currentLoad ?? 0,
        deprecated: descriptor.deprecated ?? false,
      });

      // Update the capability → agent index
      if (!this.capabilityIndex.has(name)) {
        this.capabilityIndex.set(name, new Set());
      }
      this.capabilityIndex.get(name)!.add(agentId);

      // Update the category index
      if (category) {
        this.addToCategoryIndex(category, name);
      }

      if (tags) {
        for (const tag of tags) {
          this.addToCategoryIndex(`tag:${tag}`, name);
        }
      }

      if (isNew) {
        added++;
      } else {
        updated++;
      }

      // Emit per-capability event
      this.emitEvent(CAPABILITY_PUBLISHED, {
        agentId,
        agentName: agentName ?? this.agentNames.get(agentId),
        capabilityName: name,
        timestamp: Date.now(),
      });
    }

    this.logger.log(
      `Agent "${agentName ?? agentId}" published capabilities: ${added} new, ${updated} updated`,
    );
  }

  // -----------------------------------------------------------------------
  // 2. unpublishCapabilities
  // -----------------------------------------------------------------------

  /**
   * Remove all capabilities for an agent. Cleans up indexes and emits
   * CAPABILITY_UNPUBLISHED.
   */
  unpublishCapabilities(agentId: string): void {
    const agentCaps = this.agentCapabilities.get(agentId);
    if (!agentCaps) {
      this.logger.warn(`Attempted to unpublish capabilities for unknown agent "${agentId}"`);
      return;
    }

    const removedCapabilityNames: string[] = [];

    for (const [capName, descriptor] of agentCaps.entries()) {
      // Remove from capability → agent index
      const agentSet = this.capabilityIndex.get(capName);
      if (agentSet) {
        agentSet.delete(agentId);
        // If no agents left for this capability, clean up the index entry
        if (agentSet.size === 0) {
          this.capabilityIndex.delete(capName);
        }
      }

      // Remove from category indexes
      const category = descriptor.category;
      if (category) {
        this.removeFromCategoryIndex(category, capName);
      }
      if (descriptor.tags) {
        for (const tag of descriptor.tags) {
          this.removeFromCategoryIndex(`tag:${tag}`, capName);
        }
      }

      removedCapabilityNames.push(capName);
    }

    // Remove the agent entry entirely
    this.agentCapabilities.delete(agentId);
    this.agentNames.delete(agentId);

    // Emit aggregate event
    this.emitEvent(CAPABILITY_UNPUBLISHED, {
      agentId,
      agentName: this.agentNames.get(agentId),
      timestamp: Date.now(),
    });

    this.logger.log(
      `Agent "${agentId}" unpublished ${removedCapabilityNames.length} capabilities: [${removedCapabilityNames.join(', ')}]`,
    );
  }

  // -----------------------------------------------------------------------
  // 3. updateCapability
  // -----------------------------------------------------------------------

  /**
   * Update a single capability descriptor for an agent. Merges the new
   * descriptor fields with the existing one.
   */
  updateCapability(
    agentId: string,
    capabilityName: string,
    descriptor: Partial<CapabilityDescriptor>,
  ): void {
    const agentCaps = this.agentCapabilities.get(agentId);
    if (!agentCaps) {
      this.logger.warn(
        `Cannot update capability "${capabilityName}" — agent "${agentId}" not registered`,
      );
      return;
    }

    const existing = agentCaps.get(capabilityName);
    if (!existing) {
      this.logger.warn(
        `Cannot update capability "${capabilityName}" — not found for agent "${agentId}"`,
      );
      return;
    }

    // Merge — new fields override existing ones
    const merged: CapabilityDescriptor = {
      ...existing,
      ...descriptor,
      // Preserve the name (it is the identity key)
      name: capabilityName,
    };

    // Handle category change
    if (descriptor.category !== undefined && descriptor.category !== existing.category) {
      if (existing.category) {
        this.removeFromCategoryIndex(existing.category, capabilityName);
      }
      if (descriptor.category) {
        this.addToCategoryIndex(descriptor.category, capabilityName);
      }
    }

    // Handle tag changes
    if (descriptor.tags !== undefined) {
      if (existing.tags) {
        for (const oldTag of existing.tags) {
          this.removeFromCategoryIndex(`tag:${oldTag}`, capabilityName);
        }
      }
      for (const newTag of descriptor.tags) {
        this.addToCategoryIndex(`tag:${newTag}`, capabilityName);
      }
    }

    agentCaps.set(capabilityName, merged);

    this.emitEvent(CAPABILITY_UPDATED, {
      agentId,
      agentName: this.agentNames.get(agentId),
      capabilityName,
      timestamp: Date.now(),
    });

    this.logger.log(`Agent "${agentId}" updated capability "${capabilityName}"`);
  }

  // -----------------------------------------------------------------------
  // 4. deprecateCapability
  // -----------------------------------------------------------------------

  /**
   * Mark a capability as deprecated for a given agent.
   */
  deprecateCapability(agentId: string, capabilityName: string): void {
    const agentCaps = this.agentCapabilities.get(agentId);
    if (!agentCaps) {
      this.logger.warn(
        `Cannot deprecate capability "${capabilityName}" — agent "${agentId}" not registered`,
      );
      return;
    }

    const existing = agentCaps.get(capabilityName);
    if (!existing) {
      this.logger.warn(
        `Cannot deprecate capability "${capabilityName}" — not found for agent "${agentId}"`,
      );
      return;
    }

    if (existing.deprecated) {
      this.logger.debug(
        `Capability "${capabilityName}" for agent "${agentId}" is already deprecated`,
      );
      return;
    }

    existing.deprecated = true;

    this.emitEvent(CAPABILITY_DEPRECATED, {
      agentId,
      agentName: this.agentNames.get(agentId),
      capabilityName,
      timestamp: Date.now(),
    });

    this.logger.warn(`Capability "${capabilityName}" deprecated for agent "${agentId}"`);
  }

  // -----------------------------------------------------------------------
  // 5. searchCapabilities
  // -----------------------------------------------------------------------

  /**
   * Search capabilities by name (fuzzy), description, or tags.
   * Returns results sorted by descending relevance score.
   */
  searchCapabilities(query: {
    name?: string;
    description?: string;
    tags?: string[];
    category?: string;
    includeDeprecated?: boolean;
  }): CapabilitySearchResult[] {
    const results: CapabilitySearchResult[] = [];
    const { name, description, tags, category, includeDeprecated = false } = query;

    // If a category filter is provided, scope to those capabilities only
    const candidateNames = category
      ? (this.capabilityCategories.get(category) ?? [])
      : [...this.capabilityIndex.keys()];

    for (const capName of candidateNames) {
      const agentIds = this.capabilityIndex.get(capName);
      if (!agentIds) continue;

      for (const agentId of agentIds) {
        const agentCaps = this.agentCapabilities.get(agentId);
        if (!agentCaps) continue;

        const descriptor = agentCaps.get(capName);
        if (!descriptor) continue;

        // Skip deprecated unless explicitly requested
        if (descriptor.deprecated && !includeDeprecated) continue;

        const score = this.computeSearchScore(descriptor, {
          name,
          description,
          tags,
        });

        // Only include results with a positive score (something matched)
        if (score > 0) {
          results.push({
            capability: descriptor,
            agentId,
            agentName: this.agentNames.get(agentId) ?? agentId,
            score,
          });
        }
      }
    }

    // Sort by descending score
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  // -----------------------------------------------------------------------
  // 6. getAgentsWithCapability
  // -----------------------------------------------------------------------

  /**
   * Get all agents that provide a specific capability, sorted by
   * skill level (desc) then success rate (desc).
   */
  getAgentsWithCapability(capabilityName: string): Array<{
    agentId: string;
    agentName: string;
    descriptor: CapabilityDescriptor;
  }> {
    const agentIds = this.capabilityIndex.get(capabilityName);
    if (!agentIds || agentIds.size === 0) return [];

    const results: Array<{
      agentId: string;
      agentName: string;
      descriptor: CapabilityDescriptor;
    }> = [];

    for (const agentId of agentIds) {
      const agentCaps = this.agentCapabilities.get(agentId);
      if (!agentCaps) continue;

      const descriptor = agentCaps.get(capabilityName);
      if (!descriptor) continue;

      results.push({
        agentId,
        agentName: this.agentNames.get(agentId) ?? agentId,
        descriptor,
      });
    }

    // Sort by skill level desc, then success rate desc
    results.sort((a, b) => {
      const skillDiff = (b.descriptor.skillLevel ?? 0.5) - (a.descriptor.skillLevel ?? 0.5);
      if (Math.abs(skillDiff) > 0.001) return skillDiff;
      return (b.descriptor.successRate ?? 0.5) - (a.descriptor.successRate ?? 0.5);
    });

    return results;
  }

  // -----------------------------------------------------------------------
  // 7. getCapabilityDetails
  // -----------------------------------------------------------------------

  /**
   * Get full details about a capability across all agents that provide it,
   * including aggregate metrics.
   */
  getCapabilityDetails(capabilityName: string): CapabilityDetail | null {
    const agents = this.getAgentsWithCapability(capabilityName);
    if (agents.length === 0) return null;

    const providers = agents.map((a) => ({
      agentId: a.agentId,
      agentName: a.agentName,
      descriptor: a.descriptor,
    }));

    const totalProviders = providers.length;
    const averageCost =
      providers.reduce((sum, p) => sum + p.descriptor.costEstimate, 0) / totalProviders;
    const averageLatency =
      providers.reduce((sum, p) => sum + p.descriptor.latencyEstimate, 0) / totalProviders;
    const averageSuccessRate =
      providers.reduce((sum, p) => sum + (p.descriptor.successRate ?? 0.5), 0) / totalProviders;

    // Use the first (highest skill) provider's metadata for the summary fields
    const primary = providers[0].descriptor;

    return {
      capabilityName,
      description: primary.description,
      category: primary.category,
      providers,
      totalProviders,
      averageCost,
      averageLatency,
      averageSuccessRate,
    };
  }

  // -----------------------------------------------------------------------
  // 8. findBestAgentForCapability
  // -----------------------------------------------------------------------

  /**
   * Find the best agent for a capability based on a composite scoring
   * function that weighs skill level, success rate, cost, latency, and
   * current load. Optional criteria can further constrain the selection.
   */
  findBestAgentForCapability(
    capabilityName: string,
    criteria?: AgentSelectionCriteria,
  ): {
    agentId: string;
    agentName: string;
    descriptor: CapabilityDescriptor;
    score: number;
  } | null {
    const agents = this.getAgentsWithCapability(capabilityName);
    if (agents.length === 0) return null;

    const {
      maxCost = Infinity,
      maxLatency = Infinity,
      minSuccessRate = 0,
      preferAgentId,
      minSkillLevel = 0,
      excludeAgents = [],
    } = criteria ?? {};

    const excludeSet = new Set(excludeAgents);
    let best: {
      agentId: string;
      agentName: string;
      descriptor: CapabilityDescriptor;
      score: number;
    } | null = null;

    for (const agent of agents) {
      const { descriptor } = agent;

      // Hard filters — skip immediately
      if (excludeSet.has(agent.agentId)) continue;
      if (descriptor.deprecated) continue;
      if (descriptor.costEstimate > maxCost) continue;
      if (descriptor.latencyEstimate > maxLatency) continue;
      if ((descriptor.successRate ?? 0.5) < minSuccessRate) continue;
      if ((descriptor.skillLevel ?? 0.5) < minSkillLevel) continue;

      // Composite score (higher is better)
      //   skillLevel weight:  0.30
      //   successRate weight: 0.30
      //   cost (inverted):    0.15
      //   latency (inverted): 0.10
      //   load (inverted):    0.15
      const skillLevel = descriptor.skillLevel ?? 0.5;
      const successRate = descriptor.successRate ?? 0.5;
      const load = descriptor.currentLoad ?? 0;
      const cost = descriptor.costEstimate;
      const latency = descriptor.latencyEstimate;

      // Normalise cost & latency to 0-1 range (using a soft-cap approach)
      const costNorm = cost > 0 ? 1 / (1 + cost) : 1;
      const latencyNorm = latency > 0 ? 1 / (1 + latency) : 1;
      const loadNorm = 1 - Math.min(load, 1); // invert: lower load = higher score

      let score =
        0.3 * skillLevel +
        0.3 * successRate +
        0.15 * costNorm +
        0.1 * latencyNorm +
        0.15 * loadNorm;

      // Bonus for preferred agent
      if (preferAgentId && agent.agentId === preferAgentId) {
        score += 0.2; // significant but not overriding
      }

      if (!best || score > best.score) {
        best = {
          agentId: agent.agentId,
          agentName: agent.agentName,
          descriptor,
          score,
        };
      }
    }

    if (best) {
      this.logger.debug(
        `Best agent for "${capabilityName}": ${best.agentId} (score=${best.score.toFixed(3)})`,
      );
    } else {
      this.logger.debug(`No suitable agent found for capability "${capabilityName}"`);
    }

    return best;
  }

  // -----------------------------------------------------------------------
  // 9. getCapabilityGraph
  // -----------------------------------------------------------------------

  /**
   * Build a directed graph of capability dependencies and relationships.
   * Edges include: dependency (from dependencies field), complementary
   * (agents that provide both), and alternative (same capability, multiple agents).
   */
  getCapabilityGraph(): CapabilityGraph {
    const nodes: CapabilityGraphNode[] = [];
    const edges: CapabilityGraphEdge[] = [];

    // Build nodes
    for (const [capName, agentIds] of this.capabilityIndex.entries()) {
      // Pick metadata from the first agent's descriptor for the node
      let description = '';
      let category: string | undefined;

      for (const agentId of agentIds) {
        const agentCaps = this.agentCapabilities.get(agentId);
        if (agentCaps) {
          const desc = agentCaps.get(capName);
          if (desc) {
            description = desc.description;
            category = desc.category;
            break;
          }
        }
      }

      nodes.push({
        capabilityName: capName,
        category,
        description,
        providers: [...agentIds],
      });
    }

    // Build dependency edges
    for (const [, agentCaps] of this.agentCapabilities.entries()) {
      for (const [capName, descriptor] of agentCaps.entries()) {
        if (descriptor.dependencies) {
          for (const dep of descriptor.dependencies) {
            // Only add if the dependency actually exists in the registry
            if (this.capabilityIndex.has(dep)) {
              edges.push({
                from: capName,
                to: dep,
                type: 'dependency',
              });
            }
          }
        }
      }
    }

    // Build complementary edges: capabilities that are always provided
    // together by the same agent (co-occurrence)
    const coOccurrence = new Map<string, Map<string, number>>(); // capA → capB → count
    for (const [, agentCaps] of this.agentCapabilities.entries()) {
      const capNames = [...agentCaps.keys()];
      for (let i = 0; i < capNames.length; i++) {
        for (let j = i + 1; j < capNames.length; j++) {
          const a = capNames[i];
          const b = capNames[j];
          if (!coOccurrence.has(a)) coOccurrence.set(a, new Map());
          if (!coOccurrence.has(b)) coOccurrence.set(b, new Map());
          coOccurrence.get(a)!.set(b, (coOccurrence.get(a)!.get(b) ?? 0) + 1);
          coOccurrence.get(b)!.set(a, (coOccurrence.get(b)!.get(a) ?? 0) + 1);
        }
      }
    }

    // Add complementary edges when co-occurrence >= 2 agents
    for (const [capA, partners] of coOccurrence.entries()) {
      for (const [capB, count] of partners.entries()) {
        if (count >= 2) {
          // Avoid duplicates — only add in alphabetical order
          if (capA < capB) {
            edges.push({
              from: capA,
              to: capB,
              type: 'complementary',
            });
          }
        }
      }
    }

    // Build alternative edges: same capability name provided by multiple agents
    for (const [capName, agentIds] of this.capabilityIndex.entries()) {
      if (agentIds.size > 1) {
        // Add self-referential alternative edge to indicate multiple providers
        edges.push({
          from: capName,
          to: capName,
          type: 'alternative',
        });
      }
    }

    return { nodes, edges };
  }

  // -----------------------------------------------------------------------
  // 10. getRegistryStats
  // -----------------------------------------------------------------------

  /**
   * Return summary statistics about the registry.
   */
  getRegistryStats(): RegistryStats {
    let totalCapabilities = 0;
    let deprecatedCount = 0;
    const capabilitiesByCategory: Record<string, number> = {};
    const agentCoverage: Record<string, number> = {};
    let totalSkillLevel = 0;
    let totalSuccessRate = 0;
    let descriptorCount = 0;

    // Count unique capabilities (by name)
    totalCapabilities = this.capabilityIndex.size;

    // Count deprecated and accumulate metrics
    for (const [, agentCaps] of this.agentCapabilities.entries()) {
      for (const [, descriptor] of agentCaps.entries()) {
        descriptorCount++;
        if (descriptor.deprecated) deprecatedCount++;
        totalSkillLevel += descriptor.skillLevel ?? 0.5;
        totalSuccessRate += descriptor.successRate ?? 0.5;
      }
    }

    // Capabilities by category
    for (const [category, capNames] of this.capabilityCategories.entries()) {
      // Skip internal tag: entries for the category count
      if (category.startsWith('tag:')) continue;
      capabilitiesByCategory[category] = capNames.length;
    }

    // Agent coverage: how many capabilities each agent provides
    for (const [agentId, agentCaps] of this.agentCapabilities.entries()) {
      agentCoverage[agentId] = agentCaps.size;
    }

    return {
      totalCapabilities,
      totalAgents: this.agentCapabilities.size,
      capabilitiesByCategory,
      deprecatedCount,
      agentCoverage,
      averageSkillLevel: descriptorCount > 0 ? totalSkillLevel / descriptorCount : 0,
      averageSuccessRate: descriptorCount > 0 ? totalSuccessRate / descriptorCount : 0,
    };
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Add a capability name to the category index.
   */
  private addToCategoryIndex(category: string, capabilityName: string): void {
    if (!this.capabilityCategories.has(category)) {
      this.capabilityCategories.set(category, []);
    }
    const list = this.capabilityCategories.get(category)!;
    if (!list.includes(capabilityName)) {
      list.push(capabilityName);
    }
  }

  /**
   * Remove a capability name from the category index.
   */
  private removeFromCategoryIndex(category: string, capabilityName: string): void {
    const list = this.capabilityCategories.get(category);
    if (!list) return;
    const idx = list.indexOf(capabilityName);
    if (idx >= 0) {
      list.splice(idx, 1);
    }
    if (list.length === 0) {
      this.capabilityCategories.delete(category);
    }
  }

  /**
   * Compute a relevance score for a capability descriptor against the
   * search terms. Returns a value between 0 and 1.
   *
   * Scoring:
   *  - Exact name match:          1.0
   *  - Name starts with query:    0.8
   *  - Name contains query:       0.6
   *  - Fuzzy name match:          0.3-0.5
   *  - Description contains:      0.4
   *  - Tag match:                 0.5 per matching tag
   */
  private computeSearchScore(
    descriptor: CapabilityDescriptor,
    query: { name?: string; description?: string; tags?: string[] },
  ): number {
    let score = 0;
    const normalise = (s: string) => s.toLowerCase().trim();

    // Name matching
    if (query.name) {
      const qName = normalise(query.name);
      const cName = normalise(descriptor.name);

      if (cName === qName) {
        score += 1.0;
      } else if (cName.startsWith(qName)) {
        score += 0.8;
      } else if (cName.includes(qName)) {
        score += 0.6;
      } else if (this.fuzzyMatch(cName, qName)) {
        // Fuzzy: character-sequence match
        score += 0.35;
      }
    }

    // Description matching
    if (query.description) {
      const qDesc = normalise(query.description);
      const cDesc = normalise(descriptor.description);
      if (cDesc.includes(qDesc)) {
        score += 0.4;
      }
    }

    // Tag matching
    if (query.tags && query.tags.length > 0 && descriptor.tags) {
      const queryTagsLower = query.tags.map(normalise);
      const capTagsLower = descriptor.tags.map(normalise);
      for (const qt of queryTagsLower) {
        if (capTagsLower.includes(qt)) {
          score += 0.5;
        } else {
          // Partial tag match
          for (const ct of capTagsLower) {
            if (ct.includes(qt) || qt.includes(ct)) {
              score += 0.25;
              break;
            }
          }
        }
      }
    }

    // If no query terms were provided, return a small baseline score so that
    // every capability is included in the results
    if (!query.name && !query.description && (!query.tags || query.tags.length === 0)) {
      score = 0.1;
    }

    return score;
  }

  /**
   * Simple fuzzy (subsequence) match: returns true if every character in
   * `query` appears in `target` in the same order.
   */
  private fuzzyMatch(target: string, query: string): boolean {
    let ti = 0;
    let qi = 0;
    while (ti < target.length && qi < query.length) {
      if (target[ti] === query[qi]) {
        qi++;
      }
      ti++;
    }
    return qi === query.length;
  }

  // -----------------------------------------------------------------------
  // Utility / inspection
  // -----------------------------------------------------------------------

  /**
   * Check if a specific agent has a specific capability.
   */
  hasCapability(agentId: string, capabilityName: string): boolean {
    const agentCaps = this.agentCapabilities.get(agentId);
    if (!agentCaps) return false;
    return agentCaps.has(capabilityName);
  }

  /**
   * Get a single capability descriptor for an agent.
   */
  getCapability(agentId: string, capabilityName: string): CapabilityDescriptor | undefined {
    return this.agentCapabilities.get(agentId)?.get(capabilityName);
  }

  /**
   * Get all capability names registered in the system.
   */
  getAllCapabilityNames(): string[] {
    return [...this.capabilityIndex.keys()];
  }

  /**
   * Get all registered agent IDs.
   */
  getAllAgentIds(): string[] {
    return [...this.agentCapabilities.keys()];
  }

  /**
   * Clear the entire registry (useful for testing).
   */
  clear(): void {
    this.capabilityIndex.clear();
    this.agentCapabilities.clear();
    this.capabilityCategories.clear();
    this.agentNames.clear();
    this.logger.log('Registry cleared');
  }
}
