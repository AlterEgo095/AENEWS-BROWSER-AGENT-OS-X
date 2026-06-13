"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MissionMetricsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionMetricsService = exports.MSR_TARGETS = exports.MissionCategory = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
var MissionCategory;
(function (MissionCategory) {
    MissionCategory["WEB_APP"] = "web_app";
    MissionCategory["LANDING_PAGE"] = "landing_page";
    MissionCategory["API"] = "api";
    MissionCategory["SAAS"] = "saas";
    MissionCategory["ECOMMERCE"] = "ecommerce";
    MissionCategory["AUTOMATION"] = "automation";
    MissionCategory["DOCUMENT"] = "document";
    MissionCategory["AUDIT"] = "audit";
    MissionCategory["DEPLOYMENT"] = "deployment";
    MissionCategory["CHATBOT"] = "chatbot";
    MissionCategory["PORTFOLIO"] = "portfolio";
    MissionCategory["TOOL"] = "tool";
    MissionCategory["OTHER"] = "other";
})(MissionCategory || (exports.MissionCategory = MissionCategory = {}));
exports.MSR_TARGETS = [
    { label: 'MVP', target: 0.7 },
    { label: 'Beta', target: 0.85 },
    { label: 'Enterprise', target: 0.95 },
    { label: 'Elite', target: 0.99 },
];
let MissionMetricsService = MissionMetricsService_1 = class MissionMetricsService {
    constructor() {
        this.logger = new common_1.Logger(MissionMetricsService_1.name);
        this.metrics = [];
        this.loaded = false;
        const metricsDir = '/home/z/my-project/download/missions/metrics';
        fs.mkdirSync(metricsDir, { recursive: true });
        this.metricsFile = path.join(metricsDir, 'mission-metrics.json');
        this.loadFromDisk();
    }
    record(metric) {
        const fullMetric = {
            ...metric,
            timestamp: new Date().toISOString(),
        };
        this.metrics.push(fullMetric);
        this.persistToDisk();
        this.logger.log(`Metrics recorded: ${metric.missionId} — ` +
            `${metric.success ? 'SUCCESS' : 'FAILED'} — ` +
            `Score: ${metric.qualityScore} — ` +
            `${metric.durationMs}ms — $${metric.costUsd.toFixed(3)} — ` +
            `MSR: ${(this.getMSR() * 100).toFixed(1)}%`);
    }
    getMSR() {
        if (this.metrics.length === 0)
            return 0;
        return this.metrics.filter((m) => m.success).length / this.metrics.length;
    }
    getCertificationRate() {
        if (this.metrics.length === 0)
            return 0;
        return this.metrics.filter((m) => m.certified).length / this.metrics.length;
    }
    getCurrentMsrTarget() {
        const msr = this.getMSR();
        for (const target of exports.MSR_TARGETS) {
            if (msr < target.target)
                return target;
        }
        return exports.MSR_TARGETS[exports.MSR_TARGETS.length - 1];
    }
    getAggregate() {
        const total = this.metrics.length;
        const successes = this.metrics.filter((m) => m.success).length;
        const certified = this.metrics.filter((m) => m.certified).length;
        const durations = this.metrics.map((m) => m.durationMs).sort((a, b) => a - b);
        const p50 = durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0;
        const p95 = durations.length > 0
            ? durations[Math.min(Math.floor(durations.length * 0.95), durations.length - 1)]
            : 0;
        const p99 = durations.length > 0
            ? durations[Math.min(Math.floor(durations.length * 0.99), durations.length - 1)]
            : 0;
        const target = this.getCurrentMsrTarget();
        return {
            totalMissions: total,
            successes,
            certified,
            msr: total > 0 ? successes / total : 0,
            certificationRate: total > 0 ? certified / total : 0,
            avgDurationMs: total > 0 ? Math.round(this.metrics.reduce((s, m) => s + m.durationMs, 0) / total) : 0,
            avgCostUsd: total > 0 ? this.metrics.reduce((s, m) => s + m.costUsd, 0) / total : 0,
            avgQualityScore: total > 0 ? this.metrics.reduce((s, m) => s + m.qualityScore, 0) / total : 0,
            totalRetries: this.metrics.reduce((s, m) => s + m.retries, 0),
            p50DurationMs: p50,
            p95DurationMs: p95,
            p99DurationMs: p99,
            byCategory: this.getCategoryBreakdown(),
            recentTrend: this.getTrend(),
            targetMsr: target.target,
            msrGap: target.target - (total > 0 ? successes / total : 0),
        };
    }
    getCategoryBreakdown() {
        const categories = {};
        for (const metric of this.metrics) {
            if (!categories[metric.category]) {
                categories[metric.category] = { metrics: [] };
            }
            categories[metric.category].metrics.push(metric);
        }
        const result = {};
        for (const [cat, data] of Object.entries(categories)) {
            const m = data.metrics;
            result[cat] = {
                total: m.length,
                successes: m.filter((x) => x.success).length,
                certified: m.filter((x) => x.certified).length,
                msr: m.length > 0 ? m.filter((x) => x.success).length / m.length : 0,
                avgDurationMs: m.length > 0 ? Math.round(m.reduce((s, x) => s + x.durationMs, 0) / m.length) : 0,
                avgCostUsd: m.length > 0 ? m.reduce((s, x) => s + x.costUsd, 0) / m.length : 0,
                avgQualityScore: m.length > 0 ? m.reduce((s, x) => s + x.qualityScore, 0) / m.length : 0,
            };
        }
        return result;
    }
    getTrend() {
        const last10 = this.metrics.slice(-10);
        const last25 = this.metrics.slice(-25);
        const last50 = this.metrics.slice(-50);
        const msr10 = last10.length > 0 ? last10.filter((m) => m.success).length / last10.length : 0;
        const msr25 = last25.length > 0 ? last25.filter((m) => m.success).length / last25.length : 0;
        const msr50 = last50.length > 0 ? last50.filter((m) => m.success).length / last50.length : 0;
        const improving = last10.length >= 5 && msr10 >= msr50;
        return { last10Msr: msr10, last25Msr: msr25, last50Msr: msr50, improving };
    }
    getRecent(count = 20) {
        return this.metrics.slice(-count);
    }
    getByCategory(category) {
        return this.metrics.filter((m) => m.category === category);
    }
    getFailures() {
        return this.metrics.filter((m) => !m.success);
    }
    getSlowest(count = 10) {
        return [...this.metrics].sort((a, b) => b.durationMs - a.durationMs).slice(0, count);
    }
    getLowestQuality(count = 10) {
        return [...this.metrics].sort((a, b) => a.qualityScore - b.qualityScore).slice(0, count);
    }
    getTotalCount() {
        return this.metrics.length;
    }
    getAllMetrics() {
        return [...this.metrics];
    }
    persistToDisk() {
        try {
            fs.writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2), 'utf-8');
        }
        catch (err) {
            this.logger.warn(`Failed to persist metrics: ${err.message}`);
        }
    }
    loadFromDisk() {
        if (this.loaded)
            return;
        this.loaded = true;
        try {
            if (fs.existsSync(this.metricsFile)) {
                const data = fs.readFileSync(this.metricsFile, 'utf-8');
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    this.metrics.push(...parsed);
                    this.logger.log(`Loaded ${parsed.length} historical metrics from disk`);
                }
            }
        }
        catch (err) {
            this.logger.warn(`Failed to load metrics from disk: ${err.message}`);
        }
    }
    static classifyMission(instruction) {
        const lower = instruction.toLowerCase();
        if (lower.includes('e-commerce') ||
            lower.includes('boutique') ||
            lower.includes('shop') ||
            lower.includes('store')) {
            return MissionCategory.ECOMMERCE;
        }
        if (lower.includes('saas') ||
            lower.includes('subscription') ||
            lower.includes('rh') ||
            lower.includes('scolaire') ||
            lower.includes('crm') ||
            lower.includes('erp')) {
            return MissionCategory.SAAS;
        }
        if (lower.includes('landing') ||
            lower.includes('page') ||
            lower.includes('portfolio') ||
            lower.includes('cv') ||
            lower.includes('vitrine')) {
            return MissionCategory.LANDING_PAGE;
        }
        if (lower.includes('portfolio') ||
            lower.includes('cv') ||
            lower.includes('resume') ||
            lower.includes('personal site')) {
            return MissionCategory.PORTFOLIO;
        }
        if (lower.includes('api') ||
            lower.includes('rest') ||
            lower.includes('graphql') ||
            lower.includes('endpoint') ||
            lower.includes('microservice')) {
            return MissionCategory.API;
        }
        if (lower.includes('chatbot') ||
            lower.includes('chat') ||
            lower.includes('bot') ||
            lower.includes('assistant')) {
            return MissionCategory.CHATBOT;
        }
        if (lower.includes('automat') ||
            lower.includes('scraper') ||
            lower.includes('crawler') ||
            lower.includes('pipeline')) {
            return MissionCategory.AUTOMATION;
        }
        if (lower.includes('audit') ||
            lower.includes('seo') ||
            lower.includes('analyz') ||
            lower.includes('report') ||
            lower.includes('scan')) {
            return MissionCategory.AUDIT;
        }
        if (lower.includes('deploy') ||
            lower.includes('docker') ||
            lower.includes('vps') ||
            lower.includes('infra') ||
            lower.includes('ci/cd')) {
            return MissionCategory.DEPLOYMENT;
        }
        if (lower.includes('document') ||
            lower.includes('pdf') ||
            lower.includes('ppt') ||
            lower.includes('readme') ||
            lower.includes('doc')) {
            return MissionCategory.DOCUMENT;
        }
        if (lower.includes('app') ||
            lower.includes('application') ||
            lower.includes('todo') ||
            lower.includes('list') ||
            lower.includes('manager') ||
            lower.includes('dashboard')) {
            return MissionCategory.WEB_APP;
        }
        if (lower.includes('tool') ||
            lower.includes('cli') ||
            lower.includes('script') ||
            lower.includes('generator') ||
            lower.includes('converter')) {
            return MissionCategory.TOOL;
        }
        return MissionCategory.OTHER;
    }
};
exports.MissionMetricsService = MissionMetricsService;
exports.MissionMetricsService = MissionMetricsService = MissionMetricsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MissionMetricsService);
//# sourceMappingURL=mission-metrics.service.js.map