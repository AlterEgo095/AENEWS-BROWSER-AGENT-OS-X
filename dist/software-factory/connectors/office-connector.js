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
var OfficeConnector_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfficeConnector = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const interfaces_1 = require("../interfaces");
const llm_helper_1 = require("./llm-helper");
let OfficeConnector = OfficeConnector_1 = class OfficeConnector {
    constructor() {
        this.supportedPack = interfaces_1.CapabilityPack.OFFICE;
        this.logger = new common_1.Logger(OfficeConnector_1.name);
        this.llm = new llm_helper_1.LLMHelper();
    }
    supports(capabilityId) {
        return OfficeConnector_1.OFFICE_CAPABILITIES.has(capabilityId);
    }
    async execute(capabilityId, input) {
        const startTime = Date.now();
        const capId = capabilityId;
        this.logger.log(`Office connector executing: ${capId} for mission ${input.missionId}`);
        try {
            let result;
            switch (capId) {
                case interfaces_1.OfficeCapability.PDF:
                    result = await this.executePdf(input);
                    break;
                case interfaces_1.OfficeCapability.DOCX:
                    result = await this.executeDocx(input);
                    break;
                case interfaces_1.OfficeCapability.EXCEL:
                    result = await this.executeExcel(input);
                    break;
                case interfaces_1.OfficeCapability.POWERPOINT:
                    result = await this.executePowerpoint(input);
                    break;
                case interfaces_1.OfficeCapability.OCR:
                    result = await this.executeOcr(input);
                    break;
                case interfaces_1.OfficeCapability.SIGNATURE:
                    result = await this.executeSignature(input);
                    break;
                case interfaces_1.OfficeCapability.EMAIL:
                    result = await this.executeEmail(input);
                    break;
                case interfaces_1.OfficeCapability.CALENDAR:
                    result = await this.executeCalendar(input);
                    break;
                default:
                    result = await this.executeGenericOffice(capId, input);
            }
            result.durationMs = Date.now() - startTime;
            return result;
        }
        catch (error) {
            this.logger.error(`Office connector failed for ${capId}: ${error.message}`);
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
    async executePdf(input) {
        const llmResult = await this.llm.call({
            systemPrompt: 'You are a professional report writer. Generate a comprehensive report in markdown that can be converted to PDF.',
            userPrompt: `Generate a professional PDF report for: "${input.instruction}"\n${input.parameters.context ? `Context: ${JSON.stringify(input.parameters.context)}` : ''}\n\nInclude: executive summary, methodology, findings, recommendations, conclusion. Use markdown formatting.`,
            maxTokens: 4096,
        });
        const docsDir = path.join(input.workspaceDir, 'docs');
        fs.mkdirSync(docsDir, { recursive: true });
        const reportPath = path.join(docsDir, 'report.md');
        fs.writeFileSync(reportPath, llmResult.content, 'utf-8');
        return {
            success: true,
            artifacts: [this.makeArtifact('report.md', 'document', reportPath, llmResult.content)],
            output: { content: llmResult.content.substring(0, 1000) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeDocx(input) {
        const llmResult = await this.llm.call({
            systemPrompt: 'You are a professional document writer. Generate a complete document with proper headings and sections.',
            userPrompt: `Generate a professional document for: "${input.instruction}"\n\nUse markdown format with clear headings (# H1, ## H2, ### H3).`,
            maxTokens: 4096,
        });
        const docsDir = path.join(input.workspaceDir, 'docs');
        fs.mkdirSync(docsDir, { recursive: true });
        const docPath = path.join(docsDir, 'document.md');
        fs.writeFileSync(docPath, llmResult.content, 'utf-8');
        return {
            success: true,
            artifacts: [this.makeArtifact('document.md', 'document', docPath, llmResult.content)],
            output: { content: llmResult.content.substring(0, 1000) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeExcel(input) {
        const llmResult = await this.llm.call({
            systemPrompt: 'You are a data analyst. Generate structured data in CSV format.',
            userPrompt: `Generate spreadsheet data for: "${input.instruction}"\n${input.parameters.schema ? `Schema: ${JSON.stringify(input.parameters.schema)}` : ''}\n\nOutput valid CSV with headers. Include at least 10 rows of realistic data.`,
            maxTokens: 4096,
        });
        const dataDir = path.join(input.workspaceDir, 'data');
        fs.mkdirSync(dataDir, { recursive: true });
        const csvPath = path.join(dataDir, 'data.csv');
        fs.writeFileSync(csvPath, llmResult.content, 'utf-8');
        return {
            success: true,
            artifacts: [this.makeArtifact('data.csv', 'source', csvPath, llmResult.content)],
            output: { content: llmResult.content.substring(0, 500) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executePowerpoint(input) {
        const llmResult = await this.llm.call({
            systemPrompt: 'You are a presentation designer. Generate a detailed presentation outline in markdown.',
            userPrompt: `Create a presentation outline for: "${input.instruction}"\n\nFormat:\n# Slide 1: Title\n- Bullet 1\n- Bullet 2\n\n# Slide 2: ...\n\nCreate 8-12 slides with clear talking points.`,
            maxTokens: 4096,
        });
        const docsDir = path.join(input.workspaceDir, 'docs');
        fs.mkdirSync(docsDir, { recursive: true });
        const pptxPath = path.join(docsDir, 'presentation.md');
        fs.writeFileSync(pptxPath, llmResult.content, 'utf-8');
        return {
            success: true,
            artifacts: [this.makeArtifact('presentation.md', 'document', pptxPath, llmResult.content)],
            output: { content: llmResult.content.substring(0, 500) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeOcr(input) {
        const filePath = input.parameters.filePath;
        if (!filePath || !fs.existsSync(filePath)) {
            return {
                success: false,
                artifacts: [],
                output: { error: 'No valid file path provided for OCR' },
                costUsd: 0,
                durationMs: 0,
                error: 'Missing filePath for OCR',
            };
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const llmResult = await this.llm.call({
            systemPrompt: 'You are an OCR specialist. Extract and clean text from this content.',
            userPrompt: `Extract and organize all text content from this file:\n\n${content.substring(0, 3000)}`,
            maxTokens: 4096,
        });
        const dataDir = path.join(input.workspaceDir, 'data');
        fs.mkdirSync(dataDir, { recursive: true });
        const ocrPath = path.join(dataDir, 'extracted-text.txt');
        fs.writeFileSync(ocrPath, llmResult.content, 'utf-8');
        return {
            success: true,
            artifacts: [this.makeArtifact('extracted-text.txt', 'document', ocrPath, llmResult.content)],
            output: { sourceFile: filePath, extractedLength: llmResult.content.length },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeSignature(input) {
        const signDir = path.join(input.workspaceDir, 'docs');
        fs.mkdirSync(signDir, { recursive: true });
        const signContent = `# Document Signature\n\n**Document:** ${input.instruction}\n**Date:** ${new Date().toISOString()}\n**Signer:** ${input.parameters.signer || 'Authorized Personnel'}\n\n---\n\n[SIGNATURE PLACEHOLDER]\n\n---\n\n*This document was generated and signed by AENEWS Software Factory*`;
        const signPath = path.join(signDir, 'signature.md');
        fs.writeFileSync(signPath, signContent, 'utf-8');
        return {
            success: true,
            artifacts: [this.makeArtifact('signature.md', 'document', signPath, signContent)],
            output: { signer: input.parameters.signer || 'Authorized Personnel' },
            costUsd: 0,
            durationMs: 0,
        };
    }
    async executeEmail(input) {
        const llmResult = await this.llm.call({
            systemPrompt: 'You are a professional email writer. Generate a well-structured email.',
            userPrompt: `Write a professional email for: "${input.instruction}"\n${input.parameters.recipient ? `To: ${input.parameters.recipient}` : ''}\n${input.parameters.tone ? `Tone: ${input.parameters.tone}` : 'professional'}\n\nInclude subject line, greeting, body, and sign-off.`,
            maxTokens: 2048,
        });
        const dataDir = path.join(input.workspaceDir, 'data');
        fs.mkdirSync(dataDir, { recursive: true });
        const emailPath = path.join(dataDir, 'email.md');
        fs.writeFileSync(emailPath, llmResult.content, 'utf-8');
        return {
            success: true,
            artifacts: [this.makeArtifact('email.md', 'document', emailPath, llmResult.content)],
            output: { content: llmResult.content.substring(0, 500) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeCalendar(input) {
        const event = {
            title: input.parameters.title || input.instruction,
            date: input.parameters.date || new Date().toISOString().split('T')[0],
            time: input.parameters.time || '10:00',
            duration: input.parameters.duration || '1h',
            location: input.parameters.location || 'Online',
            description: input.parameters.description || input.instruction,
            attendees: input.parameters.attendees || [],
        };
        const icsContent = this.generateICS(event);
        const dataDir = path.join(input.workspaceDir, 'data');
        fs.mkdirSync(dataDir, { recursive: true });
        const icsPath = path.join(dataDir, 'event.ics');
        fs.writeFileSync(icsPath, icsContent, 'utf-8');
        return {
            success: true,
            artifacts: [this.makeArtifact('event.ics', 'config', icsPath, icsContent)],
            output: { event },
            costUsd: 0,
            durationMs: 0,
        };
    }
    async executeGenericOffice(capId, input) {
        const llmResult = await this.llm.call({
            systemPrompt: 'You are a professional content generator. Create the requested content.',
            userPrompt: `Generate content for: "${capId}" — "${input.instruction}"`,
            maxTokens: 2048,
        });
        const docsDir = path.join(input.workspaceDir, 'docs');
        fs.mkdirSync(docsDir, { recursive: true });
        const docPath = path.join(docsDir, `${capId.replace('office.', '')}.md`);
        fs.writeFileSync(docPath, llmResult.content, 'utf-8');
        return {
            success: true,
            artifacts: [
                this.makeArtifact(`${capId.replace('office.', '')}.md`, 'document', docPath, llmResult.content),
            ],
            output: { content: llmResult.content.substring(0, 500) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
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
    generateICS(event) {
        const dtStart = event.date.replace(/-/g, '') + 'T' + event.time.replace(':', '') + '00';
        return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AENEWS//Software Factory//EN
BEGIN:VEVENT
DTSTART:${dtStart}
SUMMARY:${event.title}
LOCATION:${event.location}
DESCRIPTION:${event.description}
END:VEVENT
END:VCALENDAR`;
    }
};
exports.OfficeConnector = OfficeConnector;
OfficeConnector.OFFICE_CAPABILITIES = new Set(Object.values(interfaces_1.OfficeCapability));
exports.OfficeConnector = OfficeConnector = OfficeConnector_1 = __decorate([
    (0, common_1.Injectable)()
], OfficeConnector);
//# sourceMappingURL=office-connector.js.map