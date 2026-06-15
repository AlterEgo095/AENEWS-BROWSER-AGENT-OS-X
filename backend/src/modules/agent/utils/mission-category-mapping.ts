import { ClusterType, MissionCategory } from '../entities/agent.entity';

export const CLUSTER_MISSION_MAP: Record<ClusterType, MissionCategory[]> = {
  [ClusterType.BROWSER]: [MissionCategory.RESEARCH_ANALYSIS, MissionCategory.AUTOMATION_WORKFLOW],
  [ClusterType.COMPUTER]: [MissionCategory.SYSTEM_ADMINISTRATION],
  [ClusterType.CODING]: [MissionCategory.CODE_DEVELOPMENT],
  [ClusterType.OFFICE]: [MissionCategory.DOCUMENT_PROCESSING],
  [ClusterType.MARKETING]: [MissionCategory.MARKETING_GROWTH],
  [ClusterType.BUSINESS]: [MissionCategory.BUSINESS_INTELLIGENCE],
  [ClusterType.INFRASTRUCTURE]: [MissionCategory.INFRASTRUCTURE_MGMT],
  [ClusterType.SECURITY]: [MissionCategory.SECURITY_OPS],
  [ClusterType.META_INTELLIGENCE]: [MissionCategory.AI_ORCHESTRATION],
  [ClusterType.LLM_INTELLIGENCE]: [MissionCategory.AI_ORCHESTRATION],
  [ClusterType.INTELLIGENT_ORCHESTRATION]: [MissionCategory.AI_ORCHESTRATION],
  [ClusterType.WATCHDOG]: [MissionCategory.INFRASTRUCTURE_MGMT, MissionCategory.AI_ORCHESTRATION],
  [ClusterType.SELF_EVOLUTION]: [MissionCategory.AI_ORCHESTRATION],
  [ClusterType.CERTIFICATION]: [MissionCategory.AI_ORCHESTRATION, MissionCategory.SECURITY_OPS],
  [ClusterType.STEALTH_OPS]: [MissionCategory.STEALTH_OPERATIONS, MissionCategory.SECURITY_OPS],
  [ClusterType.DATA_INTELLIGENCE]: [MissionCategory.DATA_ENGINEERING, MissionCategory.RESEARCH_ANALYSIS, MissionCategory.BUSINESS_INTELLIGENCE],
  [ClusterType.COMMUNICATION]: [MissionCategory.COMMUNICATION_OPS, MissionCategory.AUTOMATION_WORKFLOW, MissionCategory.AI_ORCHESTRATION],
};

export function getMissionCategoriesForCluster(cluster: ClusterType): MissionCategory[] {
  return CLUSTER_MISSION_MAP[cluster] || [];
}
