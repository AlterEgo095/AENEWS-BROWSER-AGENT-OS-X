/**
 * PDEOS Phase 13 — Project Manager Agent
 * Transforms a prompt into Epics → Stories → Tasks (typed + routed to 10 PDEOS departments).
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';

export enum TaskType { RESEARCH = 'research', BACKEND = 'backend', FRONTEND = 'frontend', DATABASE = 'database', DOCKER = 'docker', TESTS = 'tests', DOCUMENTATION = 'documentation', DEPLOY = 'deploy', CONFIG = 'config', SECURITY = 'security', REFACTOR = 'refactor', DESIGN = 'design' }
export enum TaskStatus { TODO = 'todo', ASSIGNED = 'assigned', IN_PROGRESS = 'in_progress', REVIEW = 'review', BLOCKED = 'blocked', DONE = 'done', FAILED = 'failed' }
export enum Priority { LOW = 'low', MEDIUM = 'medium', HIGH = 'high', CRITICAL = 'critical' }
export enum ProjectStatus { DRAFT = 'draft', PLANNED = 'planned', IN_PROGRESS = 'in_progress', BLOCKED = 'blocked', COMPLETED = 'completed', CANCELLED = 'cancelled' }

export interface Task { id: string; title: string; description: string; type: TaskType; status: TaskStatus; priority: Priority; assignedDepartment?: string; estimatedHours: number; dependencies: string[]; acceptanceCriteria: string[]; deliverables: string[]; retryCount: number; parentStoryId: string; }
export interface Story { id: string; title: string; description: string; status: ProjectStatus; priority: Priority; tasks: Task[]; estimatedHours: number; completedHours: number; parentEpicId: string; }
export interface Epic { id: string; title: string; description: string; status: ProjectStatus; priority: Priority; stories: Story[]; estimatedHours: number; completedHours: number; }
export interface Project { id: string; name: string; description: string; status: ProjectStatus; epics: Epic[]; createdAt: Date; updatedAt: Date; techStack: string[]; totalEstimatedHours: number; totalCompletedHours: number; progressPercent: number; }

const ROUTING: Record<TaskType, string> = {
  [TaskType.RESEARCH]: 'research',
  [TaskType.BACKEND]: 'software-factory',
  [TaskType.FRONTEND]: 'software-factory',
  [TaskType.DATABASE]: 'software-factory',
  [TaskType.DOCKER]: 'infrastructure',
  [TaskType.TESTS]: 'software-factory',
  [TaskType.DOCUMENTATION]: 'content-factory',
  [TaskType.DEPLOY]: 'infrastructure',
  [TaskType.CONFIG]: 'infrastructure',
  [TaskType.SECURITY]: 'security',
  [TaskType.REFACTOR]: 'software-factory',
  [TaskType.DESIGN]: 'content-factory',
};

@Injectable()
export class ProjectManagerAgent {
  private logger = new Logger(ProjectManagerAgent.name);

  constructor(@Inject('REDIS_CLIENT') private redis: Redis, private llm: LLMService) {}

  async createProject(prompt: string, user: { id: string; tenantId: string }): Promise<Project> {
    const projectId = `proj_${uuidv4()}`;
    this.logger.log(`[${projectId}] Creating project: "${prompt.substring(0, 80)}..."`);

    // 1. Analyze
    const analysis = await this.llmComplete(`Analyze this project request and respond in JSON: { title, description, techStack: [], targetUsers, keyFeatures: [], complexity, estimatedDurationHours }
REQUEST: ${prompt}`);

    // 2. Epics
    const epicsResp = await this.llmComplete(`Decompose into 3-7 epics. JSON: { epics: [{ title, description, priority, estimatedHours }] }
PROJECT: ${JSON.stringify(analysis)}`);

    // 3. Stories per epic
    const epics: Epic[] = [];
    for (const e of (epicsResp.epics || []).slice(0, 7)) {
      const storiesResp = await this.llmComplete(`Decompose epic into 2-5 stories. JSON: { stories: [{ title, description, priority, estimatedHours }] }
EPIC: ${JSON.stringify(e)}`);
      const stories: Story[] = [];
      for (const s of (storiesResp.stories || []).slice(0, 5)) {
        // 4. Tasks per story
        const tasksResp = await this.llmComplete(`Decompose story into 3-8 tasks (types: research, backend, frontend, database, docker, tests, documentation, deploy, config, security, refactor, design). JSON: { tasks: [{ title, description, type, priority, estimatedHours, dependencies: [], acceptanceCriteria: [], deliverables: [] }] }
STORY: ${JSON.stringify(s)}`);
        const tasks: Task[] = (tasksResp.tasks || []).slice(0, 8).map((t: any) => ({
          id: `task_${uuidv4()}`, title: String(t.title), description: String(t.description),
          type: (t.type as TaskType) || TaskType.BACKEND, status: TaskStatus.TODO,
          priority: (t.priority as Priority) || Priority.MEDIUM,
          assignedDepartment: ROUTING[(t.type as TaskType) || TaskType.BACKEND] || 'software-factory',
          estimatedHours: +t.estimatedHours || 2,
          dependencies: t.dependencies || [], acceptanceCriteria: t.acceptanceCriteria || [],
          deliverables: t.deliverables || [], retryCount: 0,
          parentStoryId: '', // will be set below
        }));
        const story: Story = {
          id: `story_${uuidv4()}`, title: s.title, description: s.description,
          status: ProjectStatus.PLANNED, priority: s.priority || Priority.MEDIUM,
          tasks: tasks.map((t) => ({ ...t, parentStoryId: `story_${uuidv4()}` })), // each task gets story id
          estimatedHours: +s.estimatedHours || 8, completedHours: 0,
          parentEpicId: '', // set below
        };
        stories.push({ ...story, tasks: story.tasks.map((t) => ({ ...t, parentStoryId: story.id })) });
      }
      epics.push({
        id: `epic_${uuidv4()}`, title: e.title, description: e.description,
        status: ProjectStatus.PLANNED, priority: e.priority || Priority.HIGH,
        stories: stories.map((s) => ({ ...s, parentEpicId: `epic_${uuidv4()}` })),
        estimatedHours: +e.estimatedHours || 20, completedHours: 0,
      });
      // Fix parentEpicId
      const epicId = epics[epics.length - 1].id;
      epics[epics.length - 1].stories = epics[epics.length - 1].stories.map((s) => ({ ...s, parentEpicId: epicId }));
    }

    const totalHours = epics.reduce((s, e) => s + e.stories.reduce((ss, st) => ss + st.estimatedHours, 0), 0);
    const project: Project = {
      id: projectId, name: analysis.title || prompt.substring(0, 80), description: analysis.description || prompt,
      status: ProjectStatus.PLANNED, epics, createdAt: new Date(), updatedAt: new Date(),
      techStack: analysis.techStack || [], totalEstimatedHours: totalHours, totalCompletedHours: 0, progressPercent: 0,
    };

    await this.redis.set(`project:${projectId}`, JSON.stringify(project), 'EX', 86400 * 90);
    await this.redis.lpush('projects:recent', JSON.stringify({ id: projectId, name: project.name, status: project.status, createdAt: project.createdAt }));
    await this.redis.ltrim('projects:recent', 0, 49);

    this.logger.log(`[${projectId}] Project created: ${epics.length} epics, ${totalHours}h total`);
    return project;
  }

  async trackProject(projectId: string): Promise<Project | null> {
    const raw = await this.redis.get(`project:${projectId}`);
    if (!raw) return null;
    const p: Project = JSON.parse(raw);
    let totalTasks = 0, doneTasks = 0;
    for (const e of p.epics) for (const s of e.stories) for (const t of s.tasks) {
      totalTasks++;
      if (t.status === TaskStatus.DONE) doneTasks++;
    }
    p.progressPercent = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
    p.status = p.progressPercent === 100 ? ProjectStatus.COMPLETED : p.progressPercent > 0 ? ProjectStatus.IN_PROGRESS : ProjectStatus.PLANNED;
    p.updatedAt = new Date();
    await this.redis.set(`project:${projectId}`, JSON.stringify(p), 'EX', 86400 * 90);
    return p;
  }

  async listProjects(): Promise<any[]> {
    return (await this.redis.lrange('projects:recent', 0, 19)).map((e) => JSON.parse(e));
  }

  private async llmComplete(prompt: string): Promise<any> {
    try {
      const r = await this.llm.complete({ prompt, temperature: 0.3, maxTokens: 1500 } as any);
      return JSON.parse(r.text);
    } catch { return {}; }
  }
}
