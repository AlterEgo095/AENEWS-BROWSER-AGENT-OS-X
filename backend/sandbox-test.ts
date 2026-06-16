/**
 * AENEWS Agent OS X — Premium Sandbox Test Runner
 * Instantiates and executes every agent with mock context, captures results,
 * validates structure, and generates a comprehensive test report.
 * 
 * No database, Redis, or external services required — fully autonomous.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Mock Services ───────────────────────────────────────────────

class MockLLMService {
  isAnyAvailable() { return true; }
  
  async chatWithSystem(systemPrompt: string, userPrompt: string, options?: any) {
    // Simulate LLM response based on the agent's system prompt
    const isJSON = options?.responseFormat === 'json';
    
    if (systemPrompt.includes('arbitrat') || systemPrompt.includes('judge') || systemPrompt.includes('decision')) {
      return {
        content: isJSON ? JSON.stringify({
          ruling: 'partial-favor',
          winningPosition: 'Position A',
          reasoning: 'Mock arbitration: balanced analysis suggests partial favor.',
          confidence: 0.85,
          conditions: ['Further review recommended'],
          dissentingNotes: 'Automated test arbitration.'
        }) : 'Mock arbitration response',
        usage: { totalTokens: 250 },
        model: 'mock-model'
      };
    }
    
    if (systemPrompt.includes('navigat') || systemPrompt.includes('browser')) {
      return {
        content: isJSON ? JSON.stringify({
          pageType: 'landing',
          summary: 'Mock page analysis: standard landing page detected.',
          loadStatus: 'loaded',
          keyElements: ['header', 'navigation', 'content', 'footer'],
          accessibility: 'good'
        }) : 'Mock navigation analysis',
        usage: { totalTokens: 180 },
        model: 'mock-model'
      };
    }
    
    if (systemPrompt.includes('threat') || systemPrompt.includes('security') || systemPrompt.includes('vulnerability')) {
      return {
        content: isJSON ? JSON.stringify({
          threatLevel: 'low',
          findings: ['No critical threats detected in mock scan'],
          recommendations: ['Continue monitoring', 'Update signatures'],
          confidence: 0.9
        }) : 'Mock security analysis: no threats detected',
        usage: { totalTokens: 200 },
        model: 'mock-model'
      };
    }
    
    if (systemPrompt.includes('code') || systemPrompt.includes('review') || systemPrompt.includes('debug')) {
      return {
        content: isJSON ? JSON.stringify({
          issues: [],
          qualityScore: 0.85,
          suggestions: ['Consider adding error handling'],
          complexity: 'moderate'
        }) : 'Mock code analysis: code quality is good',
        usage: { totalTokens: 220 },
        model: 'mock-model'
      };
    }
    
    // Generic LLM response
    return {
      content: isJSON ? JSON.stringify({
        analysis: 'Mock LLM analysis completed successfully',
        confidence: 0.8,
        recommendations: ['Proceed with implementation'],
        status: 'analyzed'
      }) : 'Mock LLM response: analysis completed',
      usage: { totalTokens: 150 },
      model: 'mock-model'
    };
  }
}

class MockBridgeService {
  async executeViaConnector(connector: string, action: string, params: any) {
    return {
      connector,
      action,
      status: 'mock_success',
      data: { message: `Mock ${connector}.${action} executed`, params },
      timestamp: new Date().toISOString()
    };
  }
}

class MockEventBusService {
  private events: any[] = [];
  
  emit(eventType: any, agentName: string, data?: any) {
    this.events.push({ eventType, agentName, data, timestamp: Date.now() });
  }
  
  getEvents() { return this.events; }
  clear() { this.events = []; }
}

// ─── Test Runner ─────────────────────────────────────────────────

interface AgentTestResult {
  agentName: string;
  cluster: string;
  file: string;
  instantiated: boolean;
  instantiationError?: string;
  actions: {
    action: string;
    success: boolean;
    duration: number;
    dataKeys: string[];
    error?: string;
    hasLLMData: boolean;
    hasBridgeData: boolean;
    hasFallbackData: boolean;
    responseQuality: 'rich' | 'adequate' | 'stub' | 'empty';
  }[];
  overallStatus: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'STUB' | 'BROKEN';
  score: number;
}

const CLUSTERS_DIR = path.join(__dirname, 'src/clusters');
const mockLLM = new MockLLMService();
const mockBridge = new MockBridgeService();
const mockEventBus = new MockEventBusService();
const testResults: AgentTestResult[] = [];

// Map cluster to default test configs per capability
function getTestConfig(cluster: string, capability: string): Record<string, any> {
  const baseConfig: Record<string, any> = { action: capability };
  
  switch (cluster) {
    case 'browser':
      return { ...baseConfig, url: 'https://example.com', waitUntil: 'load', timeout: 5000 };
    case 'computer':
      return { ...baseConfig, path: '/tmp/test', command: 'echo test' };
    case 'coding':
      return { ...baseConfig, repository: 'test-repo', filePath: 'test.ts', content: 'console.log("test")' };
    case 'office':
      return { ...baseConfig, documentId: 'doc-123', content: 'Test document' };
    case 'marketing':
      return { ...baseConfig, campaignId: 'camp-123', target: 'test-audience' };
    case 'business':
      return { ...baseConfig, reportType: 'quarterly', period: 'Q1-2026' };
    case 'infrastructure':
      return { ...baseConfig, serviceName: 'test-service', environment: 'staging' };
    case 'security':
      return { ...baseConfig, scanType: 'quick', targets: ['localhost'] };
    case 'meta-intelligence':
      return { ...baseConfig, domain: 'test', query: 'test analysis' };
    case 'llm-intelligence':
      return { ...baseConfig, targetOutput: 'test output', criteria: ['quality'] };
    case 'intelligent-orchestration':
      return { ...baseConfig, missionId: 'mission-123', priority: 'high' };
    case 'certification':
      return { ...baseConfig, targetId: 'target-123', criteria: ['completeness'] };
    case 'watchdog':
      return { ...baseConfig, serviceName: 'llm', errorType: 'timeout' };
    case 'self-evolution':
      return { ...baseConfig, module: 'agents', scope: 'quality' };
    default:
      return baseConfig;
  }
}

function assessResponseQuality(data: any): 'rich' | 'adequate' | 'stub' | 'empty' {
  if (!data) return 'empty';
  
  const keys = Object.keys(data);
  const nonNullValues = keys.filter(k => data[k] !== null && data[k] !== undefined && data[k] !== '' && !(Array.isArray(data[k]) && data[k].length === 0));
  
  // Count deeply nested non-null values
  let deepValues = 0;
  for (const key of keys) {
    const val = data[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      deepValues += Object.keys(val).filter(k => val[k] !== null && val[k] !== undefined).length;
    }
    if (Array.isArray(val) && val.length > 0) {
      deepValues += val.length;
    }
  }
  
  if (nonNullValues.length >= 5 && deepValues >= 3) return 'rich';
  if (nonNullValues.length >= 3 && deepValues >= 1) return 'adequate';
  if (nonNullValues.length >= 1) return 'stub';
  return 'empty';
}

async function testAgent(cluster: string, agentFile: string): Promise<AgentTestResult> {
  const filePath = path.join(CLUSTERS_DIR, cluster, 'agents', agentFile);
  const result: AgentTestResult = {
    agentName: '',
    cluster,
    file: agentFile,
    instantiated: false,
    actions: [],
    overallStatus: 'BROKEN',
    score: 0,
  };

  try {
    // Dynamic import using ts-node transpile
    const modulePath = filePath.replace(/\.ts$/, '');
    let AgentClass: any;
    
    try {
      const module = await import(modulePath);
      // Find the exported class (default or named)
      AgentClass = module.default || Object.values(module).find((v: any) => typeof v === 'function' && v.prototype?.execute) as any;
    } catch (importError: any) {
      result.instantiated = false;
      result.instantiationError = `Import failed: ${importError.message}`;
      result.overallStatus = 'BROKEN';
      result.score = 0;
      return result;
    }
    
    if (!AgentClass) {
      result.instantiated = false;
      result.instantiationError = 'No agent class found in module';
      result.overallStatus = 'BROKEN';
      result.score = 0;
      return result;
    }
    
    // Instantiate the agent
    const agent = new AgentClass();
    agent.setServices({
      llmService: mockLLM as any,
      bridgeService: mockBridge as any,
      eventBus: mockEventBus as any,
    });
    
    result.agentName = agent.name || agentFile.replace('.agent.ts', '');
    result.instantiated = true;
    
    // Test each capability
    const capabilities: string[] = agent.capabilities || [];
    
    for (const capability of capabilities.slice(0, 3)) { // Test up to 3 capabilities
      mockEventBus.clear();
      const testConfig = getTestConfig(cluster, capability);
      
      const context = {
        agentId: `test-${result.agentName}-${Date.now()}`,
        tenantId: 'test-tenant',
        missionId: 'test-mission',
        taskId: 'test-task',
        config: testConfig,
        parameters: testConfig,
        metadata: { testRun: true }
      };
      
      const startTime = Date.now();
      try {
        const execResult = await agent.execute(context);
        const duration = Date.now() - startTime;
        
        result.actions.push({
          action: capability,
          success: execResult.success,
          duration,
          dataKeys: execResult.data ? Object.keys(execResult.data) : [],
          error: execResult.error,
          hasLLMData: execResult.data?.generatedBy === 'llm' || execResult.data?.source === 'llm' || !!execResult.data?.analysis,
          hasBridgeData: !!execResult.data?.bridgeResult,
          hasFallbackData: execResult.data?.generatedBy === 'fallback' || execResult.data?.status?.includes('simulated'),
          responseQuality: assessResponseQuality(execResult.data),
        });
      } catch (execError: any) {
        result.actions.push({
          action: capability,
          success: false,
          duration: Date.now() - startTime,
          dataKeys: [],
          error: execError.message,
          hasLLMData: false,
          hasBridgeData: false,
          hasFallbackData: false,
          responseQuality: 'empty',
        });
      }
    }
    
    // Calculate score
    const successRate = result.actions.filter(a => a.success).length / Math.max(result.actions.length, 1);
    const richRate = result.actions.filter(a => a.responseQuality === 'rich').length / Math.max(result.actions.length, 1);
    const llmRate = result.actions.filter(a => a.hasLLMData).length / Math.max(result.actions.length, 1);
    const fallbackRate = result.actions.filter(a => a.hasFallbackData).length / Math.max(result.actions.length, 1);
    
    result.score = Math.round((successRate * 40 + richRate * 25 + llmRate * 20 + fallbackRate * 15) * 10) / 10;
    
    if (result.score >= 80) result.overallStatus = 'EXCELLENT';
    else if (result.score >= 60) result.overallStatus = 'GOOD';
    else if (result.score >= 40) result.overallStatus = 'ACCEPTABLE';
    else if (result.score >= 20) result.overallStatus = 'STUB';
    else result.overallStatus = 'BROKEN';
    
  } catch (error: any) {
    result.instantiated = false;
    result.instantiationError = error.message;
    result.overallStatus = 'BROKEN';
    result.score = 0;
  }
  
  return result;
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   AENEWS Agent OS X — Premium Sandbox Test Runner                  ║');
  console.log('║   Testing all agents with mock services (no DB/Redis required)     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
  
  const clusterDirs = fs.readdirSync(CLUSTERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  let totalAgents = 0;
  let totalTested = 0;
  let totalBroken = 0;
  let totalStub = 0;
  let totalAcceptable = 0;
  let totalGood = 0;
  let totalExcellent = 0;
  
  for (const cluster of clusterDirs) {
    const agentsDir = path.join(CLUSTERS_DIR, cluster, 'agents');
    if (!fs.existsSync(agentsDir)) continue;
    
    const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.agent.ts'));
    
    console.log(`\n── Testing Cluster: ${cluster} (${agentFiles.length} agents) ──\n`);
    
    for (const agentFile of agentFiles) {
      totalAgents++;
      const result = await testAgent(cluster, agentFile);
      testResults.push(result);
      totalTested++;
      
      const statusEmoji = {
        'EXCELLENT': '🌟',
        'GOOD': '✅',
        'ACCEPTABLE': '⚠️',
        'STUB': '🔶',
        'BROKEN': '❌'
      }[result.overallStatus];
      
      if (result.overallStatus === 'EXCELLENT') totalExcellent++;
      else if (result.overallStatus === 'GOOD') totalGood++;
      else if (result.overallStatus === 'ACCEPTABLE') totalAcceptable++;
      else if (result.overallStatus === 'STUB') totalStub++;
      else totalBroken++;
      
      const name = (result.agentName || agentFile).padEnd(35);
      const score = `${result.score}`.padStart(5);
      const status = `${result.overallStatus}`.padEnd(10);
      const actions = result.actions.map(a => `${a.action}:${a.success ? '✓' : '✗'}`).join(' ').slice(0, 60);
      
      console.log(`  ${statusEmoji} ${name} Score: ${score}  Status: ${status}  Actions: ${actions}`);
      
      if (result.instantiationError) {
        console.log(`     ERROR: ${result.instantiationError.slice(0, 100)}`);
      }
    }
  }
  
  // ─── Summary ─────────────────────────────────────────────────
  console.log('\n\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   TEST RUN SUMMARY                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`  Total Agents:       ${totalAgents}`);
  console.log(`  Successfully Run:   ${totalTested}`);
  console.log(`  🌟 EXCELLENT:       ${totalExcellent} (${((totalExcellent / totalAgents) * 100).toFixed(1)}%)`);
  console.log(`  ✅ GOOD:            ${totalGood} (${((totalGood / totalAgents) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  ACCEPTABLE:     ${totalAcceptable} (${((totalAcceptable / totalAgents) * 100).toFixed(1)}%)`);
  console.log(`  🔶 STUB:            ${totalStub} (${((totalStub / totalAgents) * 100).toFixed(1)}%)`);
  console.log(`  ❌ BROKEN:          ${totalBroken} (${((totalBroken / totalAgents) * 100).toFixed(1)}%)`);
  
  const avgScore = testResults.reduce((sum, r) => sum + r.score, 0) / totalAgents;
  console.log(`\n  📊 Average Score:   ${avgScore.toFixed(1)}/100`);
  
  const platformScore = (
    (totalExcellent / totalAgents) * 40 +
    (totalGood / totalAgents) * 30 +
    (totalAcceptable / totalAgents) * 15 +
    (totalStub / totalAgents) * 5 +
    avgScore * 0.1
  );
  
  console.log(`  🏆 Platform Score:  ${platformScore.toFixed(1)}/100`);
  
  // ─── Detailed Report by Status ────────────────────────────────
  const broken = testResults.filter(r => r.overallStatus === 'BROKEN');
  if (broken.length > 0) {
    console.log('\n  ── BROKEN AGENTS (need immediate fix) ──');
    for (const b of broken) {
      console.log(`  ❌ ${b.agentName || b.file}: ${b.instantiationError || 'Execution failed'}`);
    }
  }
  
  const stubs = testResults.filter(r => r.overallStatus === 'STUB');
  if (stubs.length > 0) {
    console.log('\n  ── STUB AGENTS (need LLM/real implementation) ──');
    for (const s of stubs) {
      console.log(`  🔶 ${s.agentName || s.file} (Score: ${s.score})`);
    }
  }
  
  // ─── Save JSON Report ─────────────────────────────────────────
  const report = {
    timestamp: new Date().toISOString(),
    totalAgents,
    totalTested,
    breakdown: { excellent: totalExcellent, good: totalGood, acceptable: totalAcceptable, stub: totalStub, broken: totalBroken },
    avgScore: Math.round(avgScore * 10) / 10,
    platformScore: Math.round(platformScore * 10) / 10,
    results: testResults,
  };
  
  const reportPath = path.join(__dirname, 'agent-sandbox-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  📄 Detailed report saved to: agent-sandbox-report.json`);
}

main().catch(console.error);
