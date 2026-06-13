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
    params?: Array<{
        name: string;
        type: string;
        description: string;
    }>;
    returns?: {
        type: string;
        description: string;
    };
    example?: string;
    since?: string;
    deprecated?: boolean;
}
export interface MermaidDiagram {
    name: string;
    type: 'class' | 'flowchart' | 'sequence' | 'graph' | 'er';
    content: string;
}
export declare class DocumentationGeneratorService {
    private readonly logger;
    private readonly srcRoot;
    constructor();
    generateAll(outputDir?: string): Promise<DocGenerationResult>;
    getCoveragePercent(): number;
    generateMermaidDiagrams(): MermaidDiagram[];
    private extractAllJSDoc;
    private extractJSDocDescription;
    private extractJSDocParams;
    private extractJSDocReturns;
    private calculateDocCoverage;
    private formatJSDocAsMarkdown;
    private formatDiagramsAsMarkdown;
    private generateAgentCatalog;
    private generateReadme;
    private getAllTsFiles;
}
