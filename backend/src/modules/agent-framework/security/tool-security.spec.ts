/**
 * AENEWS Agent OS X — Tool Security Module Unit Tests
 *
 * Tests for blockedToolsForOwner(), isToolAllowed(), validateToolAccess(),
 * filterAllowedTools(), and getToolAccessSummary().
 */

import {
  blockedToolsForOwner,
  isToolAllowed,
  validateToolAccess,
  filterAllowedTools,
  getToolAccessSummary,
  NON_ADMIN_BLOCKED_TOOLS,
  OPERATOR_BLOCKED_TOOLS,
  VIEWER_BLOCKED_TOOLS,
} from './tool-security';
import { HttpException, HttpStatus } from '@nestjs/common';

// ─── blockedToolsForOwner ─────────────────────────────────────────

describe('blockedToolsForOwner', () => {
  it('should return empty set for super_admin', () => {
    const result = blockedToolsForOwner('super_admin');
    expect(result.size).toBe(0);
  });

  it('should return NON_ADMIN_BLOCKED_TOOLS for tenant_admin', () => {
    const result = blockedToolsForOwner('tenant_admin');
    expect(result).toEqual(NON_ADMIN_BLOCKED_TOOLS);
    // Should include dangerous tools like shell, bash, etc.
    expect(result.has('shell')).toBe(true);
    expect(result.has('bash')).toBe(true);
    expect(result.has('python')).toBe(true);
  });

  it('should return OPERATOR_BLOCKED_TOOLS for operator', () => {
    const result = blockedToolsForOwner('operator');
    expect(result).toEqual(OPERATOR_BLOCKED_TOOLS);
    // Should include NON_ADMIN_BLOCKED_TOOLS plus admin tools
    expect(result.has('shell')).toBe(true);
    expect(result.has('user_management')).toBe(true);
    expect(result.has('role_management')).toBe(true);
  });

  it('should return VIEWER_BLOCKED_TOOLS for viewer', () => {
    const result = blockedToolsForOwner('viewer');
    expect(result).toEqual(VIEWER_BLOCKED_TOOLS);
    // Should be the most restrictive set
    expect(result.has('shell')).toBe(true);
    expect(result.has('execute_mission')).toBe(true);
    expect(result.has('create')).toBe(true);
  });

  it('should return VIEWER_BLOCKED_TOOLS for unknown roles', () => {
    const result = blockedToolsForOwner('unknown_role');
    expect(result).toEqual(VIEWER_BLOCKED_TOOLS);
  });

  it('should return VIEWER_BLOCKED_TOOLS for empty string role', () => {
    const result = blockedToolsForOwner('');
    expect(result).toEqual(VIEWER_BLOCKED_TOOLS);
  });

  it('should have increasing restriction levels: super_admin < tenant_admin < operator < viewer', () => {
    const superAdmin = blockedToolsForOwner('super_admin');
    const tenantAdmin = blockedToolsForOwner('tenant_admin');
    const operator = blockedToolsForOwner('operator');
    const viewer = blockedToolsForOwner('viewer');

    expect(superAdmin.size).toBeLessThan(tenantAdmin.size);
    expect(tenantAdmin.size).toBeLessThan(operator.size);
    expect(operator.size).toBeLessThan(viewer.size);
  });
});

// ─── isToolAllowed ───────────────────────────────────────────────

describe('isToolAllowed', () => {
  describe('super_admin', () => {
    it('should allow all tools for super_admin', () => {
      expect(isToolAllowed('shell', 'super_admin')).toBe(true);
      expect(isToolAllowed('bash', 'super_admin')).toBe(true);
      expect(isToolAllowed('python', 'super_admin')).toBe(true);
      expect(isToolAllowed('read_file', 'super_admin')).toBe(true);
      expect(isToolAllowed('docker', 'super_admin')).toBe(true);
    });

    it('should allow safe tools for super_admin', () => {
      expect(isToolAllowed('search', 'super_admin')).toBe(true);
      expect(isToolAllowed('chat', 'super_admin')).toBe(true);
    });
  });

  describe('viewer', () => {
    it('should block dangerous tools for viewer', () => {
      expect(isToolAllowed('shell', 'viewer')).toBe(false);
      expect(isToolAllowed('bash', 'viewer')).toBe(false);
      expect(isToolAllowed('python', 'viewer')).toBe(false);
      expect(isToolAllowed('read_file', 'viewer')).toBe(false);
      expect(isToolAllowed('write_file', 'viewer')).toBe(false);
      expect(isToolAllowed('docker', 'viewer')).toBe(false);
    });

    it('should block execution tools for viewer', () => {
      expect(isToolAllowed('execute_mission', 'viewer')).toBe(false);
      expect(isToolAllowed('start_mission', 'viewer')).toBe(false);
      expect(isToolAllowed('create', 'viewer')).toBe(false);
      expect(isToolAllowed('update', 'viewer')).toBe(false);
      expect(isToolAllowed('delete', 'viewer')).toBe(false);
    });

    it('should block browser control for viewer', () => {
      expect(isToolAllowed('browser_navigate', 'viewer')).toBe(false);
      expect(isToolAllowed('browser_click', 'viewer')).toBe(false);
    });
  });

  describe('operator', () => {
    it('should block shell tools for operator', () => {
      expect(isToolAllowed('shell', 'operator')).toBe(false);
      expect(isToolAllowed('bash', 'operator')).toBe(false);
    });

    it('should block admin management tools for operator', () => {
      expect(isToolAllowed('user_management', 'operator')).toBe(false);
      expect(isToolAllowed('role_management', 'operator')).toBe(false);
      expect(isToolAllowed('tenant_management', 'operator')).toBe(false);
    });

    it('should allow execution tools for operator', () => {
      expect(isToolAllowed('execute_mission', 'operator')).toBe(true);
      expect(isToolAllowed('start_mission', 'operator')).toBe(true);
    });
  });

  it('should perform case-insensitive tool name matching', () => {
    expect(isToolAllowed('Shell', 'viewer')).toBe(false);
    expect(isToolAllowed('SHELL', 'viewer')).toBe(false);
    expect(isToolAllowed('Bash', 'viewer')).toBe(false);
  });

  it('should allow unknown tools for super_admin', () => {
    expect(isToolAllowed('custom_tool', 'super_admin')).toBe(true);
  });

  it('should allow unknown safe tools for viewer', () => {
    expect(isToolAllowed('read_status', 'viewer')).toBe(true);
    expect(isToolAllowed('view_report', 'viewer')).toBe(true);
  });
});

