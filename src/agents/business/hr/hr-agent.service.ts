/**
 * AENEWS Agent OS X - HR Agent
 * Human resources management, recruitment, onboarding,
 * performance tracking, HR reporting, and leave management.
 */

import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';

// ─── Agent Configuration ──────────────────────────────────────────

export const HR_AGENT_CONFIG: AgentConfig = {
  id: 'business-hr',
  name: 'HR',
  cluster: AgentCluster.BUSINESS,
  version: '1.0.0',
  description:
    'HR agent that handles human resources management, job postings, candidate screening, onboarding, performance tracking, HR reporting, and leave management.',
  capabilities: [
    {
      name: 'createJobPosting',
      description: 'Create a job posting for an open position',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Job title' },
          department: { type: 'string', description: 'Department' },
          location: { type: 'string', description: 'Job location' },
          type: { type: 'string', enum: ['full-time', 'part-time', 'contract', 'internship'], description: 'Employment type' },
          salaryRange: { type: 'object', description: 'Salary range with min and max' },
          requirements: { type: 'array', items: { type: 'string' }, description: 'Job requirements' },
          description: { type: 'string', description: 'Job description' },
        },
        required: ['title', 'department'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          postingId: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string' },
        },
      },
    },
    {
      name: 'screenCandidates',
      description: 'Screen and evaluate candidates for a position',
      inputSchema: {
        type: 'object',
        properties: {
          postingId: { type: 'string', description: 'Job posting ID' },
          candidates: { type: 'array', items: { type: 'object' }, description: 'Candidate profiles to screen' },
          criteria: { type: 'object', description: 'Screening criteria and weights' },
        },
        required: ['postingId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          screeningId: { type: 'string' },
          postingId: { type: 'string' },
          totalCandidates: { type: 'number' },
          qualified: { type: 'number' },
          results: { type: 'array' },
        },
      },
    },
    {
      name: 'manageOnboarding',
      description: 'Manage employee onboarding process and tasks',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['start', 'update', 'complete', 'status'], description: 'Onboarding action' },
          employeeId: { type: 'string', description: 'Employee ID' },
          employeeName: { type: 'string', description: 'Employee name' },
          department: { type: 'string', description: 'Department' },
          startDate: { type: 'string', description: 'Start date (ISO string)' },
          tasks: { type: 'array', items: { type: 'string' }, description: 'Onboarding tasks' },
        },
        required: ['action'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          onboardingId: { type: 'string' },
          action: { type: 'string' },
          status: { type: 'string' },
          progress: { type: 'number' },
          tasks: { type: 'array' },
        },
      },
    },
    {
      name: 'trackPerformance',
      description: 'Track and evaluate employee performance',
      inputSchema: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', description: 'Employee ID' },
          period: { type: 'string', description: 'Review period' },
          metrics: { type: 'object', description: 'Performance metrics and scores' },
          goals: { type: 'array', items: { type: 'object' }, description: 'Performance goals' },
        },
        required: ['employeeId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          reviewId: { type: 'string' },
          employeeId: { type: 'string' },
          overallScore: { type: 'number' },
          rating: { type: 'string' },
          strengths: { type: 'array' },
          areasForImprovement: { type: 'array' },
        },
      },
    },
    {
      name: 'generateHRReport',
      description: 'Generate an HR report',
      inputSchema: {
        type: 'object',
        properties: {
          reportType: { type: 'string', enum: ['headcount', 'turnover', 'diversity', 'recruitment', 'performance'], description: 'Type of HR report' },
          period: { type: 'string', description: 'Report period' },
          department: { type: 'string', description: 'Filter by department' },
        },
        required: ['reportType'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          reportId: { type: 'string' },
          reportType: { type: 'string' },
          summary: { type: 'object' },
          data: { type: 'object' },
          generatedAt: { type: 'string' },
        },
      },
    },
    {
      name: 'manageLeave',
      description: 'Manage employee leave requests and balances',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['request', 'approve', 'reject', 'balance'], description: 'Leave action' },
          employeeId: { type: 'string', description: 'Employee ID' },
          leaveType: { type: 'string', description: 'Type of leave' },
          startDate: { type: 'string', description: 'Leave start date' },
          endDate: { type: 'string', description: 'Leave end date' },
          reason: { type: 'string', description: 'Reason for leave' },
          requestId: { type: 'string', description: 'Leave request ID (for approve/reject)' },
        },
        required: ['action'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          requestId: { type: 'string' },
          action: { type: 'string' },
          status: { type: 'string' },
          balance: { type: 'object' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:business',
    'write:business',
    'read:hr',
    'write:hr',
    'approve:leave',
  ],
  maxConcurrentTasks: 5,
  timeout: 30000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1000,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  salaryMin: number;
  salaryMax: number;
  requirements: string[];
  description: string;
  status: 'open' | 'closed' | 'paused';
  applicants: number;
  createdAt: Date;
}

