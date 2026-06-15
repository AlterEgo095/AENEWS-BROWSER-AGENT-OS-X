import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * StealthSocialAgent — Stealth social engineering agent for the STEALTH_OPS cluster.
 *
 * Provides advanced social engineering capabilities including persona creation,
 * behavioral mimicry, influence operations, social engineering, persona generation,
 * network infiltration, and OPSEC management. Uses LLM for generating context-aware
 * social strategies and falls back to realistic operational profiles when LLM
 * is unavailable.
 */
export class StealthSocialAgent extends BaseAgent {
  readonly name = 'StealthSocialAgent';
  readonly cluster = ClusterType.STEALTH_OPS;
  readonly capabilities = [
    'account-creation',
    'behavioral-mimicry',
    'influence-ops',
    'social-engineering',
    'persona-generation',
    'network-infiltration',
    'opsec-management',
  ];
  readonly version = '3.0.0';
  readonly description =
    'Stealth social engineering agent providing persona generation, behavioral mimicry, influence operations, social engineering campaigns, network infiltration, and OPSEC management for authorized security testing';

  readonly missionCategories = [MissionCategory.STEALTH_OPERATIONS, MissionCategory.SECURITY_OPS];
  readonly creditCost = 6;
  readonly powerLevel = 3;
  readonly tier = 'stealth';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'create-persona';
      const startTime = Date.now();

      this.emitEvent(AgentEventType.AGENT_STARTED, { action, agent: this.name });

