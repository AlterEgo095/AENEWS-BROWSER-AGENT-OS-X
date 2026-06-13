/**
 * AENEWS Agent OS X - Session Management Agent
 * Manages browser sessions: login, logout, session checking, refresh, and account switching.
 */

import { Injectable, Inject } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
import { BrowserCapability } from '../../../software-factory/interfaces';
import { ConnectorOutput } from '../../../software-factory/connectors/connector.interface';

// ─── Agent Configuration ──────────────────────────────────────────

export const SESSION_MANAGEMENT_AGENT_CONFIG: AgentConfig = {
  id: 'browser-session-management',
  name: 'SessionManagement',
  cluster: AgentCluster.BROWSER,
  version: '1.0.0',
  description:
    'Manage browser authentication sessions including login/logout flows, session state monitoring, session refresh, and multi-account switching. Supports various auth mechanisms including form-based, OAuth, and token-based.',
  capabilities: [
    {
      name: 'login',
      description: 'Perform login with credentials through a login form',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Login page URL' },
          usernameSelector: { type: 'string' },
          passwordSelector: { type: 'string' },
          submitSelector: { type: 'string' },
          username: { type: 'string' },
          password: { type: 'string' },
          waitForNavigation: { type: 'boolean', default: true },
          successIndicator: { type: 'string', description: 'Selector indicating successful login' },
        },
        required: ['url', 'username', 'password'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          loggedIn: { type: 'boolean' },
          sessionToken: { type: 'string' },
          redirectUrl: { type: 'string' },
        },
      },
    },
    {
      name: 'logout',
      description: 'Perform logout and clear session data',
      inputSchema: {
        type: 'object',
        properties: {
          logoutSelector: { type: 'string', description: 'Logout button selector' },
          logoutUrl: { type: 'string', description: 'Direct logout URL' },
          clearCookies: { type: 'boolean', default: true },
          clearLocalStorage: { type: 'boolean', default: true },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          loggedOut: { type: 'boolean' },
          sessionCleared: { type: 'boolean' },
        },
      },
    },
    {
      name: 'checkSession',
      description: 'Check if the current session is valid and active',
      inputSchema: {
        type: 'object',
        properties: {
          sessionIndicator: { type: 'string', description: 'Selector indicating active session' },
          sessionCookie: { type: 'string', description: 'Cookie name for session check' },
          sessionUrl: { type: 'string', description: 'URL to check session status' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          active: { type: 'boolean' },
          sessionAge: { type: 'number' },
          expiresAt: { type: 'string' },
        },
      },
    },
    {
      name: 'refreshSession',
      description: 'Refresh an existing session to prevent expiration',
      inputSchema: {
        type: 'object',
        properties: {
          refreshUrl: { type: 'string', description: 'Session refresh endpoint' },
          refreshSelector: { type: 'string', description: 'Element to click for refresh' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          refreshed: { type: 'boolean' },
          newExpiry: { type: 'string' },
        },
      },
    },
    {
      name: 'switchAccount',
      description: 'Switch between multiple accounts',
      inputSchema: {
        type: 'object',
        properties: {
          accountId: { type: 'string', description: 'Account identifier to switch to' },
          loginUrl: { type: 'string' },
          username: { type: 'string' },
          password: { type: 'string' },
        },
        required: ['accountId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          switched: { type: 'boolean' },
          currentAccount: { type: 'string' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:browser',
    'write:browser',
    'manage:session',
    'manage:cookies',
    'access:credentials',
  ],
  maxConcurrentTasks: 3,
  timeout: 30000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1500,
    exponentialBackoff: true,
  },
};

// ─── Session State ────────────────────────────────────────────────

interface SessionState {
  accountId: string;
  loggedIn: boolean;
  sessionToken: string;
  createdAt: Date;
  lastRefreshedAt: Date;
  expiresAt: Date;
  cookies: string[];
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class SessionManagementAgentService extends BaseAgentService {
  private sessions: Map<string, SessionState> = new Map();
  private currentAccountId: string | null = null;

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return SESSION_MANAGEMENT_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'login',
      description: 'Perform login with credentials',
      execute: async (params: {
        url: string;
        usernameSelector?: string;
        passwordSelector?: string;
        submitSelector?: string;
        username: string;
        password: string;
        waitForNavigation?: boolean;
        successIndicator?: string;
      }) => this.login(params),
    });

    this.registerTool({
      name: 'logout',
      description: 'Perform logout and clear session',
      execute: async (params: {
        logoutSelector?: string;
        logoutUrl?: string;
        clearCookies?: boolean;
        clearLocalStorage?: boolean;
      }) => this.logout(params),
    });

    this.registerTool({
      name: 'checkSession',
      description: 'Check session validity',
      execute: async (params: {
        sessionIndicator?: string;
        sessionCookie?: string;
        sessionUrl?: string;
      }) => this.checkSession(params),
    });

    this.registerTool({
      name: 'refreshSession',
      description: 'Refresh the current session',
      execute: async (params: { refreshUrl?: string; refreshSelector?: string }) =>
        this.refreshSession(params),
    });

    this.registerTool({
      name: 'switchAccount',
      description: 'Switch to a different account',
      execute: async (params: {
        accountId: string;
        loginUrl?: string;
        username?: string;
        password?: string;
      }) => this.switchAccount(params),
    });

    this.logger.log('SessionManagement agent initialized with 5 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    // Try real connector first via bridge
    if (this.bridge) {
      try {
        const result: ConnectorOutput = await this.bridge.executeCapability(
          BrowserCapability.SESSION,
          {
            missionId: input.taskId,
            instruction: action || 'manageSession',
            workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
            parameters: input.payload,
          },
        );

        return this.createAgentOutput(
          input.taskId,
          result.success,
          result.output,
          result.error,
          startTime,
        );
      } catch (error) {
        this.logger.warn(
          `Bridge execution failed, falling back to local: ${(error as Error).message}`,
        );
      }
    }

    // Fallback to existing simulated logic
    if (!action) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        'Missing required parameter: action',
        startTime,
      );
    }

    try {
      let result: any;

      switch (action) {
        case 'login':
          result = await this.login(params);
          break;
        case 'logout':
          result = await this.logout(params);
          break;
        case 'checkSession':
          result = await this.checkSession(params);
          break;
        case 'refreshSession':
          result = await this.refreshSession(params);
          break;
        case 'switchAccount':
          result = await this.switchAccount(params);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown session action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`SessionManagement execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    // Logout all active sessions
    for (const [accountId, session] of this.sessions.entries()) {
      if (session.loggedIn) {
        this.logger.log(`Force-logging out account: ${accountId}`);
      }
    }
    this.sessions.clear();
    this.currentAccountId = null;
    this.logger.log('SessionManagement agent destroyed, all sessions cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async login(params: {
    url: string;
    usernameSelector?: string;
    passwordSelector?: string;
    submitSelector?: string;
    username: string;
    password: string;
    waitForNavigation?: boolean;
    successIndicator?: string;
  }): Promise<{
    loggedIn: boolean;
    sessionToken: string;
    redirectUrl: string;
  }> {
    const { url, username, password, waitForNavigation = true } = params;

    if (!url) throw new Error('Login URL is required');
    if (!username) throw new Error('Username is required');
    if (!password) throw new Error('Password is required');

    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid login URL: ${url}`);
    }

    // Simulate login flow
    const accountId = username;
    const sessionToken = `sess_${this.generateId()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Validate credentials (simulation: reject obvious bad credentials)
    if (password.length < 4) {
      throw new Error('Login failed: Invalid credentials (password too short)');
    }
    if (username.includes('invalid') || username.includes('blocked')) {
      throw new Error('Login failed: Account not found or blocked');
    }

    const session: SessionState = {
      accountId,
      loggedIn: true,
      sessionToken,
      createdAt: now,
      lastRefreshedAt: now,
      expiresAt,
      cookies: [`session=${sessionToken}`, `user=${accountId}`],
    };

    this.sessions.set(accountId, session);
    this.currentAccountId = accountId;

    // Store session in session memory
    await this.storeInSessionMemory('currentSession', session, accountId);

    const redirectUrl = waitForNavigation ? `${new URL(url).origin}/dashboard` : url;

    this.logger.log(`Logged in as ${accountId} (session expires: ${expiresAt.toISOString()})`);

    return {
      loggedIn: true,
      sessionToken,
      redirectUrl,
    };
  }

  private async logout(params: {
    logoutSelector?: string;
    logoutUrl?: string;
    clearCookies?: boolean;
    clearLocalStorage?: boolean;
  }): Promise<{ loggedOut: boolean; sessionCleared: boolean }> {
    const { clearCookies = true, clearLocalStorage = true } = params;

    if (!this.currentAccountId) {
      this.logger.warn('No active session to logout from');
      return { loggedOut: true, sessionCleared: true };
    }

    const accountId = this.currentAccountId;
    const session = this.sessions.get(accountId);

    if (session) {
      session.loggedIn = false;
      this.sessions.delete(accountId);
    }

    this.currentAccountId = null;

    // Simulate clearing cookies and localStorage
    let sessionCleared = false;
    if (clearCookies || clearLocalStorage) {
      sessionCleared = true;
      await this.storeInWorkingMemory('logoutTimestamp', new Date().toISOString(), 60000);
    }

    this.logger.log(`Logged out account: ${accountId}`);
    return { loggedOut: true, sessionCleared };
  }

  private async checkSession(params: {
    sessionIndicator?: string;
    sessionCookie?: string;
    sessionUrl?: string;
  }): Promise<{
    active: boolean;
    sessionAge: number;
    expiresAt: string;
  }> {
    if (!this.currentAccountId) {
      return { active: false, sessionAge: 0, expiresAt: '' };
    }

    const session = this.sessions.get(this.currentAccountId);
    if (!session || !session.loggedIn) {
      return { active: false, sessionAge: 0, expiresAt: '' };
    }

    const now = new Date();
    const sessionAge = now.getTime() - session.createdAt.getTime();
    const isExpired = now >= session.expiresAt;

    if (isExpired) {
      session.loggedIn = false;
      this.logger.warn(`Session expired for account: ${this.currentAccountId}`);
      return {
        active: false,
        sessionAge,
        expiresAt: session.expiresAt.toISOString(),
      };
    }

    return {
      active: true,
      sessionAge,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  private async refreshSession(params: {
    refreshUrl?: string;
    refreshSelector?: string;
  }): Promise<{ refreshed: boolean; newExpiry: string }> {
    if (!this.currentAccountId) {
      throw new Error('No active session to refresh');
    }

    const session = this.sessions.get(this.currentAccountId);
    if (!session || !session.loggedIn) {
      throw new Error('Current session is not active');
    }

    // Simulate session refresh
    const now = new Date();
    const newExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    session.lastRefreshedAt = now;
    session.expiresAt = newExpiry;
    session.sessionToken = `sess_${this.generateId()}`;

    await this.storeInSessionMemory('currentSession', session, this.currentAccountId);

    this.logger.log(
      `Refreshed session for ${this.currentAccountId} (new expiry: ${newExpiry.toISOString()})`,
    );

    return { refreshed: true, newExpiry: newExpiry.toISOString() };
  }

  private async switchAccount(params: {
    accountId: string;
    loginUrl?: string;
    username?: string;
    password?: string;
  }): Promise<{ switched: boolean; currentAccount: string }> {
    const { accountId, loginUrl, username, password } = params;

    if (!accountId) throw new Error('Account ID is required');

    // Check if the target account already has an active session
    const existingSession = this.sessions.get(accountId);
    if (existingSession && existingSession.loggedIn) {
      this.currentAccountId = accountId;
      this.logger.log(`Switched to existing session: ${accountId}`);
      return { switched: true, currentAccount: accountId };
    }

    // Need to log in with the new account
    if (!username || !password) {
      throw new Error(
        `No active session for account "${accountId}" and no credentials provided for login`,
      );
    }

    // Perform login for new account
    await this.login({
      url: loginUrl || 'https://example.com/login',
      username,
      password,
    });

    this.currentAccountId = accountId;
    this.logger.log(`Switched to account: ${accountId}`);

    return { switched: true, currentAccount: accountId };
  }
}
