import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * NavigationAgent — Browser navigation with Bridge + LLM integration.
 *
 * Handles URL navigation, page transitions, and browser history management.
 * Uses the AgentBridgeService to execute real browser navigation when available,
 * and LLM to analyze navigation results.
 *
 * When Bridge is available: Executes real browser navigation via connector.
 * When LLM is available: Analyzes page content and navigation results.
 * Falls back to simulated navigation when services are unavailable.
 */
export class NavigationAgent extends BaseAgent {
  readonly name = 'NavigationAgent';
  readonly cluster = ClusterType.BROWSER;
  readonly capabilities = [
    'navigate',
    'back',
    'forward',
    'reload',
    'history',
    'waitForNavigation',
    'goto',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Handles URL navigation, page transitions, and browser history management with Bridge + LLM support';

  readonly missionCategories = [MissionCategory.RESEARCH_ANALYSIS, MissionCategory.AUTOMATION_WORKFLOW];
  readonly creditCost = 1;
  readonly powerLevel = 1;
  readonly tier = 'standard';

  /** Tracks navigation history for the current session. */
  private navigationHistory: Array<{ url: string; timestamp: string; action: string }> = [];

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'navigate';
      const startTime = Date.now();

      switch (action) {
        case 'navigate':
        case 'goto': {
          const url = config.url;
          if (!url) {
            return { success: false, error: 'URL is required for navigation' };
          }
          const waitUntil = config.waitUntil || 'load';
          const timeout = config.timeout || 30000;

          this.logger.log(
            `Navigating to ${url} (waitUntil: ${waitUntil}, timeout: ${timeout}ms)`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, url });

          // Try bridge for real browser navigation
          let bridgeResult: any = null;
          try {
            bridgeResult = await this.executeViaBridge('browser', 'navigate', {
              url,
              waitUntil,
              timeout,
            });
          } catch {
            this.logger.debug('Bridge navigation failed or unavailable');
          }

          // Try LLM to analyze navigation result
          let llmAnalysis: string | null = null;
          if (bridgeResult) {
            const llmResult = await this.executeWithLLM(
              `You are a web navigation analyst. Analyze the result of navigating to a URL.
Return a JSON object with this structure:
{
  "pageType": "landing|article|form|dashboard|error|redirect|other",
  "summary": "...",
  "loadStatus": "loaded|partial|error",
  "keyElements": ["..."],
  "accessibility": "good|moderate|poor"
}`,
              `Navigation result for URL ${url}: ${JSON.stringify(bridgeResult).slice(0, 2000)}`,
              { responseFormat: 'json' },
            );
            llmAnalysis = llmResult;
          }

          // Track navigation history
          this.navigationHistory.push({
            url,
            timestamp: new Date().toISOString(),
            action: 'navigate',
          });

          const parsedAnalysis = this.safeJsonParse(llmAnalysis);

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, url, hadBridge: !!bridgeResult, hadLLM: !!llmAnalysis });

          return {
            success: true,
            data: {
              action,
              url,
              waitUntil,
              timeout,
              status: bridgeResult ? 'navigated' : 'navigated-simulated',
              bridgeResult: bridgeResult || null,
              analysis: parsedAnalysis || null,
              historyLength: this.navigationHistory.length,
              generatedBy: bridgeResult ? 'bridge' : 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: bridgeResult ? 'bridge' : 'fallback' },
          };
        }

        case 'back': {
          const steps = config.steps || 1;
          this.logger.log(`Navigating back ${steps} step(s)`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, steps });

          // Try bridge
          let bridgeResult: any = null;
          try {
            bridgeResult = await this.executeViaBridge('browser', 'navigate', {
              direction: 'back',
              steps,
            });
          } catch {
            // Bridge unavailable
          }

          // Update history tracking
          const lastEntry = this.navigationHistory[this.navigationHistory.length - 1];
          this.navigationHistory.push({
            url: lastEntry?.url || 'unknown',
            timestamp: new Date().toISOString(),
            action: 'back',
          });

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, steps });
          return {
            success: true,
            data: {
              action,
              steps,
              status: bridgeResult ? 'navigated_back' : 'navigated_back_simulated',
              bridgeResult: bridgeResult || null,
              historyLength: this.navigationHistory.length,
              generatedBy: bridgeResult ? 'bridge' : 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: bridgeResult ? 'bridge' : 'fallback' },
          };
        }

        case 'forward': {
          const steps = config.steps || 1;
          this.logger.log(`Navigating forward ${steps} step(s)`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, steps });

          let bridgeResult: any = null;
          try {
            bridgeResult = await this.executeViaBridge('browser', 'navigate', {
              direction: 'forward',
              steps,
            });
          } catch {
            // Bridge unavailable
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, steps });
          return {
            success: true,
            data: {
              action,
              steps,
              status: bridgeResult ? 'navigated_forward' : 'navigated_forward_simulated',
              bridgeResult: bridgeResult || null,
              generatedBy: bridgeResult ? 'bridge' : 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: bridgeResult ? 'bridge' : 'fallback' },
          };
        }

        case 'reload': {
          const ignoreCache = config.ignoreCache || false;
          this.logger.log(`Reloading page (ignoreCache: ${ignoreCache})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, ignoreCache });

          let bridgeResult: any = null;
          try {
            bridgeResult = await this.executeViaBridge('browser', 'navigate', {
              action: 'reload',
              ignoreCache,
            });
          } catch {
            // Bridge unavailable
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action });
          return {
            success: true,
            data: {
              action,
              ignoreCache,
              status: bridgeResult ? 'reloaded' : 'reloaded_simulated',
              bridgeResult: bridgeResult || null,
              generatedBy: bridgeResult ? 'bridge' : 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: bridgeResult ? 'bridge' : 'fallback' },
          };
        }

        case 'history': {
          this.logger.log('Retrieving browser history');
          this.emitEvent(AgentEventType.AGENT_STARTED, { action });

          // Try bridge for real history
          let bridgeResult: any = null;
          try {
            bridgeResult = await this.executeViaBridge('browser', 'navigate', {
              action: 'history',
            });
          } catch {
            // Bridge unavailable
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action });
          return {
            success: true,
            data: {
              action,
              entries: bridgeResult?.entries || this.navigationHistory,
              status: bridgeResult ? 'history_retrieved' : 'history_retrieved_local',
              bridgeResult: bridgeResult || null,
              generatedBy: bridgeResult ? 'bridge' : 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: bridgeResult ? 'bridge' : 'fallback' },
          };
        }

        case 'waitForNavigation': {
          const timeout = config.timeout || 30000;
          const waitUntil = config.waitUntil || 'load';
          this.logger.log(
            `Waiting for navigation (timeout: ${timeout}ms, waitUntil: ${waitUntil})`,
          );
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, timeout });

          let bridgeResult: any = null;
          try {
            bridgeResult = await this.executeViaBridge('browser', 'navigate', {
              action: 'waitForNavigation',
              timeout,
              waitUntil,
            });
          } catch {
            // Bridge unavailable
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action });
          return {
            success: true,
            data: {
              action,
              timeout,
              waitUntil,
              status: bridgeResult ? 'navigation_detected' : 'navigation_detected_simulated',
              bridgeResult: bridgeResult || null,
              generatedBy: bridgeResult ? 'bridge' : 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: bridgeResult ? 'bridge' : 'fallback' },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
