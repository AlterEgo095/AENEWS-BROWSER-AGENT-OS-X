export { Agent, getAgentConfig, AGENT_METADATA_KEY } from './agent.decorator';
export type { AgentConfig } from './agent.decorator';

export {
  Tool,
  getToolConfig,
  getToolRegistry,
  TOOL_METADATA_KEY,
  TOOLS_REGISTRY_KEY,
} from './tool.decorator';
export type {
  ToolConfig,
  ToolParameterSchema,
  ToolPermission,
} from './tool.decorator';

export {
  RequiresHumanApproval,
  HUMAN_APPROVAL_KEY,
  getHumanApprovalMetadata,
} from './human-approval.decorator';
export type { HumanApprovalOptions } from './human-approval.decorator';

export {
  CircuitBreaker,
  CIRCUIT_BREAKER_KEY,
  CIRCUIT_BREAKER_CONFIG_KEY,
  getCircuitBreakerConfig,
} from './circuit-breaker.decorator';

export {
  RateLimit,
  RateLimitDomain,
  RATE_LIMIT_KEY,
  RATE_LIMIT_DOMAIN_KEY,
} from './rate-limit.decorator';
