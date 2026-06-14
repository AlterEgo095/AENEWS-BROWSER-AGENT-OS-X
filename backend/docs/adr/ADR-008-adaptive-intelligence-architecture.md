# ADR-008: Adaptive Intelligence & Knowledge System Architecture

## Status: Accepted

## Date: 2026-06-14

## Context

After Phase 8 (Intelligent Orchestration & Multi-Agent Collaboration), agents can collaborate across clusters using patterns like delegation, handoff, parallel, pipeline, consensus, and swarm. However, the system lacks:

1. **Memory persistence across missions** — Agents don't learn from past successes/failures
2. **Knowledge connectivity** — No way to understand relationships between agents, missions, and outcomes
3. **Pattern recognition** — Recurring success/failure patterns go undetected
4. **Self-tuning** — Orchestration parameters are static and don't adapt to observed performance
5. **Feedback integration** — No mechanism to incorporate user/system feedback into agent behavior
6. **Experience reuse** — Past mission experiences can't be leveraged for future missions

## Decision

Implement a 6-service Adaptive Intelligence & Knowledge System (Phase 9):

### 1. KnowledgeGraphService (Neo4j-powered)

- **Purpose**: Persistent graph connecting agents, missions, outcomes, patterns, learnings
- **Graph Schema**: 8 node types (Agent, Mission, Pattern, Learning, Outcome, Strategy, Capability, Cluster) + 10 relationship types
- **Features**: Agent expertise scoring, strategy recommendations, collaboration partner discovery, graph analytics
- **Fallback**: In-memory cache when Neo4j is unavailable
- **Integration**: Feeds expertise data to AdaptiveStrategyService and AgentLearningEngine

### 2. AgentLearningEngine (Reinforcement-inspired)

- **Purpose**: Agents learn from execution outcomes using modified Q-learning
- **Mechanisms**: Q-value updates for strategies, capability confidence tracking, context-action mapping, failure pattern detection, optimization suggestions
- **Parameters**: α=0.1 (learning rate), γ=0.95 (discount), ε=0.15 (exploration), decay=0.995
- **Safety**: Learning is observational only — never modifies agent code; confidence thresholds prevent low-confidence suggestions; learning rate is bounded
- **Transfer Learning**: Can transfer learnings between agents in the same cluster with reduced weight (0.3 transfer factor)

### 3. PatternMiningService

- **Purpose**: Mine historical mission data for recurring patterns
- **Pattern Types**: Success sequences, failure sequences, collaboration patterns, optimization opportunities, anti-patterns, quality degradation
- **Algorithms**: Sequential pattern mining (n-gram), frequent itemset mining, correlation analysis (Pearson), temporal analysis
- **Output**: Discovered patterns with confidence, frequency, impact scores, and suggested actions
- **Integration**: Feeds patterns to KnowledgeGraphService and provides predictions to AdaptiveStrategyService

### 4. AdaptiveStrategyService

- **Purpose**: Self-tuning orchestration parameters based on learned performance data
- **Adaptive Parameters**: Pipeline timeouts, agent selection weights, strategy preferences, retry policies, resource allocation, collaboration defaults
- **Sources**: Learning engine (strategy preferences), knowledge graph (agent expertise), pattern mining (correlations)
- **Safety**: Bounded change rate (max 20% per cycle), cooldown period (60s), parameter pinning, emergency reset, full audit trail
- **A/B Testing**: Infrastructure supports running parallel configurations (future)

### 5. ExperienceReplayService

- **Purpose**: Store complete mission experiences for replay analysis and what-if simulation
- **Features**: Experience recording with full execution trace, replay analysis (extract insights), what-if simulation (alternative strategies), similar experience search
- **Storage**: In-memory with LONG_TERM memory tier persistence, indexed by cluster and outcome
- **Integration**: Feeds execution records to PatternMiningService

### 6. FeedbackAggregationService

- **Purpose**: Collect and aggregate feedback from multiple sources into actionable insights
- **Sources**: User (30% weight), Outcome Verification (25%), System (20%), Peer (15%), Agent Self (10%)
- **Pipeline**: Collect → Normalize → Weight → Aggregate → Analyze → Action
- **Features**: Temporal decay (7-day half-life), sentiment analysis, trend detection, automatic action item generation
- **Integration**: Feeds normalized feedback to AgentLearningEngine

### REST API: IntelligenceController

42 endpoints across 6 sub-domains:
- `/api/v1/intelligence/graph/*` — Knowledge graph operations
- `/api/v1/intelligence/learning/*` — Learning engine operations
- `/api/v1/intelligence/patterns/*` — Pattern mining operations
- `/api/v1/intelligence/adaptive/*` — Adaptive strategy operations
- `/api/v1/intelligence/experience/*` — Experience replay operations
- `/api/v1/intelligence/feedback/*` — Feedback aggregation operations

### Frontend: Intelligence Dashboard

6-tab dashboard with real-time data:
- Overview (KPIs, expertise rankings, strategy Q-values, experience/feedback summaries)
- Knowledge Graph (node/edge distribution, expertise table, relationship types)
- Learning (Q-value bars, cluster breakdown, learning parameters)
- Patterns (category breakdown, top patterns, correlations)
- Adaptive (effectiveness metrics, strategy preferences, pinned parameters)
- Feedback (source distribution, top issues/praise, action items)

## Consequences

### Positive
- Agents improve over time through reinforcement learning
- Knowledge graph enables semantic reasoning about agent relationships
- Pattern mining catches recurring issues before they cascade
- Self-tuning reduces manual configuration and optimizes performance
- Multi-source feedback provides holistic quality assessment
- Experience replay enables "what if" analysis without risk

### Negative
- Additional infrastructure dependency (Neo4j) with graceful fallback
- Learning requires sufficient data (cold start problem for new agents)
- Pattern mining computational cost grows with execution history
- Adaptation could introduce instability if not properly bounded
- Feedback aggregation requires trust calibration across sources

### Risks Mitigated
- **Runaway adaptation**: Bounded change rate + cooldown + pinning + emergency reset
- **Overconfident learning**: Confidence decay + minimum threshold + pruning
- **Cold start**: Default strategy preferences + transfer learning + exploration rate
- **Neo4j outage**: In-memory cache fallback with eventual consistency
