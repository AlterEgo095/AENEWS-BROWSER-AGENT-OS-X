/**
 * AENEWS Agent OS X — Premium Agent Validation Suite
 * Validates all 110 agents: structure, inheritance, execution, LLM integration, provider-agnostic compliance
 */

import * as fs from 'fs';
import * as path from 'path';

interface AgentValidationResult {
  file: string;
  cluster: string;
  agentName: string;
  version: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  errors: string[];
  warnings: string[];
  checks: {
    extendsBaseAgent: boolean;
    hasExecuteMethod: boolean;
    hasNameProperty: boolean;
    hasVersionProperty: boolean;
    hasClusterProperty: boolean;
    hasCapabilities: boolean;
    hasDescription: boolean;
    usesExecuteWithLLM: boolean;
    hasHeuristicFallback: boolean;
    isProviderAgnostic: boolean;
    hasTimeout: boolean;
    hasErrorHandling: boolean;
    hasMetadata: boolean;
    implementsWrapExecution: boolean;
  };
  lineCount: number;
  executeMethodLines: number;
  capabilityCount: number;
}

const CLUSTERS_DIR = path.join(__dirname, 'src/clusters');
const results: AgentValidationResult[] = [];
let totalPass = 0;
let totalWarn = 0;
let totalFail = 0;

function extractStringProperty(content: string, propName: string): string {
  // Match patterns like: name = 'Value' or name = "Value" or readonly name = 'Value'
  const regex = new RegExp(`(?:readonly\\s+)?${propName}\\s*[=:]\\s*['"\`]([^'"\`]+)['"\`]`, 'i');
  const match = content.match(regex);
  return match ? match[1] : '';
}

function extractNumericProperty(content: string, propName: string): string {
  const regex = new RegExp(`(?:readonly\\s+)?${propName}\\s*[=:]\\s*(\\d+\\.?\\d*)`, 'i');
  const match = content.match(regex);
  return match ? match[1] : '';
}

function extractArrayLength(content: string, propName: string): number {
  // Count items in array properties
  const regex = new RegExp(`${propName}\\s*[=:]\\s*\\[([\\s\\S]*?)\\]`, 'i');
  const match = content.match(regex);
  if (!match) return 0;
  const items = match[1].split(',').filter(s => s.trim().length > 0 && s.trim() !== '');
  return items.length;
}

function findMethodLines(content: string, methodName: string): { start: number; end: number; lines: number } | null {
  const lines = content.split('\n');
  let startLine = -1;
  let braceCount = 0;
  let foundStart = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (startLine === -1 && line.includes(`${methodName}(`) && (line.includes('async') || line.includes('execute'))) {
      startLine = i;
      foundStart = true;
    }
    if (foundStart) {
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      if (braceCount <= 0 && startLine !== i) {
        return { start: startLine + 1, end: i + 1, lines: i - startLine + 1 };
      }
    }
  }
  return null;
}

