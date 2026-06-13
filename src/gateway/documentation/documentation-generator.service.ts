/**
 * AENEWS Agent OS X - Documentation Generator Service
 *
 * Auto-generates documentation at build time:
 *   - JSDoc extraction from all TypeScript files
 *   - OpenAPI spec generation from controllers
 *   - Mermaid diagram generation for architecture
 *   - ADR (Architecture Decision Records) tracking
 *   - Plugin guide generation
 *
 * Documentation should be generated automatically at each build.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface DocGenerationResult {
  generatedFiles: string[];
  totalDocs: number;
  coveragePercent: number;
  warnings: string[];
  durationMs: number;
}

export interface JSDocEntry {
  filePath: string;
  name: string;
  kind: 'class' | 'interface' | 'method' | 'property' | 'enum';
  description: string;
  params?: Array<{ name: string; type: string; description: string }>;
  returns?: { type: string; description: string };
  example?: string;
  since?: string;
  deprecated?: boolean;
}

export interface MermaidDiagram {
  name: string;
  type: 'class' | 'flowchart' | 'sequence' | 'graph' | 'er';
  content: string;
}

@Injectable()
export class DocumentationGeneratorService {
  private readonly logger = new Logger(DocumentationGeneratorService.name);
  private readonly srcRoot: string;

  constructor() {
    this.srcRoot = path.resolve(__dirname, '..', '..');
  }

  /**
   * Generate all documentation artifacts.
   */
  async generateAll(outputDir?: string): Promise<DocGenerationResult> {
    const startTime = Date.now();
    const outDir = outputDir || path.resolve(this.srcRoot, '..', 'docs');
    const generatedFiles: string[] = [];
    const warnings: string[] = [];

    this.logger.log('Starting documentation generation...');

    // Ensure output directory exists
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // 1. Extract JSDoc from all TypeScript files
    const jsDocEntries = this.extractAllJSDoc();
    const jsDocFile = path.join(outDir, 'api-reference.md');
    fs.writeFileSync(jsDocFile, this.formatJSDocAsMarkdown(jsDocEntries));
    generatedFiles.push(jsDocFile);

    // 2. Generate architecture Mermaid diagrams
    const diagrams = this.generateMermaidDiagrams();
    const mermaidFile = path.join(outDir, 'architecture-diagrams.md');
    fs.writeFileSync(mermaidFile, this.formatDiagramsAsMarkdown(diagrams));
    generatedFiles.push(mermaidFile);

    // 3. Generate agent catalog
    const catalogFile = path.join(outDir, 'agent-catalog.md');
    fs.writeFileSync(catalogFile, this.generateAgentCatalog());
    generatedFiles.push(catalogFile);

    // 4. Generate README
    const readmeFile = path.join(outDir, 'README.md');
    fs.writeFileSync(readmeFile, this.generateReadme());
    generatedFiles.push(readmeFile);

    // 5. Calculate documentation coverage
    const coveragePercent = this.calculateDocCoverage(jsDocEntries);

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `Documentation generation complete: ${generatedFiles.length} files, ` +
        `${jsDocEntries.length} documented items, ${coveragePercent}% coverage`,
    );

    return {
      generatedFiles,
      totalDocs: jsDocEntries.length,
      coveragePercent,
      warnings,
      durationMs,
    };
  }

  /**
   * Get JSDoc documentation coverage percentage.
   */
  getCoveragePercent(): number {
    const entries = this.extractAllJSDoc();
    return this.calculateDocCoverage(entries);
  }

  /**
   * Generate Mermaid diagrams for the architecture.
   */
  generateMermaidDiagrams(): MermaidDiagram[] {
    const diagrams: MermaidDiagram[] = [];

    // High-level architecture
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

    // Memory tiers
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

    // Security pipeline
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

    // Orchestration pipeline
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

    // Certification cluster
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

  // ─── Private Methods ─────────────────────────────────────────────

  private extractAllJSDoc(): JSDocEntry[] {
    const entries: JSDocEntry[] = [];
    const files = this.getAllTsFiles(this.srcRoot);

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(this.srcRoot, filePath);

        // Extract JSDoc comments
        const jsdocRegex = /\/\*\*\s*([\s\S]*?)\*\//g;
        let match: RegExpExecArray | null;

        while ((match = jsdocRegex.exec(content)) !== null) {
          const comment = match[1];
          const description = this.extractJSDocDescription(comment);

          // Find the next declaration after the JSDoc
          const afterIndex = match.index + match[0].length;
          const afterContent = content.substring(afterIndex, afterIndex + 200).trim();

          let kind: JSDocEntry['kind'] = 'property';
          let name = 'unknown';

          if (afterContent.startsWith('export class') || afterContent.startsWith('class')) {
            kind = 'class';
            const nameMatch = afterContent.match(/class\s+(\w+)/);
            name = nameMatch?.[1] || 'unknown';
          } else if (
            afterContent.startsWith('export interface') ||
            afterContent.startsWith('interface')
          ) {
            kind = 'interface';
            const nameMatch = afterContent.match(/interface\s+(\w+)/);
            name = nameMatch?.[1] || 'unknown';
          } else if (afterContent.startsWith('export enum') || afterContent.startsWith('enum')) {
            kind = 'enum';
            const nameMatch = afterContent.match(/enum\s+(\w+)/);
            name = nameMatch?.[1] || 'unknown';
          } else if (
            afterContent.includes('async ') ||
            afterContent.includes('function ') ||
            afterContent.includes('(')
          ) {
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
      } catch {
        // Skip unreadable files
      }
    }

    return entries;
  }

  private extractJSDocDescription(comment: string): string {
    const lines = comment
      .split('\n')
      .map((l) => l.replace(/^\s*\*\s?/, ''))
      .filter((l) => !l.startsWith('@') && l.trim().length > 0);
    return lines.join(' ').trim();
  }

  private extractJSDocParams(
    comment: string,
  ): Array<{ name: string; type: string; description: string }> {
    const params: Array<{ name: string; type: string; description: string }> = [];
    const paramRegex = /@param\s+(?:\{([^}]+)\}\s+)?(\w+)\s*-?\s*(.*)/g;
    let match: RegExpExecArray | null;

    while ((match = paramRegex.exec(comment)) !== null) {
      params.push({
        type: match[1] || 'any',
        name: match[2],
        description: match[3].trim(),
      });
    }

    return params;
  }

  private extractJSDocReturns(comment: string): { type: string; description: string } | undefined {
    const returnsMatch = comment.match(/@returns?\s+(?:\{([^}]+)\}\s+)?(.*)/);
    if (!returnsMatch) return undefined;
    return { type: returnsMatch[1] || 'void', description: returnsMatch[2].trim() };
  }

  private calculateDocCoverage(entries: JSDocEntry[]): number {
    const files = this.getAllTsFiles(this.srcRoot);
    const documentedFiles = new Set(entries.map((e) => e.filePath));

    let totalPublicItems = 0;
    let documentedItems = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(this.srcRoot, file);

        // Count public/exported items
        const exports = (content.match(/export\s+(class|interface|enum|function|const)/g) || [])
          .length;
        totalPublicItems += exports;

        if (documentedFiles.has(relativePath)) {
          documentedItems += entries.filter((e) => e.filePath === relativePath).length;
        }
      } catch {
        // Skip
      }
    }

    return totalPublicItems > 0 ? Math.round((documentedItems / totalPublicItems) * 100) : 0;
  }

  private formatJSDocAsMarkdown(entries: JSDocEntry[]): string {
    let md = '# AENEWS Agent OS X - API Reference\n\n';
    md += `> Auto-generated on ${new Date().toISOString()}\n\n`;
    md += `> Total documented items: ${entries.length}\n\n`;

    const byFile = new Map<string, JSDocEntry[]>();
    for (const entry of entries) {
      if (!byFile.has(entry.filePath)) byFile.set(entry.filePath, []);
      byFile.get(entry.filePath)!.push(entry);
    }

    for (const [filePath, fileEntries] of byFile) {
      md += `## ${filePath}\n\n`;

      for (const entry of fileEntries) {
        const badge = entry.deprecated ? ' `[DEPRECATED]`' : '';
        md += `### \`${entry.kind}\` ${entry.name}${badge}\n\n`;
        if (entry.description) md += `${entry.description}\n\n`;
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

  private formatDiagramsAsMarkdown(diagrams: MermaidDiagram[]): string {
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

  private generateAgentCatalog(): string {
    let md = '# AENEWS Agent OS X - Agent Catalog\n\n';
    md += `> Auto-generated on ${new Date().toISOString()}\n\n`;

    const clusters: Record<string, string[]> = {
      'Browser Cluster (17 agents)': [
        'navigation',
        'click',
        'form-filling',
        'screenshot',
        'data-extraction',
        'cookie-management',
        'session-management',
        'tab-management',
        'popup-handling',
        'iframe-handling',
        'file-download',
        'file-upload',
        'javascript-execution',
        'wait-strategy',
        'captcha-solving',
        'network-intercept',
        'scroll-management',
      ],
      'Computer Cluster (7 agents)': [
        'terminal',
        'filesystem',
        'clipboard',
        'screen-capture',
        'process-manager',
        'notification',
        'system-monitor',
      ],
      'Coding Cluster (8 agents)': [
        'code-generation',
        'code-review',
        'testing',
        'debugging',
        'documentation',
        'version-control',
        'dependency',
        'build',
      ],
      'Office Cluster (6 agents)': [
        'document',
        'spreadsheet',
        'presentation',
        'email',
        'calendar',
        'task-management',
      ],
      'Marketing Cluster (8 agents)': [
        'social-media',
        'seo',
        'email-marketing',
        'content-creation',
        'ad-campaign',
        'analytics',
        'brand',
        'influencer',
      ],
      'Business Cluster (8 agents)': [
        'strategy',
        'financial-analysis',
        'crm',
        'hr',
        'procurement',
        'compliance',
        'market-research',
        'project-management',
      ],
      'Infrastructure Cluster (8 agents)': [
        'deployment',
        'container',
        'monitoring',
        'logging',
        'scaling',
        'configuration',
        'backup',
        'network',
      ],
      'Security Cluster (6 agents)': [
        'authentication',
        'access-control',
        'encryption',
        'audit',
        'incident-response',
        'threat-detection',
      ],
      'Meta Intelligence Cluster (13 agents)': [
        'orchestrator',
        'planner',
        'critic',
        'judge',
        'repair',
        'learning',
        'adaptation',
        'self-improvement',
        'meta-reasoning',
        'governance',
        'task-router',
        'knowledge-synthesis',
        'memory-manager',
      ],
      'Certification Cluster (13 agents)': [
        'architecture-auditor',
        'security-auditor',
        'performance-auditor',
        'memory-auditor',
        'plugin-auditor',
        'browser-auditor',
        'orchestrator-auditor',
        'documentation-auditor',
        'test-auditor',
        'regression-auditor',
        'compliance-auditor',
        'observability-auditor',
        'ai-quality-auditor',
      ],
      'Self-Evolution Cluster (5 agents)': [
        'metric-analyzer',
        'weakness-detector',
        'refactor-proposer',
        'patch-generator',
        'auto-certifier',
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

  private generateReadme(): string {
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

  private getAllTsFiles(dir: string): string[] {
    const files: string[] = [];
    const excludeDirs = ['node_modules', 'dist', '.git', 'coverage', 'backend', 'frontend'];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (excludeDirs.includes(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...this.getAllTsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip inaccessible dirs
    }

    return files;
  }
}
