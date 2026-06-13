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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMHelper = void 0;
const common_1 = require("@nestjs/common");
class LLMHelper {
    constructor() {
        this.logger = new common_1.Logger(LLMHelper.name);
        this.zaiInstance = null;
        this.callCount = 0;
    }
    async call(options) {
        await this.ensureInitialized();
        const maxRetries = options.retries ?? 3;
        let lastError = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const completion = await this.zaiInstance.chat.completions.create({
                    messages: [
                        { role: 'system', content: options.systemPrompt },
                        { role: 'user', content: options.userPrompt },
                    ],
                    temperature: options.temperature ?? 0.3,
                    max_tokens: options.maxTokens ?? 4096,
                });
                const content = completion.choices?.[0]?.message?.content;
                if (!content)
                    throw new Error('Empty LLM response');
                this.callCount++;
                return {
                    content,
                    costUsd: this.estimateCost(options.userPrompt, content),
                    retries: attempt,
                };
            }
            catch (err) {
                lastError = err;
                const isRateLimit = err.message?.includes('429') || err.message?.includes('rate');
                if (isRateLimit && attempt < maxRetries - 1) {
                    const delayMs = Math.pow(2, attempt) * 3000;
                    this.logger.warn(`Rate limited, retrying in ${delayMs / 1000}s... (${attempt + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
                this.logger.warn(`LLM call failed (attempt ${attempt + 1}): ${err.message}`);
            }
        }
        throw new Error(`LLM call failed after ${maxRetries} retries: ${lastError?.message}`);
    }
    parseJSON(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }
        catch {
            return null;
        }
    }
    parseGeneratedFiles(response) {
        const files = new Map();
        const fileRegex = /===FILE:\s*(.+?)===\s*\n([\s\S]*?)===ENDFILE===/g;
        let match;
        while ((match = fileRegex.exec(response)) !== null) {
            const filePath = match[1].trim();
            const content = match[2].trim();
            if (filePath && content)
                files.set(filePath, content);
        }
        if (files.size > 0)
            return files;
        const codeBlockRegex = /```(\w*?)\s*\n([\s\S]*?)```/g;
        const langMap = {
            html: 'index.html', css: 'style.css', javascript: 'app.js', js: 'app.js',
            typescript: 'app.ts', ts: 'app.ts', python: 'app.py', json: 'package.json',
            yaml: 'docker-compose.yml', yml: 'docker-compose.yml', dockerfile: 'Dockerfile',
            bash: 'start.sh', sh: 'start.sh', sql: 'schema.sql', md: 'README.md',
        };
        while ((match = codeBlockRegex.exec(response)) !== null) {
            const lang = match[1].trim().toLowerCase();
            const content = match[2].trim();
            if (!content || content.length < 10)
                continue;
            const before = response.substring(Math.max(0, match.index - 200), match.index);
            const nameMatch = before.match(/(\S+\.\w+)/);
            const fileName = nameMatch?.[1] || langMap[lang];
            if (fileName && !files.has(fileName)) {
                files.set(fileName, content);
            }
        }
        return files;
    }
    getCallCount() {
        return this.callCount;
    }
    async ensureInitialized() {
        if (this.zaiInstance)
            return;
        try {
            const sdk = await Promise.resolve().then(() => __importStar(require('z-ai-web-dev-sdk')));
            const ZAIClass = sdk.default || sdk;
            this.zaiInstance = await ZAIClass.create();
        }
        catch (err) {
            throw new Error(`z-ai-web-dev-sdk not available: ${err.message}`);
        }
    }
    estimateCost(prompt, response) {
        const promptTokens = Math.ceil(prompt.length / 4);
        const responseTokens = Math.ceil(response.length / 4);
        return (promptTokens + responseTokens) * 0.00001;
    }
}
exports.LLMHelper = LLMHelper;
//# sourceMappingURL=llm-helper.js.map