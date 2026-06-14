import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = 3003;

// ─── Agent Activity Types ────────────────────────────────────────
interface AgentStep {
  id: string;
  agentId: string;
  agentName: string;
  cluster: string;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'action' | 'output' | 'error' | 'waiting' | 'collaborating' | 'decision';
  title: string;
  detail?: string;
  timestamp: number;
  duration?: number;
  status: 'running' | 'completed' | 'failed' | 'waiting';
  metadata?: Record<string, unknown>;
}

interface AgentSession {
  id: string;
  agentId: string;
  agentName: string;
  cluster: string;
  missionId?: string;
  missionName?: string;
  status: 'idle' | 'thinking' | 'executing' | 'waiting' | 'collaborating' | 'completed' | 'error';
  currentStep?: string;
  progress: number;
  startedAt: number;
  steps: AgentStep[];
  tokensUsed?: number;
  llmCalls?: number;
  toolCalls?: number;
}

// ─── Simulated Agent Data ────────────────────────────────────────
const agentNames = [
  { id: 'nav-1', name: 'Navigation Agent', cluster: 'browser' },
  { id: 'scrape-1', name: 'Scraping Agent', cluster: 'browser' },
  { id: 'term-1', name: 'Terminal Agent', cluster: 'computer' },
  { id: 'code-1', name: 'Code Generation Agent', cluster: 'coding' },
  { id: 'debug-1', name: 'Debugging Agent', cluster: 'coding' },
  { id: 'doc-1', name: 'Document Agent', cluster: 'office' },
  { id: 'email-1', name: 'Email Agent', cluster: 'office' },
  { id: 'seo-1', name: 'SEO Agent', cluster: 'marketing' },
  { id: 'threat-1', name: 'Threat Detection Agent', cluster: 'security' },
  { id: 'plan-1', name: 'Mission Planner', cluster: 'intelligent-orchestration' },
  { id: 'judge-1', name: 'LLM Judge', cluster: 'llm-intelligence' },
  { id: 'auto-fix-1', name: 'Auto-Fixer Agent', cluster: 'watchdog' },
  { id: 'refactor-1', name: 'Refactor Proposer', cluster: 'self-evolution' },
  { id: 'perf-aud-1', name: 'Performance Auditor', cluster: 'certification' },
];

const thinkingPhrases = [
  'Analyzing the task requirements and selecting optimal strategy...',
  'Decomposing the problem into sub-tasks for parallel execution...',
  'Evaluating multiple approaches based on historical success rates...',
  'Considering constraints and selecting the best execution path...',
  'Cross-referencing knowledge base for similar patterns...',
  'Optimizing resource allocation across available agents...',
  'Checking dependencies and resolving conflicts...',
  'Formulating execution plan with fallback strategies...',
];

const toolCallTemplates = [
  { tool: 'web_navigate', desc: 'Navigating to target URL', cluster: 'browser' },
  { tool: 'web_scrape', desc: 'Extracting structured data from page', cluster: 'browser' },
  { tool: 'terminal_exec', desc: 'Executing shell command', cluster: 'computer' },
  { tool: 'code_generate', desc: 'Generating code implementation', cluster: 'coding' },
  { tool: 'code_review', desc: 'Reviewing code for quality issues', cluster: 'coding' },
  { tool: 'document_create', desc: 'Creating formatted document', cluster: 'office' },
  { tool: 'email_send', desc: 'Composing and sending email', cluster: 'office' },
  { tool: 'seo_analyze', desc: 'Analyzing SEO metrics and keywords', cluster: 'marketing' },
  { tool: 'threat_scan', desc: 'Scanning for security vulnerabilities', cluster: 'security' },
  { tool: 'plan_create', desc: 'Creating mission execution plan', cluster: 'intelligent-orchestration' },
  { tool: 'judge_evaluate', desc: 'Evaluating output quality score', cluster: 'llm-intelligence' },
  { tool: 'fix_apply', desc: 'Applying automated fix', cluster: 'watchdog' },
  { tool: 'refactor_propose', desc: 'Proposing code refactoring', cluster: 'self-evolution' },
  { tool: 'audit_run', desc: 'Running compliance audit', cluster: 'certification' },
];