// ─── validateToolAccess ──────────────────────────────────────────

describe('validateToolAccess', () => {
  it('should not throw for allowed tool/role combination', () => {
    expect(() => validateToolAccess('shell', 'super_admin')).not.toThrow();
    expect(() => validateToolAccess('search', 'viewer')).not.toThrow();
  });

  it('should throw FORBIDDEN for blocked tool/role combination', () => {
    expect(() => validateToolAccess('shell', 'viewer')).toThrow(HttpException);
  });

  it('should throw HttpException with FORBIDDEN status', () => {
    try {
      validateToolAccess('shell', 'viewer');
      fail('Expected HttpException to be thrown');
    } catch (e: any) {
      expect(e).toBeInstanceOf(HttpException);
      expect(e.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(e.message).toContain('shell');
      expect(e.message).toContain('viewer');
    }
  });

  it('should throw FORBIDDEN for operator accessing admin tools', () => {
    expect(() => validateToolAccess('user_management', 'operator')).toThrow(HttpException);
    try {
      validateToolAccess('user_management', 'operator');
      fail('Expected HttpException');
    } catch (e: any) {
      expect(e.getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });

  it('should include helpful message about elevated privileges', () => {
    try {
      validateToolAccess('docker', 'viewer');
      fail('Expected HttpException');
    } catch (e: any) {
      expect(e.message).toContain('elevated privileges');
    }
  });
});

// ─── filterAllowedTools ──────────────────────────────────────────

describe('filterAllowedTools', () => {
  it('should return all tools for super_admin', () => {
    const tools = ['shell', 'bash', 'search', 'python', 'chat'];
    const result = filterAllowedTools(tools, 'super_admin');
    expect(result).toEqual(tools);
  });

  it('should filter out blocked tools for viewer', () => {
    const tools = ['shell', 'bash', 'search', 'python', 'chat', 'execute_mission'];
    const result = filterAllowedTools(tools, 'viewer');
    expect(result).not.toContain('shell');
    expect(result).not.toContain('bash');
    expect(result).not.toContain('python');
    expect(result).not.toContain('execute_mission');
    expect(result).toContain('search');
    expect(result).toContain('chat');
  });

  it('should filter out shell tools for operator but allow execution tools', () => {
    const tools = ['shell', 'bash', 'execute_mission', 'start_mission', 'search'];
    const result = filterAllowedTools(tools, 'operator');
    expect(result).not.toContain('shell');
    expect(result).not.toContain('bash');
    expect(result).toContain('execute_mission');
    expect(result).toContain('start_mission');
    expect(result).toContain('search');
  });

  it('should handle empty tool list', () => {
    const result = filterAllowedTools([], 'viewer');
    expect(result).toEqual([]);
  });

  it('should handle all-blocked tools', () => {
    const tools = ['shell', 'bash', 'python', 'docker'];
    const result = filterAllowedTools(tools, 'viewer');
    expect(result).toEqual([]);
  });

  it('should handle all-allowed tools', () => {
    const tools = ['search', 'chat', 'view_report'];
    const result = filterAllowedTools(tools, 'viewer');
    expect(result).toEqual(tools);
  });

  it('should be case-insensitive', () => {
    const tools = ['Shell', 'BASH', 'Search'];
    const result = filterAllowedTools(tools, 'viewer');
    expect(result).not.toContain('Shell');
    expect(result).not.toContain('BASH');
    expect(result).toContain('Search');
  });
});

// ─── getToolAccessSummary ────────────────────────────────────────

describe('getToolAccessSummary', () => {
  it('should return correct summary for super_admin', () => {
    const summary = getToolAccessSummary('super_admin');
    expect(summary.role).toBe('super_admin');
    expect(summary.blockedCount).toBe(0);
    expect(summary.blockedTools).toEqual([]);
  });

  it('should return correct summary for viewer', () => {
    const summary = getToolAccessSummary('viewer');
    expect(summary.role).toBe('viewer');
    expect(summary.blockedCount).toBeGreaterThan(0);
    expect(summary.blockedCount).toBe(VIEWER_BLOCKED_TOOLS.size);
    expect(summary.totalBlockedTools).toBe(VIEWER_BLOCKED_TOOLS.size);
  });

  it('should sort blocked tools alphabetically', () => {
    const summary = getToolAccessSummary('viewer');
    const sorted = [...summary.blockedTools].sort();
    expect(summary.blockedTools).toEqual(sorted);
  });

  it('should return increasing blocked counts for decreasing privilege', () => {
    const superAdmin = getToolAccessSummary('super_admin');
    const tenantAdmin = getToolAccessSummary('tenant_admin');
    const operator = getToolAccessSummary('operator');
    const viewer = getToolAccessSummary('viewer');

    expect(superAdmin.blockedCount).toBeLessThan(tenantAdmin.blockedCount);
    expect(tenantAdmin.blockedCount).toBeLessThan(operator.blockedCount);
    expect(operator.blockedCount).toBeLessThan(viewer.blockedCount);
  });
});
