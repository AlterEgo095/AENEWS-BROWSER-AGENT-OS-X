"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SkillGraphService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillGraphService = exports.SkillLevel = void 0;
const common_1 = require("@nestjs/common");
var SkillLevel;
(function (SkillLevel) {
    SkillLevel["NOVICE"] = "novice";
    SkillLevel["COMPETENT"] = "competent";
    SkillLevel["PROFICIENT"] = "proficient";
    SkillLevel["EXPERT"] = "expert";
    SkillLevel["MASTER"] = "master";
})(SkillLevel || (exports.SkillLevel = SkillLevel = {}));
const SKILL_LEVEL_ORDER = {
    [SkillLevel.NOVICE]: 0,
    [SkillLevel.COMPETENT]: 1,
    [SkillLevel.PROFICIENT]: 2,
    [SkillLevel.EXPERT]: 3,
    [SkillLevel.MASTER]: 4,
};
const SKILL_LEVELS_ASC = [
    SkillLevel.NOVICE,
    SkillLevel.COMPETENT,
    SkillLevel.PROFICIENT,
    SkillLevel.EXPERT,
    SkillLevel.MASTER,
];
const WEIGHT_SKILL_LEVEL = 0.3;
const WEIGHT_SUCCESS_RATE = 0.25;
const WEIGHT_COST_EFFICIENCY = 0.2;
const WEIGHT_LATENCY_EFFICIENCY = 0.15;
const WEIGHT_IMPROVEMENT_TREND = 0.1;
let SkillGraphService = SkillGraphService_1 = class SkillGraphService {
    constructor() {
        this.logger = new common_1.Logger(SkillGraphService_1.name);
        this.profiles = new Map();
        this.maxHistoryPerSkill = 200;
        this.smoothingFactor = 0.3;
    }
    registerSkillProfile(agentId) {
        const existing = this.profiles.get(agentId);
        if (existing) {
            this.logger.warn(`Skill profile already exists for agent ${agentId}`);
            return existing;
        }
        const profile = {
            agentId,
            skills: new Map(),
            overallScore: 0,
            lastUpdated: new Date(),
        };
        this.profiles.set(agentId, profile);
        this.logger.log(`Registered skill profile for agent ${agentId}`);
        return profile;
    }
    updateSkill(agentId, skillName, executionResult) {
        let profile = this.profiles.get(agentId);
        if (!profile) {
            profile = this.registerSkillProfile(agentId);
        }
        let skill = profile.skills.get(skillName);
        if (!skill) {
            skill = {
                name: skillName,
                level: SkillLevel.NOVICE,
                costPerExecution: executionResult.cost,
                avgLatencyMs: executionResult.latencyMs,
                successRate: executionResult.success ? 1 : 0,
                executionCount: 1,
                lastExecutedAt: new Date(),
                improvementTrend: 0,
                history: [],
            };
        }
        else {
            const n = skill.executionCount;
            const alpha = this.smoothingFactor;
            skill.avgLatencyMs = alpha * executionResult.latencyMs + (1 - alpha) * skill.avgLatencyMs;
            const successBinary = executionResult.success ? 1 : 0;
            skill.successRate = alpha * successBinary + (1 - alpha) * skill.successRate;
            skill.costPerExecution = alpha * executionResult.cost + (1 - alpha) * skill.costPerExecution;
            skill.executionCount = n + 1;
            skill.lastExecutedAt = new Date();
            skill.improvementTrend = this.calculateImprovementTrend(skill.history, executionResult);
            skill.level = this.evaluateSkillLevel(skill);
        }
        const historyEntry = {
            timestamp: new Date(),
            success: executionResult.success,
            latencyMs: executionResult.latencyMs,
            cost: executionResult.cost,
        };
        skill.history.push(historyEntry);
        if (skill.history.length > this.maxHistoryPerSkill) {
            skill.history = skill.history.slice(skill.history.length - this.maxHistoryPerSkill);
        }
        profile.skills.set(skillName, skill);
        profile.overallScore = this.calculateOverallScore(profile);
        profile.lastUpdated = new Date();
        this.logger.debug(`Updated skill "${skillName}" for agent ${agentId} → level=${skill.level}, ` +
            `successRate=${skill.successRate.toFixed(3)}, executions=${skill.executionCount}`);
        return skill;
    }
    getSkillProfile(agentId) {
        return this.profiles.get(agentId) ?? null;
    }
    getSkill(agentId, skillName) {
        return this.profiles.get(agentId)?.skills.get(skillName) ?? null;
    }
    getBestAgent(criteria) {
        const candidates = [];
        const excludeSet = new Set(criteria.excludeAgentIds ?? []);
        let maxCost = 0;
        let maxLatency = 0;
        const profileEntries = Array.from(this.profiles.entries());
        for (const [agentId, profile] of profileEntries) {
            if (excludeSet.has(agentId))
                continue;
            const skill = profile.skills.get(criteria.requiredSkill);
            if (!skill)
                continue;
            if (criteria.minLevel &&
                SKILL_LEVEL_ORDER[skill.level] < SKILL_LEVEL_ORDER[criteria.minLevel]) {
                continue;
            }
            if (criteria.maxCost !== undefined && skill.costPerExecution > criteria.maxCost) {
                continue;
            }
            if (criteria.maxLatencyMs !== undefined && skill.avgLatencyMs > criteria.maxLatencyMs) {
                continue;
            }
            if (criteria.minSuccessRate !== undefined && skill.successRate < criteria.minSuccessRate) {
                continue;
            }
            if (skill.costPerExecution > maxCost)
                maxCost = skill.costPerExecution;
            if (skill.avgLatencyMs > maxLatency)
                maxLatency = skill.avgLatencyMs;
            candidates.push({
                agentId,
                skill,
                totalScore: 0,
                breakdown: {
                    skillLevelScore: 0,
                    successRateScore: 0,
                    costEfficiencyScore: 0,
                    latencyEfficiencyScore: 0,
                    improvementTrendScore: 0,
                },
            });
        }
        if (maxCost === 0)
            maxCost = 1;
        if (maxLatency === 0)
            maxLatency = 1;
        for (const candidate of candidates) {
            const skill = candidate.skill;
            const skillLevelScore = SKILL_LEVEL_ORDER[skill.level] / (SKILL_LEVELS_ASC.length - 1);
            const successRateScore = skill.successRate;
            const costEfficiencyScore = 1 - skill.costPerExecution / maxCost;
            const latencyEfficiencyScore = 1 - skill.avgLatencyMs / maxLatency;
            const improvementTrendScore = (skill.improvementTrend + 1) / 2;
            candidate.breakdown = {
                skillLevelScore,
                successRateScore,
                costEfficiencyScore,
                latencyEfficiencyScore,
                improvementTrendScore,
            };
            candidate.totalScore =
                WEIGHT_SKILL_LEVEL * skillLevelScore +
                    WEIGHT_SUCCESS_RATE * successRateScore +
                    WEIGHT_COST_EFFICIENCY * costEfficiencyScore +
                    WEIGHT_LATENCY_EFFICIENCY * latencyEfficiencyScore +
                    WEIGHT_IMPROVEMENT_TREND * improvementTrendScore;
            if (criteria.preferAgentId && candidate.agentId === criteria.preferAgentId) {
                candidate.totalScore += 0.05;
            }
        }
        candidates.sort((a, b) => b.totalScore - a.totalScore);
        this.logger.debug(`getBestAgent("${criteria.requiredSkill}"): ${candidates.length} candidates, ` +
            `top=${candidates[0]?.agentId ?? 'none'} (${candidates[0]?.totalScore.toFixed(3) ?? '-'})`);
        return candidates;
    }
    compareAgents(agentIds, skillName) {
        const result = {};
        for (const agentId of agentIds) {
            result[agentId] = this.getSkill(agentId, skillName);
        }
        return result;
    }
    getSkillGraph() {
        const nodes = [];
        const profileEntries = Array.from(this.profiles.entries());
        for (const [agentId, profile] of profileEntries) {
            const skills = {};
            const skillEntries = Array.from(profile.skills.entries());
            for (const [skillName, entry] of skillEntries) {
                skills[skillName] = {
                    level: entry.level,
                    successRate: entry.successRate,
                    executionCount: entry.executionCount,
                    avgLatencyMs: entry.avgLatencyMs,
                    costPerExecution: entry.costPerExecution,
                    improvementTrend: entry.improvementTrend,
                };
            }
            nodes.push({
                agentId,
                overallScore: profile.overallScore,
                skills,
            });
        }
        return nodes;
    }
    predictExecution(agentId, skillName) {
        const skill = this.getSkill(agentId, skillName);
        if (!skill || skill.executionCount === 0) {
            return null;
        }
        const n = skill.executionCount;
        const confidence = Math.min(1, Math.log10(n + 1) / Math.log10(101));
        const recentCount = Math.max(1, Math.floor(skill.history.length / 2));
        const recentHistory = skill.history.slice(-recentCount);
        const recentAvgLatency = recentHistory.reduce((sum, h) => sum + h.latencyMs, 0) / recentHistory.length;
        const trendAdjustment = 1 - skill.improvementTrend * 0.1;
        const estimatedLatencyMs = recentAvgLatency * trendAdjustment;
        const recentAvgCost = recentHistory.reduce((sum, h) => sum + h.cost, 0) / recentHistory.length;
        const recentSuccessRate = recentHistory.filter((h) => h.success).length / recentHistory.length;
        const successProbability = Math.min(1, Math.max(0, recentSuccessRate + skill.improvementTrend * 0.05));
        return {
            estimatedLatencyMs: Math.round(estimatedLatencyMs * 100) / 100,
            estimatedCost: Math.round(recentAvgCost * 10000) / 10000,
            successProbability: Math.round(successProbability * 1000) / 1000,
            confidence: Math.round(confidence * 1000) / 1000,
        };
    }
    getSkillRecommendations(agentId) {
        const profile = this.profiles.get(agentId);
        if (!profile) {
            this.logger.warn(`No profile found for agent ${agentId}`);
            return [];
        }
        const recommendations = [];
        const skillEntries = Array.from(profile.skills.entries());
        for (const [skillName, skill] of skillEntries) {
            const reasons = [];
            let priority = 'low';
            if (skill.successRate < 0.5) {
                reasons.push(`Very low success rate (${(skill.successRate * 100).toFixed(1)}%)`);
                priority = 'high';
            }
            else if (skill.successRate < 0.6) {
                reasons.push(`Low success rate (${(skill.successRate * 100).toFixed(1)}%)`);
                priority = 'high';
            }
            else if (skill.successRate < 0.75) {
                reasons.push(`Below-target success rate (${(skill.successRate * 100).toFixed(1)}%)`);
                if (priority !== 'high')
                    priority = 'medium';
            }
            if (skill.improvementTrend < -0.2) {
                reasons.push(`Declining performance (trend=${skill.improvementTrend.toFixed(2)})`);
                if (priority === 'low')
                    priority = 'medium';
            }
            if (skill.executionCount > 5 &&
                (skill.level === SkillLevel.NOVICE || skill.level === SkillLevel.COMPETENT)) {
                reasons.push(`Skill level "${skill.level}" despite ${skill.executionCount} executions`);
                if (priority === 'low')
                    priority = 'medium';
            }
            if (reasons.length > 0) {
                recommendations.push({
                    skillName,
                    currentLevel: skill.level,
                    currentSuccessRate: skill.successRate,
                    reason: reasons.join('; '),
                    priority,
                });
            }
        }
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        return recommendations;
    }
    decayInactiveSkills(decayThresholdMs) {
        const now = Date.now();
        const decayed = [];
        const profileEntries = Array.from(this.profiles.entries());
        for (const [agentId, profile] of profileEntries) {
            const skillEntries = Array.from(profile.skills.entries());
            for (const [skillName, skill] of skillEntries) {
                if (!skill.lastExecutedAt)
                    continue;
                const elapsed = now - skill.lastExecutedAt.getTime();
                if (elapsed < decayThresholdMs)
                    continue;
                if (skill.level === SkillLevel.NOVICE) {
                    skill.successRate = Math.max(0, skill.successRate - 0.05);
                    skill.improvementTrend = Math.max(-1, skill.improvementTrend - 0.05);
                    continue;
                }
                const previousLevel = skill.level;
                const currentIdx = SKILL_LEVEL_ORDER[skill.level];
                const newLevel = SKILL_LEVELS_ASC[Math.max(0, currentIdx - 1)];
                skill.level = newLevel;
                skill.successRate = Math.max(0, skill.successRate - 0.05);
                skill.improvementTrend = Math.max(-1, skill.improvementTrend - 0.1);
                decayed.push({ agentId, skillName, previousLevel, newLevel });
                this.logger.debug(`Decayed skill "${skillName}" for agent ${agentId}: ${previousLevel} → ${newLevel}`);
            }
            profile.overallScore = this.calculateOverallScore(profile);
            profile.lastUpdated = new Date();
        }
        if (decayed.length > 0) {
            this.logger.log(`Decayed ${decayed.length} inactive skill(s)`);
        }
        return decayed;
    }
    calculateImprovementTrend(history, latestResult) {
        const allEntries = [
            ...history,
            {
                timestamp: new Date(),
                success: latestResult.success,
                latencyMs: latestResult.latencyMs,
                cost: latestResult.cost,
            },
        ];
        if (allEntries.length < 2) {
            return 0;
        }
        const splitIdx = Math.floor(allEntries.length * 0.7);
        const older = allEntries.slice(0, splitIdx);
        const newer = allEntries.slice(splitIdx);
        if (older.length === 0 || newer.length === 0) {
            return 0;
        }
        const olderSuccessRate = older.filter((h) => h.success).length / older.length;
        const newerSuccessRate = newer.filter((h) => h.success).length / newer.length;
        const trend = Math.max(-1, Math.min(1, newerSuccessRate - olderSuccessRate));
        return Math.round(trend * 1000) / 1000;
    }
    evaluateSkillLevel(skill) {
        const { executionCount, successRate, level: currentLevel } = skill;
        const currentIdx = SKILL_LEVEL_ORDER[currentLevel];
        const upgradeThresholds = [
            { requiredCount: 100, requiredRate: 0.95, targetLevel: SkillLevel.MASTER },
            { requiredCount: 50, requiredRate: 0.85, targetLevel: SkillLevel.EXPERT },
            { requiredCount: 25, requiredRate: 0.75, targetLevel: SkillLevel.PROFICIENT },
            { requiredCount: 10, requiredRate: 0.6, targetLevel: SkillLevel.COMPETENT },
        ];
        for (const threshold of upgradeThresholds) {
            if (SKILL_LEVEL_ORDER[threshold.targetLevel] > currentIdx &&
                executionCount >= threshold.requiredCount &&
                successRate > threshold.requiredRate) {
                this.logger.log(`Skill "${skill.name}" upgraded: ${currentLevel} → ${threshold.targetLevel}`);
                return threshold.targetLevel;
            }
        }
        const downgradeThresholds = [
            { minRate: 0.55, floorLevel: SkillLevel.COMPETENT },
            { minRate: 0.7, floorLevel: SkillLevel.PROFICIENT },
            { minRate: 0.8, floorLevel: SkillLevel.EXPERT },
            { minRate: 0.9, floorLevel: SkillLevel.MASTER },
        ];
        for (const threshold of downgradeThresholds) {
            if (successRate < threshold.minRate && currentIdx > SKILL_LEVEL_ORDER[threshold.floorLevel]) {
                const downgraded = threshold.floorLevel;
                this.logger.log(`Skill "${skill.name}" downgraded: ${currentLevel} → ${downgraded} (successRate=${(successRate * 100).toFixed(1)}%)`);
                return downgraded;
            }
        }
        return currentLevel;
    }
    calculateOverallScore(profile) {
        if (profile.skills.size === 0)
            return 0;
        let total = 0;
        const skillValues = Array.from(profile.skills.values());
        for (const skill of skillValues) {
            const levelNorm = SKILL_LEVEL_ORDER[skill.level] / (SKILL_LEVELS_ASC.length - 1);
            const skillScore = 0.5 * levelNorm + 0.5 * skill.successRate;
            total += skillScore;
        }
        return Math.round((total / profile.skills.size) * 1000) / 1000;
    }
};
exports.SkillGraphService = SkillGraphService;
exports.SkillGraphService = SkillGraphService = SkillGraphService_1 = __decorate([
    (0, common_1.Injectable)()
], SkillGraphService);
//# sourceMappingURL=skill-graph.service.js.map