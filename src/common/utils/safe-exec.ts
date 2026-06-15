/**
 * AENEWS Agent OS X — Safe Command Execution Utilities
 *
 * Security module to prevent command injection attacks.
 * Replaces execSync with execFileSync and provides input validation.
 *
 * CRITICAL: Never use execSync with string interpolation.
 * Always use execFileSync with explicit args arrays.
 */

import { execFileSync, ExecOptionsWithStringEncoding } from 'child_process';
import * as path from 'path';

// ─── Types ──────────────────────────────────────────────────────────

export interface SafeExecOptions extends Omit<ExecOptionsWithStringEncoding, 'shell'> {
  /** Maximum time in ms (default: 60000) */
  timeout?: number;
  /** Working directory for the command */
  cwd?: string;
  /** Environment variables */
  env?: NodeJS.ProcessEnv;
  /** Encoding (default: 'utf-8') */
  encoding?: BufferEncoding;
}

export interface SafeExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// ─── Path Validation ────────────────────────────────────────────────

/** Characters/patterns that MUST NEVER appear in a path passed to a shell command */
const PATH_DANGEROUS_PATTERNS = [
  /\.\./, // Directory traversal
  /;/, // Command separator
  /\|/, // Pipe
  /&/, // Background / logical AND
  /\$/, // Variable expansion
  /`/, // Command substitution
  /\n/, // Newline injection
  /\r/, // Carriage return injection
  /\\/, // Escape character
  /!/, // History expansion (bash)
  /\(/, // Subshell
  /\)/, // Subshell
  /\{/, // Brace expansion
  /\}/, // Brace expansion
  /</, // Redirection
  />/, // Redirection
];

/**
 * Validates that a path does not contain dangerous characters or patterns.
 * Rejects paths with directory traversal, shell metacharacters, or injection attempts.
 *
 * @throws Error if the path contains dangerous patterns
 */
export function validatePath(input: string): string {
  if (typeof input !== 'string') {
    throw new Error(`Path validation failed: expected string, got ${typeof input}`);
  }

  if (input.length === 0) {
    throw new Error('Path validation failed: empty path');
  }

  if (input.length > 4096) {
    throw new Error('Path validation failed: path exceeds maximum length of 4096 characters');
  }

  for (const pattern of PATH_DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      throw new Error(
        `Path validation failed: path contains forbidden pattern "${pattern.source}". ` +
          `Path: ${input.slice(0, 100)}`,
      );
    }
  }

  // Resolve to absolute path and verify it doesn't escape expected boundaries
  const resolved = path.resolve(input);

  // Re-check the resolved path for traversal (should be clean after resolve, but belt-and-suspenders)
  if (/\.\./.test(resolved)) {
    throw new Error(
      `Path validation failed: resolved path contains directory traversal: ${resolved}`,
    );
  }

  return resolved;
}

// ─── Git URL Validation ─────────────────────────────────────────────

/**
 * Validates that a URL is an acceptable Git remote URL.
 * Only allows HTTPS and SSH (git@) URLs.
 * Blocks file://, ftp://, and other potentially dangerous schemes.
 *
 * @throws Error if the URL is not a valid Git URL
 */
export function validateGitUrl(url: string): string {
  if (typeof url !== 'string') {
    throw new Error(`Git URL validation failed: expected string, got ${typeof url}`);
  }

  if (url.length === 0) {
    throw new Error('Git URL validation failed: empty URL');
  }

  if (url.length > 2048) {
    throw new Error('Git URL validation failed: URL exceeds maximum length of 2048 characters');
  }

  // Allow HTTPS URLs: https://domain/path
  const httpsPattern = /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9\-._]*(:[0-9]+)?\/[^\s]+$/;
  // Allow SSH URLs: git@host:path or git@host/path
  const sshPattern = /^git@[a-zA-Z0-9][a-zA-Z0-9\-._]*(:[0-9]+)?[:\/][^\s]+$/;

  if (!httpsPattern.test(url) && !sshPattern.test(url)) {
    throw new Error(
      `Git URL validation failed: URL must be HTTPS or SSH format. ` + `Got: ${url.slice(0, 100)}`,
    );
  }

  // Block suspicious patterns in URL
  const suspiciousPatterns = [
    /\$\(/, // Command substitution
    /`/, // Backtick substitution
    /;/, // Command separator
    /\|/, // Pipe
    /&/, // Background operator
    /\n/, // Newline
    /\r/, // Carriage return
    /--/, // Flag injection (e.g., --upload-pack)
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      throw new Error(
        `Git URL validation failed: URL contains suspicious pattern "${pattern.source}". ` +
          `Got: ${url.slice(0, 100)}`,
      );
    }
  }

  return url;
}

// ─── Shell Metacharacter Sanitization ───────────────────────────────

