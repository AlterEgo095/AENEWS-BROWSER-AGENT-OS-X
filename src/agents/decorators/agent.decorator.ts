/**
 * AENEWS Agent OS X - @Agent() Decorator
 * Marks a class as an agent and registers its metadata.
 * Supports both full AgentConfig and simplified AgentDecoratorOptions.
 */

import { SetMetadata } from '@nestjs/common';
import { AgentCluster, AgentCapability, AgentConfig, AgentRetryPolicy } from '../interfaces/agent.interface';

// ─── Agent Metadata Key ───────────────────────────────────────────
export const AGENT_METADATA_KEY = 'agent:metadata';

// ─── Agent Metadata ───────────────────────────────────────────────
export interface AgentMetadata {
  id: string;
  name: string;
  cluster: AgentCluster;
  version: string;
  description: string;
  capabilities: AgentCapability[];
  permissions: string[];
  maxConcurrentTasks: number;
  timeout: number;
  retryPolicy: AgentRetryPolicy;
}

// ─── Agent Decorator Options ──────────────────────────────────────
export interface AgentDecoratorOptions {
  /** Unique agent identifier (e.g., 'browser-chrome') */
  id: string;

  /** Human-readable name (e.g., 'Chrome Browser Agent') */
  name: string;

  /** Agent cluster */
  cluster: AgentCluster;

  /** Semantic version (e.g., '1.0.0') */
  version?: string;

  /** Agent description */
  description?: string;

  /** Agent capabilities */
  capabilities?: AgentCapability[];

  /** Required permissions (e.g., ['execute:task', 'read:memory']) */
  permissions?: string[];

  /** Maximum number of concurrent tasks */
  maxConcurrentTasks?: number;

  /** Default task timeout in milliseconds */
  timeout?: number;

  /** Retry configuration */
  retryPolicy?: Partial<AgentRetryPolicy>;
}

// ─── Default Values ───────────────────────────────────────────────
const DEFAULT_OPTIONS: Partial<AgentDecoratorOptions> = {
  version: '1.0.0',
  description: '',
  capabilities: [],
  permissions: [],
  maxConcurrentTasks: 5,
  timeout: 30000,
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    exponentialBackoff: true,
  },
};

/**
 * Merge options with defaults into a full AgentMetadata object.
 */
function mergeOptionsToMetadata(options: AgentDecoratorOptions): AgentMetadata {
  return {
    id: options.id,
    name: options.name,
    cluster: options.cluster,
    version: options.version || DEFAULT_OPTIONS.version!,
    description: options.description || DEFAULT_OPTIONS.description!,
    capabilities: options.capabilities || DEFAULT_OPTIONS.capabilities!,
    permissions: options.permissions || DEFAULT_OPTIONS.permissions!,
    maxConcurrentTasks: options.maxConcurrentTasks || DEFAULT_OPTIONS.maxConcurrentTasks!,
    timeout: options.timeout || DEFAULT_OPTIONS.timeout!,
    retryPolicy: {
      maxRetries: options.retryPolicy?.maxRetries ?? DEFAULT_OPTIONS.retryPolicy!.maxRetries!,
      backoffMs: options.retryPolicy?.backoffMs ?? DEFAULT_OPTIONS.retryPolicy!.backoffMs!,
      exponentialBackoff:
        options.retryPolicy?.exponentialBackoff ?? DEFAULT_OPTIONS.retryPolicy!.exponentialBackoff!,
    },
  };
}

/**
 * @Agent() decorator
 *
 * Marks a class as an AENEWS agent with full metadata.
 * Supports two calling conventions:
 *
 * 1. Full decorator options:
 * @example
 * ```typescript
 * @Agent({
 *   id: 'browser-chrome',
 *   name: 'Chrome Browser Agent',
 *   cluster: AgentCluster.BROWSER,
 *   capabilities: [
 *     {
 *       name: 'navigate',
 *       description: 'Navigate to a URL',
 *       inputSchema: { url: { type: 'string' } },
 *       outputSchema: { success: { type: 'boolean' } },
 *     },
 *   ],
 *   permissions: ['execute:browser', 'read:network'],
 * })
 * @Injectable()
 * export class ChromeBrowserAgent extends BaseAgentService {
 *   // ...
 * }
 * ```
 *
 * 2. Direct AgentConfig (full config object):
 * @example
 * ```typescript
 * @Agent(myAgentConfig)
 * @Injectable()
 * export class MyAgent extends BaseAgentService {
 *   // ...
 * }
 * ```
 */
export function Agent(options: AgentDecoratorOptions): ClassDecorator;
export function Agent(config: AgentConfig): ClassDecorator;
export function Agent(optionsOrConfig: AgentDecoratorOptions | AgentConfig): ClassDecorator {
  let metadata: AgentMetadata;

  // Check if it's a full AgentConfig (has retryPolicy with all required fields)
  if ('retryPolicy' in optionsOrConfig && optionsOrConfig.retryPolicy &&
      'maxRetries' in optionsOrConfig.retryPolicy &&
      'backoffMs' in optionsOrConfig.retryPolicy &&
      'exponentialBackoff' in optionsOrConfig.retryPolicy) {
    // Treat as full AgentConfig
    const config = optionsOrConfig as AgentConfig;
    metadata = {
      id: config.id,
      name: config.name,
      cluster: config.cluster,
      version: config.version,
      description: config.description,
      capabilities: config.capabilities,
      permissions: config.permissions,
      maxConcurrentTasks: config.maxConcurrentTasks,
      timeout: config.timeout,
      retryPolicy: config.retryPolicy,
    };
  } else {
    // Treat as AgentDecoratorOptions
    metadata = mergeOptionsToMetadata(optionsOrConfig as AgentDecoratorOptions);
  }

  return (target: Function) => {
    SetMetadata(AGENT_METADATA_KEY, metadata)(target);

    // Attach metadata directly to class for easy access
    (target as any).__agentMetadata = metadata;
  };
}

/**
 * Helper to extract agent metadata from a class.
 */
export function getAgentMetadata(target: Function): AgentMetadata | undefined {
  return (target as any).__agentMetadata;
}

/**
 * Helper to check if a class has agent metadata.
 */
export function isAgentClass(target: Function): boolean {
  return !!((target as any).__agentMetadata || Reflect.getMetadata(AGENT_METADATA_KEY, target));
}