const missionNames = [
  'Web Scraping Pipeline', 'Code Review Sprint', 'Security Audit Q2',
  'SEO Optimization Campaign', 'Document Generation Batch', 'Market Research Analysis',
  'Infrastructure Health Check', 'Agent Performance Certification',
];

// ─── State ───────────────────────────────────────────────────────
let activeSessions: Map<string, AgentSession> = new Map();
let stepCounter = 0;

function createStep(agentId: string, agentName: string, cluster: string, type: AgentStep['type'], title: string, detail?: string): AgentStep {
  return {
    id: `step-${++stepCounter}`,
    agentId,
    agentName,
    cluster,
    type,
    title,
    detail,
    timestamp: Date.now(),
    status: type === 'thinking' || type === 'waiting' ? 'running' : 'completed',
  };
}

// ─── Server Setup ────────────────────────────────────────────────
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log(`[Agent Stream] Client connected: ${socket.id}`);

  // Send current active sessions on connect
  socket.emit('sessions:init', Array.from(activeSessions.values()));

  // Subscribe to specific agent
  socket.on('agent:subscribe', (agentId: string) => {
    socket.join(`agent:${agentId}`);
    const session = activeSessions.get(agentId);
    if (session) {
      socket.emit('agent:state', session);
    }
  });

  // Subscribe to mission
  socket.on('mission:subscribe', (missionId: string) => {
    socket.join(`mission:${missionId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Agent Stream] Client disconnected: ${socket.id}`);
  });
});