/** Shell metacharacters that need escaping (documentation reference) */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SHELL_META_CHARS = /["`\$\\!|&;<>(){}\n\r]/g;

/**
 * Escapes shell metacharacters in a string.
 * This is a LAST RESORT — prefer using execFileSync with args array instead.
 *
 * WARNING: This is defense-in-depth only. The primary defense is always
 * using execFileSync with explicit args arrays.
 */
export function sanitizeForShell(input: string): string {
  if (typeof input !== 'string') {
    throw new Error(`Shell sanitization failed: expected string, got ${typeof input}`);
  }

  // Replace dangerous characters with safe alternatives or escape them
  return input
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/`/g, '\\`') // Escape backticks
    .replace(/\$/g, '\\$') // Escape dollar signs
    .replace(/!/g, '\\!') // Escape history expansion
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\r/g, '') // Remove carriage returns
    .replace(/;/g, '') // Remove semicolons
    .replace(/\|/g, '') // Remove pipes
    .replace(/&/g, '') // Remove ampersands
    .replace(/</g, '') // Remove less-than
    .replace(/>/g, '') // Remove greater-than
    .replace(/\(/g, '') // Remove left paren
    .replace(/\)/g, ''); // Remove right paren
}

/**
 * Sanitizes a string for safe use as a git commit message.
 * Removes newlines and shell metacharacters but preserves readability.
 */
export function sanitizeCommitMessage(message: string): string {
  if (typeof message !== 'string') {
    return 'Automated commit';
  }

  return message
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\r/g, '') // Remove carriage returns
    .replace(/"/g, "'") // Replace double quotes with single
    .replace(/`/g, "'") // Replace backticks with single quotes
    .replace(/\$/g, '') // Remove dollar signs
    .replace(/!/g, '') // Remove history expansion
    .replace(/;/g, ',') // Replace semicolons with commas
    .replace(/\|/g, '') // Remove pipes
    .replace(/&/g, 'and') // Replace ampersands
    .replace(/</g, '') // Remove less-than
    .replace(/>/g, '') // Remove greater-than
    .replace(/\(/g, '[') // Replace parens with brackets
    .replace(/\)/g, ']')
    .slice(0, 500); // Limit length
}

// ─── Hostname Validation ────────────────────────────────────────────

/**
 * Validates a hostname for use in SSH/SCP commands.
 * Blocks shell metacharacters and injection attempts.
 */
export function validateHostname(host: string): string {
  if (typeof host !== 'string' || host.length === 0) {
    throw new Error('Hostname validation failed: empty hostname');
  }

  // Allow alphanumeric, dots, hyphens only
  const hostnamePattern = /^[a-zA-Z0-9][a-zA-Z0-9\-\.]*[a-zA-Z0-9]$/;

  if (!hostnamePattern.test(host)) {
    throw new Error(
      `Hostname validation failed: hostname contains invalid characters. Got: ${host.slice(0, 100)}`,
    );
  }

  // Block obviously suspicious patterns
  if (host.includes('..') || host.startsWith('.') || host.endsWith('.')) {
    throw new Error(
      `Hostname validation failed: suspicious hostname pattern: ${host.slice(0, 100)}`,
    );
  }

  return host;
}

/**
 * Validates a username for use in SSH/SCP commands.
 * Only allows alphanumeric, underscore, hyphen, and dot.
 */
export function validateUsername(user: string): string {
  if (typeof user !== 'string' || user.length === 0) {
    throw new Error('Username validation failed: empty username');
  }

  const usernamePattern = /^[a-zA-Z0-9._\-]+$/;
  if (!usernamePattern.test(user)) {
    throw new Error(
      `Username validation failed: username contains invalid characters. Got: ${user.slice(0, 100)}`,
    );
  }

  return user;
}

/**
 * Validates a remote path for use in SCP/SSH commands.
 * Blocks traversal and shell metacharacters.
 */
export function validateRemotePath(remotePath: string): string {
  if (typeof remotePath !== 'string' || remotePath.length === 0) {
    throw new Error('Remote path validation failed: empty path');
  }

  // Block dangerous patterns
  const dangerousPatterns = [
    /\.\./, // Directory traversal
    /;/, // Command separator
    /\|/, // Pipe
    /&/, // Background
    /\$/, // Variable expansion
    /`/, // Command substitution
    /\n/, // Newline
    /\r/, // Carriage return
    /\\/, // Escape
    /!/, // History expansion
    /\(/, // Subshell
    /\)/, // Subshell
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(remotePath)) {
      throw new Error(
        `Remote path validation failed: path contains forbidden pattern "${pattern.source}". ` +
          `Path: ${remotePath.slice(0, 100)}`,
      );
    }
  }

  return remotePath;
}

/**
 * Validates a Docker image name.
 * Only allows alphanumeric, dots, hyphens, underscores, colons (for tags), and slashes.
 */