function validateAgent(filePath: string): AgentValidationResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(path.join(__dirname, 'src'), filePath);
  const cluster = relativePath.split(path.sep)[0] as string;
  const errors: string[] = [];
  const warnings: string[] = [];

  const result: AgentValidationResult = {
    file: relativePath,
    cluster,
    agentName: extractStringProperty(content, 'name'),
    version: extractStringProperty(content, 'version') || extractNumericProperty(content, 'version'),
    status: 'PASS',
    errors,
    warnings,
    checks: {
      extendsBaseAgent: false,
      hasExecuteMethod: false,
      hasNameProperty: false,
      hasVersionProperty: false,
      hasClusterProperty: false,
      hasCapabilities: false,
      hasDescription: false,
      usesExecuteWithLLM: false,
      hasHeuristicFallback: false,
      isProviderAgnostic: false,
      hasTimeout: false,
      hasErrorHandling: false,
      hasMetadata: false,
      implementsWrapExecution: false,
    },
    lineCount: content.split('\n').length,
    executeMethodLines: 0,
    capabilityCount: 0,
  };

  // 1. Check extends BaseAgent
  result.checks.extendsBaseAgent = /extends\s+BaseAgent/.test(content) || /extends\s+AgentAbstract/.test(content);
  if (!result.checks.extendsBaseAgent) {
    errors.push('Does not extend BaseAgent/AgentAbstract');
  }

  // 2. Check execute method
  result.checks.hasExecuteMethod = /async\s+execute\s*\(\s*context\s*:\s*AgentContext/.test(content) || /async\s+execute\s*\(/.test(content);
  if (!result.checks.hasExecuteMethod) {
    errors.push('Missing async execute(context) method');
  }

  // Count execute method lines
  const executeInfo = findMethodLines(content, 'execute');
  if (executeInfo) {
    result.executeMethodLines = executeInfo.lines;
    if (executeInfo.lines < 10) {
      warnings.push(`Execute method is thin (${executeInfo.lines} lines) — may be a stub`);
    }
  }

  // 3. Check name property
  result.checks.hasNameProperty = /(?:readonly\s+)?name\s*[=:]\s*['"`]/.test(content);
  if (!result.checks.hasNameProperty) {
    errors.push('Missing name property');
  }

  // 4. Check version property
  result.checks.hasVersionProperty = /(?:readonly\s+)?version\s*[=:]\s*['"`\d]/.test(content);
  if (!result.checks.hasVersionProperty) {
    warnings.push('Missing version property');
  }

  // 5. Check cluster property
  result.checks.hasClusterProperty = /(?:readonly\s+)?cluster\s*[=:]/.test(content);
  if (!result.checks.hasClusterProperty) {
    errors.push('Missing cluster property');
  }

  // 6. Check capabilities
  result.checks.hasCapabilities = /capabilities\s*[=:]\s*\[/.test(content);
  if (!result.checks.hasCapabilities) {
    errors.push('Missing capabilities array');
  }
  result.capabilityCount = extractArrayLength(content, 'capabilities');

  // 7. Check description
  result.checks.hasDescription = /description\s*[=:]\s*['"`]/.test(content);
  if (!result.checks.hasDescription) {
    warnings.push('Missing description property');
  }

  // 8. Check uses executeWithLLM
  result.checks.usesExecuteWithLLM = /executeWithLLM/.test(content);
  if (!result.checks.usesExecuteWithLLM) {
    warnings.push('Does not use executeWithLLM — may not leverage LLM capabilities');
  }

  // 9. Check heuristic fallback
  result.checks.hasHeuristicFallback = /fallback|heuristic|degraded|catch.*return|catch.*\{[\s\S]*?return\s*\{/.test(content);
  if (!result.checks.hasHeuristicFallback && result.checks.usesExecuteWithLLM) {
    warnings.push('Uses LLM but no visible heuristic fallback on failure');
  }

  // 10. Check provider-agnostic (no hardcoded provider names like 'openai', 'gpt-4' in logic)
  const hasHardcodedProvider = /['"](?:openai|gpt-4|gpt-3\.5|claude-3|anthropic)['"]/.test(content) 
    && !/model-alpha|model-beta|provider/.test(content);
  result.checks.isProviderAgnostic = !hasHardcodedProvider;
  if (hasHardcodedProvider) {
    warnings.push('Contains hardcoded LLM provider/model names — not provider-agnostic');
  }

  // 11. Check timeout usage
  result.checks.hasTimeout = /withTimeout|setTimeout|TIMEOUT|timeout/.test(content);
  if (!result.checks.hasTimeout) {
    warnings.push('No timeout protection detected');
  }

  // 12. Check error handling
  result.checks.hasErrorHandling = /try\s*\{|catch\s*\(/.test(content);
  if (!result.checks.hasErrorHandling) {
    warnings.push('No error handling (try/catch) detected');
  }

  // 13. Check metadata
  result.checks.hasMetadata = /metadata|powerLevel|creditCost|tier/.test(content);
  if (!result.checks.hasMetadata) {
    warnings.push('Missing powerLevel/creditCost/tier metadata');
  }

  // 14. Check wrapExecution usage
  result.checks.implementsWrapExecution = /wrapExecution/.test(content);
  if (!result.checks.implementsWrapExecution) {
    warnings.push('Does not use wrapExecution() lifecycle wrapper');
  }

  // Set status
  if (errors.length > 0) {
    result.status = 'FAIL';
    totalFail++;
  } else if (warnings.length > 0) {
    result.status = 'WARN';
    totalWarn++;
  } else {
    totalPass++;
  }

  return result;
}

// ─── Main Execution ───
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║     AENEWS Agent OS X — Premium Agent Validation Suite     ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log();

const clusterDirs = fs.readdirSync(CLUSTERS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

let totalAgents = 0;
const clusterSummaries: Record<string, { total: number; pass: number; warn: number; fail: number }> = {};

for (const cluster of clusterDirs) {
  const agentsDir = path.join(CLUSTERS_DIR, cluster, 'agents');
  if (!fs.existsSync(agentsDir)) continue;

  const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.agent.ts'));
  clusterSummaries[cluster] = { total: 0, pass: 0, warn: 0, fail: 0 };

  for (const agentFile of agentFiles) {
    const filePath = path.join(agentsDir, agentFile);
    const result = validateAgent(filePath);
    results.push(result);
    totalAgents++;
    clusterSummaries[cluster].total++;

    if (result.status === 'PASS') clusterSummaries[cluster].pass++;
    else if (result.status === 'WARN') clusterSummaries[cluster].warn++;
    else clusterSummaries[cluster].fail++;
  }
}

// ─── Print Results by Cluster ───
console.log('════════════════════════════════════════════════════════════════');
console.log('  CLUSTER VALIDATION RESULTS');
console.log('════════════════════════════════════════════════════════════════\n');

for (const [cluster, summary] of Object.entries(clusterSummaries)) {
  const status = summary.fail > 0 ? '❌' : summary.warn > 0 ? '⚠️' : '✅';
  console.log(`  ${status} ${cluster.padEnd(30)} ${summary.total} agents | ${summary.pass} PASS | ${summary.warn} WARN | ${summary.fail} FAIL`);
}
console.log();

// ─── Print Failed Agents Detail ───
const failed = results.filter(r => r.status === 'FAIL');
if (failed.length > 0) {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  FAILED AGENTS (require immediate fix)');
  console.log('════════════════════════════════════════════════════════════════\n');
  for (const agent of failed) {
    console.log(`  ❌ ${agent.agentName || agent.file}`);
    for (const err of agent.errors) {
      console.log(`     ERROR: ${err}`);
    }
    console.log();
  }
}

// ─── Print Warning Agents Detail ───
const warned = results.filter(r => r.status === 'WARN');
if (warned.length > 0) {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  WARNING AGENTS (should be improved)');
  console.log('════════════════════════════════════════════════════════════════\n');
  for (const agent of warned) {
    console.log(`  ⚠️  ${agent.agentName || agent.file}`);
    for (const warn of agent.warnings) {
      console.log(`     WARN: ${warn}`);
    }
    console.log();
  }
}

// ─── Print Perfect Agents ───
const perfect = results.filter(r => r.status === 'PASS');
console.log('════════════════════════════════════════════════════════════════');
console.log('  PERFECT AGENTS (all checks passed)');
console.log('════════════════════════════════════════════════════════════════\n');
for (const agent of perfect) {
  console.log(`  ✅ ${agent.agentName || agent.file} (v${agent.version}) — ${agent.capabilityCount} capabilities, ${agent.executeMethodLines} exec lines, ${agent.lineCount} total`);
}

// ─── Summary ───
console.log('\n════════════════════════════════════════════════════════════════');
console.log('  OVERALL SUMMARY');
console.log('════════════════════════════════════════════════════════════════\n');
console.log(`  Total Agents:    ${totalAgents}`);
console.log(`  ✅ PASS:         ${totalPass} (${((totalPass / totalAgents) * 100).toFixed(1)}%)`);
console.log(`  ⚠️  WARN:        ${totalWarn} (${((totalWarn / totalAgents) * 100).toFixed(1)}%)`);
console.log(`  ❌ FAIL:         ${totalFail} (${((totalFail / totalAgents) * 100).toFixed(1)}%)`);

// Check averages
const avgExecLines = results.reduce((a, r) => a + r.executeMethodLines, 0) / totalAgents;
const avgCapabilities = results.reduce((a, r) => a + r.capabilityCount, 0) / totalAgents;
const llmUsage = results.filter(r => r.checks.usesExecuteWithLLM).length;
const hasFallback = results.filter(r => r.checks.hasHeuristicFallback).length;
const providerAgnostic = results.filter(r => r.checks.isProviderAgnostic).length;
const usesWrapExec = results.filter(r => r.checks.implementsWrapExecution).length;

console.log(`\n  Avg Execute Lines:   ${avgExecLines.toFixed(1)}`);
console.log(`  Avg Capabilities:    ${avgCapabilities.toFixed(1)}`);
console.log(`  LLM-Powered:         ${llmUsage}/${totalAgents} (${((llmUsage / totalAgents) * 100).toFixed(1)}%)`);
console.log(`  Has Fallback:        ${hasFallback}/${totalAgents} (${((hasFallback / totalAgents) * 100).toFixed(1)}%)`);
console.log(`  Provider-Agnostic:   ${providerAgnostic}/${totalAgents} (${((providerAgnostic / totalAgents) * 100).toFixed(1)}%)`);
console.log(`  Uses wrapExecution:  ${usesWrapExec}/${totalAgents} (${((usesWrapExec / totalAgents) * 100).toFixed(1)}%)`);

// ─── Quality Score ───
const qualityScore = (
  (totalPass / totalAgents) * 30 +
  (llmUsage / totalAgents) * 20 +
  (hasFallback / totalAgents) * 15 +
  (providerAgnostic / totalAgents) * 15 +
  (usesWrapExec / totalAgents) * 10 +
  Math.min(avgExecLines / 50, 1) * 10
);

console.log(`\n  🏆 PLATFORM QUALITY SCORE: ${qualityScore.toFixed(1)}/100`);

const grade = qualityScore >= 90 ? 'A+' : qualityScore >= 80 ? 'A' : qualityScore >= 70 ? 'B+' : qualityScore >= 60 ? 'B' : qualityScore >= 50 ? 'C' : 'D';
console.log(`  📊 GRADE: ${grade}`);

// ─── Export JSON report ───
const report = {
  timestamp: new Date().toISOString(),
  totalAgents,
  pass: totalPass,
  warn: totalWarn,
  fail: totalFail,
  qualityScore: Math.round(qualityScore * 10) / 10,
  grade,
  metrics: {
    avgExecLines: Math.round(avgExecLines * 10) / 10,
    avgCapabilities: Math.round(avgCapabilities * 10) / 10,
    llmUsagePercent: Math.round((llmUsage / totalAgents) * 1000) / 10,
    fallbackPercent: Math.round((hasFallback / totalAgents) * 1000) / 10,
    providerAgnosticPercent: Math.round((providerAgnostic / totalAgents) * 1000) / 10,
    wrapExecutionPercent: Math.round((usesWrapExec / totalAgents) * 1000) / 10,
  },
  clusterSummaries,
  agents: results,
};

const reportPath = path.join(__dirname, 'agent-validation-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n  📄 Full report saved to: agent-validation-report.json`);
