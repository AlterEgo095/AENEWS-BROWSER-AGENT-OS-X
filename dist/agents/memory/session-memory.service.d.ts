import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISessionMemoryService } from '../interfaces/agent-memory.interface';
export declare class SessionMemoryService implements ISessionMemoryService, OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private redisClient;
    private readonly store;
    private cleanupInterval;
    private static readonly DEFAULT_TTL_MS;
    private static readonly CLEANUP_INTERVAL_MS;
    private static readonly KEY_PREFIX;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    private initializeRedis;
    set<T>(agentId: string, sessionId: string, key: string, value: T, ttlMs?: number): Promise<void>;
    get<T>(agentId: string, sessionId: string, key: string): Promise<T | null>;
    delete(agentId: string, sessionId: string, key: string): Promise<boolean>;
    getSessionKeys(agentId: string, sessionId: string): Promise<string[]>;
    clearSession(agentId: string, sessionId: string): Promise<number>;
    getAgentSessions(agentId: string): Promise<string[]>;
    setBatch(agentId: string, sessionId: string, entries: Array<{
        key: string;
        value: any;
        ttlMs?: number;
    }>): Promise<void>;
    getBatch<T>(agentId: string, sessionId: string, keys: string[]): Promise<Map<string, T | null>>;
    getSessionContext<T>(agentId: string, sessionId: string): Promise<Map<string, T>>;
    extendTtl(agentId: string, sessionId: string, key: string, additionalMs: number): Promise<boolean>;
    extendSessionTtl(agentId: string, sessionId: string, additionalMs: number): Promise<number>;
    cleanup(): number;
    getStats(): {
        totalSessions: number;
        totalEntries: number;
        totalSizeBytes: number;
        connectedToRedis: boolean;
    };
    private composeKey;
    private startCleanupTimer;
}
