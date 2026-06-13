"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MemoryTeamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryTeamService = void 0;
const common_1 = require("@nestjs/common");
let MemoryTeamService = MemoryTeamService_1 = class MemoryTeamService {
    constructor() {
        this.logger = new common_1.Logger(MemoryTeamService_1.name);
        this.missions = new Map();
        this.projects = new Map();
        this.userPreferences = new Map();
        this.taskLog = new Map();
        this.metrics = {
            totalTasks: 0,
            successfulTasks: 0,
            failedTasks: 0,
            totalDurationMs: 0,
            totalEntriesStored: 0,
            totalQueries: 0,
        };
    }
    async execute(task) {
        const start = Date.now();
        this.logger.log(`Executing memory task [${task.capability}] for mission ${task.missionId}`);
        try {
            let result;
            switch (task.capability) {
                case 'store':
                    result = await this.store(task.missionId, task.params.key, task.params.value, task.params);
                    break;
                case 'retrieve':
                    result = await this.retrieve(task.missionId, task.params.key);
                    break;
                case 'rag_query':
                    result = await this.query(task.missionId, task.params.query);
                    break;
                case 'context':
                    result = await this.getContext(task.missionId);
                    break;
                case 'project':
                    result = { taskId: '', success: true, data: await this.getProject(task.params.projectId), durationMs: 0 };
                    result.durationMs = Date.now() - start;
                    break;
                case 'preferences':
                    result = { taskId: '', success: true, data: await this.getPreferences(task.params.userId), durationMs: 0 };
                    result.durationMs = Date.now() - start;
                    break;
                case 'summarize':
                    result = await this.summarize(task.missionId);
                    break;
                default:
                    throw new Error(`Unknown memory capability: ${task.capability}`);
            }
            result.taskId = task.id;
            this.metrics.totalTasks++;
            this.metrics.successfulTasks++;
            this.metrics.totalDurationMs += result.durationMs;
            this.taskLog.set(task.id, { task, result });
            this.logger.log(`Memory task [${task.capability}] completed in ${result.durationMs}ms`);
            return result;
        }
        catch (error) {
            const durationMs = Date.now() - start;
            const result = {
                taskId: task.id,
                success: false,
                error: error.message,
                durationMs,
            };
            this.metrics.totalTasks++;
            this.metrics.failedTasks++;
            this.metrics.totalDurationMs += durationMs;
            this.taskLog.set(task.id, { task, result });
            this.logger.error(`Memory task [${task.capability}] failed: ${error.message}`);
            return result;
        }
    }
    async store(missionId, key, value, options) {
        const start = Date.now();
        const namespace = options?.namespace || 'default';
        const tags = options?.tags || [];
        this.logger.log(`Storing key "${key}" in mission ${missionId} [${namespace}]`);
        const mission = this.ensureMission(missionId);
        const embedding = this.generateEmbedding(typeof value === 'string' ? value : JSON.stringify(value));
        const existing = mission.entries.get(key);
        const entry = {
            key,
            value,
            missionId,
            namespace,
            embedding,
            createdAt: existing?.createdAt || new Date(),
            updatedAt: new Date(),
            accessCount: existing ? existing.accessCount + 1 : 0,
            tags: [...tags, namespace],
        };
        mission.entries.set(key, entry);
        mission.timeline.push({
            event: 'store',
            timestamp: new Date(),
            data: { key, namespace },
        });
        this.metrics.totalEntriesStored++;
        return {
            taskId: '',
            success: true,
            data: {
                key,
                namespace,
                stored: true,
                entryCount: mission.entries.size,
                embeddingDimensions: embedding.length,
            },
            durationMs: Date.now() - start,
        };
    }
    async retrieve(missionId, key) {
        const start = Date.now();
        this.logger.log(`Retrieving key "${key}" from mission ${missionId}`);
        const mission = this.missions.get(missionId);
        if (!mission) {
            return {
                taskId: '',
                success: false,
                error: `Mission ${missionId} not found`,
                durationMs: Date.now() - start,
            };
        }
        const entry = mission.entries.get(key);
        if (!entry) {
            return {
                taskId: '',
                success: false,
                error: `Key "${key}" not found in mission ${missionId}`,
                durationMs: Date.now() - start,
            };
        }
        entry.accessCount++;
        entry.updatedAt = new Date();
        mission.timeline.push({
            event: 'retrieve',
            timestamp: new Date(),
            data: { key },
        });
        return {
            taskId: '',
            success: true,
            data: entry.value,
            context: {
                key: entry.key,
                namespace: entry.namespace,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,
                accessCount: entry.accessCount,
                tags: entry.tags,
            },
            durationMs: Date.now() - start,
        };
    }
    async query(missionId, query) {
        const start = Date.now();
        this.logger.log(`RAG query on mission ${missionId}: "${query}"`);
        const mission = this.missions.get(missionId);
        if (!mission) {
            return {
                taskId: '',
                success: false,
                error: `Mission ${missionId} not found`,
                durationMs: Date.now() - start,
            };
        }
        await this.sleep(50 + Math.random() * 100);
        const queryEmbedding = this.generateEmbedding(query);
        const scored = Array.from(mission.entries.values())
            .map((entry) => ({
            entry,
            score: this.cosineSimilarity(queryEmbedding, entry.embedding),
        }))
            .sort((a, b) => b.score - a.score);
        const topK = 5;
        const results = scored.slice(0, topK).map((s) => ({
            key: s.entry.key,
            value: s.entry.value,
            score: Math.round(s.score * 1000) / 1000,
            namespace: s.entry.namespace,
            tags: s.entry.tags,
        }));
        this.metrics.totalQueries++;
        mission.timeline.push({
            event: 'rag_query',
            timestamp: new Date(),
            data: { query, resultsCount: results.length },
        });
        return {
            taskId: '',
            success: true,
            data: {
                query,
                resultsCount: results.length,
                totalEntries: mission.entries.size,
                results,
            },
            context: {
                missionId,
                embeddingDimensions: queryEmbedding.length,
                topK,
                scoringMethod: 'cosine_similarity',
            },
            durationMs: Date.now() - start,
        };
    }
    async getContext(missionId) {
        const start = Date.now();
        this.logger.log(`Getting context for mission ${missionId}`);
        const mission = this.missions.get(missionId);
        if (!mission) {
            return {
                taskId: '',
                success: false,
                error: `Mission ${missionId} not found`,
                durationMs: Date.now() - start,
            };
        }
        const namespaces = {};
        const entriesByNamespace = {};
        for (const [key, entry] of mission.entries) {
            const ns = entry.namespace;
            namespaces[ns] = (namespaces[ns] || 0) + 1;
            if (!entriesByNamespace[ns])
                entriesByNamespace[ns] = [];
            entriesByNamespace[ns].push(key);
        }
        const context = {
            missionId,
            objective: mission.objective,
            status: mission.status,
            createdAt: mission.createdAt,
            totalEntries: mission.entries.size,
            namespaces,
            entriesByNamespace,
            timelineEventCount: mission.timeline.length,
            recentTimeline: mission.timeline.slice(-10),
            summary: mission.summary || null,
        };
        return {
            taskId: '',
            success: true,
            data: context,
            context,
            durationMs: Date.now() - start,
        };
    }
    async getProject(projectId) {
        this.logger.log(`Getting project state: ${projectId}`);
        const project = this.projects.get(projectId);
        if (!project) {
            return this.ensureProject(projectId);
        }
        return project;
    }
    async getPreferences(userId) {
        this.logger.log(`Getting preferences for user: ${userId}`);
        const prefs = this.userPreferences.get(userId);
        if (!prefs) {
            return this.ensureUserPreferences(userId);
        }
        return prefs;
    }
    async summarize(missionId) {
        const start = Date.now();
        this.logger.log(`Summarizing mission ${missionId}`);
        const mission = this.missions.get(missionId);
        if (!mission) {
            return {
                taskId: '',
                success: false,
                error: `Mission ${missionId} not found`,
                durationMs: Date.now() - start,
            };
        }
        await this.sleep(300 + Math.random() * 500);
        const entrySummaries = Array.from(mission.entries.values()).map((entry) => ({
            key: entry.key,
            type: typeof entry.value,
            namespace: entry.namespace,
            accessCount: entry.accessCount,
            ageHours: Math.round((Date.now() - entry.createdAt.getTime()) / 3600000),
        }));
        const storeEvents = mission.timeline.filter((e) => e.event === 'store').length;
        const retrieveEvents = mission.timeline.filter((e) => e.event === 'retrieve').length;
        const queryEvents = mission.timeline.filter((e) => e.event === 'rag_query').length;
        const summary = [
            `Mission "${missionId}" is currently ${mission.status}.`,
            `It contains ${mission.entries.size} stored entries across ${new Set(entrySummaries.map((e) => e.namespace)).size} namespaces.`,
            `${storeEvents} store operations, ${retrieveEvents} retrievals, and ${queryEvents} RAG queries have been performed.`,
            `The most accessed entry has been accessed ${Math.max(...entrySummaries.map((e) => e.accessCount), 0)} times.`,
            `Timeline spans ${mission.timeline.length} events from ${mission.createdAt.toISOString()} to now.`,
        ].join(' ');
        mission.summary = summary;
        mission.timeline.push({
            event: 'summarize',
            timestamp: new Date(),
        });
        return {
            taskId: '',
            success: true,
            data: {
                summary,
                entryCount: mission.entries.size,
                timelineEventCount: mission.timeline.length,
                entrySummaries,
                storeOperations: storeEvents,
                retrieveOperations: retrieveEvents,
                queryOperations: queryEvents,
            },
            context: {
                missionId,
                status: mission.status,
                totalEntries: mission.entries.size,
            },
            durationMs: Date.now() - start,
        };
    }
    getStatus() {
        const missionSummaries = Array.from(this.missions.entries()).map(([missionId, mission]) => ({
            missionId,
            status: mission.status,
            entryCount: mission.entries.size,
            timelineEventCount: mission.timeline.length,
            lastActivity: mission.timeline.length > 0
                ? mission.timeline[mission.timeline.length - 1].timestamp
                : mission.createdAt,
        }));
        return {
            team: 'memory',
            activeMissions: this.missions.size,
            activeProjects: this.projects.size,
            registeredUsers: this.userPreferences.size,
            tasksCompleted: this.metrics.successfulTasks,
            tasksFailed: this.metrics.failedTasks,
            totalEntriesStored: this.metrics.totalEntriesStored,
            totalQueries: this.metrics.totalQueries,
            avgDurationMs: this.metrics.totalTasks > 0
                ? Math.round(this.metrics.totalDurationMs / this.metrics.totalTasks)
                : 0,
            missions: missionSummaries,
        };
    }
    ensureMission(missionId) {
        let mission = this.missions.get(missionId);
        if (!mission) {
            mission = {
                missionId,
                objective: '',
                status: 'active',
                createdAt: new Date(),
                entries: new Map(),
                timeline: [],
            };
            this.missions.set(missionId, mission);
            this.logger.log(`Created memory context for mission ${missionId}`);
        }
        return mission;
    }
    ensureProject(projectId) {
        let project = this.projects.get(projectId);
        if (!project) {
            project = {
                projectId,
                name: `Project-${projectId.slice(0, 8)}`,
                status: 'planning',
                progress: 0,
                milestones: [
                    { name: 'Requirements', completed: false },
                    { name: 'Design', completed: false },
                    { name: 'Implementation', completed: false },
                    { name: 'Testing', completed: false },
                    { name: 'Deployment', completed: false },
                ],
                metadata: {},
                updatedAt: new Date(),
            };
            this.projects.set(projectId, project);
            this.logger.log(`Created project state for ${projectId}`);
        }
        return project;
    }
    ensureUserPreferences(userId) {
        let prefs = this.userPreferences.get(userId);
        if (!prefs) {
            prefs = {
                userId,
                settings: {
                    language: 'en',
                    timezone: 'UTC',
                    theme: 'dark',
                },
                notificationPreferences: {
                    email: true,
                    push: true,
                    slack: false,
                    sms: false,
                },
                uiPreferences: {
                    compactMode: false,
                    sidebarCollapsed: false,
                    defaultView: 'dashboard',
                },
                updatedAt: new Date(),
            };
            this.userPreferences.set(userId, prefs);
            this.logger.log(`Created default preferences for user ${userId}`);
        }
        return prefs;
    }
    generateEmbedding(text) {
        const dimensions = 128;
        const embedding = [];
        let seed = 0;
        for (let i = 0; i < text.length; i++) {
            seed = ((seed << 5) - seed + text.charCodeAt(i)) | 0;
        }
        for (let i = 0; i < dimensions; i++) {
            const value = Math.sin(seed * (i + 1) * 0.001) * 0.5 +
                Math.cos(i * 0.1) * 0.3 +
                (Math.random() - 0.5) * 0.1;
            embedding.push(value);
        }
        const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        return embedding.map((v) => v / magnitude);
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length)
            return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        if (denominator === 0)
            return 0;
        return dotProduct / denominator;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.MemoryTeamService = MemoryTeamService;
exports.MemoryTeamService = MemoryTeamService = MemoryTeamService_1 = __decorate([
    (0, common_1.Injectable)()
], MemoryTeamService);
//# sourceMappingURL=memory-team.service.js.map