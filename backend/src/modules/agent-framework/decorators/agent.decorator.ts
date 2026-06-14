import { ClusterType } from '../../agent/entities/agent.entity';

/**
 * Configuration for the @Agent decorator.
 */
export interface AgentConfig {
  /** Human-readable agent name */
  name: string;
  /** Cluster this agent belongs to */
  cluster: ClusterType;
  /** List of capabilities this agent provides */
  capabilities: string[];
  /** Human-readable description */
  description: string;
  /** Agent version */
  version?: string;
}

/**
 * Metadata key for storing agent configuration on a class.
 */
export const AGENT_METADATA_KEY = 'agent:config';

/**
 * @Agent(config) — Class decorator that marks a class as an agent
 * and attaches metadata (name, cluster, capabilities, description).
 *
 * Usage:
 *   @Agent({
 *     name: 'web-scraper',
 *     cluster: ClusterType.BROWSER,
 *     capabilities: ['scraping', 'navigation'],
 *     description: 'Scrapes web pages and extracts structured data',
 *   })
 *   class WebScraperAgent extends BaseAgent { ... }
 */
export function Agent(config: AgentConfig): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(AGENT_METADATA_KEY, config, target);

    // Also set as static property for easier access without Reflect API
    if (!target.prototype) {
      target._agentConfig = config;
    }
  };
}

/**
 * Retrieve the agent configuration from a decorated class.
 */
export function getAgentConfig(target: any): AgentConfig | undefined {
  return (
    Reflect.getMetadata(AGENT_METADATA_KEY, target) || target._agentConfig
  );
}
