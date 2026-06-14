import { MissionCategory } from './mission-metrics.service';
export interface ReferenceMission {
    id: number;
    instruction: string;
    category: MissionCategory;
    capabilityPack: 'browser' | 'development' | 'office' | 'business' | 'certification' | 'delivery';
    difficulty: 'easy' | 'medium' | 'hard';
    expectedArtifacts: string[];
    tags: string[];
}
export declare class ReferenceMissions {
    static readonly ALL: ReferenceMission[];
    static getByPack(pack: ReferenceMission['capabilityPack']): ReferenceMission[];
    static getByCategory(category: MissionCategory): ReferenceMission[];
    static getByDifficulty(difficulty: ReferenceMission['difficulty']): ReferenceMission[];
    static getRandom(count: number): ReferenceMission[];
    static getEasy(): ReferenceMission[];
    static getStats(): {
        total: number;
        byPack: Record<string, number>;
        byDifficulty: Record<string, number>;
        byCategory: Record<string, number>;
    };
}
