/**
 * Tests for the React Query hooks in use-platform-data.
 * Focuses on: query keys and refetchInterval configuration.
 *
 * We mock useQuery so we can inspect the options passed to it
 * without needing a full QueryClient provider.
 */

import { renderHook } from '@testing-library/react';
import { useDashboardOverview, useAgentStats, useHealth } from '@/hooks/use-platform-data';

// ─── Capture useQuery calls ────────────────────────────────────────
let capturedQueryOptions: Record<string, unknown> = {};

jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: Record<string, unknown>) => {
    capturedQueryOptions = options;
    return { data: undefined, isLoading: true } as ReturnType<typeof import('@tanstack/react-query').useQuery>;
  },
}));

// ─── useDashboardOverview ──────────────────────────────────────────
describe('useDashboardOverview', () => {
  beforeEach(() => {
    capturedQueryOptions = {};
  });

  it('uses correct query key', () => {
    renderHook(() => useDashboardOverview());
    expect(capturedQueryOptions.queryKey).toEqual(['dashboard', 'overview']);
  });

  it('sets refetchInterval to 15000ms', () => {
    renderHook(() => useDashboardOverview());
    expect(capturedQueryOptions.refetchInterval).toBe(15000);
  });

  it('provides a queryFn', () => {
    renderHook(() => useDashboardOverview());
    expect(typeof capturedQueryOptions.queryFn).toBe('function');
  });
});

// ─── useAgentStats ─────────────────────────────────────────────────
describe('useAgentStats', () => {
  beforeEach(() => {
    capturedQueryOptions = {};
  });

  it('uses correct query key', () => {
    renderHook(() => useAgentStats());
    expect(capturedQueryOptions.queryKey).toEqual(['agents', 'stats']);
  });

  it('provides a queryFn', () => {
    renderHook(() => useAgentStats());
    expect(typeof capturedQueryOptions.queryFn).toBe('function');
  });

  it('does not set a custom refetchInterval', () => {
    renderHook(() => useAgentStats());
    expect(capturedQueryOptions.refetchInterval).toBeUndefined();
  });
});

// ─── useHealth ─────────────────────────────────────────────────────
describe('useHealth', () => {
  beforeEach(() => {
    capturedQueryOptions = {};
  });

  it('uses correct query key', () => {
    renderHook(() => useHealth());
    expect(capturedQueryOptions.queryKey).toEqual(['health']);
  });

  it('sets refetchInterval to 30000ms', () => {
    renderHook(() => useHealth());
    expect(capturedQueryOptions.refetchInterval).toBe(30000);
  });

  it('provides a queryFn', () => {
    renderHook(() => useHealth());
    expect(typeof capturedQueryOptions.queryFn).toBe('function');
  });
});
