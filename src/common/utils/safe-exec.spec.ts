/**
 * AENEWS Agent OS X — Safe Execution Utilities Unit Tests
 *
 * Tests for validatePath(), validateGitUrl(), validateHostname(),
 * sanitizeForShell(), and related safe execution utilities.
 */

import {
  validatePath,
  validateGitUrl,
  validateHostname,
  validateUsername,
  sanitizeForShell,
  sanitizeCommitMessage,
  validateRemotePath,
  validateBranchName,
  validateImageName,
  validateRegistry,
} from './safe-exec';

// ─── validatePath ─────────────────────────────────────────────────

describe('validatePath', () => {
  it('should accept a simple valid path', () => {
    const result = validatePath('/home/user/project');
    expect(result).toBeTruthy();
  });

  it('should accept a path with alphanumeric characters', () => {
    const result = validatePath('/var/log/app123');
    expect(result).toBeTruthy();
  });

  it('should reject directory traversal with ..', () => {
    expect(() => validatePath('/etc/passwd/../../../root')).toThrow(/forbidden pattern/);
  });

  it('should reject path with semicolon (command separator)', () => {
    expect(() => validatePath('/tmp/file;rm -rf /')).toThrow(/forbidden pattern/);
  });

  it('should reject path with pipe', () => {
    expect(() => validatePath('/tmp/file|cat /etc/passwd')).toThrow(/forbidden pattern/);
  });

  it('should reject path with ampersand', () => {
    expect(() => validatePath('/tmp/file&evil')).toThrow(/forbidden pattern/);
  });

  it('should reject path with dollar sign (variable expansion)', () => {
    expect(() => validatePath('/tmp/$HOME/evil')).toThrow(/forbidden pattern/);
  });

  it('should reject path with backtick (command substitution)', () => {
    expect(() => validatePath('/tmp/`whoami`/evil')).toThrow(/forbidden pattern/);
  });

  it('should reject path with newline', () => {
    expect(() => validatePath('/tmp/file\nrm -rf /')).toThrow(/forbidden pattern/);
  });

  it('should reject path with backslash', () => {
    expect(() => validatePath('/tmp\\evil')).toThrow(/forbidden pattern/);
  });

  it('should reject path with less-than sign', () => {
    expect(() => validatePath('/tmp/file<input')).toThrow(/forbidden pattern/);
  });

  it('should reject path with greater-than sign', () => {
    expect(() => validatePath('/tmp/file>output')).toThrow(/forbidden pattern/);
  });

  it('should reject path with parentheses', () => {
    expect(() => validatePath('/tmp/file(evil)')).toThrow(/forbidden pattern/);
  });

  it('should reject empty path', () => {
    expect(() => validatePath('')).toThrow(/empty path/);
  });

  it('should reject non-string input', () => {
    expect(() => validatePath(42 as any)).toThrow(/expected string/);
  });

  it('should reject path exceeding max length', () => {
    const longPath = '/tmp/' + 'a'.repeat(5000);
    expect(() => validatePath(longPath)).toThrow(/maximum length/);
  });

  it('should reject path with exclamation mark (history expansion)', () => {
    expect(() => validatePath('/tmp/!event')).toThrow(/forbidden pattern/);
  });

  it('should reject path with curly braces (brace expansion)', () => {
    expect(() => validatePath('/tmp/{a,b}')).toThrow(/forbidden pattern/);
  });
});

// ─── validateGitUrl ──────────────────────────────────────────────

describe('validateGitUrl', () => {
  it('should accept valid HTTPS Git URL', () => {
    expect(() => validateGitUrl('https://github.com/user/repo.git')).not.toThrow();
  });

  it('should accept valid SSH Git URL', () => {
    expect(() => validateGitUrl('git@github.com:user/repo.git')).not.toThrow();
  });

  it('should accept HTTPS URL with port', () => {
    expect(() => validateGitUrl('https://github.com:443/user/repo.git')).not.toThrow();
  });

  it('should reject file:// URL', () => {
    expect(() => validateGitUrl('file:///tmp/repo')).toThrow(/HTTPS or SSH/);
  });

  it('should reject ftp:// URL', () => {
    expect(() => validateGitUrl('ftp://example.com/repo')).toThrow(/HTTPS or SSH/);
  });

  it('should reject empty URL', () => {
    expect(() => validateGitUrl('')).toThrow(/empty URL/);
  });

  it('should reject non-string input', () => {
    expect(() => validateGitUrl(42 as any)).toThrow(/expected string/);
  });

  it('should reject URL with command substitution', () => {
    expect(() => validateGitUrl('https://github.com/$(whoami)/repo')).toThrow(/suspicious pattern/);
  });

  it('should reject URL with backtick substitution', () => {
    expect(() => validateGitUrl('https://github.com/`whoami`/repo')).toThrow(/suspicious pattern/);
  });

  it('should reject URL with semicolon', () => {
    expect(() => validateGitUrl('https://github.com/user/repo;evil')).toThrow(/suspicious pattern/);
  });

  it('should reject URL with pipe', () => {
    expect(() => validateGitUrl('https://github.com/user/repo|evil')).toThrow(/suspicious pattern/);
  });

  it('should reject URL with flag injection (--upload-pack)', () => {
    expect(() => validateGitUrl('https://github.com/user/repo--upload-pack=evil')).toThrow(/suspicious pattern/);
  });

  it('should reject URL exceeding max length', () => {
    const longUrl = 'https://github.com/' + 'a'.repeat(2050);
    expect(() => validateGitUrl(longUrl)).toThrow(/maximum length/);
  });

  it('should accept SSH URL with path', () => {
    expect(() => validateGitUrl('git@gitlab.com:org/project/repo.git')).not.toThrow();
  });
});