interface Employee {
  id: string;
  name: string;
  department: string;
  startDate: Date;
  status: string;
  leaveBalance: Record<string, number>;
  performanceScore: number;
}

interface OnboardingProcess {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  startDate: Date;
  tasks: Array<{ name: string; status: 'pending' | 'in_progress' | 'completed' }>;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  daysRequested: number;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class HRAgentService extends BaseAgentService {
  private jobPostings: Map<string, JobPosting> = new Map();
  private employees: Map<string, Employee> = new Map();
  private onboardingProcesses: Map<string, OnboardingProcess> = new Map();
  private leaveRequests: Map<string, LeaveRequest> = new Map();
  private counter: number = 0;

  protected defineConfig(): AgentConfig {
    return HR_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'createJobPosting',
      description: 'Create a job posting',
      execute: async (params: {
        title: string;
        department: string;
        location?: string;
        type?: string;
        salaryRange?: { min: number; max: number };
        requirements?: string[];
        description?: string;
      }) => this.createJobPosting(params),
    });

    this.registerTool({
      name: 'screenCandidates',
      description: 'Screen candidates for a position',
      execute: async (params: {
        postingId: string;
        candidates?: Array<{ name: string; experience: number; skills: string[]; education: string }>;
        criteria?: Record<string, number>;
      }) => this.screenCandidates(params),
    });

    this.registerTool({
      name: 'manageOnboarding',
      description: 'Manage employee onboarding',
      execute: async (params: {
        action: string;
        employeeId?: string;
        employeeName?: string;
        department?: string;
        startDate?: string;
        tasks?: string[];
      }) => this.manageOnboarding(params),
    });

    this.registerTool({
      name: 'trackPerformance',
      description: 'Track employee performance',
      execute: async (params: {
        employeeId: string;
        period?: string;
        metrics?: Record<string, number>;
        goals?: Array<{ title: string; target: string; progress: number }>;
      }) => this.trackPerformance(params),
    });

    this.registerTool({
      name: 'generateHRReport',
      description: 'Generate an HR report',
      execute: async (params: {
        reportType: string;
        period?: string;
        department?: string;
      }) => this.generateHRReport(params),
    });

    this.registerTool({
      name: 'manageLeave',
      description: 'Manage employee leave',
      execute: async (params: {
        action: string;
        employeeId?: string;
        leaveType?: string;
        startDate?: string;
        endDate?: string;
        reason?: string;
        requestId?: string;
      }) => this.manageLeave(params),
    });

    // Seed some employees
    this.seedEmployees();