export function validateImageName(imageName: string): string {
  if (typeof imageName !== 'string' || imageName.length === 0) {
    throw new Error('Image name validation failed: empty image name');
  }

  // Docker image name: [registry/][namespace/]name[:tag]
  const imagePattern = /^[a-zA-Z0-9][a-zA-Z0-9._\-\/:]*[a-zA-Z0-9]$/;
  if (!imagePattern.test(imageName)) {
    throw new Error(
      `Image name validation failed: invalid characters. Got: ${imageName.slice(0, 100)}`,
    );
  }

  return imageName;
}

/**
 * Validates a Docker registry URL.
 */
export function validateRegistry(registry: string): string {
  if (typeof registry !== 'string' || registry.length === 0) {
    throw new Error('Registry validation failed: empty registry');
  }

  // Allow alphanumeric, dots, hyphens, colons (for port), and slashes
  const registryPattern = /^[a-zA-Z0-9][a-zA-Z0-9._\-:\/]*$/;
  if (!registryPattern.test(registry)) {
    throw new Error(
      `Registry validation failed: invalid characters. Got: ${registry.slice(0, 100)}`,
    );
  }

  return registry;
}

/**
 * Validates a branch name for git operations.
 */
export function validateBranchName(branch: string): string {
  if (typeof branch !== 'string' || branch.length === 0) {
    throw new Error('Branch name validation failed: empty branch name');
  }

  // Git branch names: allow alphanumeric, hyphens, underscores, slashes, dots
  // Block shell metacharacters
  const branchPattern = /^[a-zA-Z0-9][a-zA-Z0-9._\-\/]*$/;
  if (!branchPattern.test(branch)) {
    throw new Error(
      `Branch name validation failed: invalid characters. Got: ${branch.slice(0, 100)}`,
    );
  }

  // Block some git-specific dangerous patterns
  if (branch.startsWith('-') || branch.includes('..') || branch.includes(' ')) {
    throw new Error(
      `Branch name validation failed: suspicious pattern. Got: ${branch.slice(0, 100)}`,
    );
  }

  return branch;
}

// ─── Safe Exec ──────────────────────────────────────────────────────

/**
 * Safely executes a command using execFileSync (no shell interpolation).
 *
 * This is the PRIMARY replacement for execSync. It never invokes a shell,
 * so command injection is impossible by design.
 *
 * @param command - The executable to run (e.g., 'git', 'docker', 'zip')
 * @param args - Array of arguments (never interpolated into a shell string)
 * @param options - Execution options
 * @returns SafeExecResult with stdout, stderr, exitCode
 *
 * @example
 * // BEFORE (VULNERABLE):
 * execSync(`git clone ${repoUrl} ${branch}`);
 *
 * // AFTER (SAFE):
 * safeExec('git', ['clone', '-b', branch, repoUrl], { cwd: workspaceDir });
 */
export function safeExec(
  command: string,
  args: string[],
  options: SafeExecOptions = {},
): SafeExecResult {
  const { timeout = 60000, cwd, env, encoding = 'utf-8' } = options;

  try {
    const stdout = execFileSync(command, args, {
      timeout,
      cwd,
      env,
      encoding,
      shell: false, // CRITICAL: Never use shell
      maxBuffer: 10 * 1024 * 1024, // 10MB max buffer
    });

    return {
      stdout: stdout || '',
      stderr: '',
      exitCode: 0,
    };
  } catch (error: any) {
    // execFileSync throws on non-zero exit codes
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status || 1,
    };
  }
}

/**
 * Executes a series of git commands safely using execFileSync.
 * Each command is broken into command + args array (no shell interpolation).
 */
export function safeGitExec(gitArgs: string[], options: SafeExecOptions = {}): SafeExecResult {
  return safeExec('git', gitArgs, options);
}

/**
 * Executes a zip command safely using execFileSync.
 */
export function safeZipExec(zipArgs: string[], options: SafeExecOptions = {}): SafeExecResult {
  return safeExec('zip', zipArgs, options);
}

/**
 * Executes a docker command safely using execFileSync.
 */
export function safeDockerExec(
  dockerArgs: string[],
  options: SafeExecOptions = {},
): SafeExecResult {
  return safeExec('docker', dockerArgs, {
    ...options,
    timeout: options.timeout || 300000, // Docker operations can be slow
  });
}

/**
 * Executes an scp command safely using execFileSync.
 */
export function safeScpExec(scpArgs: string[], options: SafeExecOptions = {}): SafeExecResult {
  return safeExec('scp', scpArgs, {
    ...options,
    timeout: options.timeout || 120000,
  });
}

/**
 * Executes an ssh command safely using execFileSync.
 */
export function safeSshExec(sshArgs: string[], options: SafeExecOptions = {}): SafeExecResult {
  return safeExec('ssh', sshArgs, {
    ...options,
    timeout: options.timeout || 120000,
  });
}

/**
 * Executes a cp command safely using execFileSync.
 */
export function safeCpExec(cpArgs: string[], options: SafeExecOptions = {}): SafeExecResult {
  return safeExec('cp', cpArgs, options);
}
