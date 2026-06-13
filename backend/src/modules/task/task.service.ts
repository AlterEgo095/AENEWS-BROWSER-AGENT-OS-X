import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  /**
   * Create a new task. Defaults to PENDING status.
   */
  async create(createDto: Partial<Task>): Promise<Task> {
    const task = this.taskRepository.create({
      ...createDto,
      status: TaskStatus.PENDING,
      retryCount: 0,
      maxRetries: createDto.maxRetries ?? 3,
      priority: createDto.priority ?? 5,
      input: createDto.input ?? {},
    });
    return this.taskRepository.save(task);
  }

  /**
   * List tasks with optional filtering by tenant and status, ordered by
   * priority (DESC) then creation time (ASC) for FIFO within same priority.
   */
  async findAll(
    tenantId?: string,
    status?: TaskStatus,
    page = 1,
    limit = 20,
  ): Promise<{ data: Task[]; total: number }> {
    const query = this.taskRepository.createQueryBuilder('task');
    if (tenantId) query.andWhere('task.tenantId = :tenantId', { tenantId });
    if (status) query.andWhere('task.status = :status', { status });
    query
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.createdAt', 'ASC');
    query.skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  /**
   * Find a single task by ID. Throws NotFoundException if missing.
   */
  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  /**
   * Update the status of a task, automatically setting startedAt / completedAt
   * timestamps based on the transition.
   */
  async updateStatus(
    id: string,
    status: TaskStatus,
    error?: string,
  ): Promise<Task> {
    const updateData: Partial<Task> = { status };

    if (status === TaskStatus.RUNNING) {
      updateData.startedAt = new Date();
    }

    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
      updateData.completedAt = new Date();
    }

    if (error) {
      updateData.error = error;
    }

    await this.taskRepository.update(id, updateData);
    return this.findOne(id);
  }

  /**
   * Increment the retry counter for a task. If the new count exceeds maxRetries,
   * the task transitions to FAILED; otherwise it moves to RETRYING.
   */
  async incrementRetry(id: string): Promise<Task> {
    const task = await this.findOne(id);

    const newRetryCount = task.retryCount + 1;
    const newStatus =
      newRetryCount >= task.maxRetries ? TaskStatus.FAILED : TaskStatus.RETRYING;

    await this.taskRepository.update(id, {
      retryCount: newRetryCount,
      status: newStatus,
    });

    this.logger.log(
      `Task ${id} retry ${newRetryCount}/${task.maxRetries} — status: ${newStatus}`,
    );

    return this.findOne(id);
  }

  /**
   * Cancel a task by setting its status to CANCELLED and recording completedAt.
   */
  async cancel(id: string): Promise<Task> {
    await this.taskRepository.update(id, {
      status: TaskStatus.CANCELLED,
      completedAt: new Date(),
    });
    return this.findOne(id);
  }
}
