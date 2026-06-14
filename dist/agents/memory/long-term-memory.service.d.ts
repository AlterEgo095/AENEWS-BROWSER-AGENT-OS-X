import { OnModuleInit } from '@nestjs/common';
import { ILongTermMemoryService, LongTermMemoryEntry, MemoryQuery, MemoryQueryResult, MemoryStoreOptions } from '../interfaces/agent-memory.interface';
export declare class LongTermMemoryService implements ILongTermMemoryService, OnModuleInit {
    private readonly logger;
    private readonly records;
    private readonly agentIndex;
    private readonly tagIndex;
    private readonly fullTextIndex;
    onModuleInit(): Promise<void>;
    store<T>(agentId: string, key: string, value: T, options?: MemoryStoreOptions): Promise<LongTermMemoryEntry<T>>;
    retrieve<T>(agentId: string, key: string): Promise<LongTermMemoryEntry<T> | null>;
    query<T>(query: MemoryQuery): Promise<MemoryQueryResult<T>>;
    delete(agentId: string, key: string): Promise<boolean>;
    update<T>(agentId: string, key: string, value: Partial<T>): Promise<LongTermMemoryEntry<T> | null>;
    getKeys(agentId: string): Promise<string[]>;
    fullTextSearch<T>(searchTerm: string, options?: {
        agentId?: string;
        limit?: number;
        offset?: number;
    }): Promise<MemoryQueryResult<LongTermMemoryEntry<T>>>;
    bulkStore<T>(entries: Array<{
        agentId: string;
        key: string;
        value: T;
        options?: MemoryStoreOptions;
    }>): Promise<LongTermMemoryEntry<T>[]>;
    bulkDelete(agentId: string, keys: string[]): Promise<number>;
    deleteAllByAgent(agentId: string): Promise<number>;
    getStats(): {
        totalAgents: number;
        totalEntries: number;
        totalSizeBytes: number;
        tagsCount: number;
    };
    private recordToEntry;
    private buildFullText;
    private indexFullText;
    private deindexFullText;
    private calculateSearchScore;
}
