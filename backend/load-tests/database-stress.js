/**
 * AENEWS Agent OS X — Phase 13: Database Stress Test
 *
 * Focused load testing for database-heavy operations.
 * Tests query performance under concurrent load.
 *
 * Run: k6 run load-tests/database-stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_PREFIX = __ENV.API_PREFIX || 'api/v1';
const API_URL = `${BASE_URL}/${API_PREFIX}`;

// Custom metrics
const queryDuration = new Trend('db_query_duration_ms', true);
const writeDuration = new Trend('db_write_duration_ms', true);
const errorRate = new Rate('db_errors');
const queriesTotal = new Counter('db_queries_total');

export const options = {
  scenarios: {
    // Concurrent read operations
    concurrent_reads: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '2m', target: 20 },
        { duration: '30s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      tags: { operation: 'read' },
    },

    // Write operations (lower concurrency)
    concurrent_writes: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '2m', target: 5 },
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      tags: { operation: 'write' },
      startTime: '30s',
    },
  },

  thresholds: {
    db_query_duration_ms: ['p(95)<200', 'p(99)<500'],
    db_write_duration_ms: ['p(95)<1000', 'p(99)<3000'],
    db_errors: ['rate<0.05'],
  },

  discardResponseBodies: true,
};

function getAuthToken() {
  const response = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({ email: 'admin@aenews.ai', password: 'Admin123!@#' }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (response.status === 200 || response.status === 201) {
    const body = JSON.parse(response.body);
    return body.access_token || body.data?.access_token || null;
  }
  return null;
}

export default function () {
  const token = getAuthToken();
  if (!token) {
    sleep(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // ─── Read Operations ────────────────────────────────────────

  group('Paginated Reads', () => {
    // Test various pagination patterns
    for (const page of [1, 2, 3]) {
      const start = Date.now();
      const res = http.get(`${API_URL}/agents?page=${page}&limit=20`, { headers });
      queryDuration.add(Date.now() - start);
      queriesTotal.add(1);
      check(res, { [`agents page ${page}`]: (r) => r.status === 200 || r.status === 404 });
      sleep(0.3);
    }
  });

  group('Filtered Reads', () => {
    // Test filtered queries (should use indexes)
    const start1 = Date.now();
    const agentsByStatus = http.get(`${API_URL}/agents?status=idle`, { headers });
    queryDuration.add(Date.now() - start1);
    queriesTotal.add(1);
    check(agentsByStatus, { 'agents by status': (r) => r.status === 200 || r.status === 404 });

    const start2 = Date.now();
    const tasksByStatus = http.get(`${API_URL}/tasks?status=pending`, { headers });
    queryDuration.add(Date.now() - start2);
    queriesTotal.add(1);
    check(tasksByStatus, { 'tasks by status': (r) => r.status === 200 || r.status === 404 });

    sleep(0.3);
  });

  group('Join-Heavy Reads', () => {
    // Test queries that involve multiple table joins
    const start = Date.now();
    const missions = http.get(`${API_URL}/factory/missions?page=1&limit=10&include=contracts`, { headers });
    queryDuration.add(Date.now() - start);
    queriesTotal.add(1);
    check(missions, { 'missions with joins': (r) => r.status === 200 || r.status === 404 });

    sleep(0.3);
  });

  group('Aggregation Queries', () => {
    const start = Date.now();
    const stats = http.get(`${API_URL}/agents/stats`, { headers });
    queryDuration.add(Date.now() - start);
    queriesTotal.add(1);
    check(stats, { 'agent stats': (r) => r.status === 200 || r.status === 404 });

    sleep(0.3);
  });

  // ─── Write Operations ───────────────────────────────────────

  group('Create Operations', () => {
    const start = Date.now();
    const res = http.post(
      `${API_URL}/tasks`,
      JSON.stringify({
        type: 'load-test',
        input: { test: true, vu: __VU, iter: __ITER },
        priority: 5,
      }),
      { headers },
    );
    writeDuration.add(Date.now() - start);
    queriesTotal.add(1);

    const success = res.status === 200 || res.status === 201;
    errorRate.add(!success);
    check(res, { 'task created': (r) => success });

    sleep(0.5);
  });

  sleep(1);
}
