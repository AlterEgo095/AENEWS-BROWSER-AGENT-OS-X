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
