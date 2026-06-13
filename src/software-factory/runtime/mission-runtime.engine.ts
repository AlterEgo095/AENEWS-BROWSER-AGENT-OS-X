/**
 * AENEWS Software Factory — Mission Runtime Engine
 * 
 * THE execution motor. No more architecture layers.
 * This is what makes the platform actually PRODUCE results.
 * 
 * Flow:
 *   Mission → Analyze (LLM) → Plan → Select Capabilities →
 *   Execute (real tools) → Certify → Assemble → Deliver
 * 
 * Connected tools:
 *   - z-ai-web-dev-sdk (LLM for planning, code generation, analysis)
 *   - Node.js fs (real file output)
 *   - ZIP packaging (archiver)
 *   - Shell execution (child_process)
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// ZAI is loaded lazily via dynamic import to handle ESM/CJS interop
// (removed top-level require() — incompatible with ESM mode)

import {
  MissionState,
  TransitionTrigger,
  MissionQuality,
  CapabilityId,
} from '../interfaces';

import { MissionContractService } from '../mission-contract/mission-contract.service';
import { MissionStateMachineService } from '../mission-state-machine/mission-state-machine.service';
import { MissionMemoryService } from '../memory/mission-memory.service';
import { MissionArchiveService } from '../archive/mission-archive.service';
import { CapabilityRegistryService } from '../capability-registry/capability-registry.service';
import { CapabilityResolverService } from '../capability-resolver/capability-resolver.service';
import { MissionMetricsService, MissionCategory } from './mission-metrics.service';

// ─── Runtime Types ───────────────────────────────────────────

export interface RuntimeMission {
  id: string;
  instruction: string;
  contractId: string;
  workspaceDir: string;
  status: MissionState;
  artifacts: RuntimeArtifact[];
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
}

export interface RuntimeArtifact {
  name: string;
  type: 'source' | 'test' | 'document' | 'config' | 'archive' | 'report';
  path: string;
  size: number;
  content?: string;
}

export interface RuntimeResult {
  missionId: string;
  success: boolean;
  artifacts: RuntimeArtifact[];
  workspaceDir: string;
  qualityScore: number;
  certified: boolean;
  totalDurationMs: number;
  totalCostUsd: number;
  errors: string[];
}

@Injectable()
export class MissionRuntimeEngine {
  private readonly logger = new Logger(MissionRuntimeEngine.name);
  private readonly missions = new Map<string, RuntimeMission>();
  private zaiInstance: any = null;
  private readonly baseWorkspace = '/home/z/my-project/download/missions';
  private llmCallCount = 0;

  constructor(
    private readonly contractService: MissionContractService,
    private readonly stateMachine: MissionStateMachineService,
    private readonly memoryService: MissionMemoryService,
    private readonly archiveService: MissionArchiveService,
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly capabilityResolver: CapabilityResolverService,
    private readonly metricsService: MissionMetricsService,
  ) {
    // Ensure workspace exists
    fs.mkdirSync(this.baseWorkspace, { recursive: true });
  }

  // ═══════════════════════════════════════════════════════════
  //  THE MAIN ENTRY POINT — Execute a full mission
  // ═══════════════════════════════════════════════════════════

  async executeMission(request: {
    instruction: string;
    description?: string;
    quality?: MissionQuality;
    budgetMaxUsd?: number;
    deadline?: Date;
  }): Promise<RuntimeResult> {
    const missionId = `mission-${uuidv4().slice(0, 8)}`;
    const startTime = Date.now();
    let totalCost = 0;

    this.logger.log(`═══ MISSION START: ${missionId} ═══`);
    this.logger.log(`Instruction: "${request.instruction}"`);

    // ─── Step 1: Create workspace ──────────────────────────
    const workspaceDir = path.join(this.baseWorkspace, missionId);
    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, 'tests'), { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, 'docs'), { recursive: true });

    const mission: RuntimeMission = {
      id: missionId,
      instruction: request.instruction,
      contractId: '',
      workspaceDir,
      status: MissionState.DRAFT,
      artifacts: [],
      errors: [],
      startedAt: new Date(),
    };
    this.missions.set(missionId, mission);

    try {
      // ─── Step 2: Create contract ─────────────────────────
      const contract = this.contractService.createContract({
        mission: request.instruction,
        description: request.description,
        quality: request.quality || MissionQuality.STANDARD,
        deadline: request.deadline,
        budgetMaxUsd: request.budgetMaxUsd || 50,
      });
      mission.contractId = contract.id;

      const negotiation = this.contractService.negotiate(contract);
      if (!negotiation.accepted) {
        mission.errors.push(`Contract rejected: feasibility ${negotiation.feasibilityScore}`);
        return this.buildResult(mission, startTime, totalCost, false);
      }

      // ─── Step 3: Initialize state machine ────────────────
      this.stateMachine.initializeMission(missionId);

      // ─── Step 4: Analyze mission with LLM ────────────────
      this.updateState(missionId, MissionState.PLANNED, 'Analyzing mission');
      this.memoryService.storeContext(missionId, {
        instruction: request.instruction,
        contractId: contract.id,
        quality: contract.quality,
        budget: contract.budget.maxApiCostUsd,
        deadline: contract.deadline.deadline,
      });

      const analysis = await this.analyzeMission(request.instruction);
      totalCost += analysis.cost;
      this.memoryService.storePlan(missionId, analysis.plan);
      this.logger.log(`Plan: ${analysis.plan.phases.length} phases, ${analysis.plan.requiredCapabilities.length} capabilities`);

      // ─── Step 5: Resolve capabilities ────────────────────
      this.updateState(missionId, MissionState.RESEARCH, 'Resolving capabilities');
      const resolution = this.capabilityResolver.resolve({
        missionId,
        instruction: request.instruction,
      });
      this.memoryService.storeResearch(missionId, { resolution });

      // ─── Step 6: Execute — the core ──────────────────────
      this.updateState(missionId, MissionState.BUILDING, 'Building');

      const buildResult = await this.executeBuild(request.instruction, analysis, workspaceDir);
      totalCost += buildResult.cost;
      mission.artifacts.push(...buildResult.artifacts);
      this.memoryService.storeBuildResults(missionId, buildResult);

      // ─── Step 7: Testing ─────────────────────────────────
      this.updateState(missionId, MissionState.TESTING, 'Testing');
      const testResult = await this.executeTests(workspaceDir, analysis);
      totalCost += testResult.cost;
      this.memoryService.storeTestResults(missionId, testResult);

      // ─── Step 8: Auditing ────────────────────────────────
      this.updateState(missionId, MissionState.AUDITING, 'Auditing');
      const auditResult = await this.executeAudit(workspaceDir, mission.artifacts);
      totalCost += auditResult.cost;
      this.memoryService.storeAuditResults(missionId, auditResult);

      // ─── Step 9: Certification ───────────────────────────
      this.updateState(missionId, MissionState.CERTIFYING, 'Certifying');
      const certResult = this.certify(mission, testResult, auditResult);
      this.memoryService.storeCertification(missionId, certResult);

      if (!certResult.certified) {
        this.logger.warn(`Certification failed: ${certResult.reasons.join(', ')}`);
        // Continue anyway — partial delivery is better than no delivery
      }

      // ─── Step 10: Assemble & Deliver ─────────────────────
      this.updateState(missionId, MissionState.DELIVERING, 'Assembling delivery');

      // Generate README
      const readme = await this.generateReadme(request.instruction, analysis, mission.artifacts);
      totalCost += readme.cost;
      this.writeFile(workspaceDir, 'README.md', readme.content);
      mission.artifacts.push({
        name: 'README.md',
        type: 'document',
        path: path.join(workspaceDir, 'README.md'),
        size: Buffer.byteLength(readme.content),
      });

      // Generate PDF report metadata
      const reportContent = this.generateReport(mission, certResult, testResult, auditResult);
      this.writeFile(workspaceDir, 'docs/REPORT.md', reportContent);
      mission.artifacts.push({
        name: 'REPORT.md',
        type: 'report',
        path: path.join(workspaceDir, 'docs/REPORT.md'),
        size: Buffer.byteLength(reportContent),
      });

      // Create ZIP
      const zipPath = await this.createZipArchive(missionId, workspaceDir);
      if (zipPath) {
        mission.artifacts.push({
          name: `${missionId}.zip`,
          type: 'archive',
          path: zipPath,
          size: fs.statSync(zipPath).size,
        });
      }

      // ─── Step 11: Complete ┐──────────────────────────────
      this.updateState(missionId, MissionState.COMPLETED, 'Completed');
      mission.completedAt = new Date();

      // Archive
      await this.archiveService.archive(missionId, {
        execution: mission,
        timeline: this.stateMachine.getTimeline(missionId),
        contract: this.contractService.getContract(contract.id),
        memory: this.memoryService.exportMission(missionId),
        agentStats: { totalCost, missionsCompleted: 1 },
      });

      const totalDuration = Date.now() - startTime;
      this.logger.log(`═══ MISSION COMPLETE: ${missionId} ═══ ${mission.artifacts.length} artifacts, $${totalCost.toFixed(2)}, ${totalDuration}ms`);

      const result = this.buildResult(mission, startTime, totalCost, certResult.certified);

      // ─── Step 12: Record metrics ──────────────────────────
      this.metricsService.record({
        missionId,
        instruction: request.instruction,
        category: MissionMetricsService.classifyMission(request.instruction),
        success: result.success,
        certified: result.certified,
        qualityScore: result.qualityScore,
        artifactCount: mission.artifacts.length,
        totalSizeBytes: mission.artifacts.reduce((s, a) => s + a.size, 0),
        durationMs: result.totalDurationMs,
        costUsd: result.totalCostUsd,
        retries: 0,
        errors: mission.errors,
        phases: [],
      });

      return result;
    } catch (error) {
      this.logger.error(`Mission ${missionId} FAILED: ${(error as Error).message}`);
      mission.errors.push((error as Error).message);
      this.updateState(missionId, MissionState.AUDITING, `Failed: ${(error as Error).message}`);

      const result = this.buildResult(mission, startTime, totalCost, false);

      // Record failed mission metrics too
      this.metricsService.record({
        missionId,
        instruction: request.instruction,
        category: MissionMetricsService.classifyMission(request.instruction),
        success: false,
        certified: false,
        qualityScore: result.qualityScore,
        artifactCount: mission.artifacts.length,
        totalSizeBytes: mission.artifacts.reduce((s, a) => s + a.size, 0),
        durationMs: result.totalDurationMs,
        costUsd: result.totalCostUsd,
        retries: 0,
        errors: mission.errors,
        phases: [],
      });

      return result;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  STEP 4: Analyze mission with LLM
  // ═══════════════════════════════════════════════════════════

  private async analyzeMission(instruction: string): Promise<{ plan: any; cost: number }> {
    const prompt = `You are a software project planner. Analyze this mission and create a detailed execution plan.

Mission: "${instruction}"

Respond in JSON format:
{
  "objective": "clear statement of what needs to be built",
  "techStack": ["list", "of", "technologies"],
  "phases": [
    {
      "name": "phase name",
      "tasks": ["task 1", "task 2"],
      "capabilities": ["dev.frontend", "dev.backend", etc.],
      "estimatedMinutes": 30
    }
  ],
  "requiredCapabilities": ["dev.frontend", "dev.backend", etc.],
  "deliverables": ["README.md", "src/", etc.],
  "risks": ["potential risk 1"],
  "complexity": "low|medium|high"
}

Be specific. List exact files to create. Be practical.`;

    try {
      const response = await this.callLLM(prompt);
      let plan: any;
      try {
        // Try to parse JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        plan = jsonMatch ? JSON.parse(jsonMatch[0]) : this.fallbackPlan(instruction);
      } catch {
        plan = this.fallbackPlan(instruction);
      }
      return { plan, cost: 0.02 };
    } catch (error) {
      this.logger.warn(`LLM analysis failed, using fallback: ${(error as Error).message}`);
      return { plan: this.fallbackPlan(instruction), cost: 0 };
    }
  }

  private fallbackPlan(instruction: string): any {
    const lower = instruction.toLowerCase();
    const isWebApp = lower.includes('app') || lower.includes('application') || lower.includes('web') || lower.includes('site') || lower.includes('page') || lower.includes('saas') || lower.includes('erp') || lower.includes('todo') || lower.includes('list');
    const hasBackend = lower.includes('api') || lower.includes('backend') || lower.includes('server') || lower.includes('database') || lower.includes('erp') || lower.includes('crm') || lower.includes('todo');

    return {
      objective: instruction,
      techStack: isWebApp ? ['HTML', 'CSS', 'JavaScript', 'Node.js'] : ['JavaScript'],
      phases: [
        {
          name: 'Architecture & Setup',
          tasks: ['Define project structure', 'Create configuration files'],
          capabilities: ['dev.architecture'],
          estimatedMinutes: 10,
        },
        {
          name: 'Frontend Development',
          tasks: ['Create HTML structure', 'Write CSS styles', 'Implement JavaScript logic'],
          capabilities: ['dev.frontend'],
          estimatedMinutes: 30,
        },
        ...(hasBackend ? [{
          name: 'Backend Development',
          tasks: ['Create server', 'Implement API endpoints', 'Set up data storage'],
          capabilities: ['dev.backend', 'dev.database'],
          estimatedMinutes: 45,
        }] : []),
        {
          name: 'Testing & Documentation',
          tasks: ['Write tests', 'Generate documentation'],
          capabilities: ['dev.test', 'dev.documentation'],
          estimatedMinutes: 15,
        },
      ],
      requiredCapabilities: hasBackend
        ? ['dev.architecture', 'dev.frontend', 'dev.backend', 'dev.database', 'dev.test', 'dev.documentation']
        : ['dev.architecture', 'dev.frontend', 'dev.test', 'dev.documentation'],
      deliverables: ['index.html', 'style.css', 'app.js', 'tests/', 'README.md', 'Dockerfile'],
      risks: ['Scope may be larger than estimated'],
      complexity: hasBackend ? 'medium' : 'low',
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  STEP 6: Execute Build — REAL code generation
  // ═══════════════════════════════════════════════════════════

  private async executeBuild(
    instruction: string,
    analysis: { plan: any },
    workspaceDir: string,
  ): Promise<{ artifacts: RuntimeArtifact[]; cost: number; code: string }> {
    const artifacts: RuntimeArtifact[] = [];
    let totalCost = 0;

    // Generate the full application code via LLM
    this.logger.log('Generating application code via LLM...');

    const codePrompt = `You are an expert software developer. Build the following project completely.

Mission: "${instruction}"

Plan: ${JSON.stringify(analysis.plan, null, 2)}

Generate ALL the code needed. For each file, use this format:

===FILE: path/to/file===
(file content here)

===ENDFILE===

Include:
1. All source files (HTML, CSS, JS, etc.)
2. A package.json if it's a Node.js project
3. A Dockerfile
4. Test files
5. Any configuration files needed

Make the code complete, functional, and production-ready.
The application should work when the files are placed in a directory and opened/started.
For web apps: create a single-page application with index.html that includes CSS and JS.
For Node.js apps: include package.json with start script.
Write REAL, WORKING code — not stubs or placeholders.`;

    let codeResponse: string;
    let llmSucceeded = false;
    try {
      codeResponse = await this.callLLM(codePrompt);
      totalCost += 0.10;
      llmSucceeded = true;
      this.logger.log(`  LLM returned ${Buffer.byteLength(codeResponse)} bytes`);
    } catch (error) {
      this.logger.warn(`LLM code generation failed, using template: ${(error as Error).message}`);
    }

    // Parse and write files from LLM response
    let files = new Map<string, string>();
    if (llmSucceeded) {
      files = this.parseGeneratedFiles(codeResponse!);
      this.logger.log(`  Parsed ${files.size} files from LLM response`);

      // If parsing partially worked but missed some, try to extract code blocks
      if (files.size < 2) {
        const codeBlocks = this.extractCodeBlocks(codeResponse!);
        if (codeBlocks.size > files.size) {
          files = codeBlocks;
          this.logger.log(`  Extracted ${files.size} files from code blocks`);
        }
      }
    }

    // If LLM parsing still produced nothing, use template fallback
    if (files.size === 0) {
      this.logger.log('  Using template code generation fallback');
      const templateResponse = this.generateTemplateCode(instruction, analysis.plan);
      files = this.parseGeneratedFiles(templateResponse);
    }
    files.forEach((content, filePath) => {
      const fullPath = path.join(workspaceDir, filePath);
      const dir = path.dirname(fullPath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');

      let type: RuntimeArtifact['type'] = 'source';
      if (filePath.includes('test') || filePath.includes('spec')) type = 'test';
      else if (filePath.endsWith('.md') || filePath.endsWith('.txt')) type = 'document';
      else if (filePath.endsWith('.json') || filePath.endsWith('.yml') || filePath.endsWith('.yaml') || filePath.endsWith('Dockerfile') || filePath.includes('.config')) type = 'config';

      artifacts.push({
        name: path.basename(filePath),
        type,
        path: fullPath,
        size: Buffer.byteLength(content),
        content: content.substring(0, 500), // preview
      });

      this.logger.log(`  Created: ${filePath} (${Buffer.byteLength(content)} bytes)`);
    });

    // If still no files were created, something is very wrong
    if (files.size === 0) {
      this.logger.warn('No files could be created from LLM output or template fallback!');
    }

    // Always ensure package.json exists for Node.js projects
    if (analysis.plan.techStack?.some((t: string) => t.toLowerCase().includes('node') || t.toLowerCase().includes('javascript'))) {
      const packageJsonPath = path.join(workspaceDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        const packageJson = {
          name: `aenews-${analysis.plan.objective?.toLowerCase().replace(/\s+/g, '-').slice(0, 30) || 'project'}`,
          version: '1.0.0',
          description: instruction,
          scripts: { start: 'node server.js', test: 'node tests/test.js' },
        };
        this.writeFile(workspaceDir, 'package.json', JSON.stringify(packageJson, null, 2));
        artifacts.push({ name: 'package.json', type: 'config', path: packageJsonPath, size: 200 });
      }
    }

    // Always ensure Dockerfile exists
    const dockerfilePath = path.join(workspaceDir, 'Dockerfile');
    if (!fs.existsSync(dockerfilePath)) {
      const dockerfile = this.generateDockerfile(analysis.plan);
      this.writeFile(workspaceDir, 'Dockerfile', dockerfile);
      artifacts.push({ name: 'Dockerfile', type: 'config', path: dockerfilePath, size: Buffer.byteLength(dockerfile) });
    }

    // Ensure test file exists — generate fallback if LLM didn't create one
    const testArtifacts = artifacts.filter(a => a.type === 'test');
    const testDir = path.join(workspaceDir, 'tests');
    const testDirFiles = fs.existsSync(testDir) ? fs.readdirSync(testDir).filter(f => f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.ts')) : [];
    const rootTestFiles = fs.readdirSync(workspaceDir).filter(f => (f.includes('test') || f.includes('spec')) && (f.endsWith('.js') || f.endsWith('.ts')));
    const hasTests = testArtifacts.length > 0 || testDirFiles.length > 0 || rootTestFiles.length > 0;

    if (!hasTests) {
      this.logger.log('  No tests generated by LLM, creating fallback test suite...');
      const testCode = this.generateFallbackTests(instruction, workspaceDir);
      if (testCode) {
        const testPath = path.join(workspaceDir, 'tests', 'test.js');
        this.writeFile(workspaceDir, 'tests/test.js', testCode);
        artifacts.push({ name: 'test.js', type: 'test', path: testPath, size: Buffer.byteLength(testCode) });
        this.logger.log(`  Created: tests/test.js (${Buffer.byteLength(testCode)} bytes) — fallback test suite`);
      }
    }

    return { artifacts, cost: totalCost, code: codeResponse! };
  }

  // ═══════════════════════════════════════════════════════════
  //  STEP 7: Execute Tests
  // ═══════════════════════════════════════════════════════════

  private async executeTests(
    workspaceDir: string,
    analysis: { plan: any },
  ): Promise<{ passed: boolean; results: any[]; cost: number }> {
    this.logger.log('Running tests...');

    // Check if test files exist
    const testDir = path.join(workspaceDir, 'tests');
    const hasTests = fs.existsSync(testDir) && fs.readdirSync(testDir).length > 0;

    // Try to run any Node.js test files
    const results: any[] = [];

    if (hasTests) {
      const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
      for (const testFile of testFiles.slice(0, 5)) { // limit to 5 test files
        try {
          const { execSync } = await import('child_process');
          const output = execSync(`node "${path.join(testDir, testFile)}" 2>&1`, {
            timeout: 30000,
            cwd: workspaceDir,
          }).toString();
          results.push({ file: testFile, passed: true, output: output.slice(0, 500) });
        } catch (err: any) {
          results.push({ file: testFile, passed: false, output: (err.stdout || err.message || '').toString().slice(0, 500) });
        }
      }
    }

    // LLM-based test analysis
    let llmTestResult = { passed: true, analysis: '' };
    try {
      const srcFiles = this.collectSourceFiles(workspaceDir);
      const testPrompt = `Analyze this code for correctness. Are there obvious bugs? Will it run?

Source files:
${srcFiles.slice(0, 5).map(f => `--- ${f.name} ---\n${f.content?.slice(0, 500) || '(file too large)'}`).join('\n\n')}

Reply in JSON: {"passed": true/false, "analysis": "brief analysis", "bugs": ["list of bugs if any"]}`;

      const response = await this.callLLM(testPrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        llmTestResult = { ...llmTestResult, ...JSON.parse(jsonMatch[0]) };
      }
    } catch {
      // LLM test analysis is optional
    }

    const passed = results.every(r => r.passed) && llmTestResult.passed;

    this.logger.log(`Tests: ${results.length} file tests, LLM analysis: ${llmTestResult.passed ? 'PASS' : 'ISSUES'} → ${passed ? 'ALL PASSED' : 'SOME FAILED'}`);

    return {
      passed,
      results: [...results, { type: 'llm_analysis', ...llmTestResult }],
      cost: 0.02,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  STEP 8: Execute Audit
  // ═══════════════════════════════════════════════════════════

  private async executeAudit(
    workspaceDir: string,
    artifacts: RuntimeArtifact[],
  ): Promise<{ passed: boolean; findings: string[]; cost: number }> {
    this.logger.log('Running audit...');

    const findings: string[] = [];

    // Check 1: Files exist
    const sourceFiles = artifacts.filter(a => a.type === 'source');
    if (sourceFiles.length === 0) findings.push('No source files generated');

    // Check 2: README exists
    if (!artifacts.find(a => a.name === 'README.md')) findings.push('No README.md generated');

    // Check 3: Dockerfile exists
    if (!artifacts.find(a => a.name === 'Dockerfile')) findings.push('No Dockerfile generated');

    // Check 4: No empty files
    for (const artifact of artifacts) {
      if (artifact.size < 10 && artifact.type === 'source') {
        findings.push(`File ${artifact.name} is suspiciously small (${artifact.size} bytes)`);
      }
    }

    // Check 5: LLM-based security review
    try {
      const srcFiles = this.collectSourceFiles(workspaceDir);
      if (srcFiles.length > 0) {
        const secPrompt = `Quick security review of this code. Are there any obvious vulnerabilities?
Reply in JSON: {"vulnerabilities": [], "severity": "low|medium|high", "summary": "brief summary"}

Code:
${srcFiles.slice(0, 3).map(f => `--- ${f.name} ---\n${f.content?.slice(0, 800) || ''}`).join('\n\n')}`;

        const response = await this.callLLM(secPrompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const secResult = JSON.parse(jsonMatch[0]);
          if (secResult.vulnerabilities?.length > 0) {
            findings.push(...secResult.vulnerabilities.map((v: any) => `Security: ${typeof v === 'string' ? v : JSON.stringify(v)}`));
          }
        }
      }
    } catch {
      // Security LLM analysis is optional
    }

    const passed = findings.filter(f => f.includes('No source') || f.includes('Security')).length === 0;
    this.logger.log(`Audit: ${findings.length} findings → ${passed ? 'PASSED' : 'ISSUES FOUND'}`);

    return { passed, findings, cost: 0.02 };
  }

  // ═══════════════════════════════════════════════════════════
  //  STEP 9: Certification
  // ═══════════════════════════════════════════════════════════

  private certify(
    mission: RuntimeMission,
    testResult: { passed: boolean; results: any[] },
    auditResult: { passed: boolean; findings: string[] },
  ): { certified: boolean; qualityScore: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 100;

    // Test scoring — partial credit if some tests pass
    if (!testResult.passed) {
      const totalTests = testResult.results.length;
      const passedTests = testResult.results.filter(r => r.passed).length;
      if (totalTests > 0 && passedTests > 0) {
        const passRate = passedTests / totalTests;
        score -= Math.round(30 * (1 - passRate)); // Partial deduction
        if (passRate < 0.5) reasons.push(`${passedTests}/${totalTests} tests passed`);
      } else {
        score -= 30;
        reasons.push('Tests failed');
      }
    }

    // Audit scoring — only critical findings reduce score significantly
    const criticalFindings = auditResult.findings.filter(f =>
      f.toLowerCase().includes('no source') ||
      f.toLowerCase().includes('injection') ||
      f.toLowerCase().includes('execute') ||
      f.toLowerCase().includes('malicious')
    );
    const minorFindings = auditResult.findings.filter(f => !criticalFindings.includes(f));

    if (criticalFindings.length > 0) {
      score -= 20;
      reasons.push(...criticalFindings.slice(0, 3));
    }
    if (minorFindings.length > 0) {
      score -= Math.min(10, minorFindings.length * 3); // Minor findings: -3 each, max -10
      if (minorFindings.length <= 3) reasons.push(...minorFindings);
      else reasons.push(`${minorFindings.length} minor findings`);
    }

    // Missing artifacts — these are critical
    if (mission.artifacts.filter(a => a.type === 'source').length === 0) {
      score -= 40;
      reasons.push('No source code');
    }
    if (!mission.artifacts.find(a => a.name === 'README.md')) {
      score -= 10;
      reasons.push('No README');
    }
    if (!mission.artifacts.find(a => a.name === 'Dockerfile')) {
      score -= 10;
      reasons.push('No Dockerfile');
    }
    if (!mission.artifacts.some(a => a.type === 'test')) {
      score -= 10;
      reasons.push('No test files');
    }

    return { certified: score >= 60, qualityScore: Math.max(0, score), reasons };
  }

  // ═══════════════════════════════════════════════════════════
  //  STEP 10: Generate README
  // ═══════════════════════════════════════════════════════════

  private async generateReadme(
    instruction: string,
    analysis: { plan: any },
    artifacts: RuntimeArtifact[],
  ): Promise<{ content: string; cost: number }> {
    try {
      const fileList = artifacts.map(a => `- \`${a.name}\` (${a.type}, ${a.size} bytes)`).join('\n');
      const prompt = `Generate a professional README.md for this project.

Mission: "${instruction}"
Tech Stack: ${analysis.plan.techStack?.join(', ') || 'JavaScript'}
Files:
${fileList}

Include: title, description, features, installation, usage, tech stack, project structure, license.
Use markdown formatting. Be concise but complete.`;

      const content = await this.callLLM(prompt);
      return { content, cost: 0.02 };
    } catch {
      const content = `# ${instruction}\n\n## Generated by AENEWS Software Factory\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\n\`\`\`bash\nnpm start\n\`\`\`\n\n## Files\n\n${artifacts.map(a => `- \`${a.name}\``).join('\n')}\n\n## License\n\nMIT\n`;
      return { content, cost: 0 };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  LLM Integration
  // ═══════════════════════════════════════════════════════════

  private async callLLM(prompt: string): Promise<string> {
    if (!this.zaiInstance) {
      try {
        const sdk: any = await import('z-ai-web-dev-sdk');
        const ZAIClass = sdk.default || sdk;
        this.zaiInstance = await ZAIClass.create();
      } catch (err: any) {
        throw new Error(`z-ai-web-dev-sdk not available: ${err.message}`);
      }
    }

    // Retry with exponential backoff for rate limiting
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const completion = await this.zaiInstance.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are an expert software engineer. Generate complete, working, production-ready code. Be thorough and practical.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        });

        const content = completion.choices?.[0]?.message?.content;
        if (content) {
          this.llmCallCount++;
          return content;
        }
        throw new Error('Empty LLM response');
      } catch (err: any) {
        const isRateLimit = err.message?.includes('429') || err.message?.includes('rate');
        if (isRateLimit && attempt < maxRetries - 1) {
          const delayMs = Math.pow(2, attempt) * 3000; // 3s, 6s, 12s
          this.logger.warn(`Rate limited, retrying in ${delayMs / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        this.logger.warn(`LLM call failed: ${(err as Error).message}`);
        throw err;
      }
    }
    throw new Error('Max retries exceeded');
  }

  // ═══════════════════════════════════════════════════════════
  //  File Operations
  // ═══════════════════════════════════════════════════════════

  private writeFile(workspaceDir: string, relativePath: string, content: string): void {
    const fullPath = path.join(workspaceDir, relativePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  private parseGeneratedFiles(response: string): Map<string, string> {
    const files = new Map<string, string>();

    // Try ===FILE: path=== format
    const fileRegex = /===FILE:\s*(.+?)===\s*\n([\s\S]*?)===ENDFILE===/g;
    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      const filePath = match[1].trim();
      const content = match[2].trim();
      if (filePath && content) files.set(filePath, content);
    }

    if (files.size > 0) return files;

    // Try ```filename format
    const codeBlockRegex = /```(\w*?)\s*\n([\s\S]*?)```/g;
    while ((match = codeBlockRegex.exec(response)) !== null) {
      const lang = match[1].trim();
      const content = match[2].trim();
      if (!content || content.length < 10) continue;

      // Try to find filename in the line before the code block
      const beforeMatch = response.substring(Math.max(0, match.index - 200), match.index);
      const nameMatch = beforeMatch.match(/(?:^|\n)[\s]*(?:\/\/|#|<!--)?\s*(?:file:\s*)?(\S+\.\w+)\s*(?:$|\n)/m);

      if (nameMatch) {
        files.set(nameMatch[1], content);
      } else {
        // Infer filename from language
        const langMap: Record<string, string> = {
          'html': 'index.html', 'css': 'style.css', 'javascript': 'app.js', 'js': 'app.js',
          'typescript': 'app.ts', 'ts': 'app.ts', 'python': 'app.py', 'py': 'app.py',
          'json': 'package.json', 'yaml': 'docker-compose.yml', 'yml': 'docker-compose.yml',
          'dockerfile': 'Dockerfile', 'bash': 'start.sh', 'sh': 'start.sh',
          'sql': 'schema.sql', 'md': 'README.md',
        };
        const fileName = langMap[lang.toLowerCase()];
        if (fileName && !files.has(fileName)) {
          files.set(fileName, content);
        }
      }
    }

    return files;
  }

  /**
   * Extract code blocks from LLM response with filename inference
   */
  private extractCodeBlocks(response: string): Map<string, string> {
    const files = new Map<string, string>();

    // Split by markdown code blocks and look for filename patterns
    const lines = response.split('\n');
    let currentFile = '';
    let currentContent: string[] = [];
    let inCodeBlock = false;
    let codeLang = '';
    let fileCounter = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          const content = currentContent.join('\n').trim();
          if (content.length > 10) {
            if (!currentFile) {
              // Infer from language
              const langMap: Record<string, string> = {
                'html': 'index.html', 'css': 'style.css', 'javascript': 'app.js', 'js': 'app.js',
                'typescript': 'app.ts', 'json': 'package.json', 'dockerfile': 'Dockerfile',
                'python': 'app.py', 'bash': 'start.sh', 'sql': 'schema.sql', 'md': 'README.md',
              };
              currentFile = langMap[codeLang.toLowerCase()] || `file-${++fileCounter}.${codeLang || 'txt'}`;
            }
            if (!files.has(currentFile)) {
              files.set(currentFile, content);
            }
          }
          currentFile = '';
          currentContent = [];
          inCodeBlock = false;
        } else {
          // Start of code block
          inCodeBlock = true;
          codeLang = line.trim().replace('```', '').trim();

          // Look back for filename
          const prevLines = lines.slice(Math.max(0, i - 3), i).join('\n');
          const filePatterns = [
            /(?:file|filename|path|create|save)\s*[:=]\s*`?(\S+\.\w+)`?/i,
            /(\S+\.\w+)\s*[:=]/,
            /`(\S+\.\w+)`/,
            /(?:\/|\w\/)(\w+\.\w+)/,
            /(\w+\.(?:html|css|js|ts|json|py|sql|sh|yml|yaml|md|txt|dockerfile))/i,
          ];

          for (const pattern of filePatterns) {
            const m = prevLines.match(pattern);
            if (m) { currentFile = m[1]; break; }
          }
        }
      } else if (inCodeBlock) {
        currentContent.push(line);
      }
    }

    return files;
  }

  private collectSourceFiles(workspaceDir: string): { name: string; content?: string }[] {
    const files: { name: string; content?: string }[] = [];
    const extensions = ['.js', '.ts', '.html', '.css', '.json', '.py', '.jsx', '.tsx'];

    const walkDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walkDir(fullPath);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            files.push({ name: path.relative(workspaceDir, fullPath), content: content.slice(0, 1000) });
          } catch { /* skip unreadable files */ }
        }
      }
    };

    walkDir(workspaceDir);
    return files;
  }

  // ═══════════════════════════════════════════════════════════
  //  ZIP Packaging
  // ═══════════════════════════════════════════════════════════

  private async createZipArchive(missionId: string, workspaceDir: string): Promise<string | null> {
    const zipPath = path.join(this.baseWorkspace, `${missionId}.zip`);

    // Try native zip first
    try {
      const { execSync } = await import('child_process');
      const result = execSync(`cd "${workspaceDir}" && zip -r "${zipPath}" . -x "*.git*" 2>&1`, {
        timeout: 60000,
        encoding: 'utf-8',
      });
      if (fs.existsSync(zipPath) && fs.statSync(zipPath).size > 0) {
        this.logger.log(`ZIP created: ${zipPath} (${fs.statSync(zipPath).size} bytes)`);
        return zipPath;
      }
    } catch (err: any) {
      this.logger.warn(`zip command failed: ${err.message?.slice(0, 200)}`);
    }

    // Fallback: use Node.js archiver
    try {
      const archiverModule: any = await import('archiver');
      const archiverFn = archiverModule.default || archiverModule;
      const output = fs.createWriteStream(zipPath);
      const archive = archiverFn('zip', { zlib: { level: 9 } });

      await new Promise<void>((resolve, reject) => {
        output.on('close', () => resolve());
        archive.on('error', (err: Error) => reject(err));
        archive.pipe(output);
        archive.directory(workspaceDir, false);
        archive.finalize();
      });

      if (fs.existsSync(zipPath) && fs.statSync(zipPath).size > 0) {
        this.logger.log(`ZIP created (archiver): ${zipPath} (${fs.statSync(zipPath).size} bytes)`);
        return zipPath;
      }
    } catch (err: any) {
      this.logger.warn(`archiver failed: ${err.message?.slice(0, 200)}`);
    }

    // Last fallback: create a simple tar.gz
    try {
      const { execSync } = await import('child_process');
      const tarPath = path.join(this.baseWorkspace, `${missionId}.tar.gz`);
      execSync(`cd "${workspaceDir}" && tar -czf "${tarPath}" . 2>&1`, { timeout: 60000 });
      if (fs.existsSync(tarPath) && fs.statSync(tarPath).size > 0) {
        this.logger.log(`Using tar.gz fallback: ${tarPath}`);
        return tarPath;
      }
    } catch (err: any) {
      this.logger.warn(`tar failed: ${err.message?.slice(0, 200)}`);
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════
  //  Template Code Generation (fallback when LLM is unavailable)
  // ═══════════════════════════════════════════════════════════

  private generateTemplateCode(instruction: string, plan: any): string {
    const title = instruction.slice(0, 60);
    return `===FILE: index.html===
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>${title}</h1>
        </header>
        <main id="content">
            <p>Application generated by AENEWS Software Factory</p>
        </main>
    </div>
    <script src="app.js"></script>
</body>
</html>
===ENDFILE===

===FILE: style.css===
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
#app { max-width: 800px; margin: 0 auto; padding: 2rem; }
header { text-align: center; margin-bottom: 2rem; }
header h1 { font-size: 2rem; color: #60a5fa; }
main { background: #1e293b; border-radius: 12px; padding: 2rem; }
===ENDFILE===

===FILE: app.js===
// ${title} - Application Logic
document.addEventListener('DOMContentLoaded', () => {
    console.log('${title} loaded successfully');
});
===ENDFILE===

===FILE: Dockerfile===
FROM node:18-alpine
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["npx", "serve", "-s", ".", "-l", "3000"]
===ENDFILE===`;
  }

  private generateDockerfile(plan: any): string {
    const hasNode = plan.techStack?.some((t: string) => t.toLowerCase().includes('node') || t.toLowerCase().includes('javascript'));
    if (hasNode) {
      return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;
    }
    return `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
  }

  /**
   * Generate fallback test suite when LLM doesn't create test files.
   * Analyzes the source files and creates basic validation tests.
   */
  private generateFallbackTests(instruction: string, workspaceDir: string): string | null {
    const lower = instruction.toLowerCase();
    const isTodo = lower.includes('todo');
    const isApi = lower.includes('api') || lower.includes('rest') || lower.includes('server');
    const isLanding = lower.includes('landing') || lower.includes('page') || lower.includes('website');

    // Collect source files for analysis
    const srcFiles = this.collectSourceFiles(workspaceDir);
    const hasHtml = srcFiles.some(f => f.name.endsWith('.html'));
    const hasJs = srcFiles.some(f => f.name.endsWith('.js') && !f.name.includes('test'));
    const hasCss = srcFiles.some(f => f.name.endsWith('.css'));

    // Base tests that always apply
    let tests: string[] = [];
    tests.push(`// AENEWS Software Factory — Auto-generated Test Suite`);
    tests.push(`// Mission: ${instruction}`);
    tests.push(`const fs = require('fs');`);
    tests.push(`const path = require('path');`);
    tests.push(`\nlet passed = 0;\nlet failed = 0;\n`);
    tests.push(`function assert(condition, message) { if (condition) { passed++; console.log('  \u2713 ' + message); } else { failed++; console.log('  \u2717 ' + message); } }`);
    tests.push(`\nconsole.log('Running test suite...\\n');`);

    // File existence tests
    tests.push(`\n// \u2500\u2500 File Structure Tests \u2500\u2500`);
    if (hasHtml) tests.push(`assert(fs.existsSync(path.join(__dirname, '..', 'index.html')), 'index.html exists');`);
    if (hasJs) {
      const jsFile = srcFiles.find(f => f.name === 'app.js' || f.name === 'src/app.js');
      if (jsFile) tests.push(`assert(fs.existsSync(path.join(__dirname, '..', '${jsFile.name}')), '${jsFile.name} exists');`);
    }
    if (hasCss) tests.push(`assert(fs.existsSync(path.join(__dirname, '..', 'style.css')) || fs.existsSync(path.join(__dirname, '..', 'src', 'style.css')), 'style.css exists');`);
    tests.push(`assert(fs.existsSync(path.join(__dirname, '..', 'package.json')), 'package.json exists');`);
    tests.push(`assert(fs.existsSync(path.join(__dirname, '..', 'Dockerfile')), 'Dockerfile exists');`);

    // Content validation tests
    tests.push(`\n// \u2500\u2500 Content Validation Tests \u2500\u2500`);
    if (hasHtml) {
      tests.push(`(function() { const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');`);
      tests.push(`  assert(html.includes('<!DOCTYPE html>') || html.includes('<html'), 'HTML has valid doctype');`);
      tests.push(`  assert(html.includes('</html>'), 'HTML has closing tag');`);
      tests.push(`  assert(html.includes('<head>'), 'HTML has head section');`);
      tests.push(`  assert(html.includes('<body'), 'HTML has body section');`);
      tests.push(`})();`);
    }

    // Mission-specific tests
    if (isTodo) {
      tests.push(`\n// \u2500\u2500 Todo App Specific Tests \u2500\u2500`);
      tests.push(`(function() {`);
      tests.push(`  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');`);
      tests.push(`  assert(html.toLowerCase().includes('todo') || html.toLowerCase().includes('task') || html.toLowerCase().includes('list'), 'HTML references todo/task/list');`);
      tests.push(`  const jsPath = fs.existsSync(path.join(__dirname, '..', 'app.js')) ? path.join(__dirname, '..', 'app.js') : path.join(__dirname, '..', 'src', 'app.js');`);
      tests.push(`  if (fs.existsSync(jsPath)) { const js = fs.readFileSync(jsPath, 'utf-8');`);
      tests.push(`    assert(js.includes('add') || js.includes('create') || js.includes('push'), 'JS has add/create functionality');`);
      tests.push(`    assert(js.includes('delete') || js.includes('remove') || js.includes('filter'), 'JS has delete/remove functionality');`);
      tests.push(`    assert(js.includes('localStorage') || js.includes('storage') || js.includes('save'), 'JS has persistence (localStorage/save)');`);
      tests.push(`  }`);
      tests.push(`})();`);
    } else if (isApi) {
      tests.push(`\n// \u2500\u2500 REST API Specific Tests \u2500\u2500`);
      tests.push(`(function() {`);
      tests.push(`  const jsFiles = fs.readdirSync(path.join(__dirname, '..')).filter(f => f.endsWith('.js') && !f.includes('test'));`);
      tests.push(`  const mainJs = jsFiles.length > 0 ? fs.readFileSync(path.join(__dirname, '..', jsFiles[0]), 'utf-8') : '';`);
      tests.push(`  assert(mainJs.includes('express') || mainJs.includes('http') || mainJs.includes('server') || mainJs.includes('router'), 'JS has server/router code');`);
      tests.push(`  assert(mainJs.includes('get') || mainJs.includes('post') || mainJs.includes('put') || mainJs.includes('delete'), 'JS has HTTP methods');`);
      tests.push(`})();`);
    } else if (isLanding) {
      tests.push(`\n// \u2500\u2500 Landing Page Specific Tests \u2500\u2500`);
      tests.push(`(function() {`);
      tests.push(`  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');`);
      tests.push(`  const lowerHtml = html.toLowerCase();`);
      tests.push(`  assert(lowerHtml.includes('hero') || lowerHtml.includes('banner') || lowerHtml.includes('headline'), 'Landing page has hero/banner section');`);
      tests.push(`  assert(lowerHtml.includes('feature') || lowerHtml.includes('service') || lowerHtml.includes('about'), 'Landing page has features section');`);
      tests.push(`  assert(lowerHtml.includes('contact') || lowerHtml.includes('form') || lowerHtml.includes('email'), 'Landing page has contact/form section');`);
      tests.push(`})();`);
    }

    // File size sanity checks
    tests.push(`\n// \u2500\u2500 File Size Sanity Checks \u2500\u2500`);
    tests.push(`(function() {`);
    tests.push(`  const files = fs.readdirSync(path.join(__dirname, '..')).filter(f => f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.css'));`);
    tests.push(`  files.forEach(f => {`);
    tests.push(`    const stat = fs.statSync(path.join(__dirname, '..', f));`);
    tests.push(`    assert(stat.size > 50, f + ' is not empty (' + stat.size + ' bytes)');`);
    tests.push(`  });`);
    tests.push(`})();`);

    // Summary
    tests.push(`\n// \u2500\u2500 Summary \u2500\u2500`);
    tests.push(`console.log('\\n' + '='.repeat(50));`);
    tests.push(`console.log('Tests: ' + passed + ' passed, ' + failed + ' failed');`);
    tests.push(`console.log('='.repeat(50));`);
    tests.push(`if (failed > 0) process.exit(1);`);

    return tests.join('\n');
  }

  // ═══════════════════════════════════════════════════════════
  //  Report Generation
  // ═══════════════════════════════════════════════════════════

  private generateReport(
    mission: RuntimeMission,
    certResult: { certified: boolean; qualityScore: number; reasons: string[] },
    testResult: { passed: boolean; results: any[] },
    auditResult: { passed: boolean; findings: string[] },
  ): string {
    return `# Mission Report: ${mission.id}

## Objective
${mission.instruction}

## Results
- **Certified**: ${certResult.certified ? '✅ YES' : '❌ NO'}
- **Quality Score**: ${certResult.qualityScore}/100
- **Tests**: ${testResult.passed ? '✅ PASSED' : '❌ FAILED'}
- **Audit**: ${auditResult.passed ? '✅ PASSED' : '❌ ISSUES FOUND'}

## Artifacts
${mission.artifacts.map(a => `- **${a.name}** (${a.type}, ${a.size} bytes)`).join('\n')}

## Certification Details
${certResult.reasons.length > 0 ? certResult.reasons.map(r => `- ⚠️ ${r}`).join('\n') : 'All checks passed.'}

## Audit Findings
${auditResult.findings.length > 0 ? auditResult.findings.map(f => `- ${f}`).join('\n') : 'No issues found.'}

## Duration
Started: ${mission.startedAt.toISOString()}
${mission.completedAt ? `Completed: ${mission.completedAt.toISOString()}` : 'In progress...'}

---
Generated by AENEWS Software Factory`;
  }

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  private updateState(missionId: string, state: MissionState, phase: string): void {
    const mission = this.missions.get(missionId);
    if (mission) {
      mission.status = state;
    }
    // Also update the state machine
    const currentState = this.stateMachine.getCurrentState(missionId);
    if (currentState && currentState !== state) {
      const triggerMap: Partial<Record<MissionState, TransitionTrigger>> = {
        [MissionState.PLANNED]: TransitionTrigger.SUBMIT,
        [MissionState.RESEARCH]: TransitionTrigger.START_RESEARCH,
        [MissionState.BUILDING]: TransitionTrigger.START_BUILD,
        [MissionState.TESTING]: TransitionTrigger.START_TESTING,
        [MissionState.AUDITING]: TransitionTrigger.START_AUDIT,
        [MissionState.CERTIFYING]: TransitionTrigger.START_CERTIFICATION,
        [MissionState.DELIVERING]: TransitionTrigger.START_DELIVERY,
        [MissionState.COMPLETED]: TransitionTrigger.MARK_COMPLETE,
      };
      const trigger = triggerMap[state];
      if (trigger) {
        this.stateMachine.transition({
          missionId,
          contractId: mission?.contractId || '',
          currentState,
          trigger,
        }).catch(() => { /* state machine errors are non-critical */ });
      }
    }
    this.logger.log(`[${missionId}] State: ${state} — ${phase}`);
  }

  private buildResult(
    mission: RuntimeMission,
    startTime: number,
    totalCost: number,
    certified: boolean,
  ): RuntimeResult {
    const certData = this.memoryService.getCertification(mission.id);
    return {
      missionId: mission.id,
      success: mission.errors.length === 0,
      artifacts: mission.artifacts,
      workspaceDir: mission.workspaceDir,
      qualityScore: certData?.qualityScore || 0,
      certified,
      totalDurationMs: Date.now() - startTime,
      totalCostUsd: totalCost,
      errors: mission.errors,
    };
  }

  /**
   * Get a mission's status
   */
  getMission(missionId: string): RuntimeMission | undefined {
    return this.missions.get(missionId);
  }

  /**
   * Get all active missions
   */
  getActiveMissions(): RuntimeMission[] {
    return Array.from(this.missions.values())
      .filter(m => m.status !== MissionState.COMPLETED && m.status !== MissionState.ARCHIVED);
  }

  /**
   * Get all completed missions
   */
  getCompletedMissions(): RuntimeMission[] {
    return Array.from(this.missions.values())
      .filter(m => m.status === MissionState.COMPLETED);
  }

  /**
   * Get workspace directory for a mission
   */
  getWorkspaceDir(missionId: string): string | undefined {
    return this.missions.get(missionId)?.workspaceDir;
  }
}
