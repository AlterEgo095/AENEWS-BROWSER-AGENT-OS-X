/**
 * Tests for the centralized API client.
 * Focuses on: method groups, getAuthHeaders, and localStorage interaction.
 */

// ─── localStorage mock ─────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// ─── Import after mocks are in place ────────────────────────────────
import { api, getAuthHeaders } from '@/lib/api';

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

// ─── getAuthHeaders ────────────────────────────────────────────────
describe('getAuthHeaders', () => {
  it('returns Content-Type by default', () => {
    const headers = getAuthHeaders();
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('includes Authorization when localStorage has auth_token', () => {
    localStorageMock.setItem('auth_token', 'test-jwt-token');
    const headers = getAuthHeaders();
    expect(headers['Authorization']).toBe('Bearer test-jwt-token');
  });

  it('omits Authorization when localStorage has no auth_token', () => {
    const headers = getAuthHeaders();
    expect(headers['Authorization']).toBeUndefined();
  });

  it('always includes Content-Type even when token is present', () => {
    localStorageMock.setItem('auth_token', 'another-token');
    const headers = getAuthHeaders();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Authorization']).toBe('Bearer another-token');
  });
});

// ─── ApiClient method groups ───────────────────────────────────────
describe('api (ApiClient)', () => {
  it('exposes agent methods', () => {
    expect(typeof api.getAgents).toBe('function');
    expect(typeof api.getAgentStats).toBe('function');
    expect(typeof api.getAgent).toBe('function');
    expect(typeof api.executeAgent).toBe('function');
  });

  it('exposes auth methods', () => {
    expect(typeof api.login).toBe('function');
    expect(typeof api.register).toBe('function');
  });

  it('exposes mission methods', () => {
    expect(typeof api.getMissions).toBe('function');
    expect(typeof api.getMission).toBe('function');
    expect(typeof api.createMission).toBe('function');
    expect(typeof api.startMission).toBe('function');
    expect(typeof api.pauseMission).toBe('function');
    expect(typeof api.resumeMission).toBe('function');
    expect(typeof api.cancelMission).toBe('function');
    expect(typeof api.getMissionProgress).toBe('function');
  });

  it('exposes task methods', () => {
    expect(typeof api.getTasks).toBe('function');
    expect(typeof api.createTask).toBe('function');
  });

  it('exposes event methods', () => {
    expect(typeof api.getEvents).toBe('function');
    expect(typeof api.emitEvent).toBe('function');
  });

  it('exposes health method', () => {
    expect(typeof api.getHealth).toBe('function');
  });

  it('exposes connector methods', () => {
    expect(typeof api.getConnectors).toBe('function');
    expect(typeof api.executeConnector).toBe('function');
  });

  it('exposes orchestration sub-object with expected methods', () => {
    expect(api.orchestration).toBeDefined();
    expect(typeof api.orchestration.collaborate).toBe('function');
    expect(typeof api.orchestration.decompose).toBe('function');
    expect(typeof api.orchestration.coordinate).toBe('function');
    expect(typeof api.orchestration.getClusterHealth).toBe('function');
    expect(typeof api.orchestration.getConnectors).toBe('function');
    expect(typeof api.orchestration.getStatistics).toBe('function');
    expect(typeof api.orchestration.getHistory).toBe('function');
  });

  it('exposes intelligence sub-object with expected methods', () => {
    expect(api.intelligence).toBeDefined();
    expect(typeof api.intelligence.getGraphStats).toBe('function');
    expect(typeof api.intelligence.getAgentKnowledge).toBe('function');
    expect(typeof api.intelligence.getExpertiseRanking).toBe('function');
    expect(typeof api.intelligence.getStrategyRecommendations).toBe('function');
    expect(typeof api.intelligence.submitLearningFeedback).toBe('function');
    expect(typeof api.intelligence.getLearningStats).toBe('function');
    expect(typeof api.intelligence.getLearningInsights).toBe('function');
    expect(typeof api.intelligence.transferLearning).toBe('function');
    expect(typeof api.intelligence.minePatterns).toBe('function');
    expect(typeof api.intelligence.getPatterns).toBe('function');
    expect(typeof api.intelligence.getCorrelations).toBe('function');
    expect(typeof api.intelligence.getPatternStats).toBe('function');
    expect(typeof api.intelligence.getAdaptiveConfig).toBe('function');
    expect(typeof api.intelligence.runAdaptation).toBe('function');
    expect(typeof api.intelligence.getAdaptiveStats).toBe('function');
    expect(typeof api.intelligence.emergencyReset).toBe('function');
    expect(typeof api.intelligence.getExperienceStats).toBe('function');
    expect(typeof api.intelligence.submitFeedback).toBe('function');
    expect(typeof api.intelligence.getFeedbackSummary).toBe('function');
    expect(typeof api.intelligence.getFeedbackActions).toBe('function');
    expect(typeof api.intelligence.getFeedbackStats).toBe('function');
  });

  it('exposes swarm sub-object with expected methods', () => {
    expect(api.swarm).toBeDefined();
    expect(typeof api.swarm.createSwarm).toBe('function');
    expect(typeof api.swarm.getSwarms).toBe('function');
    expect(typeof api.swarm.executeSwarm).toBe('function');
    expect(typeof api.swarm.getSwarmMetrics).toBe('function');
    expect(typeof api.swarm.initiateConsensus).toBe('function');
    expect(typeof api.swarm.runConsensus).toBe('function');
    expect(typeof api.swarm.getConsensusResults).toBe('function');
    expect(typeof api.swarm.getCollaborations).toBe('function');
    expect(typeof api.swarm.getCollaborationHistory).toBe('function');
    expect(typeof api.swarm.createCheckpoint).toBe('function');
    expect(typeof api.swarm.recoverCheckpoint).toBe('function');
    expect(typeof api.swarm.createMemorySession).toBe('function');
    expect(typeof api.swarm.getMemorySessions).toBe('function');
    expect(typeof api.swarm.writeToWorkspace).toBe('function');
    expect(typeof api.swarm.getFeedbackParams).toBe('function');
    expect(typeof api.swarm.runFeedbackCycle).toBe('function');
    expect(typeof api.swarm.getFeedbackAdjustments).toBe('function');
    expect(typeof api.swarm.rollbackAdjustment).toBe('function');
    expect(typeof api.swarm.createTopology).toBe('function');
    expect(typeof api.swarm.getTopologies).toBe('function');
    expect(typeof api.swarm.addTopologyNode).toBe('function');
    expect(typeof api.swarm.removeTopologyNode).toBe('function');
    expect(typeof api.swarm.isolateNode).toBe('function');
    expect(typeof api.swarm.restoreNode).toBe('function');
    expect(typeof api.swarm.executeDAG).toBe('function');
    expect(typeof api.swarm.getDAGResults).toBe('function');
    expect(typeof api.swarm.getDAGTrace).toBe('function');
  });
});
