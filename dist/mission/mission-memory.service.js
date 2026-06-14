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
let MissionMemoryService = MissionMemoryService_1 = class MissionMemoryService {
    constructor() {
        this.logger = new common_1.Logger(MissionMemoryService_1.name);
        this.missionStores = new Map();
        this.projects = new Map();
        this.userPreferences = new Map();
        this.historyIdCounter = 0;
    }
    store(missionId, key, value) {
        const store = this.getOrCreateStore(missionId);
        store.data.set(key, value);
        this.addHistoryItem(missionId, 'DATA_STORE', `Stored key "${key}"`, {
            key,
            valueType: typeof value,
        });
        this.logger.debug(`Mission "${missionId}": stored key "${key}"`);
    }
    retrieve(missionId, key) {
        const store = this.missionStores.get(missionId);
        if (!store) {
            this.logger.warn(`Mission "${missionId}": no store found for retrieval of key "${key}"`);
            return undefined;
        }
        const value = store.data.get(key);
        this.addHistoryItem(missionId, 'DATA_RETRIEVE', `Retrieved key "${key}"`, {
            key,
            found: value !== undefined,
        });
        return value;
    }
    getMissionContext(missionId) {
        const store = this.missionStores.get(missionId);
        if (!store || !store.context) {
            return null;
        }
        const phaseResults = {};
        for (const [phaseType, results] of store.phaseResults.entries()) {
            phaseResults[phaseType] = [...results];
        }
        return {
            ...store.context,
            phaseResults,
        };
    }
    initializeMissionContext(missionId, instruction, userId, projectId, metadata) {
        const store = this.getOrCreateStore(missionId);
        const context = {
            missionId,
            instruction,
            userId,
            projectId,
            startTime: new Date(),
            currentPhase: null,
            phaseResults: {},
            metadata: metadata ?? {},
        };
        store.context = context;
        this.addHistoryItem(missionId, 'NOTE', `Mission context initialised: "${instruction.substring(0, 60)}..."`, null);
        this.logger.log(`Mission "${missionId}": context initialised`);
        return context;
    }
    addPhaseResult(missionId, phaseType, result) {
        const store = this.getOrCreateStore(missionId);
        if (!store.phaseResults.has(phaseType)) {
            store.phaseResults.set(phaseType, []);
        }
        const phaseResult = {
            phaseType,
            result,
            timestamp: new Date(),
            durationMs: 0,
            success: true,
            metadata: {},
        };
        store.phaseResults.get(phaseType).push(phaseResult);
        if (store.context) {
            store.context.currentPhase = phaseType;
        }
        this.addHistoryItem(missionId, 'PHASE_COMPLETE', `Phase "${phaseType}" result recorded`, phaseResult);
        this.logger.log(`Mission "${missionId}": phase "${phaseType}" result added`);
    }
    getPhaseResults(missionId, phaseType) {
        const store = this.missionStores.get(missionId);
        if (!store) {
            return [];
        }
        if (phaseType) {
            return [...(store.phaseResults.get(phaseType) ?? [])];
        }
        const allResults = [];
        for (const results of store.phaseResults.values()) {
            allResults.push(...results);
        }
        return allResults.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    search(missionId, query) {
        const store = this.missionStores.get(missionId);
        if (!store) {
            return [];
        }
        const queryLower = query.toLowerCase();
        const results = [];
        for (const [key, value] of store.data.entries()) {
            const strValue = JSON.stringify(value).toLowerCase();
            if (strValue.includes(queryLower) || key.toLowerCase().includes(queryLower)) {
                results.push({ key, value });
            }
        }
        for (const [phaseType, phaseResults] of store.phaseResults.entries()) {
            if (phaseType.toLowerCase().includes(queryLower)) {
                results.push({ phaseType, results: phaseResults });
            }
            for (const pr of phaseResults) {
                const prStr = JSON.stringify(pr.result).toLowerCase();
                if (prStr.includes(queryLower)) {
                    results.push({ phaseType, result: pr });
                }
            }
        }
        this.logger.debug(`Mission "${missionId}": search for "${query}" returned ${results.length} results`);
        return results;
    }
    getHistory(missionId) {
        const store = this.missionStores.get(missionId);
        if (!store) {
            return [];
        }
        return [...store.history];
    }
    setProject(projectId, data) {
        const existing = this.projects.get(projectId);
        const project = {
            projectId,
            name: data.name,
            description: data.description ?? existing?.description ?? '',
            techStack: data.techStack ?? existing?.techStack ?? [],
            repositoryUrl: data.repositoryUrl ?? existing?.repositoryUrl ?? null,
            createdAt: existing?.createdAt ?? new Date(),
            updatedAt: new Date(),
            metadata: data.metadata ?? existing?.metadata ?? {},
        };
        this.projects.set(projectId, project);
        this.logger.log(`Project "${projectId}" data stored/updated`);
        return project;
    }
    getProject(projectId) {
        return this.projects.get(projectId) ?? null;
    }
    setUserPreferences(userId, prefs) {
        const existing = this.userPreferences.get(userId);
        const preferences = {
            userId,
            language: prefs.language ?? existing?.language ?? 'fr',
            notificationLevel: prefs.notificationLevel ?? existing?.notificationLevel ?? 'IMPORTANT',
            defaultPriority: prefs.defaultPriority ?? existing?.defaultPriority ?? 'MEDIUM',
            preferredTeams: prefs.preferredTeams ?? existing?.preferredTeams ?? [],
            customSettings: prefs.customSettings ?? existing?.customSettings ?? {},
            updatedAt: new Date(),
        };
        this.userPreferences.set(userId, preferences);
        this.logger.log(`User "${userId}" preferences updated`);
        return preferences;
    }
    getUserPreferences(userId) {
        return this.userPreferences.get(userId) ?? null;
    }
    summarize(missionId) {
        const store = this.missionStores.get(missionId);
        if (!store) {
            return `Mission "${missionId}": no data found.`;
        }
        const ctx = store.context;
        const phaseTypes = [...store.phaseResults.keys()];
        const completedPhases = phaseTypes.length;
        const totalDataKeys = store.data.size;
        const historyCount = store.history.length;
        const phaseSummaries = phaseTypes.map((pt) => {
            const results = store.phaseResults.get(pt) ?? [];
            const lastResult = results[results.length - 1];
            return `  - ${pt}: ${results.length} result(s), last at ${lastResult?.timestamp.toISOString() ?? 'N/A'}`;
        });
        return [
            `Mission "${missionId}" Summary:`,
            `  Instruction: "${ctx?.instruction?.substring(0, 80) ?? 'N/A'}..."`,
            `  Current Phase: ${ctx?.currentPhase ?? 'N/A'}`,
            `  Completed Phases: ${completedPhases} (${phaseTypes.join(', ') || 'none'})`,
            `  Stored Data Keys: ${totalDataKeys}`,
            `  History Entries: ${historyCount}`,
            `  Started: ${ctx?.startTime?.toISOString() ?? 'N/A'}`,
            ...phaseSummaries,
        ].join('\n');
    }
    cleanup(missionId) {
        const store = this.missionStores.get(missionId);
        if (!store) {
            this.logger.warn(`Mission "${missionId}": no store to cleanup`);
            return;
        }
        const dataKeys = store.data.size;
        const phaseKeys = store.phaseResults.size;
        const historyEntries = store.history.length;
        store.data.clear();
        store.phaseResults.clear();
        store.history.length = 0;
        store.context = null;
        this.missionStores.delete(missionId);
        this.logger.log(`Mission "${missionId}" cleaned up: ${dataKeys} data keys, ` +
            `${phaseKeys} phase types, ${historyEntries} history entries removed`);
    }
    getOrCreateStore(missionId) {
        let store = this.missionStores.get(missionId);
        if (!store) {
            store = {
                data: new Map(),
                phaseResults: new Map(),
                history: [],
                context: null,
            };
            this.missionStores.set(missionId, store);
        }
        return store;
    }
    addHistoryItem(missionId, type, description, data) {
        const store = this.getOrCreateStore(missionId);
        this.historyIdCounter++;
        store.history.push({
            id: `hist_${this.historyIdCounter}`,
            missionId,
            timestamp: new Date(),
            type,
            description,
            data,
        });
    }
};
exports.MissionMemoryService = MissionMemoryService;
exports.MissionMemoryService = MissionMemoryService = MissionMemoryService_1 = __decorate([
    (0, common_1.Injectable)()
], MissionMemoryService);
//# sourceMappingURL=mission-memory.service.js.map