// ─── Simulation Engine ───────────────────────────────────────────
function simulateAgentActivity() {
  // Pick 3-6 active agents
  const numActive = Math.floor(Math.random() * 4) + 3;
  const activeAgents = agentNames.sort(() => Math.random() - 0.5).slice(0, numActive);

  activeAgents.forEach((agent) => {
    const missionId = `mission-${Math.floor(Math.random() * 4) + 1}`;
    const missionName = missionNames[Math.floor(Math.random() * missionNames.length)];

    // Create or update session
    if (!activeSessions.has(agent.id)) {
      activeSessions.set(agent.id, {
        id: `session-${agent.id}`,
        agentId: agent.id,
        agentName: agent.name,
        cluster: agent.cluster,
        missionId,
        missionName,
        status: 'idle',
        progress: 0,
        startedAt: Date.now(),
        steps: [],
        tokensUsed: 0,
        llmCalls: 0,
        toolCalls: 0,
      });
    }

    const session = activeSessions.get(agent.id)!;
    session.missionId = missionId;
    session.missionName = missionName;
  });

  // Simulate step progression for each active agent
  activeAgents.forEach((agent) => {
    const session = activeSessions.get(agent.id)!;
    const roll = Math.random();

    if (roll < 0.25) {
      // Thinking step
      const phrase = thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)];
      session.status = 'thinking';
      session.currentStep = 'Analyzing...';

      const step = createStep(agent.id, agent.name, agent.cluster, 'thinking', 'Thinking...', phrase);
      step.status = 'running';
      session.steps.push(step);
      session.llmCalls = (session.llmCalls || 0) + 1;
      session.tokensUsed = (session.tokensUsed || 0) + Math.floor(Math.random() * 500) + 100;

      io.emit('agent:step', step);
      io.to(`agent:${agent.id}`).emit('agent:state', session);

      // Mark thinking complete after a delay
      setTimeout(() => {
        step.status = 'completed';
        step.duration = Date.now() - step.timestamp;
        io.emit('agent:step:update', step);
      }, 1500 + Math.random() * 2000);

    } else if (roll < 0.65) {
      // Tool call + result
      const toolTemplate = toolCallTemplates.find(t => t.cluster === agent.cluster) || toolCallTemplates[0];
      session.status = 'executing';
      session.currentStep = toolTemplate.desc;

      const toolStep = createStep(agent.id, agent.name, agent.cluster, 'tool_call', `Calling: ${toolTemplate.tool}`, toolTemplate.desc);
      toolStep.metadata = { tool: toolTemplate.tool, params: { target: 'current-task' } };
      session.steps.push(toolStep);
      session.toolCalls = (session.toolCalls || 0) + 1;

      io.emit('agent:step', toolStep);
      io.to(`agent:${agent.id}`).emit('agent:state', session);

      // Result after delay
      setTimeout(() => {
        toolStep.status = 'completed';
        toolStep.duration = Date.now() - toolStep.timestamp;
        io.emit('agent:step:update', toolStep);

        const resultStep = createStep(agent.id, agent.name, agent.cluster, 'tool_result', `Result: ${toolTemplate.tool}`,
          `Successfully completed. Output: ${Math.floor(Math.random() * 100)} items processed.`);
        resultStep.status = 'completed';
        resultStep.duration = Math.floor(Math.random() * 200) + 50;
        session.steps.push(resultStep);
        session.progress = Math.min(100, session.progress + Math.floor(Math.random() * 15) + 5);

        io.emit('agent:step', resultStep);
        io.to(`agent:${agent.id}`).emit('agent:state', session);
      }, 800 + Math.random() * 2000);

    } else if (roll < 0.8) {
      // Collaboration step
      const otherAgent = agentNames.find(a => a.id !== agent.id) || agentNames[0];
      session.status = 'collaborating';
      session.currentStep = `Collaborating with ${otherAgent.name}`;

      const collabStep = createStep(agent.id, agent.name, agent.cluster, 'collaborating',
        `Collaborating with ${otherAgent.name}`, `Sharing workspace data and coordinating task execution`);
      collabStep.status = 'running';
      session.steps.push(collabStep);

      io.emit('agent:step', collabStep);
      io.to(`agent:${agent.id}`).emit('agent:state', session);

      setTimeout(() => {
        collabStep.status = 'completed';
        collabStep.duration = Date.now() - collabStep.timestamp;
        io.emit('agent:step:update', collabStep);
      }, 2000 + Math.random() * 1500);

    } else if (roll < 0.9) {
      // Decision step
      session.status = 'thinking';
      session.currentStep = 'Making decision';

      const decisionStep = createStep(agent.id, agent.name, agent.cluster, 'decision',
        'Decision Point', `Selected strategy: ${['parallel-execution', 'sequential-pipeline', 'consensus-voting', 'delegation'][Math.floor(Math.random() * 4)]}. Confidence: ${(70 + Math.random() * 30).toFixed(1)}%`);
      decisionStep.status = 'completed';
      decisionStep.duration = Math.floor(Math.random() * 500) + 100;
      session.steps.push(decisionStep);
      session.llmCalls = (session.llmCalls || 0) + 1;

      io.emit('agent:step', decisionStep);
      io.to(`agent:${agent.id}`).emit('agent:state', session);

    } else {
      // Output / completion step
      session.status = 'completed';
      session.currentStep = 'Task completed';
      session.progress = 100;

      const outputStep = createStep(agent.id, agent.name, agent.cluster, 'output',
        'Task Completed', `Generated output with ${Math.floor(Math.random() * 50) + 10} results. Quality score: ${(80 + Math.random() * 20).toFixed(1)}%`);
      outputStep.status = 'completed';
      outputStep.duration = Math.floor(Math.random() * 1000) + 200;
      session.steps.push(outputStep);

      io.emit('agent:step', outputStep);
      io.to(`agent:${agent.id}`).emit('agent:state', session);

      // Reset after a while
      setTimeout(() => {
        session.status = 'idle';
        session.progress = 0;
        session.steps = [];
        session.currentStep = undefined;
        io.to(`agent:${agent.id}`).emit('agent:state', session);
      }, 5000);
    }

    // Emit global sessions update
    io.emit('sessions:update', Array.from(activeSessions.values()));
  });
}

// ─── Start ───────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[Agent Stream] WebSocket server running on port ${PORT}`);

  // Simulate agent activity every 2-4 seconds
  setInterval(simulateAgentActivity, 2500);

  // Initial simulation
  setTimeout(simulateAgentActivity, 1000);
});
