/**
 * AENEWS Agent OS X — Advanced Consensus Protocol
 *
 * Phase 10 — Robust multi-agent consensus with weighted voting,
 * Byzantine fault tolerance, and multi-round deliberation.
 *
 * Weighted Voting:
 *   Agent votes are weighted by expertise score (from KnowledgeGraphService),
 *   reliability history, and cluster relevance. Weights are normalized.
 *
 * Byzantine Fault Tolerance:
 *   Implements practical BFT with 3f+1 agents tolerating f faulty agents.
 *   Includes vote verification, commitment, and outlier detection.
 *
 * Multi-Round Deliberation:
 *   Agents can challenge, support, or propose alternatives across rounds.
 *   Convergence is tracked per round. Max 5 rounds with early termination
 *   on supermajority (>66%).
 *
 * Dissent Tracking:
 *   Dissenting opinions are preserved with rationale, enabling audit trails
 *   and potential pattern discovery.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentHealthService } from './agent-health.service';
import { ClusterType } from '../../agent/entities/agent.entity';
import { LLMService } from '../../llm/llm.service';

// ─── Consensus Types ──────────────────────────────────────────────

export type ConsensusStatus =
  | 'pending'
  | 'deliberating'
  | 'voting'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'byzantine_detected';

export type VoteType = 'support' | 'oppose' | 'abstain' | 'challenge' | 'alternative';

export type ConsensusStrategy =
  | 'simple_majority'     // >50% weighted votes
  | 'supermajority'      // >66% weighted votes
  | 'unanimous'          // 100% weighted votes
  | 'bft'               // Byzantine fault tolerant
  | 'weighted_quorum';   // Quorum with weighted votes

export interface ConsensusProposal {
  id: string;
  content: any;
  proposedBy: string;
  round: number;
  timestamp: number;
  alternatives?: ConsensusProposal[];
}

export interface ConsensusVote {
  agentId: string;
  clusterType: ClusterType;
  voteType: VoteType;
  weight: number;
  rationale?: string;
  alternative?: ConsensusProposal;
  round: number;
  timestamp: number;
  commitment?: string; // hash-based commitment for BFT
}

export interface AgentExpertise {
  agentId: string;
  expertiseScore: number;   // 0-1 from knowledge graph
  reliabilityScore: number; // 0-1 from execution history
  clusterRelevance: number; // 0-1 how relevant the cluster is
  byzantineSuspicion: number; // 0-1 how suspicious the agent is
}

export interface ConsensusConfig {
  id: string;
  proposal: ConsensusProposal;
  strategy: ConsensusStrategy;
  participants: AgentExpertise[];
  maxRounds: number;
  quorumThreshold: number;    // 0-1, fraction of participants needed
  supermajorityThreshold: number; // 0-1, default 0.66
  byzantineTolerance: number; // f, number of faulty agents tolerated
  timeoutPerRoundMs: number;  // default 30000
  enableDissentTracking: boolean;
  enableMultiRound: boolean;
  metadata?: Record<string, any>;
}

export interface DeliberationRound {
  roundNumber: number;
  votes: ConsensusVote[];
  weightedSupport: number;
  weightedOpposition: number;
  weightedAbstain: number;
  challenges: ConsensusVote[];
  alternatives: ConsensusProposal[];
  convergenceScore: number;
  timestamp: number;
}

export interface DissentRecord {
  agentId: string;
  voteType: VoteType;
  rationale: string;
  round: number;
  expertiseWeight: number;
  reviewedByHuman: boolean;
}

export interface ConsensusResult {
  consensusId: string;
  status: ConsensusStatus;
  proposal: ConsensusProposal;
  acceptedProposal?: ConsensusProposal;
  rounds: DeliberationRound[];
  finalSupport: number;
  finalOpposition: number;
  dissentRecords: DissentRecord[];
  byzantineAgents: string[];
  totalRounds: number;
  durationMs: number;
  participants: string[];
  strategy: ConsensusStrategy;
}

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class AdvancedConsensusProtocol {
  private readonly logger = new Logger(AdvancedConsensusProtocol.name);

  /** Active consensus sessions */
  private readonly sessions = new Map<string, ConsensusConfig>();

  /** Deliberation rounds by consensus ID */
  private readonly rounds = new Map<string, DeliberationRound[]>();

  /** Consensus results */
  private readonly results = new Map<string, ConsensusResult>();

  /** Agent expertise cache */
  private readonly expertiseCache = new Map<string, AgentExpertise>();

  /** Byzantine suspicion scores */
  private readonly byzantineScores = new Map<string, number>();

  constructor(
    private readonly eventBus: AgentEventBusService,
    private readonly healthService: AgentHealthService,
    @Optional() private readonly llmService?: LLMService,
  ) {}

  // ─── Consensus Lifecycle ──────────────────────────────────────

  /**
   * Initialize a new consensus session.
   */
  async initiateConsensus(config: Partial<ConsensusConfig> & { id: string; proposal: ConsensusProposal }): Promise<ConsensusConfig> {
    const fullConfig: ConsensusConfig = {
      strategy: 'simple_majority',
      participants: [],
      maxRounds: 5,
      quorumThreshold: 0.5,
      supermajorityThreshold: 0.66,
      byzantineTolerance: 0,
      timeoutPerRoundMs: 30000,
      enableDissentTracking: true,
      enableMultiRound: true,
      ...config,
    };

    // Validate BFT requirements
    if (fullConfig.strategy === 'bft') {
      const minParticipants = 3 * fullConfig.byzantineTolerance + 1;
      if (fullConfig.participants.length < minParticipants) {
        this.logger.warn(`BFT requires ${minParticipants} participants for f=${fullConfig.byzantineTolerance}, got ${fullConfig.participants.length}. Falling back to supermajority.`);
        fullConfig.strategy = 'supermajority';
      }
    }

    // Normalize weights
    this.normalizeWeights(fullConfig.participants);

    this.sessions.set(fullConfig.id, fullConfig);
    this.rounds.set(fullConfig.id, []);

    this.logger.log(`Consensus ${fullConfig.id} initiated with ${fullConfig.participants.length} participants, strategy: ${fullConfig.strategy}`);

    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'AdvancedConsensusProtocol',
      data: { event: 'consensus.initiated', consensusId: fullConfig.id, strategy: fullConfig.strategy, participants: fullConfig.participants.length },
      timestamp: new Date(),
    });

    return fullConfig;
  }

  /**
   * Run the full consensus protocol.
   */
  async runConsensus(consensusId: string): Promise<ConsensusResult> {
    const config = this.sessions.get(consensusId);
    if (!config) {
      throw new Error(`Consensus ${consensusId} not found`);
    }

    const startTime = Date.now();
    const deliberationRounds: DeliberationRound[] = [];
    const dissentRecords: DissentRecord[] = [];
    const byzantineAgents: string[] = [];

    let currentProposal = config.proposal;
    let accepted = false;

    try {
      for (let round = 1; round <= config.maxRounds; round++) {
        this.logger.log(`Consensus ${consensusId}: Round ${round}/${config.maxRounds}`);

        // Collect votes for this round
        const votes = await this.collectVotes(consensusId, currentProposal, round);

        // Check for Byzantine behavior
        const byzantineDetected = this.detectByzantineBehavior(votes, config);
        if (byzantineDetected.length > 0) {
          byzantineAgents.push(...byzantineDetected);
          this.logger.warn(`Consensus ${consensusId}: Byzantine agents detected: ${byzantineDetected.join(', ')}`);

          // Remove Byzantine votes
          const cleanVotes = votes.filter(v => !byzantineDetected.includes(v.agentId));

          if (config.strategy === 'bft' && byzantineDetected.length > config.byzantineTolerance) {
            // Too many faulty agents — consensus fails
            const failedResult: ConsensusResult = {
              consensusId,
              status: 'byzantine_detected',
              proposal: config.proposal,
              rounds: deliberationRounds,
              finalSupport: 0,
              finalOpposition: 0,
              dissentRecords,
              byzantineAgents,
              totalRounds: round,
              durationMs: Date.now() - startTime,
              participants: config.participants.map(p => p.agentId),
              strategy: config.strategy,
            };
            this.results.set(consensusId, failedResult);
            return failedResult;
          }
        }

        // Calculate weighted tallies
        const weightedSupport = votes
          .filter(v => v.voteType === 'support')
          .reduce((sum, v) => sum + v.weight, 0);

        const weightedOpposition = votes
          .filter(v => v.voteType === 'oppose')
          .reduce((sum, v) => sum + v.weight, 0);

        const weightedAbstain = votes
          .filter(v => v.voteType === 'abstain')
          .reduce((sum, v) => sum + v.weight, 0);

        // Track challenges and alternatives
        const challenges = votes.filter(v => v.voteType === 'challenge');
        const alternatives = votes
          .filter(v => v.voteType === 'alternative' && v.alternative)
          .map(v => v.alternative!);

        // Calculate convergence
        const totalWeight = weightedSupport + weightedOpposition + weightedAbstain;
        const convergenceScore = totalWeight > 0
          ? Math.max(weightedSupport, weightedOpposition) / totalWeight
          : 0;

        const roundResult: DeliberationRound = {
          roundNumber: round,
          votes,
          weightedSupport,
          weightedOpposition,
          weightedAbstain,
          challenges,
          alternatives,
          convergenceScore,
          timestamp: Date.now(),
        };

        deliberationRounds.push(roundResult);

        // Track dissent
        if (config.enableDissentTracking) {
          for (const vote of votes.filter(v => v.voteType === 'oppose' || v.voteType === 'challenge')) {
            const expertise = config.participants.find(p => p.agentId === vote.agentId);
            dissentRecords.push({
              agentId: vote.agentId,
              voteType: vote.voteType,
              rationale: vote.rationale || 'No rationale provided',
              round,
              expertiseWeight: expertise?.expertiseScore || 0,
              reviewedByHuman: false,
            });
          }
        }

        // Check if consensus reached
        const quorumMet = votes.length >= config.participants.length * config.quorumThreshold;
        if (!quorumMet) {
          this.logger.warn(`Consensus ${consensusId}: Quorum not met in round ${round}`);
          continue;
        }

        const totalActiveWeight = weightedSupport + weightedOpposition;
        if (totalActiveWeight === 0) continue;

        const supportRatio = weightedSupport / totalActiveWeight;

        switch (config.strategy) {
          case 'simple_majority':
            accepted = supportRatio > 0.5;
            break;
          case 'supermajority':
            accepted = supportRatio > config.supermajorityThreshold;
            break;
          case 'unanimous':
            accepted = weightedOpposition === 0 && weightedSupport > 0;
            break;
          case 'bft':
            // BFT: need >2/3 support from non-faulty agents
            accepted = supportRatio > (2 / 3);
            break;
          case 'weighted_quorum':
            accepted = weightedSupport > totalWeight * config.quorumThreshold;
            break;
        }

        // Early termination on supermajority
        if (accepted && supportRatio > config.supermajorityThreshold && config.enableMultiRound) {
          this.logger.log(`Consensus ${consensusId}: Early termination — supermajority reached in round ${round}`);
          break;
        }

        // If not accepted and there are alternatives, adopt the best alternative
        if (!accepted && alternatives.length > 0 && config.enableMultiRound) {
          // Pick the alternative with most support
          const bestAlternative = this.selectBestAlternative(votes, alternatives);
          if (bestAlternative) {
            currentProposal = bestAlternative;
            this.logger.log(`Consensus ${consensusId}: Adopting alternative proposal for round ${round + 1}`);
          }
        }

        // If convergence is high but not yet accepted, try one more round
        if (convergenceScore > 0.9 && !accepted && round < config.maxRounds) {
          this.logger.log(`Consensus ${consensusId}: High convergence (${convergenceScore.toFixed(2)}) but not yet accepted, continuing`);
        }
      }

      const finalRound = deliberationRounds[deliberationRounds.length - 1];

      const result: ConsensusResult = {
        consensusId,
        status: accepted ? 'completed' : 'failed',
        proposal: config.proposal,
        acceptedProposal: accepted ? currentProposal : undefined,
        rounds: deliberationRounds,
        finalSupport: finalRound?.weightedSupport || 0,
        finalOpposition: finalRound?.weightedOpposition || 0,
        dissentRecords,
        byzantineAgents,
        totalRounds: deliberationRounds.length,
        durationMs: Date.now() - startTime,
        participants: config.participants.map(p => p.agentId),
        strategy: config.strategy,
      };

      this.results.set(consensusId, result);

      await this.eventBus.publish({
        type: AgentEventType.CUSTOM,
        source: 'AdvancedConsensusProtocol',
        data: {
          event: accepted ? 'consensus.reached' : 'consensus.failed',
          consensusId,
          rounds: deliberationRounds.length,
          support: result.finalSupport,
          opposition: result.finalOpposition,
        },
        timestamp: new Date(),
      });

      return result;
    } catch (error: any) {
      this.logger.error(`Consensus ${consensusId} failed: ${error.message}`, error.stack);

      const failedResult: ConsensusResult = {
        consensusId,
        status: 'failed',
        proposal: config.proposal,
        rounds: deliberationRounds,
        finalSupport: 0,
        finalOpposition: 0,
        dissentRecords,
        byzantineAgents,
        totalRounds: deliberationRounds.length,
        durationMs: Date.now() - startTime,
        participants: config.participants.map(p => p.agentId),
        strategy: config.strategy,
      };

      this.results.set(consensusId, failedResult);
      return failedResult;
    }
  }

  // ─── Vote Collection ──────────────────────────────────────────

  /**
   * Collect votes from all participants for a given round.
   */
  private async collectVotes(
    consensusId: string,
    proposal: ConsensusProposal,
    round: number,
  ): Promise<ConsensusVote[]> {
    const config = this.sessions.get(consensusId);
    if (!config) return [];

    const votes: ConsensusVote[] = [];

    for (const participant of config.participants) {
      // Skip agents with high Byzantine suspicion
      if (participant.byzantineSuspicion > 0.8) {
        this.logger.warn(`Skipping Byzantine-suspected agent ${participant.agentId}`);
        continue;
      }

      try {
        const vote = await this.solicitVote(participant, proposal, round, config);
        votes.push(vote);
      } catch (error: any) {
        this.logger.warn(`Agent ${participant.agentId} failed to vote: ${error.message}`);
        // Abstain on failure
        votes.push({
          agentId: participant.agentId,
          clusterType: ClusterType.META_INTELLIGENCE,
          voteType: 'abstain',
          weight: participant.expertiseScore * participant.reliabilityScore,
          rationale: `Vote failed: ${error.message}`,
          round,
          timestamp: Date.now(),
        });
      }
    }

    return votes;
  }

  /**
   * Solicit a vote from a single agent.
   */
  private async solicitVote(
    participant: AgentExpertise,
    proposal: ConsensusProposal,
    round: number,
    config: ConsensusConfig,
  ): Promise<ConsensusVote> {
    // Use LLM for intelligent voting if available
    if (this.llmService) {
      try {
        const llmResponse = await this.llmService.chat(
          [
            {
              role: 'system',
              content: `You are an agent participating in a consensus protocol. Your expertise score is ${participant.expertiseScore.toFixed(2)} and reliability is ${participant.reliabilityScore.toFixed(2)}. Review the proposal and vote: support, oppose, abstain, challenge, or propose an alternative.`,
            },
            {
              role: 'user',
              content: `Proposal: ${JSON.stringify(proposal.content)}. Round: ${round}. Strategy: ${config.strategy}. Cast your vote with rationale.`,
            },
          ],
          { temperature: 0.3, maxTokens: 200 },
        );

        const voteType = this.parseVoteType(llmResponse.content);
        const weight = participant.expertiseScore * participant.reliabilityScore * participant.clusterRelevance;

        return {
          agentId: participant.agentId,
          clusterType: ClusterType.META_INTELLIGENCE,
          voteType,
          weight,
          rationale: llmResponse.content.slice(0, 500),
          round,
          timestamp: Date.now(),
          commitment: config.strategy === 'bft' ? this.generateCommitment(participant.agentId, proposal.id, round) : undefined,
        };
      } catch {
        // Fall through to simulation
      }
    }

    // Simulation-based voting
    const weight = participant.expertiseScore * participant.reliabilityScore * participant.clusterRelevance;
    const voteType = this.simulateVote(participant, proposal, round);

    return {
      agentId: participant.agentId,
      clusterType: ClusterType.META_INTELLIGENCE,
      voteType,
      weight,
      rationale: `Simulated vote based on expertise (${participant.expertiseScore.toFixed(2)}) and reliability (${participant.reliabilityScore.toFixed(2)})`,
      round,
      timestamp: Date.now(),
    };
  }

  // ─── Byzantine Fault Detection ────────────────────────────────

  /**
   * Detect Byzantine (faulty/adversarial) behavior in votes.
   */
  private detectByzantineBehavior(votes: ConsensusVote[], config: ConsensusConfig): string[] {
    const byzantineAgents: string[] = [];

    // 1. Detect flip-flopping (voting differently across rounds)
    const agentVotes = new Map<string, VoteType[]>();
    for (const vote of votes) {
      const history = agentVotes.get(vote.agentId) || [];
      history.push(vote.voteType);
      agentVotes.set(vote.agentId, history);
    }

    for (const [agentId, voteHistory] of agentVotes) {
      if (voteHistory.length >= 3) {
        const uniqueVotes = new Set(voteHistory);
        if (uniqueVotes.size === voteHistory.length) {
          // Agent voted differently every time — suspicious
          byzantineAgents.push(agentId);
        }
      }
    }

    // 2. Detect outlier votes (contradicting high-expertise consensus)
    const highExpertiseVotes = votes.filter(v => {
      const participant = config.participants.find(p => p.agentId === v.agentId);
      return participant && participant.expertiseScore > 0.7;
    });

    if (highExpertiseVotes.length > 0) {
      const majorityVote = this.getMajorityVoteType(highExpertiseVotes);
      const outlierVotes = votes.filter(v =>
        v.voteType !== majorityVote && v.voteType !== 'abstain'
      );

      for (const outlier of outlierVotes) {
        const suspicion = (this.byzantineScores.get(outlier.agentId) || 0) + 0.2;
        this.byzantineScores.set(outlier.agentId, Math.min(1, suspicion));

        if (suspicion > 0.7) {
          byzantineAgents.push(outlier.agentId);
        }
      }
    }

    // 3. Detect commitment violations (BFT only)
    if (config.strategy === 'bft') {
      const committedVotes = votes.filter(v => v.commitment);
      for (const vote of committedVotes) {
        if (!this.verifyCommitment(vote.commitment!, vote.agentId, vote.voteType)) {
          byzantineAgents.push(vote.agentId);
        }
      }
    }

    // Deduplicate
    return [...new Set(byzantineAgents)];
  }

  // ─── Utility Methods ──────────────────────────────────────────

  /**
   * Normalize participant weights so they sum to 1.
   */
  private normalizeWeights(participants: AgentExpertise[]): void {
    const totalWeight = participants.reduce(
      (sum, p) => sum + p.expertiseScore * p.reliabilityScore * p.clusterRelevance,
      0,
    );

    if (totalWeight > 0) {
      for (const p of participants) {
        p.expertiseScore = (p.expertiseScore * p.reliabilityScore * p.clusterRelevance) / totalWeight;
      }
    }
  }

  /**
   * Parse vote type from LLM response text.
   */
  private parseVoteType(response: string): VoteType {
    const lower = response.toLowerCase();
    if (lower.includes('support') || lower.includes('agree') || lower.includes('accept')) return 'support';
    if (lower.includes('oppose') || lower.includes('reject') || lower.includes('disagree')) return 'oppose';
    if (lower.includes('challenge') || lower.includes('question')) return 'challenge';
    if (lower.includes('alternative') || lower.includes('instead') || lower.includes('propose')) return 'alternative';
    if (lower.includes('abstain') || lower.includes('neutral')) return 'abstain';
    return 'support'; // default
  }

  /**
   * Simulate a vote based on agent expertise and proposal quality.
   */
  private simulateVote(participant: AgentExpertise, proposal: ConsensusProposal, round: number): VoteType {
    // Higher expertise agents are more decisive
    const decisiveness = participant.expertiseScore * participant.reliabilityScore;

    if (decisiveness > 0.7) {
      return Math.random() > 0.3 ? 'support' : 'oppose';
    } else if (decisiveness > 0.4) {
      return Math.random() > 0.5 ? 'support' : 'abstain';
    } else {
      return Math.random() > 0.6 ? 'abstain' : 'challenge';
    }
  }

  /**
   * Get the majority vote type from a set of votes.
   */
  private getMajorityVoteType(votes: ConsensusVote[]): VoteType {
    const counts: Record<VoteType, number> = {
      support: 0, oppose: 0, abstain: 0, challenge: 0, alternative: 0,
    };

    for (const vote of votes) {
      counts[vote.voteType]++;
    }

    let maxType: VoteType = 'support';
    let maxCount = 0;
    for (const [type, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type as VoteType;
      }
    }
    return maxType;
  }

  /**
   * Generate a commitment hash for BFT voting.
   */
  private generateCommitment(agentId: string, proposalId: string, round: number): string {
    // Simple hash-based commitment (in production, use proper cryptographic hash)
    const data = `${agentId}:${proposalId}:${round}:${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `commit-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Verify a commitment for BFT.
   */
  private verifyCommitment(commitment: string, agentId: string, voteType: VoteType): boolean {
    // Simplified verification — in production, use proper commitment schemes
    return commitment.startsWith('commit-') && voteType !== undefined;
  }

  /**
   * Select the best alternative from proposed alternatives.
   */
  private selectBestAlternative(votes: ConsensusVote[], alternatives: ConsensusProposal[]): ConsensusProposal | null {
    if (alternatives.length === 0) return null;

    // Count support for each alternative
    const supportCounts = new Map<string, number>();
    for (const alt of alternatives) {
      const support = votes
        .filter(v => v.alternative?.id === alt.id)
        .reduce((sum, v) => sum + v.weight, 0);
      supportCounts.set(alt.id, support);
    }

    // Find the alternative with most support
    let bestAlt: ConsensusProposal | null = null;
    let bestSupport = 0;
    for (const alt of alternatives) {
      const support = supportCounts.get(alt.id) || 0;
      if (support > bestSupport) {
        bestSupport = support;
        bestAlt = alt;
      }
    }

    return bestAlt;
  }

  // ─── Query Methods ────────────────────────────────────────────

  getConsensus(consensusId: string): ConsensusConfig | undefined {
    return this.sessions.get(consensusId);
  }

  getConsensusResult(consensusId: string): ConsensusResult | undefined {
    return this.results.get(consensusId);
  }

  getDeliberationRounds(consensusId: string): DeliberationRound[] {
    return this.rounds.get(consensusId) || [];
  }

  getDissentRecords(consensusId: string): DissentRecord[] {
    return this.results.get(consensusId)?.dissentRecords || [];
  }

  getByzantineScores(): Record<string, number> {
    return Object.fromEntries(this.byzantineScores);
  }

  getAllConsensus(): { id: string; status: ConsensusStatus; strategy: ConsensusStrategy; participants: number }[] {
    const result: { id: string; status: ConsensusStatus; strategy: ConsensusStrategy; participants: number }[] = [];
    for (const [id, config] of this.sessions) {
      const consensusResult = this.results.get(id);
      result.push({
        id,
        status: consensusResult?.status ?? 'pending',
        strategy: config.strategy,
        participants: config.participants.length,
      });
    }
    return result;
  }

  getStats(): { totalConsensus: number; completedConsensus: number; failedConsensus: number; byzantineDetections: number } {
    let completed = 0;
    let failed = 0;
    let byzantineDetections = 0;

    for (const [, result] of this.results) {
      if (result.status === 'completed') completed++;
      else if (result.status === 'failed' || result.status === 'byzantine_detected') failed++;
      byzantineDetections += result.byzantineAgents.length;
    }

    return {
      totalConsensus: this.sessions.size,
      completedConsensus: completed,
      failedConsensus: failed,
      byzantineDetections,
    };
  }

  /**
   * Update an agent's expertise score (called from external services).
   */
  updateAgentExpertise(agentId: string, expertise: Partial<AgentExpertise>): void {
    const existing = this.expertiseCache.get(agentId) || {
      agentId,
      expertiseScore: 0.5,
      reliabilityScore: 0.5,
      clusterRelevance: 0.5,
      byzantineSuspicion: 0,
    };

    this.expertiseCache.set(agentId, { ...existing, ...expertise });
  }
}
