import { OnModuleDestroy } from '@nestjs/common';
import { IWorkingMemoryService } from '../interfaces/agent-memory.interface';
export declare class WorkingMemoryService implements IWorkingMemoryService, OnModuleDestroy {
    private readonly logger;
    private readonly store;
    private cleanupInterval;
    private static readonly DEFAULT_TTL_MS;
    private static readonly DEFAULT_MAX_ENTRIES_PER_AGENT;
    private static readonly CLEANUP_INTERVAL_MS;
    constructor();
    set<T>(agentId: string, key: string, value: T, ttlMs?: number): void;
    get<T>(agentId: string, key: string): T | null;
    delete(agentId: string, key: string): boolean;
    has(agentId: string, key: string): boolean;
    clear(agentId: string): number;
    getSize(agentId: string): number;
    cleanup(): number;
    getKeys(agentId: string): string[];
    getAllEntries<T>(agentId: string): Array<{
        key: string;
        value: T;
        accessCount: number;
        createdAt: number;
    }>;
    getStats(): {
        totalAgents: number;
        totalEntries: number;
        totalSizeBytes: number;
    };
    onModuleDestroy(): void;
    private evictLRU;
    private startCleanupTimer;
    private estimateSize;
}