    await this.storeInWorkingMemory('hr:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('HR agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    if (!action) {
      return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
    }

    const supportedActions = [
      'createJobPosting',
      'screenCandidates',
      'manageOnboarding',
      'trackPerformance',
      'generateHRReport',
      'manageLeave',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown HR action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    }

    try {
      const tool = this.getTool(action);
      if (!tool) {
        return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
      }

      const result = await tool.execute(params);

      await this.storeInWorkingMemory(
        `hr:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`HR execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.jobPostings.clear();
    this.employees.clear();
    this.onboardingProcesses.clear();
    this.leaveRequests.clear();
    this.counter = 0;
    this.logger.log('HR agent destroyed, all data cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async createJobPosting(params: {
    title: string;
    department: string;
    location?: string;
    type?: string;
    salaryRange?: { min: number; max: number };
    requirements?: string[];
    description?: string;
  }): Promise<{
    postingId: string;
    title: string;
    department: string;
    location: string;
    type: string;
    salaryRange: { min: number; max: number };
    requirements: string[];
    status: string;
    createdAt: string;
  }> {
    const {
      title,
      department,
      location = 'Remote',
      type = 'full-time',
      salaryRange = { min: 60000, max: 120000 },
      requirements = [],
      description = '',
    } = params;

    if (!title || typeof title !== 'string') {
      throw new Error('A valid job title is required');
    }

    if (!department || typeof department !== 'string') {
      throw new Error('A valid department is required');
    }

    const validTypes = ['full-time', 'part-time', 'contract', 'internship'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid employment type: ${type}. Supported: ${validTypes.join(', ')}`);
    }

    this.counter++;
    const postingId = `job-${Date.now()}-${this.counter}`;

    const defaultRequirements = [
      'Bachelor\'s degree or equivalent experience',
      'Strong communication skills',
      'Team collaboration ability',
      'Problem-solving mindset',
    ];

    const posting: JobPosting = {
      id: postingId,
      title,
      department,
      location,
      type,
      salaryMin: salaryRange.min,
      salaryMax: salaryRange.max,
      requirements: requirements.length > 0 ? requirements : defaultRequirements,
      description: description || `We are looking for a talented ${title} to join our ${department} team.`,
      status: 'open',
      applicants: 0,
      createdAt: new Date(),
    };

    this.jobPostings.set(postingId, posting);

    this.logger.log(`Created job posting: ${postingId}, title=${title}, department=${department}`);

    return {
      postingId,
      title,
      department,
      location,
      type,
      salaryRange: { min: posting.salaryMin, max: posting.salaryMax },
      requirements: posting.requirements,
      status: 'open',
      createdAt: posting.createdAt.toISOString(),
    };
  }

  private async screenCandidates(params: {
    postingId: string;
    candidates?: Array<{ name: string; experience: number; skills: string[]; education: string }>;
    criteria?: Record<string, number>;
  }): Promise<{
    screeningId: string;
    postingId: string;
    totalCandidates: number;
    qualified: number;
    shortlisted: number;
    results: Array<{
      name: string;
      score: number;
      status: string;
      skillMatch: number;
      experienceMatch: number;
    }>;
  }> {
    const { postingId, candidates = [], criteria = {} } = params;

    if (!postingId || typeof postingId !== 'string') {
      throw new Error('A valid postingId is required');
    }

    const posting = this.jobPostings.get(postingId);
    if (!posting) {
      throw new Error(`Job posting not found: ${postingId}`);
    }

    this.counter++;
    const screeningId = `screen-${Date.now()}-${this.counter}`;

    // Generate default candidates if none provided
    const defaultCandidates = [
      { name: 'Alice Johnson', experience: 5, skills: ['JavaScript', 'TypeScript', 'React'], education: 'BS Computer Science' },
      { name: 'Bob Smith', experience: 3, skills: ['Python', 'Django', 'SQL'], education: 'MS Software Engineering' },
      { name: 'Carol Davis', experience: 7, skills: ['Java', 'Spring', 'AWS'], education: 'BS Information Technology' },
      { name: 'David Wilson', experience: 2, skills: ['React', 'Node.js', 'MongoDB'], education: 'BS Computer Science' },
      { name: 'Eva Martinez', experience: 4, skills: ['Python', 'ML', 'Data Analysis'], education: 'MS Data Science' },
    ];

    const candidatesToScreen = candidates.length > 0 ? candidates : defaultCandidates;

    const defaultCriteria: Record<string, number> = {
      experience: 0.3,
      skills: 0.4,
      education: 0.15,
      culturalFit: 0.15,
    };
    const screeningCriteria = { ...defaultCriteria, ...criteria };

    const results = candidatesToScreen.map((candidate) => {
      const experienceScore = Math.min(candidate.experience / 7, 1) * 100;
      const skillMatch = 50 + Math.random() * 50;
      const educationScore = candidate.education.includes('MS') ? 85 : candidate.education.includes('BS') ? 70 : 50;
      const culturalFitScore = 60 + Math.random() * 35;

      const totalScore =
        experienceScore * (screeningCriteria.experience || 0.3) +
        skillMatch * (screeningCriteria.skills || 0.4) +
        educationScore * (screeningCriteria.education || 0.15) +
        culturalFitScore * (screeningCriteria.culturalFit || 0.15);

      const score = Math.round(totalScore);
      let status: string;
      if (score >= 75) status = 'shortlisted';
      else if (score >= 50) status = 'qualified';
      else status = 'not_qualified';

      return {
        name: candidate.name,
        score,
        status,
        skillMatch: Math.round(skillMatch),
        experienceMatch: Math.round(experienceScore),
      };
    });

    results.sort((a, b) => b.score - a.score);

    const qualified = results.filter((r) => r.status !== 'not_qualified').length;
    const shortlisted = results.filter((r) => r.status === 'shortlisted').length;

    // Update posting applicant count
    posting.applicants += candidatesToScreen.length;

    this.logger.log(`Screened candidates: ${screeningId}, postingId=${postingId}, total=${candidatesToScreen.length}, qualified=${qualified}`);

    return {
      screeningId,
      postingId,
      totalCandidates: candidatesToScreen.length,
      qualified,
      shortlisted,
      results,
    };
  }

  private async manageOnboarding(params: {
    action: string;
    employeeId?: string;
    employeeName?: string;
    department?: string;
    startDate?: string;
    tasks?: string[];
  }): Promise<{
    onboardingId: string;
    action: string;
    employeeId: string;
    status: string;
    progress: number;
    tasks: Array<{ name: string; status: string }>;
    updatedAt: string;
  }> {
    const { action, employeeId, employeeName, department = 'General', startDate, tasks = [] } = params;

    const validActions = ['start', 'update', 'complete', 'status'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid onboarding action: ${action}. Supported: ${validActions.join(', ')}`);
    }

    switch (action) {
      case 'start': {
        if (!employeeId && !employeeName) {
          throw new Error('Either employeeId or employeeName is required to start onboarding');
        }

        this.counter++;
        const onboardingId = `onboard-${Date.now()}-${this.counter}`;
        const empId = employeeId || `emp-${Date.now()}-${this.counter}`;
        const empStartDate = startDate ? new Date(startDate) : new Date();

        const defaultTasks = [
          'Complete new hire paperwork',
          'Set up IT equipment and accounts',
          'Attend orientation session',
          'Meet team members',
          'Review company policies',
          'Complete compliance training',
          'Set up benefits enrollment',
          'Schedule 30-day check-in',
        ];

        const onboardingTasks = (tasks.length > 0 ? tasks : defaultTasks).map((name) => ({
          name,
          status: 'pending' as const,
        }));

        const process: OnboardingProcess = {
          id: onboardingId,
          employeeId: empId,
          employeeName: employeeName || `Employee ${empId}`,
          department,
          startDate: empStartDate,
          tasks: onboardingTasks,
          progress: 0,
          status: 'in_progress',
        };

        this.onboardingProcesses.set(onboardingId, process);

        this.logger.log(`Started onboarding: ${onboardingId}, employee=${employeeName || empId}`);

        return {
          onboardingId,
          action,
          employeeId: empId,
          status: 'in_progress',
          progress: 0,
          tasks: onboardingTasks,
          updatedAt: new Date().toISOString(),
        };
      }
      case 'update': {
        if (!employeeId) throw new Error('employeeId is required for update');

        const process = Array.from(this.onboardingProcesses.values()).find((p) => p.employeeId === employeeId);
        if (!process) throw new Error(`Onboarding process not found for employee: ${employeeId}`);

        // Complete random tasks
        const pendingTasks = process.tasks.filter((t) => t.status === 'pending');
        const tasksToComplete = Math.min(2, pendingTasks.length);
        for (let i = 0; i < tasksToComplete; i++) {
          pendingTasks[i].status = 'completed';
        }

        const completedCount = process.tasks.filter((t) => t.status === 'completed').length;
        process.progress = Math.round((completedCount / process.tasks.length) * 100);
        process.status = process.progress === 100 ? 'completed' : 'in_progress';

        this.logger.log(`Updated onboarding: ${process.id}, progress=${process.progress}%`);

        return {
          onboardingId: process.id,
          action,
          employeeId: process.employeeId,
          status: process.status,
          progress: process.progress,
          tasks: process.tasks,
          updatedAt: new Date().toISOString(),
        };
      }
      case 'complete': {
        if (!employeeId) throw new Error('employeeId is required for complete');

        const process = Array.from(this.onboardingProcesses.values()).find((p) => p.employeeId === employeeId);
        if (!process) throw new Error(`Onboarding process not found for employee: ${employeeId}`);

        process.tasks.forEach((t) => { t.status = 'completed'; });
        process.progress = 100;
        process.status = 'completed';

        this.logger.log(`Completed onboarding: ${process.id}, employee=${process.employeeName}`);

        return {
          onboardingId: process.id,
          action,
          employeeId: process.employeeId,
          status: 'completed',
          progress: 100,
          tasks: process.tasks,
          updatedAt: new Date().toISOString(),
        };
      }
      case 'status': {
        if (!employeeId) throw new Error('employeeId is required for status');

        const process = Array.from(this.onboardingProcesses.values()).find((p) => p.employeeId === employeeId);
        if (!process) throw new Error(`Onboarding process not found for employee: ${employeeId}`);

        return {
          onboardingId: process.id,
          action,
          employeeId: process.employeeId,
          status: process.status,
          progress: process.progress,
          tasks: process.tasks,
          updatedAt: new Date().toISOString(),
        };
      }
      default:
        throw new Error(`Unhandled onboarding action: ${action}`);
    }
  }

  private async trackPerformance(params: {
    employeeId: string;
    period?: string;
    metrics?: Record<string, number>;
    goals?: Array<{ title: string; target: string; progress: number }>;
  }): Promise<{
    reviewId: string;
    employeeId: string;
    period: string;
    overallScore: number;
    rating: string;
    metrics: Record<string, number>;
    strengths: string[];
    areasForImprovement: string[];
    goalsProgress: number;
  }> {
    const { employeeId, period = 'Q1-2024', metrics = {}, goals = [] } = params;

    if (!employeeId || typeof employeeId !== 'string') {
      throw new Error('A valid employeeId is required');
    }

    this.counter++;
    const reviewId = `perf-${Date.now()}-${this.counter}`;

    const defaultMetrics: Record<string, number> = {
      qualityOfWork: 70 + Math.floor(Math.random() * 30),
      productivity: 65 + Math.floor(Math.random() * 35),
      communication: 70 + Math.floor(Math.random() * 30),
      teamwork: 75 + Math.floor(Math.random() * 25),
      initiative: 60 + Math.floor(Math.random() * 40),
      attendance: 85 + Math.floor(Math.random() * 15),
    };

    const reviewMetrics = { ...defaultMetrics, ...metrics };

    const overallScore = Math.round(
      Object.values(reviewMetrics).reduce((s, v) => s + v, 0) / Object.values(reviewMetrics).length,
    );

    let rating: string;
    if (overallScore >= 90) rating = 'exceptional';
    else if (overallScore >= 80) rating = 'exceeds_expectations';
    else if (overallScore >= 70) rating = 'meets_expectations';
    else if (overallScore >= 60) rating = 'needs_improvement';
    else rating = 'unsatisfactory';

    const strengthPool = [
      'Consistent high-quality deliverables',
      'Strong collaboration and communication',
      'Proactive problem-solving approach',
      'Excellent time management',
      'Mentorship and knowledge sharing',
      'Adaptability to change',
    ];

    const improvementPool = [
      'Could take more initiative on projects',
      'Communication in cross-team settings',
      'Time management during peak periods',
      'Attention to detail in documentation',
      'Delegation and workload management',
      'Presentation and public speaking skills',
    ];

    const strengths: string[] = [];
    const areasForImprovement: string[] = [];

    const metricEntries = Object.entries(reviewMetrics).sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < Math.min(3, metricEntries.length); i++) {
      if (metricEntries[i][1] >= 80) {
        strengths.push(strengthPool[i] || `Strong performance in ${metricEntries[i][0]}`);
      }
    }

    for (let i = metricEntries.length - 1; i >= Math.max(0, metricEntries.length - 2); i--) {
      if (metricEntries[i][1] < 75) {
        areasForImprovement.push(improvementPool[metricEntries.length - 1 - i] || `Improve ${metricEntries[i][0]}`);
      }
    }

    if (strengths.length === 0) strengths.push('Reliable and consistent contributor');
    if (areasForImprovement.length === 0) areasForImprovement.push('Continue developing leadership skills');

    const goalsProgress = goals.length > 0
      ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
      : 0;

    // Update employee performance score
    const employee = this.employees.get(employeeId);
    if (employee) {
      employee.performanceScore = overallScore;
    }

    this.logger.log(`Performance review: ${reviewId}, employee=${employeeId}, score=${overallScore}, rating=${rating}`);

    return {
      reviewId,
      employeeId,
      period,
      overallScore,
      rating,
      metrics: reviewMetrics,
      strengths,
      areasForImprovement,
      goalsProgress,
    };
  }

