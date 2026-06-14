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
}

export const api = new ApiClient();