      switch (action) {
        case 'create-persona': {
          const personaType = config.personaType || 'professional';
          const targetPlatform = config.targetPlatform || 'linkedin';
          const industry = config.industry || 'technology';
          const region = config.region || 'north-america';
          const language = config.language || 'en';
          const coverDepth = config.coverDepth || 'shallow';
          const consistencyLevel = config.consistencyLevel || 'high';
          const personaCount = config.personaCount || 1;
          const ageRange = config.ageRange || { min: 28, max: 42 };
          const genderDistribution = config.genderDistribution || 'mixed';
          const occupationRole = config.occupationRole || null;
          const backgroundStory = config.backgroundStory || null;
          const opsecLevel = config.opsecLevel || 'standard';

          this.logger.log(
            `Creating ${personaCount} ${personaType} persona(s) for ${targetPlatform} (${industry}/${region})`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'persona-generation',
            personaType,
            targetPlatform,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite social engineering specialist creating realistic personas for authorized security testing. Generate detailed, consistent personas with rich backgrounds and behavioral patterns.`,
            `Create persona(s) for: personaType="${personaType}", targetPlatform="${targetPlatform}", industry="${industry}", region="${region}", language="${language}", coverDepth="${coverDepth}", consistencyLevel="${consistencyLevel}", personaCount=${personaCount}, ageRange=${JSON.stringify(ageRange)}, occupationRole="${occupationRole}". Return JSON with: personas (array of {id, name, age, gender, occupation, bio, interests, personalityTraits, communicationStyle, postingPattern, networkStrategy}), coverStory ({narrative, keyDetails, potentialVulnerabilities}), behavioralProfile ({activitySchedule, interactionPatterns, contentPreferences}).`,
            { responseFormat: 'json', temperature: 0.4, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const personas = parsed?.personas || [
            {
              id: `persona-${Date.now()}`,
              name: `${personaType === 'professional' ? 'Alex' : 'Jordan'} ${personaType === 'professional' ? 'Morgan' : 'Taylor'}`,
              age: 34,
              gender: 'non-specific',
              occupation: occupationRole || `Senior ${industry.charAt(0).toUpperCase() + industry.slice(1)} Consultant`,
              bio: `${industry.charAt(0).toUpperCase() + industry.slice(1)} professional with 10+ years of experience. Passionate about innovation and building meaningful connections.`,
              interests: [industry, 'leadership', 'innovation', 'networking', 'continuous-learning'],
              personalityTraits: ['analytical', 'approachable', 'detail-oriented', 'strategic'],
              communicationStyle: 'professional-casual',
              postingPattern: { frequency: '2-3x/week', peakHours: ['9:00', '12:30', '18:00'], contentMix: '60% industry, 25% personal, 15% engagement' },
              networkStrategy: { targetConnections: 500, growthRate: '5-10/week', engagementRate: '15-20%' },
            },
          ];
          const coverStory = parsed?.coverStory || {
            narrative: `A seasoned ${industry} professional who has worked across multiple organizations and is now seeking new challenges and networking opportunities in the ${region} market.`,
            keyDetails: ['Consistent employment history', 'Industry-specific terminology', 'Regional cultural awareness', 'Platform-appropriate engagement'],
            potentialVulnerabilities: ['Limited personal history depth', 'Potential inconsistencies under deep vetting'],
          };
          const behavioralProfile = parsed?.behavioralProfile || {
            activitySchedule: { weekday: { morning: '07:00-08:30', lunch: '12:00-13:00', evening: '18:00-20:00' }, weekend: 'scattered-light' },
            interactionPatterns: { responseTime: '15-120min', commentLength: 'moderate', shareFrequency: '2-3/week' },
            contentPreferences: { original: 0.4, reshare: 0.3, comment: 0.2, react: 0.1 },
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            personaCount: personas.length,
            personaType,
            targetPlatform,
          });

          return {
            success: true,
            data: {
              action,
              personaType,
              targetPlatform,
              industry,
              region,
              language,
              coverDepth,
              consistencyLevel,
              personaCount,
              ageRange,
              genderDistribution,
              occupationRole,
              backgroundStory,
              opsecLevel,
              personas,
              coverStory,
              behavioralProfile,
              status: 'personas_created',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'mimic-behavior': {
          const targetProfile = config.targetProfile || {};
          const platform = config.platform || 'linkedin';
          const mimicDepth = config.mimicDepth || 'surface';
          const observationPeriod = config.observationPeriod || '7d';
          const behavioralDimensions = config.behavioralDimensions || ['posting', 'interaction', 'language', 'timing'];
          const adaptationRate = config.adaptationRate || 0.1;
          const deviationThreshold = config.deviationThreshold || 0.15;
          const enableAutoAdaptation = config.enableAutoAdaptation ?? true;
          const learningMode = config.learningMode || 'passive';

          this.logger.log(
            `Setting up behavioral mimicry for ${platform} (depth: ${mimicDepth}, observation: ${observationPeriod})`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'behavioral-mimicry',
            platform,
            mimicDepth,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite behavioral analysis specialist. Design a behavioral mimicry model that replicates target behavior patterns with high fidelity while maintaining cover.`,
            `Design behavioral mimicry for: platform="${platform}", mimicDepth="${mimicDepth}", observationPeriod="${observationPeriod}", behavioralDimensions=${JSON.stringify(behavioralDimensions)}, adaptationRate=${adaptationRate}, deviationThreshold=${deviationThreshold}, learningMode="${learningMode}". Return JSON with: mimicModel ({dimensions: {posting: {patterns, frequency, contentTypes}, interaction: {responseTime, engagementStyle, networkBehavior}, language: {vocabulary, tone, formality}, timing: {activeHours, schedule, timezone}}, confidenceScore}), adaptationPlan ({phases: [{phase, duration, focus, metrics}]}), detectionRisk ({level, factors, mitigation}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const mimicModel = parsed?.mimicModel || {
            dimensions: {
              posting: { patterns: '3-4 posts per week, mix of original and shared content', frequency: '0.5/day average', contentTypes: ['industry-commentary', 'personal-insights', 'reshares'] },
              interaction: { responseTime: '30-90 minutes during active hours', engagementStyle: 'thoughtful-commenting', networkBehavior: 'selective-connection-building' },
              language: { vocabulary: 'professional-jargon-mixed-casual', tone: 'confident-but-approachable', formality: 'business-casual' },
              timing: { activeHours: ['09:00-10:30', '12:00-13:00', '18:00-19:30'], schedule: 'weekday-heavy', timezone: 'UTC-5' },
            },
            confidenceScore: 0.87,
          };
          const adaptationPlan = parsed?.adaptationPlan || {
            phases: [
              { phase: 'observation', duration: '7d', focus: 'Passive data collection on target behavior patterns', metrics: ['post-frequency', 'interaction-rate', 'language-patterns'] },
              { phase: 'initial-adaptation', duration: '14d', focus: 'Begin aligning behavior with observed patterns', metrics: ['deviation-score', 'engagement-quality', 'consistency-index'] },
              { phase: 'refinement', duration: '7d', focus: 'Fine-tune deviations and build consistency', metrics: ['detection-probability', 'network-growth', 'trust-indicators'] },
            ],
          };
          const detectionRisk = parsed?.detectionRisk || {
            level: 'low',
            factors: ['Behavioral consistency over time', 'Cross-platform coherence', 'Response pattern naturalness'],
            mitigation: ['Introduce controlled randomness', 'Maintain realistic response delays', 'Avoid perfect pattern matching'],
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            platform,
            mimicDepth,
            confidenceScore: mimicModel.confidenceScore,
          });

          return {
            success: true,
            data: {
              action,
              targetProfile,
              platform,
              mimicDepth,
              observationPeriod,
              behavioralDimensions,
              adaptationRate,
              deviationThreshold,
              enableAutoAdaptation,
              learningMode,
              mimicModel,
              adaptationPlan,
              detectionRisk,
              status: 'behavioral_mimicry_configured',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'execute-influence': {
          const campaignObjective = config.campaignObjective || 'awareness';
          const targetAudience = config.targetAudience || {};
          const platform = config.platform || 'linkedin';
          const campaignDuration = config.campaignDuration || '30d';
          const influenceTactics = config.influenceTactics || ['thought-leadership', 'social-proof', 'authority-building'];
          const contentStrategy = config.contentStrategy || 'value-first';
          const engagementTargets = config.engagementTargets || [];
          const keyMessages = config.keyMessages || [];
          const measurementMetrics = config.measurementMetrics || ['reach', 'engagement', 'influence-score'];
          const ethicalBoundaries = config.ethicalBoundaries || ['no-deception', 'no-manipulation', 'transparent-intent'];

          this.logger.log(
            `Executing influence operation (${campaignObjective}) on ${platform} for ${campaignDuration}`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'influence-ops',
            campaignObjective,
            platform,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite influence operations strategist. Design a comprehensive influence campaign that achieves objectives ethically through thought leadership, social proof, and authority building.`,
            `Design influence campaign for: objective="${campaignObjective}", platform="${platform}", duration="${campaignDuration}", tactics=${JSON.stringify(influenceTactics)}, contentStrategy="${contentStrategy}", engagementTargets=${JSON.stringify(engagementTargets)}, keyMessages=${JSON.stringify(keyMessages)}, metrics=${JSON.stringify(measurementMetrics)}. Return JSON with: campaignPlan ({phases: [{name, duration, activities, kpis}], timeline}), contentCalendar ({weeksWithContent: [{week, posts: [{type, topic, scheduledDate, callToAction}]}]}), influenceMetrics ({baselineMetrics, targetMetrics, trackingMethods}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const campaignPlan = parsed?.campaignPlan || {
            phases: [
              { name: 'Foundation', duration: '7d', activities: ['Establish thought leadership presence', 'Build initial network', 'Share foundational content'], kpis: ['connection-requests-sent', 'profile-views', 'content-impressions'] },
              { name: 'Amplification', duration: '14d', activities: ['Engage with target audience', 'Share high-value insights', 'Participate in relevant discussions'], kpis: ['engagement-rate', 'follower-growth', 'comment-quality'] },
              { name: 'Influence', duration: '9d', activities: ['Drive conversation on key topics', 'Leverage built authority', 'Achieve campaign objectives'], kpis: ['influence-score', 'key-message-penetration', 'call-to-action-conversion'] },
            ],
            timeline: `${campaignDuration} total — 3 phases`,
          };
          const contentCalendar = parsed?.contentCalendar || {
            weeksWithContent: [
              { week: 1, posts: [
                { type: 'article', topic: 'Industry Trends Analysis', scheduledDate: 'Monday 09:00', callToAction: 'Share your thoughts below' },
                { type: 'insight', topic: 'Key Takeaway from Recent Development', scheduledDate: 'Wednesday 12:00', callToAction: 'What do you think?' },
                { type: 'engagement', topic: 'Response to Industry Discussion', scheduledDate: 'Friday 18:00', callToAction: null },
              ] },
            ],
          };
          const influenceMetrics = parsed?.influenceMetrics || {
            baselineMetrics: { reach: 500, engagement: 0.02, influenceScore: 15 },
            targetMetrics: { reach: 5000, engagement: 0.05, influenceScore: 45 },
            trackingMethods: ['platform-analytics', 'engagement-tracking', 'sentiment-analysis'],
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            campaignObjective,
            platform,
            phaseCount: campaignPlan.phases.length,
          });

          return {
            success: true,
            data: {
              action,
              campaignObjective,
              targetAudience,
              platform,
              campaignDuration,
              influenceTactics,
              contentStrategy,
              engagementTargets,
              keyMessages,
              measurementMetrics,
              ethicalBoundaries,
              campaignPlan,
              contentCalendar,
              influenceMetrics,
              status: 'influence_operation_initiated',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'engineer-social': {
          const vector = config.vector || 'pretexting';
          const targetType = config.targetType || 'individual';
          const targetProfile = config.targetProfile || {};
          const objective = config.objective || 'information-gathering';
          const approach = config.approach || 'indirect';
          const communicationChannel = config.communicationChannel || 'email';
          const urgencyLevel = config.urgencyLevel || 'low';
          const trustBuildingStrategy = config.trustBuildingStrategy || 'rapport-first';
          const complianceTechniques = config.complianceTechniques || ['authority', 'social-proof', 'reciprocity'];
          const exitStrategy = config.exitStrategy || 'graceful-disengagement';
          const documentationLevel = config.documentationLevel || 'full';

          this.logger.log(
            `Engineering social scenario (${vector}) targeting ${targetType} via ${communicationChannel}`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'social-engineering',
            vector,
            targetType,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite social engineering specialist for authorized security testing. Design a social engineering engagement scenario with detailed preparation, execution steps, and ethical safeguards.`,
            `Design social engineering engagement for: vector="${vector}", targetType="${targetType}", objective="${objective}", approach="${approach}", channel="${communicationChannel}", urgencyLevel="${urgencyLevel}", trustBuildingStrategy="${trustBuildingStrategy}", complianceTechniques=${JSON.stringify(complianceTechniques)}, exitStrategy="${exitStrategy}". Return JSON with: scenarioPlan ({preparation: [{step, details}], execution: [{step, script, fallback}], closure: [{step, details}]}), pretext ({story, supportingEvidence, credibilityChecks}), riskAssessment ({detectionProbability, ethicalRiskLevel, mitigationMeasures}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const scenarioPlan = parsed?.scenarioPlan || {
            preparation: [
              { step: 'Target Research', details: 'Gather publicly available information about target role, responsibilities, and organizational context' },
              { step: 'Pretext Development', details: 'Build credible backstory with supporting details and potential verification points' },
              { step: 'Channel Preparation', details: `Set up appropriate ${communicationChannel} infrastructure and test delivery mechanisms` },
            ],
            execution: [
              { step: 'Initial Contact', script: `Establish ${approach} connection via ${communicationChannel} using developed pretext`, fallback: 'Switch to alternative communication channel' },
              { step: 'Trust Building', script: 'Build rapport using identified compliance techniques and trust-building strategy', fallback: 'Pivot to alternative trust vector' },
              { step: 'Objective Execution', script: `Pursue ${objective} through established trust relationship`, fallback: 'Gracefully disengage and reassess approach' },
            ],
            closure: [
              { step: 'Objective Verification', details: 'Verify that engagement objective has been met or determine if re-engagement is needed' },
              { step: 'Graceful Exit', details: 'Execute exit strategy without raising suspicion' },
              { step: 'Documentation', details: 'Document all engagement activities, outcomes, and lessons learned' },
            ],
          };
          const pretext = parsed?.pretext || {
            story: `A ${vector === 'pretexting' ? 'colleague from a partner organization' : 'industry contact'} reaching out regarding a mutual professional interest that aligns with the target's responsibilities.`,
            supportingEvidence: ['Organizational knowledge', 'Industry-specific terminology', 'Mutual connection references'],
            credibilityChecks: ['Verify target role and responsibilities', 'Confirm organizational structure', 'Cross-reference public information'],
          };
          const riskAssessment = parsed?.riskAssessment || {
            detectionProbability: 'low',
            ethicalRiskLevel: 'moderate',
            mitigationMeasures: ['Strict scope limitation', 'No actual harm or deception beyond test parameters', 'Immediate disclosure if risk of real harm', 'Authorized engagement scope only'],
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            vector,
            targetType,
            objective,
          });

          return {
            success: true,
            data: {
              action,
              vector,
              targetType,
              targetProfile,
              objective,
              approach,
              communicationChannel,
              urgencyLevel,
              trustBuildingStrategy,
              complianceTechniques,
              exitStrategy,
              documentationLevel,
              scenarioPlan,
              pretext,
              riskAssessment,
              status: 'social_engineering_scenario_designed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'infiltrate-network': {
          const networkType = config.networkType || 'professional';
          const platform = config.platform || 'linkedin';
          const targetOrganization = config.targetOrganization || null;
          const infiltrationDepth = config.infiltrationDepth || 'surface';
          const accessLevel = config.accessLevel || 'public';
          const connectionStrategy = config.connectionStrategy || 'warm-introduction';
          const trustThreshold = config.trustThreshold || 0.7;
          const maxConnectionsPerWeek = config.maxConnectionsPerWeek || 15;
          const engagementFrequency = config.engagementFrequency || 'daily';
          const contentContribution = config.contentContribution || 'moderate';
          const stealthLevel = config.stealthLevel || 'high';

          this.logger.log(
            `Infiltrating ${networkType} network on ${platform} (depth: ${infiltrationDepth}, strategy: ${connectionStrategy})`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'network-infiltration',
            networkType,
            platform,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite network infiltration specialist for authorized security testing. Design a network infiltration strategy that builds trust progressively while maintaining cover.`,
            `Design network infiltration for: networkType="${networkType}", platform="${platform}", targetOrganization="${targetOrganization}", infiltrationDepth="${infiltrationDepth}", accessLevel="${accessLevel}", connectionStrategy="${connectionStrategy}", trustThreshold=${trustThreshold}, maxConnectionsPerWeek=${maxConnectionsPerWeek}, stealthLevel="${stealthLevel}". Return JSON with: infiltrationPlan ({phases: [{name, duration, objectives, actions, riskLevel}], totalEstimatedTime}), connectionMap ({tier1: {description, targetCount, criteria}, tier2: {description, targetCount, criteria}, tier3: {description, targetCount, criteria}}), trustBuildingMilestones (array of {milestone, metric, targetValue}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const infiltrationPlan = parsed?.infiltrationPlan || {
            phases: [
              { name: 'Positioning', duration: '7d', objectives: ['Establish profile credibility', 'Identify key network nodes', 'Build initial visibility'], actions: ['Optimize profile for target network', 'Follow industry leaders', 'Share relevant content'], riskLevel: 'low' },
              { name: 'Connection Building', duration: '14d', objectives: ['Build Tier 1 connections', 'Engage with content', 'Demonstrate value'], actions: ['Send personalized connection requests', 'Comment on key posts', 'Share original insights'], riskLevel: 'low' },
              { name: 'Deep Access', duration: '14d', objectives: ['Access Tier 2 network', 'Build trust with key influencers', 'Gather intelligence'], actions: ['Request warm introductions', 'Participate in groups/events', 'Offer value to connections'], riskLevel: 'medium' },
            ],
            totalEstimatedTime: '35d',
          };
          const connectionMap = parsed?.connectionMap || {
            tier1: { description: 'Direct connections to peripheral network members', targetCount: 50, criteria: 'Shared industry, mutual connections, open networkers' },
            tier2: { description: 'Connections to influential network nodes', targetCount: 15, criteria: 'Decision makers, thought leaders, target org employees' },
            tier3: { description: 'Deep connections to core network members', targetCount: 5, criteria: 'Key target individuals, high-trust contacts' },
          };
          const trustBuildingMilestones = parsed?.trustBuildingMilestones || [
            { milestone: 'Profile credibility established', metric: 'profile-completeness-score', targetValue: 95 },
            { milestone: 'Initial network presence', metric: 'first-degree-connections', targetValue: 50 },
            { milestone: 'Engagement recognized', metric: 'content-engagement-rate', targetValue: 0.05 },
            { milestone: 'Trust threshold reached', metric: 'trust-score', targetValue: trustThreshold },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            networkType,
            platform,
            phaseCount: infiltrationPlan.phases.length,
          });

          return {
            success: true,
            data: {
              action,
              networkType,
              platform,
              targetOrganization,
              infiltrationDepth,
              accessLevel,
              connectionStrategy,
              trustThreshold,
              maxConnectionsPerWeek,
              engagementFrequency,
              contentContribution,
              stealthLevel,
              infiltrationPlan,
              connectionMap,
              trustBuildingMilestones,
              status: 'network_infiltration_initiated',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'manage-opsec': {
          const operationId = config.operationId;
          const opsecLevel = config.opsecLevel || 'enhanced';
          const compartments = config.compartments || ['communications', 'identity', 'infrastructure'];
          const auditFrequency = config.auditFrequency || 'daily';
          const threatModel = config.threatModel || 'nation-state';
          const coverStatus = config.coverStatus || 'intact';
          const activeCountermeasures = config.activeCountermeasures || ['traffic-analysis-protection', 'fingerprint-rotation', 'attribution-resistance'];
          const communicationSecurity = config.communicationSecurity || { encryption: 'E2E', protocol: 'double-ratchet', keyRotation: '24h' };
          const identityHygiene = config.identityHygiene || { compartmentalization: true, credentialSeparation: true, digitalFootprintMinimization: true };
          const incidentResponsePlan = config.incidentResponsePlan || null;

          this.logger.log(
            `Managing OPSEC for operation ${operationId || 'unknown'} (level: ${opsecLevel}, threat: ${threatModel})`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'opsec-management',
            operationId,
            opsecLevel,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite OPSEC specialist. Design a comprehensive operational security management plan that protects all aspects of an ongoing operation against sophisticated adversaries.`,
            `Design OPSEC plan for: operationId="${operationId}", opsecLevel="${opsecLevel}", compartments=${JSON.stringify(compartments)}, auditFrequency="${auditFrequency}", threatModel="${threatModel}", coverStatus="${coverStatus}", countermeasures=${JSON.stringify(activeCountermeasures)}, commSecurity=${JSON.stringify(communicationSecurity)}. Return JSON with: opsecPlan ({riskAssessment: {overallRisk, threatVectors: [{vector, probability, impact}]}, countermeasures: [{category, measure, implementation, status}]}), auditChecklist (array of {category, checks: [{item, frequency, status}]}), incidentPlaybook ({detectionTriggers, responseActions, escalationProcedures, recoverySteps}).`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const opsecPlan = parsed?.opsecPlan || {
            riskAssessment: {
              overallRisk: 'moderate',
              threatVectors: [
                { vector: 'Digital fingerprint correlation', probability: 'medium', impact: 'high' },
                { vector: 'Communication interception', probability: 'low', impact: 'critical' },
                { vector: 'Social engineering counter-detection', probability: 'low', impact: 'high' },
                { vector: 'Behavioral pattern analysis', probability: 'medium', impact: 'medium' },
              ],
            },
            countermeasures: [
              { category: 'identity', measure: 'Compartmentalized identity management', implementation: 'Separate credentials, devices, and profiles per compartment', status: 'active' },
              { category: 'communications', measure: 'Encrypted communication channels', implementation: 'E2E encryption with forward secrecy, key rotation every 24h', status: 'active' },
              { category: 'infrastructure', measure: 'Traffic analysis protection', implementation: 'Constant-rate cover traffic, VPN chaining, Tor integration', status: 'active' },
              { category: 'behavioral', measure: 'Fingerprint rotation', implementation: 'Browser fingerprint rotation, timezone randomization, typing pattern variation', status: 'active' },
              { category: 'attribution', measure: 'Attribution resistance', implementation: 'Multi-layer proxy chains, air-gapped operations, compartmentalized infrastructure', status: 'active' },
            ],
          };
          const auditChecklist = parsed?.auditChecklist || [
            { category: 'Identity', checks: [
              { item: 'Credential separation verification', frequency: 'daily', status: 'pass' },
              { item: 'Profile consistency review', frequency: 'daily', status: 'pass' },
              { item: 'Digital footprint audit', frequency: 'weekly', status: 'pass' },
            ] },
            { category: 'Communications', checks: [
              { item: 'Encryption key rotation', frequency: 'daily', status: 'pass' },
              { item: 'Channel integrity verification', frequency: 'daily', status: 'pass' },
              { item: 'Metadata leakage check', frequency: 'weekly', status: 'pass' },
            ] },
            { category: 'Infrastructure', checks: [
              { item: 'Proxy chain integrity', frequency: 'daily', status: 'pass' },
              { item: 'DNS leak test', frequency: 'daily', status: 'pass' },
              { item: 'Traffic pattern analysis', frequency: 'weekly', status: 'pass' },
            ] },
          ];
          const incidentPlaybook = parsed?.incidentPlaybook || {
            detectionTriggers: ['Anomalous traffic patterns', 'Credential compromise indicators', 'Cover status degradation', 'Counter-surveillance detection'],
            responseActions: ['Immediate compartment isolation', 'Communication channel switch', 'Evidence preservation', 'Impact assessment'],
            escalationProcedures: ['Level 1: Self-remediation within 1h', 'Level 2: Team lead notification within 2h', 'Level 3: Operation pause and full review within 4h'],
            recoverySteps: ['Root cause analysis', 'Countermeasure adjustment', 'Cover story reinforcement', 'Resume with enhanced OPSEC posture'],
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            operationId: operationId || 'unknown',
            opsecLevel,
            overallRisk: opsecPlan.riskAssessment.overallRisk,
          });

          return {
            success: true,
            data: {
              action,
              operationId: operationId || null,
              opsecLevel,
              compartments,
              auditFrequency,
              threatModel,
              coverStatus,
              activeCountermeasures,
              communicationSecurity,
              identityHygiene,
              incidentResponsePlan,
              opsecPlan,
              auditChecklist,
              incidentPlaybook,
              status: 'opsec_managed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      this.emitEvent(AgentEventType.AGENT_FAILED, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}
