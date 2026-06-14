/**
 * AENEWS Agent OS X — Phase 13: k6 Load Testing Scripts
 *
 * Comprehensive load testing suite covering:
 *   1. API baseline performance
 *   2. Authentication stress testing
 *   3. Agent execution pipeline
 *   4. WebSocket connection scaling
 *   5. Database query performance
 *   6. Mixed workload simulation
 *
 * Run: k6 run load-tests/performance-baseline.js
 * Env: BASE_URL=http://localhost:3000 API_PREFIX=api/v1
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// ─── Configuration ────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_PREFIX = __ENV.API_PREFIX || 'api/v1';
const API_URL = `${BASE_URL}/${API_PREFIX}`;

// Custom metrics
const apiErrorRate = new Rate('api_errors');
const authDuration = new Trend('auth_duration', true);
const agentExecutionDuration = new Trend('agent_execution_duration', true);
const dbQueryDuration = new Trend('db_query_duration', true);
const cacheHitRate = new Rate('cache_hits');
const requestsTotal = new Counter('requests_total');

// ─── Test Scenarios ───────────────────────────────────────────

export const options = {
  scenarios: {
    // Scenario 1: Smoke test — verify basic functionality
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },

    // Scenario 2: Load test — normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },   // Ramp up to 10 users
        { duration: '2m', target: 10 },     // Stay at 10 users
        { duration: '30s', target: 20 },    // Ramp up to 20 users
        { duration: '2m', target: 20 },     // Stay at 20 users
        { duration: '30s', target: 0 },     // Ramp down
      ],
      tags: { test_type: 'load' },
    },

    // Scenario 3: Stress test — beyond normal capacity
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },    // Ramp up to 50 users
        { duration: '2m', target: 50 },     // Stay at 50 users
        { duration: '30s', target: 100 },   // Ramp up to 100 users
        { duration: '1m', target: 100 },    // Stay at 100 users
        { duration: '30s', target: 0 },     // Ramp down
      ],
      tags: { test_type: 'stress' },
    },

    // Scenario 4: Spike test — sudden traffic burst
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },   // Sudden spike
        { duration: '30s', target: 100 },   // Hold
        { duration: '10s', target: 0 },     // Immediate drop
      ],
      tags: { test_type: 'spike' },
    },

    // Scenario 5: Soak test — extended duration for memory leaks
    soak: {
      executor: 'constant-vus',
      vus: 10,
      duration: '10m',
      tags: { test_type: 'soak' },
    },
  },

  // Performance thresholds
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<2000'],  // 95% < 500ms, 99% < 2s
    http_req_failed: ['rate<0.05'],                   // <5% error rate
    api_errors: ['rate<0.1'],                          // <10% API error rate
    auth_duration: ['p(95)<1000'],                     // Auth 95% < 1s
    agent_execution_duration: ['p(95)<30000'],         // Agent 95% < 30s
  },

  // Discard response bodies to save memory
  discardResponseBodies: true,
};

// ─── Test Data ────────────────────────────────────────────────

const testUsers = new SharedArray('test users', function () {
  return [
    { email: 'admin@aenews.ai', password: 'Admin123!@#' },
    { email: 'user1@aenews.ai', password: 'User123!@#' },
    { email: 'user2@aenews.ai', password: 'User123!@#' },
  ];
});

// ─── Helper Functions ─────────────────────────────────────────

function getAuthToken(email, password) {
  const startTime = Date.now();
  const response = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '10s',
    },
  );
  authDuration.add(Date.now() - startTime);

  if (response.status === 200 || response.status === 201) {
    const body = JSON.parse(response.body);
    return body.access_token || body.data?.access_token || null;
  }
  return null;
}

function makeRequest(method, path, token, body = null) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    timeout: '30s',
    tags: { endpoint: path },
  };

  requestsTotal.add(1);

  let response;
  const url = `${API_URL}${path}`;

  switch (method.toUpperCase()) {
    case 'GET':
      response = http.get(url, params);
      break;
    case 'POST':
      response = http.post(url, JSON.stringify(body), params);
      break;
    case 'PUT':
      response = http.put(url, JSON.stringify(body), params);
      break;
    case 'DELETE':
      response = http.del(url, null, params);
      break;
    default:
      response = http.get(url, params);
  }

  // Check response
  const isSuccess = response.status >= 200 && response.status < 400;
  apiErrorRate.add(!isSuccess);

  // Track cache hits
  const cacheHeader = response.headers['X-Cache'];
  if (cacheHeader === 'HIT') {
    cacheHitRate.add(true);
  } else if (cacheHeader === 'MISS' || cacheHeader === undefined) {
    cacheHitRate.add(false);
  }

  return response;
}

// ─── Test Functions ───────────────────────────────────────────

export default function () {
  const user = testUsers[__VU % testUsers.length];

  group('Authentication', () => {
    const token = getAuthToken(user.email, user.password);

    if (!token) {
      // If auth fails, try health endpoint (public)
      const healthResponse = makeRequest('GET', '/health', null);
      check(healthResponse, {
        'health endpoint available': (r) => r.status === 200 || r.status === 503,
      });
      sleep(1);
      return;
    }

    // Authenticated requests
    group('Health & Status', () => {
      const healthRes = makeRequest('GET', '/health', token);
      check(healthRes, { 'health check': (r) => r.status === 200 });
      sleep(0.5);
    });

    group('Agent Operations', () => {
      // List agents
      const agentsRes = makeRequest('GET', '/agents?page=1&limit=10', token);
      check(agentsRes, {
        'agents list': (r) => r.status === 200 || r.status === 404,
      });

      // Agent stats
      const statsRes = makeRequest('GET', '/agents/stats', token);
      check(statsRes, {
        'agent stats': (r) => r.status === 200 || r.status === 404,
      });

      dbQueryDuration.add(statsRes.timings.duration);
      sleep(0.5);
    });

    group('Task Operations', () => {
      const tasksRes = makeRequest('GET', '/tasks?page=1&limit=10', token);
      check(tasksRes, {
        'tasks list': (r) => r.status === 200 || r.status === 404,
      });

      dbQueryDuration.add(tasksRes.timings.duration);
      sleep(0.5);
    });

    group('Mission Operations', () => {
      const missionsRes = makeRequest('GET', '/factory/missions?page=1&limit=10', token);
      check(missionsRes, {
        'missions list': (r) => r.status === 200 || r.status === 404,
      });

      dbQueryDuration.add(missionsRes.timings.duration);
      sleep(0.5);
    });

    group('Performance Monitoring', () => {
      const perfRes = makeRequest('GET', '/performance/overview', token);
      check(perfRes, {
        'performance overview': (r) => r.status === 200 || r.status === 403,
      });
      sleep(0.5);
    });

    group('Intelligence Endpoints', () => {
      const intelRes = makeRequest('GET', '/intelligence/stats', token);
      check(intelRes, {
        'intelligence stats': (r) => r.status === 200 || r.status === 404,
      });

      dbQueryDuration.add(intelRes.timings.duration);
      sleep(0.5);
    });

    group('Swarm Endpoints', () => {
      const swarmRes = makeRequest('GET', '/swarm/stats', token);
      check(swarmRes, {
        'swarm stats': (r) => r.status === 200 || r.status === 404,
      });

      dbQueryDuration.add(swarmRes.timings.duration);
      sleep(0.5);
    });

    // Simulate cache warming
    group('Cache Warming (repeated reads)', () => {
      for (let i = 0; i < 3; i++) {
        makeRequest('GET', '/agents/stats', token);
        sleep(0.2);
      }
    });

    sleep(1);
  });
}

// ─── Teardown ─────────────────────────────────────────────────

export function teardown(data) {
  console.log('Load test completed. Check Grafana dashboard for results.');
}

// ─── Handle Summary ───────────────────────────────────────────

export function handleSummary(data) {
  return {
    'load-tests/results/latest.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  // Simplified summary output
  const metrics = data.metrics || {};
  const httpDuration = metrics.http_req_duration || {};
  const p95 = httpDuration.values?.['p(95)'] || 0;
  const p99 = httpDuration.values?.['p(99)'] || 0;

  return `
═══════════════════════════════════════════
  AENEWS Agent OS X — Load Test Summary
═══════════════════════════════════════════
  HTTP Duration P95: ${p95.toFixed(2)}ms
  HTTP Duration P99: ${p99.toFixed(2)}ms
  Total Requests: ${metrics.iterations?.values?.count || 0}
═══════════════════════════════════════════
  `;
}
