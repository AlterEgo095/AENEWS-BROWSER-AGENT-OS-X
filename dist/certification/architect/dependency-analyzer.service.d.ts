import { DependencyCycle, DependencyAnalysisResult } from '../types';
export declare class DependencyAnalyzerService {
    private readonly logger;
    private readonly srcRoot;
    constructor();
    analyze(): Promise<DependencyAnalysisResult>;
    hasCircularDependencies(): Promise<boolean>;
    getCycles(): Promise<DependencyCycle[]>;
    private scanAllFiles;
    private getAllTsFiles;
    private extractImports;
    private resolveRelativeImport;
    private toRelativePath;
    private inferCluster;
    private inferModule;
    private buildAdjacencyList;
    private detectCycles;
    private deduplicateCycles;
    private detectCrossClusterImports;
    private inferClusterFromPath;
    private isClusterUpstream;
    private detectViolations;
    private calculateCouplingScore;
}