// ─── validateHostname ────────────────────────────────────────────

describe('validateHostname', () => {
  it('should accept valid hostname', () => {
    expect(() => validateHostname('example.com')).not.toThrow();
  });

  it('should accept hostname with subdomains', () => {
    expect(() => validateHostname('api.example.com')).not.toThrow();
  });

  it('should accept hostname with hyphens', () => {
    expect(() => validateHostname('my-server.example.com')).not.toThrow();
  });

  it('should accept IP address as hostname', () => {
    expect(() => validateHostname('192.168.1.1')).not.toThrow();
  });

  it('should reject empty hostname', () => {
    expect(() => validateHostname('')).toThrow(/empty hostname/);
  });

  it('should reject hostname with shell metacharacters', () => {
    expect(() => validateHostname('example.com;evil')).toThrow(/invalid characters/);
  });

  it('should reject hostname with dollar sign', () => {
    expect(() => validateHostname('example$evil.com')).toThrow(/invalid characters/);
  });

  it('should reject hostname with backtick', () => {
    expect(() => validateHostname('example`evil.com')).toThrow(/invalid characters/);
  });

  it('should reject hostname with pipe', () => {
    expect(() => validateHostname('example|evil.com')).toThrow(/invalid characters/);
  });

  it('should reject hostname with spaces', () => {
    expect(() => validateHostname('example .com')).toThrow(/invalid characters/);
  });

  it('should reject hostname starting with dot', () => {
    expect(() => validateHostname('.example.com')).toThrow();
  });

  it('should reject hostname ending with dot', () => {
    expect(() => validateHostname('example.com.')).toThrow();
  });

  it('should reject hostname with double dots', () => {
    expect(() => validateHostname('example..com')).toThrow(/suspicious/);
  });
});

// ─── validateUsername ─────────────────────────────────────────────

describe('validateUsername', () => {
  it('should accept valid username', () => {
    expect(() => validateUsername('deploy')).not.toThrow();
  });

  it('should accept username with underscores', () => {
    expect(() => validateUsername('deploy_user')).not.toThrow();
  });

  it('should accept username with hyphens', () => {
    expect(() => validateUsername('deploy-user')).not.toThrow();
  });

  it('should accept username with dots', () => {
    expect(() => validateUsername('deploy.user')).not.toThrow();
  });

  it('should reject empty username', () => {
    expect(() => validateUsername('')).toThrow(/empty username/);
  });

  it('should reject username with spaces', () => {
    expect(() => validateUsername('deploy user')).toThrow(/invalid characters/);
  });

  it('should reject username with shell metacharacters', () => {
    expect(() => validateUsername('deploy;evil')).toThrow(/invalid characters/);
  });
});

// ─── sanitizeForShell ────────────────────────────────────────────

describe('sanitizeForShell', () => {
  it('should return clean input unchanged', () => {
    expect(sanitizeForShell('hello world')).toBe('hello world');
  });

  it('should escape backslashes', () => {
    expect(sanitizeForShell('path\\to\\file')).toBe('path\\\\to\\\\file');
  });

  it('should escape double quotes', () => {
    expect(sanitizeForShell('say "hello"')).toBe('say \\"hello\\"');
  });

  it('should escape backticks', () => {
    expect(sanitizeForShell('`whoami`')).toBe('\\`whoami\\`');
  });

  it('should escape dollar signs', () => {
    expect(sanitizeForShell('$HOME')).toBe('\\$HOME');
  });

  it('should escape exclamation marks', () => {
    expect(sanitizeForShell('!event')).toBe('\\!event');
  });

  it('should replace newlines with spaces', () => {
    expect(sanitizeForShell('line1\nline2')).toBe('line1 line2');
  });

  it('should remove carriage returns', () => {
    expect(sanitizeForShell('text\rmore')).toBe('textmore');
  });

  it('should remove semicolons', () => {
    expect(sanitizeForShell('cmd;evil')).toBe('cmdevil');
  });

  it('should remove pipes', () => {
    expect(sanitizeForShell('cmd|evil')).toBe('cmdevil');
  });

  it('should remove ampersands', () => {
    expect(sanitizeForShell('cmd&evil')).toBe('cmdevil');
  });

  it('should remove angle brackets', () => {
    expect(sanitizeForShell('cmd<input>output')).toBe('cmdinputoutput');
  });

  it('should remove parentheses', () => {
    expect(sanitizeForShell('cmd(subshell)')).toBe('cmdsubshell');
  });

  it('should handle combined injection attempt', () => {
    const result = sanitizeForShell('$(whoami);cat /etc/passwd');
    expect(result).not.toContain('$(');
    expect(result).not.toContain(';');
  });

  it('should throw for non-string input', () => {
    expect(() => sanitizeForShell(42 as any)).toThrow(/expected string/);
  });

  it('should handle empty string', () => {
    expect(sanitizeForShell('')).toBe('');
  });
});

