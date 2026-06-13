import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IKnowledgeGraphService, KnowledgeNode, KnowledgeRelationship, KnowledgeGraphQuery, KnowledgeGraphResult } from '../interfaces/agent-memory.interface';
export declare class KnowledgeGraphService implements IKnowledgeGraphService, OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private neo4jDriver;
    private readonly nodes;
    private readonly relationships;
    private readonly labelIndex;
    private readonly relationshipTypeIndex;
    private readonly sourceNodeIndex;
    private readonly targetNodeIndex;
    private readonly schema;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private initializeDriver;
    addNode(label: string, properties: Record<string, any>): Promise<KnowledgeNode>;
    getNode(id: string): Promise<KnowledgeNode | null>;
    updateNode(id: string, properties: Record<string, any>): Promise<KnowledgeNode | null>;
    deleteNode(id: string): Promise<boolean>;
    addRelationship(type: string, sourceId: string, targetId: string, properties?: Record<string, any>): Promise<KnowledgeRelationship>;
    getRelationship(id: string): Promise<KnowledgeRelationship | null>;
    deleteRelationship(id: string): Promise<boolean>;
    query(query: KnowledgeGraphQuery): Promise<KnowledgeGraphResult>;
    traverse(startNodeId: string, depth: number, relationshipType?: string): Promise<KnowledgeGraphResult>;
    findPath(startNodeId: string, endNodeId: string, maxDepth?: number, relationshipType?: string): Promise<KnowledgeGraphResult>;
    getSchema(): {
        labels: string[];
        relationshipTypes: string[];
        propertyIndexes: Record<string, string[]>;
    };
    addPropertyIndex(label: string, propertyName: string): void;
    executeCypher(query: string, params?: Record<string, any>): Promise<any[]>;
    getStats(): {
        totalNodes: number;
        totalRelationships: number;
        labels: number;
        relationshipTypes: number;
        connectedToNeo4j: boolean;
    };
    private matchesProperties;
    private sanitizeLabel;
    private removeRelationshipIndexes;
    private executeNeo4jQuery;
    private executeInMemoryCypher;
}
