"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CapabilityRegistryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityRegistryService = exports.CAPABILITY_DEPRECATED = exports.CAPABILITY_UPDATED = exports.CAPABILITY_UNPUBLISHED = exports.CAPABILITY_PUBLISHED = void 0;
const common_1 = require("@nestjs/common");
exports.CAPABILITY_PUBLISHED = 'capability.published';
exports.CAPABILITY_UNPUBLISHED = 'capability.unpublished';
exports.CAPABILITY_UPDATED = 'capability.updated';
exports.CAPABILITY_DEPRECATED = 'capability.deprecated';
let CapabilityRegistryService = CapabilityRegistryService_1 = class CapabilityRegistryService {
    constructor() {
        this.logger = new common_1.Logger(CapabilityRegistryService_1.name);
        this.capabilityIndex = new Map();
        this.agentCapabilities = new Map();
        this.capabilityCategories = new Map();
        this.agentNames = new Map();
        this.eventListeners = new Map();
    }
    onModuleInit() {
        this.logger.log('CapabilityRegistryService initialised');
    }
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
        return () => {
            const listeners = this.eventListeners.get(event);
            if (listeners) {
                const idx = listeners.indexOf(listener);
                if (idx >= 0)
                    listeners.splice(idx, 1);
            }
        };
    }
    emitEvent(event, payload) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(payload);
                }
                catch (err) {
                    this.logger.warn(`Event listener error on "${event}": ${err}`);
                }
            }
        }
    }
    publishCapabilities(agentId, registration) {
        const { agentName, capabilities } = registration;
        if (agentName) {
            this.agentNames.set(agentId, agentName);
        }
        if (!this.agentCapabilities.has(agentId)) {
            this.agentCapabilities.set(agentId, new Map());
        }
        const agentCaps = this.agentCapabilities.get(agentId);
        let added = 0;
        let updated = 0;
        for (const descriptor of capabilities) {
            const { name, category, tags } = descriptor;
            const isNew = !agentCaps.has(name);
            agentCaps.set(name, {
                ...descriptor,
                skillLevel: descriptor.skillLevel ?? 0.5,
                successRate: descriptor.successRate ?? 0.5,
                currentLoad: descriptor.currentLoad ?? 0,
                deprecated: descriptor.deprecated ?? false,
            });
            if (!this.capabilityIndex.has(name)) {
                this.capabilityIndex.set(name, new Set());
            }
            this.capabilityIndex.get(name).add(agentId);
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
            }
            else {
                updated++;
            }
            this.emitEvent(exports.CAPABILITY_PUBLISHED, {
                agentId,
                agentName: agentName ?? this.agentNames.get(agentId),
                capabilityName: name,
                timestamp: Date.now(),
            });
        }
        this.logger.log(`Agent "${agentName ?? agentId}" published capabilities: ${added} new, ${updated} updated`);
    }
    unpublishCapabilities(agentId) {
        const agentCaps = this.agentCapabilities.get(agentId);
        if (!agentCaps) {
            this.logger.warn(`Attempted to unpublish capabilities for unknown agent "${agentId}"`);
            return;
        }
        const removedCapabilityNames = [];
        for (const [capName, descriptor] of agentCaps.entries()) {
            const agentSet = this.capabilityIndex.get(capName);
            if (agentSet) {
                agentSet.delete(agentId);
                if (agentSet.size === 0) {
                    this.capabilityIndex.delete(capName);
                }
            }
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
        this.agentCapabilities.delete(agentId);
        this.agentNames.delete(agentId);
        this.emitEvent(exports.CAPABILITY_UNPUBLISHED, {
            agentId,
            agentName: this.agentNames.get(agentId),
            timestamp: Date.now(),
        });
        this.logger.log(`Agent "${agentId}" unpublished ${removedCapabilityNames.length} capabilities: [${removedCapabilityNames.join(', ')}]`);
    }
    updateCapability(agentId, capabilityName, descriptor) {
        const agentCaps = this.agentCapabilities.get(agentId);
        if (!agentCaps) {
            this.logger.warn(`Cannot update capability "${capabilityName}" — agent "${agentId}" not registered`);
            return;
        }
        const existing = agentCaps.get(capabilityName);
        if (!existing) {
            this.logger.warn(`Cannot update capability "${capabilityName}" — not found for agent "${agentId}"`);
            return;
        }
        const merged = {
            ...existing,
            ...descriptor,
            name: capabilityName,
        };
        if (descriptor.category !== undefined && descriptor.category !== existing.category) {
            if (existing.category) {
                this.removeFromCategoryIndex(existing.category, capabilityName);
            }
            if (descriptor.category) {
                this.addToCategoryIndex(descriptor.category, capabilityName);
            }
        }
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
        this.emitEvent(exports.CAPABILITY_UPDATED, {
            agentId,
            agentName: this.agentNames.get(agentId),
            capabilityName,
            timestamp: Date.now(),
        });
        this.logger.log(`Agent "${agentId}" updated capability "${capabilityName}"`);
    }
    deprecateCapability(agentId, capabilityName) {
        const agentCaps = this.agentCapabilities.get(agentId);
        if (!agentCaps) {
            this.logger.warn(`Cannot deprecate capability "${capabilityName}" — agent "${agentId}" not registered`);
            return;
        }
        const existing = agentCaps.get(capabilityName);
        if (!existing) {
            this.logger.warn(`Cannot deprecate capability "${capabilityName}" — not found for agent "${agentId}"`);
            return;
        }
        if (existing.deprecated) {
            this.logger.debug(`Capability "${capabilityName}" for agent "${agentId}" is already deprecated`);
            return;
        }
        existing.deprecated = true;
        this.emitEvent(exports.CAPABILITY_DEPRECATED, {
            agentId,
            agentName: this.agentNames.get(agentId),
            capabilityName,
            timestamp: Date.now(),
        });
        this.logger.warn(`Capability "${capabilityName}" deprecated for agent "${agentId}"`);
    }
    searchCapabilities(query) {
        const results = [];
        const { name, description, tags, category, includeDeprecated = false } = query;
        const candidateNames = category
            ? (this.capabilityCategories.get(category) ?? [])
            : [...this.capabilityIndex.keys()];
        for (const capName of candidateNames) {
            const agentIds = this.capabilityIndex.get(capName);
            if (!agentIds)
                continue;
            for (const agentId of agentIds) {
                const agentCaps = this.agentCapabilities.get(agentId);
                if (!agentCaps)
                    continue;
                const descriptor = agentCaps.get(capName);
                if (!descriptor)
                    continue;
                if (descriptor.deprecated && !includeDeprecated)
                    continue;
                const score = this.computeSearchScore(descriptor, {
                    name,
                    description,
                    tags,
                });
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
        results.sort((a, b) => b.score - a.score);
        return results;
    }
    getAgentsWithCapability(capabilityName) {
        const agentIds = this.capabilityIndex.get(capabilityName);
        if (!agentIds || agentIds.size === 0)
            return [];
        const results = [];
        for (const agentId of agentIds) {
            const agentCaps = this.agentCapabilities.get(agentId);
            if (!agentCaps)
                continue;
            const descriptor = agentCaps.get(capabilityName);
            if (!descriptor)
                continue;
            results.push({
                agentId,
                agentName: this.agentNames.get(agentId) ?? agentId,
                descriptor,
            });
        }
        results.sort((a, b) => {
            const skillDiff = (b.descriptor.skillLevel ?? 0.5) - (a.descriptor.skillLevel ?? 0.5);
            if (Math.abs(skillDiff) > 0.001)
                return skillDiff;
            return (b.descriptor.successRate ?? 0.5) - (a.descriptor.successRate ?? 0.5);
        });
        return results;
    }
    getCapabilityDetails(capabilityName) {
        const agents = this.getAgentsWithCapability(capabilityName);
        if (agents.length === 0)
            return null;
        const providers = agents.map((a) => ({
            agentId: a.agentId,
            agentName: a.agentName,
            descriptor: a.descriptor,
        }));
        const totalProviders = providers.length;
        const averageCost = providers.reduce((sum, p) => sum + p.descriptor.costEstimate, 0) / totalProviders;
        const averageLatency = providers.reduce((sum, p) => sum + p.descriptor.latencyEstimate, 0) / totalProviders;
        const averageSuccessRate = providers.reduce((sum, p) => sum + (p.descriptor.successRate ?? 0.5), 0) / totalProviders;
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
    findBestAgentForCapability(capabilityName, criteria) {
        const agents = this.getAgentsWithCapability(capabilityName);
        if (agents.length === 0)
            return null;
        const { maxCost = Infinity, maxLatency = Infinity, minSuccessRate = 0, preferAgentId, minSkillLevel = 0, excludeAgents = [], } = criteria ?? {};
        const excludeSet = new Set(excludeAgents);
        let best = null;
        for (const agent of agents) {
            const { descriptor } = agent;
            if (excludeSet.has(agent.agentId))
                continue;
            if (descriptor.deprecated)
                continue;
            if (descriptor.costEstimate > maxCost)
                continue;
            if (descriptor.latencyEstimate > maxLatency)
                continue;
            if ((descriptor.successRate ?? 0.5) < minSuccessRate)
                continue;
            if ((descriptor.skillLevel ?? 0.5) < minSkillLevel)
                continue;
            const skillLevel = descriptor.skillLevel ?? 0.5;
            const successRate = descriptor.successRate ?? 0.5;
            const load = descriptor.currentLoad ?? 0;
            const cost = descriptor.costEstimate;
            const latency = descriptor.latencyEstimate;
            const costNorm = cost > 0 ? 1 / (1 + cost) : 1;
            const latencyNorm = latency > 0 ? 1 / (1 + latency) : 1;
            const loadNorm = 1 - Math.min(load, 1);
            let score = 0.3 * skillLevel +
                0.3 * successRate +
                0.15 * costNorm +
                0.1 * latencyNorm +
                0.15 * loadNorm;
            if (preferAgentId && agent.agentId === preferAgentId) {
                score += 0.2;
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
            this.logger.debug(`Best agent for "${capabilityName}": ${best.agentId} (score=${best.score.toFixed(3)})`);
        }
        else {
            this.logger.debug(`No suitable agent found for capability "${capabilityName}"`);
        }
        return best;
    }
    getCapabilityGraph() {
        const nodes = [];
        const edges = [];
        for (const [capName, agentIds] of this.capabilityIndex.entries()) {
            let description = '';
            let category;
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
        for (const [, agentCaps] of this.agentCapabilities.entries()) {
            for (const [capName, descriptor] of agentCaps.entries()) {
                if (descriptor.dependencies) {
                    for (const dep of descriptor.dependencies) {
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
        const coOccurrence = new Map();
        for (const [, agentCaps] of this.agentCapabilities.entries()) {
            const capNames = [...agentCaps.keys()];
            for (let i = 0; i < capNames.length; i++) {
                for (let j = i + 1; j < capNames.length; j++) {
                    const a = capNames[i];
                    const b = capNames[j];
                    if (!coOccurrence.has(a))
                        coOccurrence.set(a, new Map());
                    if (!coOccurrence.has(b))
                        coOccurrence.set(b, new Map());
                    coOccurrence.get(a).set(b, (coOccurrence.get(a).get(b) ?? 0) + 1);
                    coOccurrence.get(b).set(a, (coOccurrence.get(b).get(a) ?? 0) + 1);
                }
            }
        }
        for (const [capA, partners] of coOccurrence.entries()) {
            for (const [capB, count] of partners.entries()) {
                if (count >= 2) {
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
        for (const [capName, agentIds] of this.capabilityIndex.entries()) {
            if (agentIds.size > 1) {
                edges.push({
                    from: capName,
                    to: capName,
                    type: 'alternative',
                });
            }
        }
        return { nodes, edges };
    }
    getRegistryStats() {
        let totalCapabilities = 0;
        let deprecatedCount = 0;
        const capabilitiesByCategory = {};
        const agentCoverage = {};
        let totalSkillLevel = 0;
        let totalSuccessRate = 0;
        let descriptorCount = 0;
        totalCapabilities = this.capabilityIndex.size;
        for (const [, agentCaps] of this.agentCapabilities.entries()) {
            for (const [, descriptor] of agentCaps.entries()) {
                descriptorCount++;
                if (descriptor.deprecated)
                    deprecatedCount++;
                totalSkillLevel += descriptor.skillLevel ?? 0.5;
                totalSuccessRate += descriptor.successRate ?? 0.5;
            }
        }
        for (const [category, capNames] of this.capabilityCategories.entries()) {
            if (category.startsWith('tag:'))
                continue;
            capabilitiesByCategory[category] = capNames.length;
        }
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
    addToCategoryIndex(category, capabilityName) {
        if (!this.capabilityCategories.has(category)) {
            this.capabilityCategories.set(category, []);
        }
        const list = this.capabilityCategories.get(category);
        if (!list.includes(capabilityName)) {
            list.push(capabilityName);
        }
    }
    removeFromCategoryIndex(category, capabilityName) {
        const list = this.capabilityCategories.get(category);
        if (!list)
            return;
        const idx = list.indexOf(capabilityName);
        if (idx >= 0) {
            list.splice(idx, 1);
        }
        if (list.length === 0) {
            this.capabilityCategories.delete(category);
        }
    }
    computeSearchScore(descriptor, query) {
        let score = 0;
        const normalise = (s) => s.toLowerCase().trim();
        if (query.name) {
            const qName = normalise(query.name);
            const cName = normalise(descriptor.name);
            if (cName === qName) {
                score += 1.0;
            }
            else if (cName.startsWith(qName)) {
                score += 0.8;
            }
            else if (cName.includes(qName)) {
                score += 0.6;
            }
            else if (this.fuzzyMatch(cName, qName)) {
                score += 0.35;
            }
        }
        if (query.description) {
            const qDesc = normalise(query.description);
            const cDesc = normalise(descriptor.description);
            if (cDesc.includes(qDesc)) {
                score += 0.4;
            }
        }
        if (query.tags && query.tags.length > 0 && descriptor.tags) {
            const queryTagsLower = query.tags.map(normalise);
            const capTagsLower = descriptor.tags.map(normalise);
            for (const qt of queryTagsLower) {
                if (capTagsLower.includes(qt)) {
                    score += 0.5;
                }
                else {
                    for (const ct of capTagsLower) {
                        if (ct.includes(qt) || qt.includes(ct)) {
                            score += 0.25;
                            break;
                        }
                    }
                }
            }
        }
        if (!query.name && !query.description && (!query.tags || query.tags.length === 0)) {
            score = 0.1;
        }
        return score;
    }
    fuzzyMatch(target, query) {
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
    hasCapability(agentId, capabilityName) {
        const agentCaps = this.agentCapabilities.get(agentId);
        if (!agentCaps)
            return false;
        return agentCaps.has(capabilityName);
    }
    getCapability(agentId, capabilityName) {
        return this.agentCapabilities.get(agentId)?.get(capabilityName);
    }
    getAllCapabilityNames() {
        return [...this.capabilityIndex.keys()];
    }
    getAllAgentIds() {
        return [...this.agentCapabilities.keys()];
    }
    clear() {
        this.capabilityIndex.clear();
        this.agentCapabilities.clear();
        this.capabilityCategories.clear();
        this.agentNames.clear();
        this.logger.log('Registry cleared');
    }
};
exports.CapabilityRegistryService = CapabilityRegistryService;
exports.CapabilityRegistryService = CapabilityRegistryService = CapabilityRegistryService_1 = __decorate([
    (0, common_1.Injectable)()
], CapabilityRegistryService);
//# sourceMappingURL=capability-registry.service.js.map