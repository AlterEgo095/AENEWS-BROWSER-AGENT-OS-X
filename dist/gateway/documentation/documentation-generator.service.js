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
var DocumentationGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentationGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let DocumentationGeneratorService = DocumentationGeneratorService_1 = class DocumentationGeneratorService {
    constructor() {
        this.logger = new common_1.Logger(DocumentationGeneratorService_1.name);
        this.srcRoot = path.resolve(__dirname, '..', '..');
    }
    async generateAll(outputDir) {
        const startTime = Date.now();
        const outDir = outputDir || path.resolve(this.srcRoot, '..', 'docs');
        const generatedFiles = [];
        const warnings = [];
        this.logger.log('Starting documentation generation...');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        const jsDocEntries = this.extractAllJSDoc();
        const jsDocFile = path.join(outDir, 'api-reference.md');
        fs.writeFileSync(jsDocFile, this.formatJSDocAsMarkdown(jsDocEntries));
        generatedFiles.push(jsDocFile);
        const diagrams = this.generateMermaidDiagrams();
        const mermaidFile = path.join(outDir, 'architecture-diagrams.md');
        fs.writeFileSync(mermaidFile, this.formatDiagramsAsMarkdown(diagrams));
        generatedFiles.push(mermaidFile);
        const catalogFile = path.join(outDir, 'agent-catalog.md');
        fs.writeFileSync(catalogFile, this.generateAgentCatalog());
        generatedFiles.push(catalogFile);
        const readmeFile = path.join(outDir, 'README.md');
        fs.writeFileSync(readmeFile, this.generateReadme());
        generatedFiles.push(readmeFile);
        const coveragePercent = this.calculateDocCoverage(jsDocEntries);
        const durationMs = Date.now() - startTime;
        this.logger.log(`Documentation generation complete: ${generatedFiles.length} files, ` +
            `${jsDocEntries.length} documented items, ${coveragePercent}% coverage`);
        return {
            generatedFiles,
            totalDocs: jsDocEntries.length,
            coveragePercent,
            warnings,
            durationMs,
        };
    }
    getCoveragePercent() {
        const entries = this.extractAllJSDoc();
        return this.calculateDocCoverage(entries);
    }
    generateMermaidDiagrams() {
        const diagrams = [];
        diagrams.push({
            name: 'System Architecture',
            type: 'graph',
            content: `graph TB
    subgraph Gateways
        MG[Memory Gateway]
        SG[Security Gateway]
        DG[Documentation Gateway]
    end
    subgraph Core
        ORC[Orchestrator]
        REG[Agent Registry]
        EBS[Event Bus]
    end
    subgraph Clusters
        BR[Browser Cluster - 17 agents]
        CO[Computer Cluster - 7 agents]
        CD[Coding Cluster - 8 agents]
        OF[Office Cluster - 6 agents]
        MK[Marketing Cluster - 8 agents]
        BU[Business Cluster - 8 agents]
        IN[Infrastructure Cluster - 8 agents]
        SC[Security Cluster - 6 agents]
        MI[Meta Intelligence Cluster - 13 agents]
        CC[Certification Cluster - 13 agents]
        SE[Self-Evolution Cluster - 5 agents]
    end
    subgraph Infrastructure
        PG[(PostgreSQL)]
        RD[(Redis)]
        MQ[RabbitMQ]
        NE[(Neo4j)]
        QD[(Qdrant)]
        MN[(MinIO)]
    end
    ORC --> REG
    ORC --> EBS
    ORC --> MG
    ORC --> SG
    MG --> PG
    MG --> RD
    MG --> NE
    MG --> QD
    EBS --> MQ
    Clusters --> ORC
    Clusters --> MG
    Clusters --> SG`,
        });
        diagrams.push({
            name: 'Memory Tier Architecture',
            type: 'graph',
            content: `graph TD
    AG[Agent] --> GW[Memory Gateway]
    GW --> WM[Working Memory]
    GW --> SM[Session Memory]
    GW --> CM[Conversation Memory]
    GW --> LM[Long-term Memory]
    GW --> SEM[Semantic Memory]
    GW --> KG[Knowledge Graph - Neo4j]
    GW --> VS[Vector Search - Qdrant]
    GW --> AR[Archive Store]
    WM --> |promote| SM
    SM --> |promote| LM
    LM --> |promote| SEM
    SEM --> |archive| AR`,
        });
        diagrams.push({
            name: 'Security Gateway Pipeline',
            type: 'flowchart',
            content: `flowchart TD
    IN[Input] --> IV[Input Validation]
    IV --> SZ[Sanitization]
    SZ --> PE[Policy Engine]
    PE --> PM[Permission Engine]
    PM --> RL[Rate Limiter]
    RL --> EX[Execution]
    RL --> BL[Blocked]
    PE --> BL`,
        });
        diagrams.push({
            name: 'Orchestration Pipeline',
            type: 'flowchart',
            content: `flowchart LR
    DEC[Decomposer] --> PLA[Planner]
    PLA --> EXE[Executor]
    EXE --> CRI[Critic]
    CRI --> |pass| VAL[Validator]
    CRI --> |fail| REP[Repair]
    REP --> EXE
    VAL --> DEL[Delivery]`,
        });
        diagrams.push({
            name: 'Certification Cluster',
            type: 'graph',
            content: `graph TB
    CR[Certification Runner] --> EA[EQI Calculator]
    CR --> AA[Architecture Auditor]
    CR --> TA[Test Auditor]
    CR --> OA[Orchestrator Auditor]
    CR --> BA[Browser Auditor]
    CR --> MA[Memory Auditor]
    CR --> SA[Security Auditor]
    CR --> PA[Performance Auditor]
    CR --> DA[Documentation Auditor]
    CR --> OB[Observability Auditor]
    CR --> RA[Regression Auditor]
    CR --> CA[Compliance Auditor]
    CR --> AIQ[AI Quality Auditor]
    CR --> PLA[Plugin Auditor]`,
        });
        return diagrams;
    }
    extractAllJSDoc() {
        const entries = [];
        const files = this.getAllTsFiles(this.srcRoot);
        for (const filePath of files) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const relativePath = path.relative(this.srcRoot, filePath);
                const jsdocRegex = /\/\*\*\s*([\s\S]*?)\*\//g;
                let match;
                while ((match = jsdocRegex.exec(content)) !== null) {
                    const comment = match[1];
                    const description = this.extractJSDocDescription(comment);
                    const afterIndex = match.index + match[0].length;
                    const afterContent = content.substring(afterIndex, afterIndex + 200).trim();
                    let kind = 'property';
                    let name = 'unknown';
                    if (afterContent.startsWith('export class') || afterContent.startsWith('class')) {
                        kind = 'class';
                        const nameMatch = afterContent.match(/class\s+(\w+)/);
                        name = nameMatch?.[1] || 'unknown';
                    }
                    else if (afterContent.startsWith('export interface') || afterContent.startsWith('interface')) {
                        kind = 'interface';
                        const nameMatch = afterContent.match(/interface\s+(\w+)/);
                        name = nameMatch?.[1] || 'unknown';
                    }
                    else if (afterContent.startsWith('export enum') || afterContent.startsWith('enum')) {
                        kind = 'enum';
                        const nameMatch = afterContent.match(/enum\s+(\w+)/);
                        name = nameMatch?.[1] || 'unknown';
                    }
                    else if (afterContent.includes('async ') || afterContent.includes('function ') || afterContent.includes('(')) {
                        kind = 'method';
                        const nameMatch = afterContent.match(/(?:async\s+)?(\w+)\s*\(/);
                        name = nameMatch?.[1] || 'unknown';
                    }
                    entries.push({
                        filePath: relativePath,
                        name,
                        kind,
                        description,
                        params: this.extractJSDocParams(comment),
                        returns: this.extractJSDocReturns(comment),
                        deprecated: comment.includes('@deprecated'),
                    });
                }
            }
            catch {
            }
        }
        return entries;
    }
    extractJSDocDescription(comment) {
        const lines = comment
            .split('\n')
            .map((l) => l.replace(/^\s*\*\s?/, ''))
            .filter((l) => !l.startsWith('@') && l.trim().length > 0);
        return lines.join(' ').trim();
    }
    extractJSDocParams(comment) {
        const params = [];
        const paramRegex = /@param\s+(?:\{([^}]+)\}\s+)?(\w+)\s*-?\s*(.*)/g;
        let match;
        while ((match = paramRegex.exec(comment)) !== null) {
            params.push({
                type: match[1] || 'any',
                name: match[2],
                description: match[3].trim(),
            });
        }
        return params;
    }
    extractJSDocReturns(comment) {
        const returnsMatch = comment.match(/@returns?\s+(?:\{([^}]+)\}\s+)?(.*)/);
        if (!returnsMatch)
            return undefined;
        return { type: returnsMatch[1] || 'void', description: returnsMatch[2].trim() };
    }
    calculateDocCoverage(entries) {
        const files = this.getAllTsFiles(this.srcRoot);
        const documentedFiles = new Set(entries.map((e) => e.filePath));
        let totalPublicItems = 0;
        let documentedItems = 0;
        for (const file of files) {
            try {
                const content = fs.readFileSync(file, 'utf-8');
                const relativePath = path.relative(this.srcRoot, file);
                const exports = (content.match(/export\s+(class|interface|enum|function|const)/g) || []).length;
                totalPublicItems += exports;
                if (documentedFiles.has(relativePath)) {
                    documentedItems += entries.filter((e) => e.filePath === relativePath).length;
                }
            }
            catch {
            }
        }
        return totalPublicItems > 0 ? Math.round((documentedItems / totalPublicItems) * 100) : 0;
    }
    formatJSDocAsMarkdown(entries) {
        let md = '# AENEWS Agent OS X - API Reference\n\n';
        md += `> Auto-generated on ${new Date().toISOString()}\n\n`;
        md += `> Total documented items: ${entries.length}\n\n`;
        const byFile = new Map();
        for (const entry of entries) {
            if (!byFile.has(entry.filePath))
                byFile.set(entry.filePath, []);
            byFile.get(entry.filePath).push(entry);
        }
        for (const [filePath, fileEntries] of byFile) {
            md += `## ${filePath}\n\n`;
            for (const entry of fileEntries) {
                const badge = entry.deprecated ? ' `[DEPRECATED]`' : '';
                md += `### \`${entry.kind}\` ${entry.name}${badge}\n\n`;
                if (entry.description)
                    md += `${entry.description}\n\n`;
                if (entry.params && entry.params.length > 0) {
                    md += '**Parameters:**\n\n';
                    for (const param of entry.params) {
                        md += `- \`${param.name}\` (\`${param.type}\`) - ${param.description}\n`;
                    }
                    md += '\n';
                }
                if (entry.returns) {
                    md += `**Returns:** \`${entry.returns.type}\` - ${entry.returns.description}\n\n`;
                }
            }
        }
        return md;
    }
    formatDiagramsAsMarkdown(diagrams) {
        let md = '# AENEWS Agent OS X - Architecture Diagrams\n\n';
        md += `> Auto-generated on ${new Date().toISOString()}\n\n`;
        for (const diagram of diagrams) {
            md += `## ${diagram.name}\n\n`;
            md += '```mermaid\n';
            md += diagram.content;
            md += '\n```\n\n';
        }
        return md;
    }
    generateAgentCatalog() {
        let md = '# AENEWS Agent OS X - Agent Catalog\n\n';
        md += `> Auto-generated on ${new Date().toISOString()}\n\n`;
        const clusters = {
            'Browser Cluster (17 agents)': [
                'navigation', 'click', 'form-filling', 'screenshot', 'data-extraction',
                'cookie-management', 'session-management', 'tab-management', 'popup-handling',
                'iframe-handling', 'file-download', 'file-upload', 'javascript-execution',
                'wait-strategy', 'captcha-solving', 'network-intercept', 'scroll-management',
            ],
            'Computer Cluster (7 agents)': [
                'terminal', 'filesystem', 'clipboard', 'screen-capture', 'process-manager',
                'notification', 'system-monitor',
            ],
            'Coding Cluster (8 agents)': [
                'code-generation', 'code-review', 'testing', 'debugging', 'documentation',
                'version-control', 'dependency', 'build',
            ],
            'Office Cluster (6 agents)': [
                'document', 'spreadsheet', 'presentation', 'email', 'calendar', 'task-management',
            ],
            'Marketing Cluster (8 agents)': [
                'social-media', 'seo', 'email-marketing', 'content-creation', 'ad-campaign',
                'analytics', 'brand', 'influencer',
            ],
            'Business Cluster (8 agents)': [
                'strategy', 'financial-analysis', 'crm', 'hr', 'procurement', 'compliance',
                'market-research', 'project-management',
            ],
            'Infrastructure Cluster (8 agents)': [
                'deployment', 'container', 'monitoring', 'logging', 'scaling',
                'configuration', 'backup', 'network',
            ],
            'Security Cluster (6 agents)': [
                'authentication', 'access-control', 'encryption', 'audit',
                'incident-response', 'threat-detection',
            ],
            'Meta Intelligence Cluster (13 agents)': [
                'orchestrator', 'planner', 'critic', 'judge', 'repair',
                'learning', 'adaptation', 'self-improvement', 'meta-reasoning',
                'governance', 'task-router', 'knowledge-synthesis', 'memory-manager',
            ],
            'Certification Cluster (13 agents)': [
                'architecture-auditor', 'security-auditor', 'performance-auditor',
                'memory-auditor', 'plugin-auditor', 'browser-auditor',
                'orchestrator-auditor', 'documentation-auditor', 'test-auditor',
                'regression-auditor', 'compliance-auditor', 'observability-auditor',
                'ai-quality-auditor',
            ],
            'Self-Evolution Cluster (5 agents)': [
                'metric-analyzer', 'weakness-detector', 'refactor-proposer',
                'patch-generator', 'auto-certifier',
            ],
        };
        let totalAgents = 0;
        for (const [clusterName, agents] of Object.entries(clusters)) {
            totalAgents += agents.length;
            md += `## ${clusterName}\n\n`;
            for (const agent of agents) {
                md += `- **${agent}-agent** — \`${agent}\` capability\n`;
            }
            md += '\n';
        }
        md += `---\n\n**Total Agents: ${totalAgents}**\n`;
        return md;
    }
    generateReadme() {
        return `# AENEWS Agent OS X

## Enterprise Autonomous Browser Platform

AENEWS Agent OS X is an enterprise-grade autonomous browser platform built on NestJS + TypeScript.
It comprises **96 agents** across **11 clusters**, with a unified Memory Gateway,
Security Gateway, and automated EQI certification system.

## Architecture

\`\`\`
Gateways:  Memory Gateway | Security Gateway | Documentation Gateway
Core:      Orchestrator | Agent Registry | Event Bus | Communication
Clusters:  Browser | Computer | Coding | Office | Marketing | Business
           Infrastructure | Security | Meta Intelligence | Certification | Self-Evolution
Storage:   PostgreSQL | Redis | Neo4j | Qdrant | MinIO | RabbitMQ
\`\`\`

## EQI Certification

| Domain         | Weight |
|----------------|--------|
| Architecture   | 8%     |
| Agents         | 12%    |
| Orchestration  | 15%    |
| Browser        | 10%    |
| Memory         | 12%    |
| Security       | 15%    |
| Performance    | 8%     |
| Tests          | 10%    |
| Documentation  | 5%     |
| Observability  | 5%     |

### Certification Levels

| Level     | EQI  |
|-----------|------|
| Platinum  | >=98%|
| Gold      | >=95%|
| Silver    | >=90%|
| Refused   | <90% |

## Quick Start

\`\`\`bash
npm install
docker-compose up -d
npm run start:dev
\`\`\`

## Running Certification

\`\`\`bash
curl http://localhost:3000/certification/run
\`\`\`

## Governance Rule

No commit, no merge, no new phase until the current phase produces
an automatic certification report with EQI >= target level.

---
*Auto-generated by AENEWS Documentation Generator on ${new Date().toISOString()}*
`;
    }
    getAllTsFiles(dir) {
        const files = [];
        const excludeDirs = ['node_modules', 'dist', '.git', 'coverage', 'backend', 'frontend'];
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (excludeDirs.includes(entry.name))
                    continue;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    files.push(...this.getAllTsFiles(fullPath));
                }
                else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
                    files.push(fullPath);
                }
            }
        }
        catch {
        }
        return files;
    }
};
exports.DocumentationGeneratorService = DocumentationGeneratorService;
exports.DocumentationGeneratorService = DocumentationGeneratorService = DocumentationGeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DocumentationGeneratorService);
//# sourceMappingURL=documentation-generator.service.js.map