  private async generateHRReport(params: {
    reportType: string;
    period?: string;
    department?: string;
  }): Promise<{
    reportId: string;
    reportType: string;
    period: string;
    summary: Record<string, any>;
    data: Record<string, any>;
    generatedAt: string;
  }> {
    const { reportType, period = 'current', department } = params;

    const validReportTypes = ['headcount', 'turnover', 'diversity', 'recruitment', 'performance'];
    if (!validReportTypes.includes(reportType)) {
      throw new Error(`Invalid reportType: ${reportType}. Supported: ${validReportTypes.join(', ')}`);
    }

    this.counter++;
    const reportId = `hr-rpt-${Date.now()}-${this.counter}`;

    const totalEmployees = this.employees.size || 150;
    let summary: Record<string, any> = {};
    let data: Record<string, any> = {};

    switch (reportType) {
      case 'headcount': {
        const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];
        const headcountByDept: Record<string, number> = {};
        for (const dept of departments) {
          headcountByDept[dept] = 10 + Math.floor(Math.random() * 40);
        }
        summary = { totalEmployees, departments: departments.length, avgTeamSize: Math.round(totalEmployees / departments.length) };
        data = { headcountByDept, trend: 'growing' };
        break;
      }
      case 'turnover': {
        const turnoverRate = +(8 + Math.random() * 12).toFixed(1);
        summary = {
          turnoverRate,
          voluntaryTurnover: +(turnoverRate * 0.7).toFixed(1),
          involuntaryTurnover: +(turnoverRate * 0.3).toFixed(1),
          avgTenureMonths: Math.round(24 + Math.random() * 36),
        };
        data = {
          turnoverByDepartment: {
            Engineering: +(6 + Math.random() * 8).toFixed(1),
            Marketing: +(10 + Math.random() * 10).toFixed(1),
            Sales: +(12 + Math.random() * 15).toFixed(1),
            HR: +(5 + Math.random() * 5).toFixed(1),
            Finance: +(4 + Math.random() * 6).toFixed(1),
          },
          retentionRisk: { high: 5, medium: 12, low: 133 },
        };
        break;
      }
      case 'diversity': {
        summary = {
          genderDiversity: +(35 + Math.random() * 20).toFixed(1),
          ethnicDiversity: +(25 + Math.random() * 25).toFixed(1),
          ageDiversity: 'multigenerational',
        };
        data = {
          genderDistribution: { male: 55, female: 35, nonBinary: 5, preferNotToSay: 5 },
          ageGroups: { '18-25': 15, '26-35': 35, '36-45': 30, '46-55': 15, '55+': 5 },
        };
        break;
      }
      case 'recruitment': {
        summary = {
          openPositions: this.jobPostings.size || 12,
          totalApplicants: 250 + Math.floor(Math.random() * 200),
          avgTimeToHire: Math.round(25 + Math.random() * 20),
          offerAcceptanceRate: +(70 + Math.random() * 20).toFixed(1),
        };
        data = {
          pipelineByStage: { sourcing: 45, screening: 30, interview: 18, offer: 5, hired: 3 },
          costPerHire: Math.round(3000 + Math.random() * 5000),
        };
        break;
      }
      case 'performance': {
        summary = {
          avgPerformanceScore: Math.round(72 + Math.random() * 15),
          highPerformers: Math.round(totalEmployees * 0.2),
          needsImprovement: Math.round(totalEmployees * 0.1),
          goalsCompletionRate: +(65 + Math.random() * 25).toFixed(1),
        };
        data = {
          ratingDistribution: {
            exceptional: 10,
            exceedsExpectations: 25,
            meetsExpectations: 55,
            needsImprovement: 8,
            unsatisfactory: 2,
          },
        };
        break;
      }
    }

