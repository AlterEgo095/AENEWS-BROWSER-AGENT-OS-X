"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MissionArchiveService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionArchiveService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
let MissionArchiveService = MissionArchiveService_1 = class MissionArchiveService {
    constructor() {
        this.logger = new common_1.Logger(MissionArchiveService_1.name);
        this.archives = new Map();
    }
    async archive(missionId, data) {
        this.logger.log(`Archiving mission ${missionId}`);
        const execution = data.execution;
        const contract = data.contract;
        const certification = data.memory?.entries?.find((e) => e.category === 'certification')?.data;
        const lessonsLearned = [];
        if (execution?.errors?.length > 0) {
            lessonsLearned.push(`Errors encountered: ${execution.errors.join(', ')}`);
        }
        if (certification?.qualityScore && certification.qualityScore < 80) {
            lessonsLearned.push('Quality score below 80% — improve testing coverage');
        }
        if (contract?.budget?.currentSpendUsd > contract?.budget?.maxApiCostUsd * 0.8) {
            lessonsLearned.push('Budget utilization above 80% — consider optimization');
        }
        if (lessonsLearned.length === 0) {
            lessonsLearned.push('Mission executed smoothly with no major issues');
        }
        const summary = {
            objective: contract?.mission || 'Unknown',
            result: execution?.errors?.length > 0 ? 'partial' : 'success',
            qualityScore: certification?.qualityScore || 0,
            totalDurationMs: data.timeline?.totalDuration || 0,
            totalCostUsd: contract?.budget?.currentSpendUsd || 0,
            artifactsDelivered: execution?.artifacts?.length || 0,
            certificationPassed: certification?.certified || false,
            lessonsLearned,
        };
        const archive = {
            id: `archive-${(0, uuid_1.v4)().slice(0, 8)}`,
            missionId,
            archivedAt: new Date(),
            execution: data.execution,
            timeline: data.timeline,
            contract: data.contract,
            memory: data.memory,
            agentStats: data.agentStats,
            summary,
        };
        this.archives.set(missionId, archive);
        this.logger.log(`Mission ${missionId} archived: ${summary.result} (quality: ${summary.qualityScore}, cost: $${summary.totalCostUsd.toFixed(2)})`);
        return archive;
    }
    getArchive(missionId) {
        return this.archives.get(missionId);
    }
    listArchives() {
        return Array.from(this.archives.values());
    }
    searchArchives(criteria) {
        return Array.from(this.archives.values()).filter(archive => {
            if (criteria.result && archive.summary.result !== criteria.result)
                return false;
            if (criteria.minQuality && archive.summary.qualityScore < criteria.minQuality)
                return false;
            if (criteria.maxCost && archive.summary.totalCostUsd > criteria.maxCost)
                return false;
            if (criteria.since && archive.archivedAt < criteria.since)
                return false;
            return true;
        });
    }
    getStatistics() {
        const archives = Array.from(this.archives.values());
        if (archives.length === 0) {
            return { totalMissions: 0, successRate: 0, averageQualityScore: 0, averageCost: 0, averageDurationMs: 0 };
        }
        const successCount = archives.filter(a => a.summary.result === 'success').length;
        const totalQuality = archives.reduce((sum, a) => sum + a.summary.qualityScore, 0);
        const totalCost = archives.reduce((sum, a) => sum + a.summary.totalCostUsd, 0);
        const totalDuration = archives.reduce((sum, a) => sum + a.summary.totalDurationMs, 0);
        return {
            totalMissions: archives.length,
            successRate: (successCount / archives.length) * 100,
            averageQualityScore: totalQuality / archives.length,
            averageCost: totalCost / archives.length,
            averageDurationMs: totalDuration / archives.length,
        };
    }
};
exports.MissionArchiveService = MissionArchiveService;
exports.MissionArchiveService = MissionArchiveService = MissionArchiveService_1 = __decorate([
    (0, common_1.Injectable)()
], MissionArchiveService);
//# sourceMappingURL=mission-archive.service.js.map