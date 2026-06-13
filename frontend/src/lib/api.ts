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
}

export const api = new ApiClient();
