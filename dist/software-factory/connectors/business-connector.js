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
var BusinessConnector_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessConnector = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const interfaces_1 = require("../interfaces");
const llm_helper_1 = require("./llm-helper");
let BusinessConnector = BusinessConnector_1 = class BusinessConnector {
    constructor() {
        this.supportedPack = interfaces_1.CapabilityPack.BUSINESS;
        this.logger = new common_1.Logger(BusinessConnector_1.name);
        this.llm = new llm_helper_1.LLMHelper();
    }
    supports(capabilityId) {
        return BusinessConnector_1.BUSINESS_CAPABILITIES.has(capabilityId);
    }
    async execute(capabilityId, input) {
        const startTime = Date.now();
        const capId = capabilityId;
        this.logger.log(`Business connector executing: ${capId} for mission ${input.missionId}`);
        try {
            const systemPrompt = BusinessConnector_1.SYSTEM_PROMPTS[capId] ||
                'You are a business consultant. Generate professional business content.';
            const userPrompt = `Generate content for: "${input.instruction}"
${input.parameters.context ? `Context: ${JSON.stringify(input.parameters.context)}` : ''}
${input.parameters.target ? `Target audience: ${input.parameters.target}` : ''}
${input.parameters.industry ? `Industry: ${input.parameters.industry}` : ''}

Be specific, actionable, and professional. Use markdown formatting.`;
            const llmResult = await this.llm.call({ systemPrompt, userPrompt, maxTokens: 4096 });
            const docsDir = path.join(input.workspaceDir, 'docs', 'business');
            fs.mkdirSync(docsDir, { recursive: true });
            const fileName = `${capId.replace('business.', '')}.md`;
            const filePath = path.join(docsDir, fileName);
            fs.writeFileSync(filePath, llmResult.content, 'utf-8');
            const result = {
                success: true,
                artifacts: [this.makeArtifact(fileName, 'document', filePath, llmResult.content)],
                output: { content: llmResult.content.substring(0, 1500) },
                costUsd: llmResult.costUsd,
                durationMs: 0,
            };
            result.durationMs = Date.now() - startTime;
            return result;
        }
        catch (error) {
            this.logger.error(`Business connector failed for ${capId}: ${error.message}`);
            return {
                success: false,
                artifacts: [],
                output: { error: error.message },
                costUsd: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    makeArtifact(name, type, fullPath, content) {
        return {
            name,
            type,
            path: fullPath,
            size: Buffer.byteLength(content),
            content: content.substring(0, 500),
        };
    }
};
exports.BusinessConnector = BusinessConnector;
BusinessConnector.BUSINESS_CAPABILITIES = new Set(Object.values(interfaces_1.BusinessCapability));
BusinessConnector.SYSTEM_PROMPTS = {
    [interfaces_1.BusinessCapability.SEO]: 'You are an SEO expert. Generate comprehensive SEO strategies with keywords, meta descriptions, and optimization recommendations.',
    [interfaces_1.BusinessCapability.MARKETING]: 'You are a marketing strategist. Create detailed marketing plans with channels, budgets, timelines, and KPIs.',
    [interfaces_1.BusinessCapability.COPYWRITING]: 'You are an expert copywriter. Write compelling, persuasive content that converts.',
    [interfaces_1.BusinessCapability.BRANDING]: 'You are a brand strategist. Develop brand guidelines including voice, tone, visual direction, and positioning.',
    [interfaces_1.BusinessCapability.CRM]: 'You are a CRM specialist. Design customer relationship strategies and data structures.',
    [interfaces_1.BusinessCapability.ANALYTICS]: 'You are a data analyst. Generate analytical reports with insights, metrics, and recommendations.',
    [interfaces_1.BusinessCapability.FINANCE]: 'You are a financial analyst. Produce financial analyses with projections, risk assessments, and recommendations.',
    [interfaces_1.BusinessCapability.SALES]: 'You are a sales strategist. Create sales materials including pitch decks, objection handling, and closing strategies.',
    [interfaces_1.BusinessCapability.LEGAL]: 'You are a legal document specialist. Draft professional legal documents and contracts. Note: always include a disclaimer that this is not legal advice.',
    [interfaces_1.BusinessCapability.PARTNERSHIP]: 'You are a partnership strategist. Create partnership proposals with mutual value propositions and terms.',
};
exports.BusinessConnector = BusinessConnector = BusinessConnector_1 = __decorate([
    (0, common_1.Injectable)()
], BusinessConnector);
//# sourceMappingURL=business-connector.js.map