/**
 * AENEWS Agent OS X → PDEOS — Phase 5
 *
 * File: backend/src/modules/learning-engine/tests/learning-engine.spec.ts
 */
import { Test, TestingModule } from '@nestjs/testing';
import { LearningEngine } from '../services/learning-engine.service';
import { LLMService } from '../../llm/llm.service';

describe('LearningEngine', () => {
  let engine: LearningEngine;
  let llmService: any;
  let redis: any;

  beforeEach(async () => {
    llmService = { complete: jest.fn() };
    redis = {
      lpush: jest.fn().mockResolvedValue(1),
      ltrim: jest.fn(),
      lrange: jest.fn().mockResolvedValue([]),
      llen: jest.fn().mockResolvedValue(0),
      zadd: jest.fn(),
      hincrby: jest.fn(),
      hgetall: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      duplicate: jest.fn().mockReturnValue({
        subscribe: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningEngine,
        { provide: LLMService, useValue: llmService },
        { provide: 'REDIS_CLIENT', useValue: redis },
      ],
    }).compile();

    engine = module.get(LearningEngine);
    await engine.onModuleInit();
  });

  describe('ingestMissionResult', () => {
    it('should store experience in Redis', async () => {
      await engine.ingestMissionResult({
        missionId: 'm1',
        agentName: 'TestAgent',
        input: { prompt: 'test' },
        plan: { subtasks: [] },
        output: { result: 'ok' },
        success: true,
        durationMs: 5000,
        costUSD: 0.5,
        qualityScore: 85,
      });

      expect(redis.lpush).toHaveBeenCalledWith('learning:experiences', expect.any(String));
      expect(redis.zadd).toHaveBeenCalled();
    });
  });

  describe('findSimilarExperiences', () => {
    it('should return experiences matching input description', async () => {
      redis.lrange.mockResolvedValueOnce([
        JSON.stringify({
          id: 'exp_1', agentName: 'A', input: { prompt: 'create a react app' },
          output: {}, success: true, durationMs: 1000, costUSD: 0.5, timestamp: new Date().toISOString(),
        }),
        JSON.stringify({
          id: 'exp_2', agentName: 'A', input: { prompt: 'cook pasta' },
          output: {}, success: false, durationMs: 500, costUSD: 0.2, timestamp: new Date().toISOString(),
        }),
      ]);

      const result = await engine.findSimilarExperiences({
        inputDescription: 'create a react application',
        limit: 5,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].input.prompt).toContain('react');
    });
  });

  describe('recordFeedback', () => {
    it('should store feedback and update aggregate', async () => {
      await engine.recordFeedback({
        userId: 'u1',
        targetType: 'mission',
        targetId: 'm1',
        feedback: 'positive',
        rating: 5,
      });

      expect(redis.lpush).toHaveBeenCalledWith('learning:feedback', expect.any(String));
      expect(redis.hincrby).toHaveBeenCalledWith(
        'learning:feedback:aggregate:mission:m1', 'positive', 1,
      );
    });
  });

  describe('getAdaptiveStrategy', () => {
    it('should return defaults when insufficient history', async () => {
      redis.lrange.mockResolvedValueOnce([]);
      const strategy = await engine.getAdaptiveStrategy('NewAgent');
      expect(strategy.suggestedDepth).toBe('standard');
      expect(strategy.reasoning).toContain('Insufficient');
    });

    it('should suggest simple depth when success rate > 85%', async () => {
      redis.lrange.mockResolvedValueOnce(
        Array.from({ length: 10 }, (_, i) => JSON.stringify({
          id: `e${i}`, agentName: 'A', success: true,
          durationMs: 1000, costUSD: 0.5, timestamp: new Date().toISOString(),
          input: {}, output: {}, plan: {},
        })),
      );
      const strategy = await engine.getAdaptiveStrategy('A');
      expect(strategy.suggestedDepth).toBe('simple');
    });
  });

  describe('suggestPromptOptimization', () => {
    it('should return null when insufficient failing experiences', async () => {
      redis.lrange.mockResolvedValueOnce(
        Array.from({ length: 2 }, (_, i) => JSON.stringify({
          id: `e${i}`, success: false, agentName: 'A',
          input: {}, output: {}, durationMs: 0, costUSD: 0, timestamp: new Date().toISOString(), plan: {},
        })),
      );
      const result = await engine.suggestPromptOptimization('A');
      expect(result).toBeNull();
    });

    it('should suggest optimization when >= 3 failing experiences', async () => {
      redis.lrange.mockResolvedValueOnce(
        Array.from({ length: 5 }, (_, i) => JSON.stringify({
          id: `e${i}`, success: false, agentName: 'A',
          input: { prompt: 'test' }, output: { error: 'failed' },
          durationMs: 0, costUSD: 0, timestamp: new Date().toISOString(), plan: {},
        })),
      );
      llmService.complete.mockResolvedValueOnce({
        text: JSON.stringify({
          optimizedPrompt: 'new prompt',
          rationale: 'better',
          expectedImprovement: '20%',
        }),
      });
      const result = await engine.suggestPromptOptimization('A');
      expect(result).not.toBeNull();
      expect(result.optimizedPrompt).toBe('new prompt');
    });
  });

  describe('detectAutomationOpportunities', () => {
    it('should suggest automation when >= 3 similar missions', async () => {
      redis.lrange.mockResolvedValueOnce(
        Array.from({ length: 5 }, (_, i) => JSON.stringify({
          id: `e${i}`, input: { prompt: 'create kubernetes course' },
          agentName: 'A', success: true, durationMs: 0, costUSD: 0,
          timestamp: new Date().toISOString(), output: {}, plan: {},
        })),
      );
      const suggestions = await engine.detectAutomationOpportunities();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].potentialTimeSavedHours).toBeGreaterThan(0);
    });
  });

  describe('monthlyThresholdCalibration', () => {
    it('should calibrate thresholds based on historical data', async () => {
      redis.lrange.mockResolvedValue(
        Array.from({ length: 100 }, () => '50').concat(
          Array.from({ length: 50 }, () => '60'),
        ),
      );
      redis.get.mockResolvedValue('80');
      await engine.monthlyThresholdCalibration();
      // Should have set new threshold
      expect(redis.set).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return aggregated learning stats', async () => {
      redis.llen.mockResolvedValue(42);
      const stats = await engine.getStats();
      expect(stats.totalExperiences).toBe(42);
      expect(stats.patterns).toBe(42);
    });
  });
});