    this.logger.log(`Generated HR report: ${reportId}, type=${reportType}`);

    return {
      reportId,
      reportType,
      period,
      summary,
      data,
      generatedAt: new Date().toISOString(),
    };
  }

  private async manageLeave(params: {
    action: string;
    employeeId?: string;
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    requestId?: string;
  }): Promise<{
    requestId: string;
    action: string;
    status: string;
    leaveType: string;
    daysRequested: number;
    balance: Record<string, number>;
    updatedAt: string;
  }> {
    const { action, employeeId, leaveType = 'vacation', startDate, endDate, reason = '', requestId } = params;

    const validActions = ['request', 'approve', 'reject', 'balance'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid leave action: ${action}. Supported: ${validActions.join(', ')}`);
    }

    const validLeaveTypes = ['vacation', 'sick', 'personal', 'maternity', 'paternity', 'bereavement'];
    if (!validLeaveTypes.includes(leaveType)) {
      throw new Error(`Invalid leave type: ${leaveType}. Supported: ${validLeaveTypes.join(', ')}`);
    }

    const defaultBalance: Record<string, number> = {
      vacation: 15,
      sick: 10,
      personal: 3,
      maternity: 0,
      paternity: 0,
      bereavement: 5,
    };

    switch (action) {
      case 'request': {
        if (!employeeId) throw new Error('employeeId is required for leave request');
        if (!startDate || !endDate) throw new Error('startDate and endDate are required for leave request');

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new Error('Invalid date format for startDate or endDate');
        }
        if (end < start) {
          throw new Error('endDate must be after startDate');
        }

        const daysRequested = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        this.counter++;
        const leaveRequestId = `leave-${Date.now()}-${this.counter}`;

        const leaveRequest: LeaveRequest = {
          id: leaveRequestId,
          employeeId,
          leaveType,
          startDate: start,
          endDate: end,
          reason,
          status: 'pending',
          daysRequested,
        };

        this.leaveRequests.set(leaveRequestId, leaveRequest);

        const employee = this.employees.get(employeeId);
        const balance = employee?.leaveBalance || { ...defaultBalance };

        this.logger.log(`Leave request: ${leaveRequestId}, employee=${employeeId}, type=${leaveType}, days=${daysRequested}`);

        return {
          requestId: leaveRequestId,
          action,
          status: 'pending',
          leaveType,
          daysRequested,
          balance,
          updatedAt: new Date().toISOString(),
        };
      }
      case 'approve': {
        if (!requestId) throw new Error('requestId is required for approval');

        const request = this.leaveRequests.get(requestId);
        if (!request) throw new Error(`Leave request not found: ${requestId}`);
        if (request.status !== 'pending') throw new Error(`Leave request already ${request.status}`);

        request.status = 'approved';

        // Update employee balance
        const employee = this.employees.get(request.employeeId);
        if (employee && employee.leaveBalance[request.leaveType] !== undefined) {
          employee.leaveBalance[request.leaveType] = Math.max(0, employee.leaveBalance[request.leaveType] - request.daysRequested);
        }

        this.logger.log(`Approved leave: ${requestId}, employee=${request.employeeId}`);

        return {
          requestId,
          action,
          status: 'approved',
          leaveType: request.leaveType,
          daysRequested: request.daysRequested,
          balance: employee?.leaveBalance || defaultBalance,
          updatedAt: new Date().toISOString(),
        };
      }
      case 'reject': {
        if (!requestId) throw new Error('requestId is required for rejection');

        const request = this.leaveRequests.get(requestId);
        if (!request) throw new Error(`Leave request not found: ${requestId}`);
        if (request.status !== 'pending') throw new Error(`Leave request already ${request.status}`);

        request.status = 'rejected';

        this.logger.log(`Rejected leave: ${requestId}, employee=${request.employeeId}`);

        return {
          requestId,
          action,
          status: 'rejected',
          leaveType: request.leaveType,
          daysRequested: request.daysRequested,
          balance: defaultBalance,
          updatedAt: new Date().toISOString(),
        };
      }
      case 'balance': {
        if (!employeeId) throw new Error('employeeId is required for balance check');

        const employee = this.employees.get(employeeId);
        const balance = employee?.leaveBalance || defaultBalance;

        this.logger.log(`Leave balance checked: employee=${employeeId}`);

        return {
          requestId: 'balance-check',
          action,
          status: 'completed',
          leaveType: 'all',
          daysRequested: 0,
          balance,
          updatedAt: new Date().toISOString(),
        };
      }
      default:
        throw new Error(`Unhandled leave action: ${action}`);
    }
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private seedEmployees(): void {
    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
    const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'Chris Brown'];

    names.forEach((name, i) => {
      const empId = `emp-seed-${i + 1}`;
      this.employees.set(empId, {
        id: empId,
        name,
        department: departments[i % departments.length],
        startDate: new Date(Date.now() - Math.floor(Math.random() * 3 * 365 * 24 * 60 * 60 * 1000)),
        status: 'active',
        leaveBalance: {
          vacation: 10 + Math.floor(Math.random() * 10),
          sick: 5 + Math.floor(Math.random() * 5),
          personal: 1 + Math.floor(Math.random() * 3),
          maternity: 0,
          paternity: 0,
          bereavement: 5,
        },
        performanceScore: 65 + Math.floor(Math.random() * 30),
      });
    });
  }
}
