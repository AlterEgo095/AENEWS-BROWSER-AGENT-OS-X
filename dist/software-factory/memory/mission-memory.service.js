"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MissionMemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionMemoryService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
let MissionMemoryService = MissionMemoryService_1 = class MissionMemoryService {
    constructor() {
        this.logger = new common_1.Logger(MissionMemoryService_1.name);
        this.contexts = new Map();
        this.entries = new Map();
    }
    storeContext(missionId, context) {
        this.contexts.set(missionId, context);
        this.addEntry(missionId, 'context', 'mission_context', context);
        this.logger.log(`Context stored for mission ${missionId}`);
    }
    getContext(missionId) {
        return this.contexts.get(missionId);
    }
    storePlan(missionId, plan) {
        this.addEntry(missionId, 'plan', 'execution_plan', plan);
        this.logger.log(`Plan stored for mission ${missionId}`);
    }
    getPlan(missionId) {
        return this.getLatestEntry(missionId, 'plan', 'execution_plan');
    }
    storeResearch(missionId, research) {
        this.addEntry(missionId, 'research', 'research_results', research);
        this.logger.log(`Research stored for mission ${missionId}`);
    }
    getResearch(missionId) {
        return this.getLatestEntry(missionId, 'research', 'research_results');
    }
    storeBuildResults(missionId, results) {
        this.addEntry(missionId, 'build', 'build_results', results);
        this.logger.log(`Build results stored for mission ${missionId}`);
    }
    getBuildResults(missionId) {
        return this.getLatestEntry(missionId, 'build', 'build_results');
    }
    storeTestResults(missionId, results) {
        this.addEntry(missionId, 'test', 'test_results', results);
        this.logger.log(`Test results stored for mission ${missionId}`);
    }
    getTestResults(missionId) {
        return this.getLatestEntry(missionId, 'test', 'test_results');
    }
    storeAuditResults(missionId, results) {
        this.addEntry(missionId, 'audit', 'audit_results', results);
        this.logger.log(`Audit results stored for mission ${missionId}`);
    }
    getAuditResults(missionId) {
        return this.getLatestEntry(missionId, 'audit', 'audit_results');
    }
    storeCertification(missionId, results) {
        this.addEntry(missionId, 'certification', 'certification_results', results);
        this.logger.log(`Certification stored for mission ${missionId}`);
    }
    getCertification(missionId) {
        return this.getLatestEntry(missionId, 'certification', 'certification_results');
    }
    getAllResults(missionId) {
        const results = {};
        const missionEntries = this.entries.get(missionId) || [];
        for (const entry of missionEntries) {
            results[entry.category] = entry.data;
        }
        return results;
    }
    exportMission(missionId) {
        return {
            context: this.contexts.get(missionId),
            entries: this.entries.get(missionId) || [],
        };
    }
    clearMission(missionId) {
        this.contexts.delete(missionId);
        this.entries.delete(missionId);
        this.logger.log(`Memory cleared for mission ${missionId}`);
    }
    addEntry(missionId, category, key, data) {
        const entry = {
            id: `mem-${(0, uuid_1.v4)().slice(0, 8)}`,
            missionId,
            category,
            key,
            data,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const missionEntries = this.entries.get(missionId) || [];
        missionEntries.push(entry);
        this.entries.set(missionId, missionEntries);
    }
    getLatestEntry(missionId, category, key) {
        const missionEntries = this.entries.get(missionId) || [];
        const matching = missionEntries.filter((e) => e.category === category && e.key === key);
        return matching.length > 0 ? matching[matching.length - 1].data : undefined;
    }
};
exports.MissionMemoryService = MissionMemoryService;
exports.MissionMemoryService = MissionMemoryService = MissionMemoryService_1 = __decorate([
    (0, common_1.Injectable)()
], MissionMemoryService);
//# sourceMappingURL=mission-memory.service.js.map