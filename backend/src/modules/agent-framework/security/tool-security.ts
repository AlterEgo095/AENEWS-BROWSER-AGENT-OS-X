/**
 * AENEWS Agent OS X — Tool Security Module
 *
 * Controls which tools/capabilities are available to different user roles.
 * Prevents privilege escalation by restricting dangerous tools (shell access,
 * file I/O, code execution) to admin-level users only.
 *
 * Security model:
 * - SUPER_ADMIN: Access to all tools
 * - TENANT_ADMIN: Access to all tools except system-level admin tools
 * - OPERATOR: Access to operational tools, no shell/file/admin tools
 * - VIEWER: Read-only tools only (no execution, no write)
 */

import { HttpException, HttpStatus } from '@nestjs/common';

// ─── Tool Categories ───────────────────────────────────────────────

/**
 * Tools that are DANGEROUS and should only be available to admin users.
 * These tools allow arbitrary code execution, file system access, or
 * system-level operations.
 */
export const NON_ADMIN_BLOCKED_TOOLS: Set<string> = new Set([
  // Shell/command execution
  'shell',
  'bash',
  'command',
  'exec',
  'execute',
  'terminal',
  'cmd',
  'powershell',
  'subprocess',
  'run_command',

  // Code execution
  'python',
  'python3',
  'node',
  'ruby',
  'perl',
  'php',
  'eval',
  'exec_python',
  'exec_javascript',
  'exec_code',
  'code_interpreter',

  // File system
  'read_file',
  'write_file',
  'delete_file',
  'move_file',
  'copy_file',
  'create_file',
  'edit_file',
  'file_upload',
  'file_download',
  'append_file',

  // System administration
  'sudo',
  'su',
  'chmod',
  'chown',
  'systemctl',
  'service',
  'docker',
  'docker_exec',
  'kubernetes',
  'kubectl',

  // Network tools (potential for lateral movement)
  'curl',
  'wget',
  'nc',
  'netcat',
  'ssh',
  'scp',
  'sftp',
  'telnet',

  // Database
  'sql',
  'sql_query',
  'database',
  'db_query',
  'redis',
  'mongo',

  // Environment/config
  'env',
  'environment',
  'set_env',
  'get_env',
  'config',
  'set_config',
]);

/**
 * Tools that OPERATOR role should NOT have access to.
 * In addition to NON_ADMIN_BLOCKED_TOOLS, operators also cannot
 * access admin-level management tools.
 */
export const OPERATOR_BLOCKED_TOOLS: Set<string> = new Set([
  ...NON_ADMIN_BLOCKED_TOOLS,
  // Admin management
  'user_management',
  'role_management',
  'permission_management',
  'tenant_management',
  'audit_log',
  'system_config',
  'deployment',
  'backup_restore',
]);

/**
 * Tools that VIEWER role should NOT have access to.
 * Viewers can only use read-only, observation tools.
 */
export const VIEWER_BLOCKED_TOOLS: Set<string> = new Set([
  ...OPERATOR_BLOCKED_TOOLS,
  // Execution tools
  'execute_mission',
  'start_mission',
  'cancel_mission',
  'restart_agent',
  'stop_agent',
  'create_agent',
  'delete_agent',
  'update_agent',

  // Write operations
  'create',
  'update',
  'delete',
  'modify',
  'deploy',
  'publish',
  'submit',

  // Agent control
  'agent_execute',
  'agent_command',
  'browser_navigate',
  'browser_click',
  'browser_type',
  'browser_screenshot',

  // Orchestration
  'collaborate',
  'coordinate',
  'decompose',
  'orchestrate',
]);

// ─── Tool Access Functions ─────────────────────────────────────────

/**
 * Returns the set of blocked tool names for a given user role.
 *
 * @param role - The user role (e.g., 'super_admin', 'tenant_admin', 'operator', 'viewer')
 * @returns Set of blocked tool names for that role
 */
export function blockedToolsForOwner(role: string): Set<string> {
  switch (role) {
    case 'super_admin':
      // Super admins can access all tools
      return new Set();
    case 'tenant_admin':
      // Tenant admins can access most tools but not system-level tools
      return NON_ADMIN_BLOCKED_TOOLS;
    case 'operator':
      return OPERATOR_BLOCKED_TOOLS;
    case 'viewer':
      return VIEWER_BLOCKED_TOOLS;
    default:
      // Unknown roles get the most restrictive set
      return VIEWER_BLOCKED_TOOLS;
  }
}

/**
 * Checks whether a specific tool is allowed for a given user role.
 *
 * @param toolName - The name of the tool to check
 * @param userRole - The user's role
 * @returns true if the tool is allowed, false if it is blocked
 *
 * @example
 * if (!isToolAllowed('shell', user.role)) {
 *   throw new ForbiddenException('Shell access is not available for your role');
 * }
 */
export function isToolAllowed(toolName: string, userRole: string): boolean {
  const blocked = blockedToolsForOwner(userRole);
  return !blocked.has(toolName.toLowerCase());
}

/**
 * Validates that a tool is allowed for a given user role.
 * Throws an HttpException if the tool is not allowed.
 *
 * @param toolName - The name of the tool to validate
 * @param userRole - The user's role
 * @throws HttpException (FORBIDDEN) if the tool is not allowed for the role
 *
 * @example
 * // In a controller or service:
 * validateToolAccess('shell', user.role);
 * // If we reach here, the tool is allowed
 */
export function validateToolAccess(toolName: string, userRole: string): void {
  if (!isToolAllowed(toolName, userRole)) {
    throw new HttpException(
      `Tool "${toolName}" is not available for role "${userRole}". ` +
      `This tool requires elevated privileges.`,
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Filters a list of tools, returning only those allowed for a given role.
 *
 * @param tools - Array of tool names to filter
 * @param userRole - The user's role
 * @returns Array of tool names that are allowed for the role
 *
 * @example
 * const availableTools = filterAllowedTools(allTools, user.role);
 */
export function filterAllowedTools(tools: string[], userRole: string): string[] {
  const blocked = blockedToolsForOwner(userRole);
  return tools.filter((tool) => !blocked.has(tool.toLowerCase()));
}

/**
 * Returns a summary of tool access for a given role.
 * Useful for API responses that show what tools are available.
 */
export function getToolAccessSummary(userRole: string): {
  role: string;
  blockedTools: string[];
  blockedCount: number;
  totalBlockedTools: number;
} {
  const blocked = blockedToolsForOwner(userRole);
  return {
    role: userRole,
    blockedTools: [...blocked].sort(),
    blockedCount: blocked.size,
    totalBlockedTools: VIEWER_BLOCKED_TOOLS.size,
  };
}
