/**
 * AENEWS Agent OS X → PDEOS — Phase 5
 *
 * File: backend/src/modules/learning-engine/dto/learning.dto.ts
 */
import { IsString, IsEnum, IsOptional, IsObject, IsArray, IsNumber } from 'class-validator';

export enum LearningPatternType {
  MISSION_SUCCESS = 'mission_success',
  MISSION_FAILURE = 'mission_failure',
  USER_HABIT = 'user_habit',
  PROMPT_OPTIMIZATION = 'prompt_optimization',
  AGENT_PERFORMANCE = 'agent_performance',
  COST_PATTERN = 'cost_pattern',
  ERROR_PATTERN = 'error_pattern',
  AUTOMATION_OPPORTUNITY = 'automation_opportunity',
}

export interface LearningPattern {
  id: string;
  type: LearningPatternType;
  name: string;
  description: string;
  occurrences: number;
  confidence: number;        // 0-1
  firstSeenAt: Date;
  lastSeenAt: Date;
  examples: any[];           // sample data points
  metadata?: any;
  recommendedAction?: string;
  autoApplied: boolean;
}

export interface ExperienceRecord {
  id: string;
  missionId: string;
  agentName: string;
  input: any;
  plan: any;
  output: any;
  success: boolean;
  durationMs: number;
  costUSD: number;
  qualityScore?: number;
  feedback?: 'positive' | 'negative' | 'neutral';
  timestamp: Date;
  learnings?: string[];      // what was learned
}

export interface FeedbackEntry {
  id: string;
  userId: string;
  targetType: 'mission' | 'agent' | 'content' | 'system';
  targetId: string;
  feedback: 'positive' | 'negative' | 'neutral';
  rating: number;            // 1-5
  comment?: string;
  implicit: boolean;         // true if inferred from behavior
  timestamp: Date;
}

export interface PromptOptimization {
  id: string;
  agentName: string;
  originalPrompt: string;
  optimizedPrompt: string;
  metric: 'success_rate' | 'quality_score' | 'cost' | 'latency';
  beforeValue: number;
  afterValue: number;
  improvementPercent: number;
  createdAt: Date;
  appliedAt?: Date;
  rolledBackAt?: Date;
}

export interface HabitDetection {
  id: string;
  userId: string;
  pattern: string;           // e.g., "user does X then Y on Tuesdays"
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;        // 0-6
  hourOfDay?: number;        // 0-23
  occurrences: number;
  confidence: number;
  suggestedAutomation?: string;
  acceptedByUser: boolean;
  detectedAt: Date;
}

export interface AutomationSuggestion {
  id: string;
  pattern: string;
  rationale: string;
  potentialTimeSavedHours: number;
  estimatedSetupEffortHours: number;
  implementationPlan: string;
  status: 'pending' | 'approved' | 'rejected' | 'implemented' | 'archived';
  suggestedBy: string;       // agent name
  createdAt: Date;
  reviewedAt?: Date;
  implementedAt?: Date;
}

export interface ThresholdCalibration {
  id: string;
  metric: string;            // e.g., "cpu_usage", "api_latency_p95"
  previousThreshold: number;
  newThreshold: number;
  baseline: number;
  stdDev: number;
  rationale: string;
  confidence: number;
  appliedAt: Date;
  rollbackAt?: Date;
}
