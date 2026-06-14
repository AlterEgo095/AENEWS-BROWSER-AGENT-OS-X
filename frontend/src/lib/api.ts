const API_BASE = '/api/v1';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Agents
  async getAgents(params?: { cluster?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.cluster) searchParams.set('cluster', params.cluster);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<{ data: import('./types').Agent[]; total: number }>(
      `/agents${query ? `?${query}` : ''}`
    );
  }

  async getAgentStats() {
    return this.request<import('./types').ClusterStats[]>('/agents/stats');
  }

  async getAgent(id: string) {
    return this.request<import('./types').Agent>(`/agents/${id}`);
  }

  async executeAgent(id: string, data: { tenantId: string; config: Record<string, unknown> }) {
    return this.request<unknown>(`/agents/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Tasks
  async getTasks(params?: { status?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<{ data: import('./types').Task[]; total: number }>(
      `/tasks${query ? `?${query}` : ''}`
    );
  }

  async createTask(data: {
    type: string;
    tenantId: string;
    agentId?: string;
    priority?: number;
    input?: Record<string, unknown>;
  }) {
    return this.request<import('./types').Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Events
  async getEvents(params?: {
    namespace?: string;
    type?: string;
    severity?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.namespace) searchParams.set('namespace', params.namespace);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.severity) searchParams.set('severity', params.severity);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<{ data: import('./types').Event[]; total: number }>(
      `/events${query ? `?${query}` : ''}`
    );
  }

  async emitEvent(data: {
    type: string;
    namespace: string;
    payload: Record<string, unknown>;
    source: string;
    severity?: string;
  }) {
    return this.request<import('./types').Event>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Health
  async getHealth() {
    return this.request<import('./types').HealthCheckResult>('/health');
  }

  // Auth
  async login(data: { email: string; password: string }) {
    return this.request<import('./types').AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantSlug?: string;
  }) {
    return this.request<import('./types').AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Missions
  async getMissions(params?: { state?: string; priority?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.state) searchParams.set('state', params.state);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<{ data: import('./types').Mission[]; total: number }>(
      `/missions${query ? `?${query}` : ''}`
    );
  }

  async getMission(id: string) {
    return this.request<import('./types').Mission>(`/missions/${id}`);
  }

  async createMission(data: {
    name: string;
    description: string;
    priority: import('./types').MissionPriority;
    requiredCapabilities?: string[];
    constraints?: string[];
    deadline?: string;
  }) {
    return this.request<import('./types').Mission>('/missions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async startMission(id: string) {
    return this.request<import('./types').Mission>(`/missions/${id}/start`, {
      method: 'POST',
    });
  }

  async pauseMission(id: string) {
    return this.request<import('./types').Mission>(`/missions/${id}/pause`, {
      method: 'POST',
    });
  }

  async resumeMission(id: string) {
    return this.request<import('./types').Mission>(`/missions/${id}/resume`, {
      method: 'POST',
    });
  }

  async cancelMission(id: string) {
    return this.request<import('./types').Mission>(`/missions/${id}`, {
      method: 'DELETE',
    });
  }

  async getMissionProgress(id: string) {
    return this.request<{ progress: number; state: import('./types').MissionState; updatedAt: string }>(
      `/missions/${id}/progress`
    );
  }

  // Connectors
  async getConnectors() {
    return this.request<{ name: string; type: string; status: string; capabilities: string[] }[]>(
      '/connectors'
    );
  }

  async executeConnector(name: string, action: string, params?: Record<string, unknown>) {
    return this.request<unknown>(`/connectors/${name}/execute`, {
      method: 'POST',
      body: JSON.stringify({ action, params }),
    });
  }

  // Orchestration
  orchestration = {
    collaborate: (
      pattern: import('./types').CollaborationPattern,
      description: string,
      objectives: string[],
      options?: Record<string, unknown>
    ) =>
      this.request<import('./types').CollaborationResult>('/orchestration/collaborate', {
        method: 'POST',
        body: JSON.stringify({ pattern, description, objectives, ...options }),
      }),

    decompose: (
      missionId: string | null,
      description: string,
      objectives: string[],
      options?: Record<string, unknown>
    ) =>
      this.request<import('./types').DecompositionResult>('/orchestration/decompose', {
        method: 'POST',
        body: JSON.stringify({ missionId, description, objectives, ...options }),
      }),

    coordinate: (tasks: string[]) =>
      this.request<import('./types').CoordinationResult>('/orchestration/coordinate', {
        method: 'POST',
        body: JSON.stringify({ taskIds: tasks }),
      }),

    getClusterHealth: () =>
      this.request<import('./types').ClusterHealthInfo[]>('/orchestration/cluster-health'),

    getConnectors: () =>
      this.request<import('./types').UnifiedConnectorInfo[]>('/orchestration/connectors'),

    getStatistics: () =>
      this.request<import('./types').OrchestrationStatistics>('/orchestration/statistics'),

    getHistory: (type?: string, limit?: number) => {
      const searchParams = new URLSearchParams();
      if (type) searchParams.set('type', type);
      if (limit) searchParams.set('limit', String(limit));
      const query = searchParams.toString();
      return this.request<import('./types').OrchestrationHistoryItem[]>(
        `/orchestration/history${query ? `?${query}` : ''}`
      );
    },
  };

  // Phase 9 — Intelligence
  intelligence = {
    // Knowledge Graph
    getGraphStats: () =>
      this.request<{ success: boolean; data: import('./types').GraphStatistics }>('/intelligence/graph/stats'),

    getAgentKnowledge: (agentId: string) =>
      this.request<{ success: boolean; data: import('./types').ExpertiseRanking | null }>(`/intelligence/graph/agents/${agentId}`),

    getExpertiseRanking: (cluster?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (cluster) params.set('cluster', cluster);
      if (limit) params.set('limit', String(limit));
      return this.request<{ success: boolean; data: import('./types').ExpertiseRanking[] }>(
        `/intelligence/graph/expertise${params.toString() ? `?${params}` : ''}`
      );
    },

    getStrategyRecommendations: (cluster?: string, capabilities?: string) => {
      const params = new URLSearchParams();
      if (cluster) params.set('cluster', cluster);
      if (capabilities) params.set('capabilities', capabilities);
      return this.request<{ success: boolean; data: import('./types').StrategyRecommendation[] }>(
        `/intelligence/graph/recommendations${params.toString() ? `?${params}` : ''}`
      );
    },

    // Learning Engine
    submitLearningFeedback: (data: {
      agentId: string;
      missionId: string;
      outcome: string;
      durationMs: number;
      score?: number;
      strategyUsed?: string;
      capabilitiesUsed?: string[];
      context: Record<string, unknown>;
    }) =>
      this.request<{ success: boolean; data: { insightsGenerated: number } }>('/intelligence/learning/feedback', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getLearningStats: () =>
      this.request<{ success: boolean; data: import('./types').LearningStatistics }>('/intelligence/learning/stats'),

    getLearningInsights: (type?: string, minConfidence?: number) => {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (minConfidence) params.set('minConfidence', String(minConfidence));
      return this.request<{ success: boolean; data: import('./types').LearningInsight[] }>(
        `/intelligence/learning/insights${params.toString() ? `?${params}` : ''}`
      );
    },

    transferLearning: (sourceAgentId: string, targetAgentId: string) =>
      this.request<{ success: boolean; data: { transferred: number; skipped: number } }>('/intelligence/learning/transfer', {
        method: 'POST',
        body: JSON.stringify({ sourceAgentId, targetAgentId }),
      }),

    // Pattern Mining
    minePatterns: (options?: { categories?: string[]; minFrequency?: number; minConfidence?: number }) =>
      this.request<{ success: boolean; data: { patternCount: number; patterns: import('./types').DiscoveredPattern[] } }>('/intelligence/patterns/mine', {
        method: 'POST',
        body: JSON.stringify(options || {}),
      }),

    getPatterns: (category?: string, minConfidence?: number) => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (minConfidence) params.set('minConfidence', String(minConfidence));
      return this.request<{ success: boolean; data: import('./types').DiscoveredPattern[] }>(
        `/intelligence/patterns${params.toString() ? `?${params}` : ''}`
      );
    },

    getCorrelations: () =>
      this.request<{ success: boolean; data: import('./types').CorrelationFinding[] }>('/intelligence/patterns/correlations'),

    getPatternStats: () =>
      this.request<{ success: boolean; data: import('./types').PatternMiningStatistics }>('/intelligence/patterns/stats'),

    // Adaptive Strategy
    getAdaptiveConfig: () =>
      this.request<{ success: boolean; data: import('./types').AdaptiveConfig }>('/intelligence/adaptive/config'),

    runAdaptation: () =>
      this.request<{ success: boolean; data: { adaptationCount: number; applied: number } }>('/intelligence/adaptive/adapt', {
        method: 'POST',
      }),

    getAdaptiveStats: () =>
      this.request<{ success: boolean; data: import('./types').AdaptiveStatistics }>('/intelligence/adaptive/stats'),

    emergencyReset: () =>
      this.request<{ success: boolean; data: { message: string } }>('/intelligence/adaptive/reset', {
        method: 'POST',
      }),

    // Experience Replay
    getExperienceStats: () =>
      this.request<{ success: boolean; data: import('./types').ExperienceStatistics }>('/intelligence/experience/stats'),

    // Feedback
    submitFeedback: (data: {
      source: string;
      missionId: string;
      agentId?: string;
      rating?: number;
      score?: number;
      success?: boolean;
      durationMs?: number;
      comment?: string;
      context: Record<string, unknown>;
    }) =>
      this.request<{ success: boolean; data: { message: string } }>('/intelligence/feedback', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getFeedbackSummary: (cluster?: string) => {
      const params = new URLSearchParams();
      if (cluster) params.set('cluster', cluster);
      return this.request<{ success: boolean; data: import('./types').FeedbackSummary }>(
        `/intelligence/feedback/summary${params.toString() ? `?${params}` : ''}`
      );
    },

    getFeedbackActions: (priority?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (priority) params.set('priority', priority);
      if (limit) params.set('limit', String(limit));
      return this.request<{ success: boolean; data: import('./types').ActionItem[] }>(
        `/intelligence/feedback/actions${params.toString() ? `?${params}` : ''}`
      );
    },

    getFeedbackStats: () =>
      this.request<{ success: boolean; data: import('./types').FeedbackStatistics }>('/intelligence/feedback/stats'),
  };

  // Phase 10 — Swarm Intelligence
  swarm = {
    // Swarm Service
    createSwarm: (data: { name: string; objective: string; topology: import('./types').SwarmTopologyType; agentIds: string[] }) =>
      this.request<{ success: boolean; data: import('./types').SwarmInfo }>('/swarm/create', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getSwarms: () =>
      this.request<{ success: boolean; data: import('./types').SwarmInfo[] }>('/swarm/list'),

    executeSwarm: (id: string) =>
      this.request<{ success: boolean; data: import('./types').SwarmInfo }>(`/swarm/${id}/execute`, {
        method: 'POST',
      }),

    getSwarmMetrics: () =>
      this.request<{ success: boolean; data: import('./types').SwarmMetrics }>('/swarm/metrics'),

    // Consensus Service
    initiateConsensus: (data: { topic: string; proposerId: string; participantIds: string[]; consensusThreshold?: number }) =>
      this.request<{ success: boolean; data: import('./types').ConsensusSession }>('/swarm/consensus/initiate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    runConsensus: (id: string) =>
      this.request<{ success: boolean; data: import('./types').ConsensusSession }>(`/swarm/consensus/${id}/run`, {
        method: 'POST',
      }),

    getConsensusResults: () =>
      this.request<{ success: boolean; data: import('./types').ConsensusSession[] }>('/swarm/consensus/results'),

    // Persistence Service
    getCollaborations: () =>
      this.request<{ success: boolean; data: import('./types').CollaborationSession[] }>('/swarm/persistence/collaborations'),

    getCollaborationHistory: () =>
      this.request<{ success: boolean; data: import('./types').CollaborationSession[] }>('/swarm/persistence/history'),

    createCheckpoint: (collaborationId: string, label: string) =>
      this.request<{ success: boolean; data: import('./types').Checkpoint }>(`/swarm/persistence/${collaborationId}/checkpoint`, {
        method: 'POST',
        body: JSON.stringify({ label }),
      }),

    recoverCheckpoint: (collaborationId: string, checkpointId: string) =>
      this.request<{ success: boolean; data: import('./types').CollaborationSession }>(`/swarm/persistence/${collaborationId}/recover`, {
        method: 'POST',
        body: JSON.stringify({ checkpointId }),
      }),

    // Working Memory Service
    createMemorySession: (data: { name: string; participants: string[] }) =>
      this.request<{ success: boolean; data: import('./types').WorkingMemorySession }>('/swarm/memory/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getMemorySessions: () =>
      this.request<{ success: boolean; data: import('./types').WorkingMemorySession[] }>('/swarm/memory/sessions'),

    writeToWorkspace: (sessionId: string, key: string, value: unknown) =>
      this.request<{ success: boolean; data: { message: string } }>(`/swarm/memory/sessions/${sessionId}/workspace`, {
        method: 'PUT',
        body: JSON.stringify({ key, value }),
      }),

    // Feedback Loop Service
    getFeedbackParams: () =>
      this.request<{ success: boolean; data: import('./types').FeedbackLoopParams }>('/swarm/feedback/params'),

    runFeedbackCycle: () =>
      this.request<{ success: boolean; data: import('./types').FeedbackCycleResult }>('/swarm/feedback/cycle', {
        method: 'POST',
      }),

    getFeedbackAdjustments: () =>
      this.request<{ success: boolean; data: import('./types').FeedbackAdjustment[] }>('/swarm/feedback/adjustments'),

    rollbackAdjustment: (adjustmentId: string) =>
      this.request<{ success: boolean; data: { message: string } }>(`/swarm/feedback/adjustments/${adjustmentId}/rollback`, {
        method: 'POST',
      }),

    // Topology Service
    createTopology: (data: { name: string; type: import('./types').SwarmTopologyType; nodeCount: number }) =>
      this.request<{ success: boolean; data: import('./types').TopologyInfo }>('/swarm/topology/create', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getTopologies: () =>
      this.request<{ success: boolean; data: import('./types').TopologyInfo[] }>('/swarm/topology/list'),

    addTopologyNode: (topologyId: string, agentId: string) =>
      this.request<{ success: boolean; data: import('./types').TopologyInfo }>(`/swarm/topology/${topologyId}/nodes`, {
        method: 'POST',
        body: JSON.stringify({ agentId }),
      }),

    removeTopologyNode: (topologyId: string, nodeId: string) =>
      this.request<{ success: boolean; data: import('./types').TopologyInfo }>(`/swarm/topology/${topologyId}/nodes/${nodeId}`, {
        method: 'DELETE',
      }),

    isolateNode: (topologyId: string, nodeId: string) =>
      this.request<{ success: boolean; data: { message: string } }>(`/swarm/topology/${topologyId}/nodes/${nodeId}/isolate`, {
        method: 'POST',
      }),

    restoreNode: (topologyId: string, nodeId: string) =>
      this.request<{ success: boolean; data: { message: string } }>(`/swarm/topology/${topologyId}/nodes/${nodeId}/restore`, {
        method: 'POST',
      }),

    // DAG Orchestrator Service
    executeDAG: (data: { name: string; nodes: Array<{ id: string; label: string; agentId?: string }>; edges: Array<{ source: string; target: string; condition?: string }> }) =>
      this.request<{ success: boolean; data: import('./types').DAGExecution }>('/swarm/dag/execute', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getDAGResults: () =>
      this.request<{ success: boolean; data: import('./types').DAGExecution[] }>('/swarm/dag/results'),

    getDAGTrace: (executionId: string) =>
      this.request<{ success: boolean; data: import('./types').DAGTrace }>(`/swarm/dag/${executionId}/trace`),
  };
}

export const api = new ApiClient();
