"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CapabilityResolverService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityResolverService = void 0;
const common_1 = require("@nestjs/common");
const capability_registry_service_1 = require("../capability-registry/capability-registry.service");
let CapabilityResolverService = CapabilityResolverService_1 = class CapabilityResolverService {
    constructor(registry) {
        this.registry = registry;
        this.logger = new common_1.Logger(CapabilityResolverService_1.name);
    }
    resolve(requirements) {
        this.logger.log(`Resolving capabilities for mission ${requirements.missionId}`);
        const resolved = [];
        const packsNeeded = new Set();
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
        const inferred = this.inferFromMissionText(requirements.instruction);
        for (const cap of inferred) {
            if (!resolved.find((r) => r.capabilityId === cap.id)) {
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
        const implied = this.resolveImpliedCapabilities(resolved.map((r) => r.capabilityId));
        for (const capId of implied) {
            if (!resolved.find((r) => r.capabilityId === capId)) {
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
        if (resolved.length >= 3) {
            this.addDefaultCertificationCapabilities(resolved, packsNeeded, requirements.instruction);
            this.addDefaultDeliveryCapabilities(resolved, packsNeeded, requirements.instruction);
        }
        resolved.sort((a, b) => a.priority - b.priority);
        const totalCost = resolved.reduce((sum, r) => sum + r.definition.cost.estimatedUsdPerExecution, 0);
        const maxLatency = Math.max(...resolved.map((r) => r.definition.latency.estimatedMs));
        const confidence = this.calculateConfidence(resolved, requirements.instruction);
        const resolution = {
            missionId: requirements.missionId,
            requiredCapabilities: resolved,
            packsNeeded: Array.from(packsNeeded),
            estimatedTotalCost: totalCost,
            estimatedTotalDurationMs: maxLatency,
            confidence,
        };
        this.logger.log(`Resolved ${resolved.length} capabilities across ${packsNeeded.size} packs (confidence: ${(confidence * 100).toFixed(0)}%)`);
        return resolution;
    }
    resolveIds(requirements) {
        const resolution = this.resolve(requirements);
        return resolution.requiredCapabilities.map((r) => r.capabilityId);
    }
    inferFromMissionText(text) {
        return this.registry.findCapabilitiesForMission(text);
    }
    getMatchingKeyword(cap, text) {
        const lower = text.toLowerCase();
        const match = cap.keywords.find((k) => lower.includes(k));
        return match || cap.name;
    }
    resolveDependencies(capabilityId) {
        const deps = [];
        if (capabilityId.startsWith('browser.') && capabilityId !== 'browser.session') {
            deps.push('browser.session');
        }
        if (capabilityId === 'dev.test') {
            deps.push('dev.qa');
        }
        if (capabilityId === 'dev.kubernetes') {
            deps.push('dev.docker');
        }
        if (capabilityId === 'delivery.deployment') {
            deps.push('delivery.github');
        }
        return deps;
    }
    resolveImpliedCapabilities(current) {
        const implied = [];
        const hasDevCap = current.some((c) => c.startsWith('dev.'));
        if (hasDevCap && !current.includes('dev.architecture')) {
            implied.push('dev.architecture');
        }
        if (current.includes('dev.frontend') &&
            current.includes('dev.backend')) {
            if (!current.includes('dev.api')) {
                implied.push('dev.api');
            }
        }
        if (hasDevCap && !current.includes('dev.documentation')) {
            implied.push('dev.documentation');
        }
        return implied;
    }
    addDefaultCertificationCapabilities(resolved, packsNeeded, instruction) {
        const defaultCertCaps = [
            'cert.security_audit',
            'cert.test_coverage',
        ];
        const lower = instruction.toLowerCase();
        if (lower.includes('enterprise') || lower.includes('critique') || lower.includes('critical')) {
            defaultCertCaps.push('cert.compliance', 'cert.architecture_review');
        }
        for (const capId of defaultCertCaps) {
            if (!resolved.find((r) => r.capabilityId === capId)) {
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
    addDefaultDeliveryCapabilities(resolved, packsNeeded, instruction) {
        const defaultDeliverCaps = [
            'delivery.zip',
            'delivery.notification',
        ];
        const lower = instruction.toLowerCase();
        if (lower.includes('github') || lower.includes('repo') || lower.includes('push')) {
            defaultDeliverCaps.push('delivery.github');
        }
        if (lower.includes('docker') || lower.includes('container') || lower.includes('image')) {
            defaultDeliverCaps.push('delivery.docker_registry');
        }
        if (lower.includes('deploy') || lower.includes('production') || lower.includes('déployer')) {
            defaultDeliverCaps.push('delivery.deployment');
        }
        defaultDeliverCaps.push('delivery.pdf_report');
        for (const capId of defaultDeliverCaps) {
            if (!resolved.find((r) => r.capabilityId === capId)) {
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
    calculatePriority(capId, instruction) {
        const lower = instruction.toLowerCase();
        const cap = this.registry.getCapability(capId);
        if (!cap)
            return 5;
        const matchCount = cap.keywords.filter((k) => lower.includes(k)).length;
        if (matchCount >= 3)
            return 1;
        if (matchCount >= 2)
            return 2;
        return 3;
    }
    calculateConfidence(resolved, instruction) {
        if (resolved.length === 0)
            return 0;
        const explicitCount = resolved.filter((r) => r.priority <= 3).length;
        const total = resolved.length;
        const explicitRatio = explicitCount / total;
        const coverageBonus = Math.min(total / 5, 1) * 0.1;
        return Math.min(1, explicitRatio * 0.8 + coverageBonus + 0.1);
    }
};
exports.CapabilityResolverService = CapabilityResolverService;
exports.CapabilityResolverService = CapabilityResolverService = CapabilityResolverService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [capability_registry_service_1.CapabilityRegistryService])
], CapabilityResolverService);
//# sourceMappingURL=capability-resolver.service.js.map