// ─── sanitizeCommitMessage ───────────────────────────────────────

describe('sanitizeCommitMessage', () => {
  it('should return clean message unchanged', () => {
    expect(sanitizeCommitMessage('Fix bug in login')).toBe('Fix bug in login');
  });

  it('should replace newlines with spaces', () => {
    expect(sanitizeCommitMessage('line1\nline2')).toBe('line1 line2');
  });

  it('should replace double quotes with single quotes', () => {
    expect(sanitizeCommitMessage('say "hello"')).toBe("say 'hello'");
  });

  it('should replace backticks with single quotes', () => {
    expect(sanitizeCommitMessage('use `code`')).toBe("use 'code'");
  });

  it('should remove dollar signs', () => {
    expect(sanitizeCommitMessage('$VAR')).toBe('VAR');
  });

  it('should replace semicolons with commas', () => {
    expect(sanitizeCommitMessage('fix;test')).toBe('fix,test');
  });

  it('should replace ampersands with "and"', () => {
    expect(sanitizeCommitMessage('fix & deploy')).toBe('fix and deploy');
  });

  it('should replace parentheses with brackets', () => {
    expect(sanitizeCommitMessage('fix(login)')).toBe('fix[login]');
  });

  it('should truncate to 500 characters', () => {
    const longMsg = 'a'.repeat(600);
    expect(sanitizeCommitMessage(longMsg).length).toBe(500);
  });

  it('should return default for non-string', () => {
    expect(sanitizeCommitMessage(42 as any)).toBe('Automated commit');
  });
});

// ─── validateRemotePath ──────────────────────────────────────────

describe('validateRemotePath', () => {
  it('should accept valid remote path', () => {
    expect(() => validateRemotePath('/home/user/project')).not.toThrow();
  });

  it('should reject empty path', () => {
    expect(() => validateRemotePath('')).toThrow(/empty path/);
  });

  it('should reject path traversal', () => {
    expect(() => validateRemotePath('../../../etc/passwd')).toThrow(/forbidden pattern/);
  });

  it('should reject semicolons', () => {
    expect(() => validateRemotePath('/tmp;evil')).toThrow(/forbidden pattern/);
  });

  it('should reject dollar signs', () => {
    expect(() => validateRemotePath('/tmp/$HOME')).toThrow(/forbidden pattern/);
  });

  it('should reject backticks', () => {
    expect(() => validateRemotePath('/tmp/`whoami`')).toThrow(/forbidden pattern/);
  });
});

// ─── validateBranchName ──────────────────────────────────────────

describe('validateBranchName', () => {
  it('should accept valid branch name', () => {
    expect(() => validateBranchName('feature/login')).not.toThrow();
  });

  it('should accept branch with hyphens', () => {
    expect(() => validateBranchName('bug-fix')).not.toThrow();
  });

  it('should reject empty branch name', () => {
    expect(() => validateBranchName('')).toThrow(/empty/);
  });

  it('should reject branch starting with dash', () => {
    expect(() => validateBranchName('-evil')).toThrow();
  });

  it('should reject branch with double dots', () => {
    expect(() => validateBranchName('feature..evil')).toThrow(/suspicious/);
  });

  it('should reject branch with spaces', () => {
    expect(() => validateBranchName('evil branch')).toThrow();
  });

  it('should reject branch with semicolons', () => {
    expect(() => validateBranchName('main;evil')).toThrow(/invalid characters/);
  });
});

// ─── validateImageName ───────────────────────────────────────────

describe('validateImageName', () => {
  it('should accept valid image name', () => {
    expect(() => validateImageName('nginx:latest')).not.toThrow();
  });

  it('should accept image with registry', () => {
    expect(() => validateImageName('registry.io/org/image:v1')).not.toThrow();
  });

  it('should reject empty image name', () => {
    expect(() => validateImageName('')).toThrow(/empty/);
  });

  it('should reject image with shell metacharacters', () => {
    expect(() => validateImageName('nginx;evil')).toThrow(/invalid characters/);
  });
});

// ─── validateRegistry ────────────────────────────────────────────

describe('validateRegistry', () => {
  it('should accept valid registry', () => {
    expect(() => validateRegistry('registry.example.com')).not.toThrow();
  });

  it('should accept registry with port', () => {
    expect(() => validateRegistry('registry.example.com:5000')).not.toThrow();
  });

  it('should reject empty registry', () => {
    expect(() => validateRegistry('')).toThrow(/empty/);
  });

  it('should reject registry with shell metacharacters', () => {
    expect(() => validateRegistry('registry;evil')).toThrow(/invalid characters/);
  });
});
