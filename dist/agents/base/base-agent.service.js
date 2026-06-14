"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgentService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const agent_interface_1 = require("../interfaces/agent.interface");
const agent_lifecycle_interface_1 = require("../interfaces/agent-lifecycle.interface");
const agent_event_interface_1 = require("../interfaces/agent-event.interface");
const agent_permission_interface_1 = require("../interfaces/agent-permission.interface");
const agent_memory_interface_1 = require("../interfaces/agent-memory.interface");
let BaseAgentService = class BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator) {
        this.eventBusService = eventBusService;
        this.memoryService = memoryService;
        this.permissionEvaluator = permissionEvaluator;
        this.status = agent_interface_1.AgentStatus.IDLE;
        this.currentTasks = new Set();
        this.completedTaskCount = 0;
        this.failedTaskCount = 0;
        this.lastActivity = new Date();
        this.startedAt = null;
        this.correlationId = '';
        this.lifecyclePhase = null;
        this.tools = new Map();
        this.healthState = {
            isHealthy: true,
            lastHealthCheck: new Date(),
            consecutiveFailures: 0,
            uptimeMs: 0,
        };
        this.lifecycleHooks = new Map();
        this.healthCheckInterval = null;
        this.metricsInterval = null;
        this.activeTimeouts = new Map();
        this.circuitBreaker = {
            state: 'closed',
            failureCount: 0,
            lastFailureTime: null,
            successThreshold: 3,
            failureThreshold: 5,
            resetTimeoutMs: 60000,
            halfOpenSuccesses: 0,
        };
        this.config = this.defineConfig();
        this.logger = new common_1.Logger(`${this.config.name}Agent`);
        this.initializeLifecycleHooks();
    }
    async onHealthCheck() {
        return true;
    }
    async onPause() { }
    async onResume() { }
    async onValidateInput(input) {
        return !!input.taskId && !!input.payload;
    }
    async onSuccess(input, output) { }
    async onFailure(input, error) { }
    async onModuleInit() {
        try {
            await this.transitionTo(agent_interface_1.AgentStatus.INITIALIZING);
            this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.PRE_INITIALIZE);
            await this.onInitialize();
            this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.POST_INITIALIZE);
            await this.transitionTo(agent_interface_1.AgentStatus.IDLE);
            this.startHealthMonitoring();
            this.startMetricsCollection();
            this.logger.log(`Agent initialized: ${this.config.id} (${this.config.cluster})`);
            this.emitEvent(agent_event_interface_1.AgentEventType.AGENT_INITIALIZED, {
                agentId: this.config.id,
                cluster: this.config.cluster,
                version: this.config.version,
            });
        }
        catch (error) {
            this.logger.error(`Agent initialization failed: ${error.message}`, error.stack);
            await this.transitionTo(agent_interface_1.AgentStatus.ERROR);
            this.emitEvent(agent_event_interface_1.AgentEventType.AGENT_ERROR, {
                errorCode: agent_interface_1.AgentErrorCode.INITIALIZATION_FAILED,
                errorMessage: error.message,
                recoverable: false,
            });
            throw error;
        }
    }
    async start() {
        if (this.status === agent_interface_1.AgentStatus.RUNNING) {
            throw new agent_interface_1.AgentError('Agent is already running', agent_interface_1.AgentErrorCode.ALREADY_RUNNING, this.config.id);
        }
        this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.PRE_START);
        this.startedAt = new Date();
        await this.transitionTo(agent_interface_1.AgentStatus.RUNNING);
        this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.POST_START);
        this.logger.log(`Agent started: ${this.config.id}`);
        this.emitEvent(agent_event_interface_1.AgentEventType.AGENT_STARTED, {
            agentId: this.config.id,
            cluster: this.config.cluster,
        });
    }
    async execute(input) {
        if (this.status !== agent_interface_1.AgentStatus.RUNNING && this.status !== agent_interface_1.AgentStatus.IDLE) {
            throw new agent_interface_1.AgentError(`Agent cannot execute in ${this.status} state`, agent_interface_1.AgentErrorCode.NOT_RUNNING, this.config.id, input.taskId);
        }
        if (this.circuitBreaker.state === 'open') {
            throw new agent_interface_1.AgentError('Circuit breaker is open; agent is not accepting tasks', agent_interface_1.AgentErrorCode.CIRCUIT_BREAKER_OPEN, this.config.id, input.taskId);
        }
        if (this.currentTasks.size >= this.config.maxConcurrentTasks) {
            throw new agent_interface_1.AgentError(`Max concurrent tasks (${this.config.maxConcurrentTasks}) reached`, agent_interface_1.AgentErrorCode.MAX_CONCURRENT_TASKS, this.config.id, input.taskId);
        }
        await this.checkPermission(agent_permission_interface_1.PermissionAction.EXECUTE, agent_permission_interface_1.PermissionResource.TASK);
        const isValid = await this.onValidateInput(input);
        if (!isValid) {
            throw new agent_interface_1.AgentError('Invalid input provided', agent_interface_1.AgentErrorCode.INVALID_INPUT, this.config.id, input.taskId);
        }
        this.correlationId = input.context?.correlationId || (0, uuid_1.v4)();
        this.currentTasks.add(input.taskId);
        this.lastActivity = new Date();
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;
        this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.PRE_EXECUTE, { taskId: input.taskId });
        this.emitEvent(agent_event_interface_1.AgentEventType.TASK_STARTED, {
            taskId: input.taskId,
            agentId: this.config.id,
            priority: input.priority || agent_interface_1.TaskPriority.NORMAL,
        });
        try {
            if (this.status === agent_interface_1.AgentStatus.IDLE) {
                await this.start();
            }
            let retryCount = 0;
            let lastError = null;
            const output = await this.executeWithRetry(async () => {
                try {
                    const result = await this.executeWithTimeout(input);
                    return result;
                }
                catch (execError) {
                    retryCount++;
                    lastError = execError;
                    if (retryCount > this.config.retryPolicy.maxRetries) {
                        throw execError;
                    }
                    const backoffMs = this.calculateBackoff(retryCount);
                    this.logger.warn(`Task ${input.taskId} failed (attempt ${retryCount}/${this.config.retryPolicy.maxRetries}), ` +
                        `retrying in ${backoffMs}ms: ${lastError.message}`);
                    await this.sleep(backoffMs);
                    throw execError;
                }
            });
            this.currentTasks.delete(input.taskId);
            this.completedTaskCount++;
            this.lastActivity = new Date();
            this.recordCircuitBreakerSuccess();
            await this.storeExecutionResult(input, output);
            this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.POST_EXECUTE, { taskId: input.taskId });
            this.emitEvent(agent_event_interface_1.AgentEventType.TASK_COMPLETED, {
                taskId: input.taskId,
                agentId: this.config.id,
                success: true,
                executionTimeMs: Date.now() - startTime,
                result: output.result,
            });
            await this.onSuccess(input, output);
            return output;
        }
        catch (error) {
            this.currentTasks.delete(input.taskId);
            this.failedTaskCount++;
            this.recordCircuitBreakerFailure();
            this.lastActivity = new Date();
            const agentError = error;
            this.logger.error(`Task ${input.taskId} execution error: ${agentError.message}`, agentError.stack);
            this.emitEvent(agent_event_interface_1.AgentEventType.AGENT_ERROR, {
                errorCode: agentError.code || agent_interface_1.AgentErrorCode.EXECUTION_FAILED,
                errorMessage: agentError.message,
                taskId: input.taskId,
                recoverable: true,
            });
            this.emitEvent(agent_event_interface_1.AgentEventType.TASK_FAILED, {
                taskId: input.taskId,
                agentId: this.config.id,
                success: false,
                executionTimeMs: Date.now() - startTime,
                error: agentError.message,
            });
            await this.onFailure(input, agentError);
            return {
                taskId: input.taskId,
                success: false,
                result: null,
                error: agentError.message,
                metrics: this.collectMetrics(startTime, startMemory),
                timestamp: new Date(),
            };
        }
    }
    async pause() {
        this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.PRE_PAUSE);
        await this.onPause();
        await this.transitionTo(agent_interface_1.AgentStatus.PAUSED);
        this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.POST_PAUSE);
        this.logger.log(`Agent paused: ${this.config.id}`);
        this.emitEvent(agent_event_interface_1.AgentEventType.AGENT_PAUSED, {
            previousStatus: agent_interface_1.AgentStatus.RUNNING,
            newStatus: agent_interface_1.AgentStatus.PAUSED,
            reason: 'Manual pause',
        });
    }
    async resume() {
        this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.PRE_RESUME);
        await this.onResume();
        await this.transitionTo(agent_interface_1.AgentStatus.RUNNING);
        this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.POST_RESUME);
        this.logger.log(`Agent resumed: ${this.config.id}`);
        this.emitEvent(agent_event_interface_1.AgentEventType.AGENT_RESUMED, {
            previousStatus: agent_interface_1.AgentStatus.PAUSED,
            newStatus: agent_interface_1.AgentStatus.RUNNING,
            reason: 'Manual resume',
        });
    }
    async stop() {
        this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.PRE_STOP);
        for (const [taskId, timeout] of this.activeTimeouts) {
            clearTimeout(timeout);
            this.activeTimeouts.delete(taskId);
        }
        const gracePeriodMs = 5000;
        const startTime = Date.now();
        while (this.currentTasks.size > 0 && Date.now() - startTime < gracePeriodMs) {
            await this.sleep(100);
        }
        if (this.currentTasks.size > 0) {
            this.logger.warn(`Force-stopping with ${this.currentTasks.size} active tasks`);
            this.currentTasks.clear();
        }
        this.stopHealthMonitoring();
        this.stopMetricsCollection();
        await this.transitionTo(agent_interface_1.AgentStatus.STOPPED);
        this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.POST_STOP);
        this.logger.log(`Agent stopped: ${this.config.id}`);
        this.emitEvent(agent_event_interface_1.AgentEventType.AGENT_STOPPED, {
            agentId: this.config.id,
            completedTasks: this.completedTaskCount,
            failedTasks: this.failedTaskCount,
        });
    }
    async onModuleDestroy() {
        this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.PRE_DESTROY);
        if (this.status === agent_interface_1.AgentStatus.RUNNING || this.status === agent_interface_1.AgentStatus.PAUSED) {
            await this.stop();
        }
        await this.onDestroy();
        for (const [toolName] of this.tools) {
            this.tools.delete(toolName);
        }
        this.executeLifecyclePhase(agent_lifecycle_interface_1.LifecyclePhase.POST_DESTROY);
        this.logger.log(`Agent destroyed: ${this.config.id}`);
        this.emitEvent(agent_event_interface_1.AgentEventType.AGENT_DESTROYED, {
            agentId: this.config.id,
            cluster: this.config.cluster,
        });
    }
    async healthCheck() {
        return this.performHealthCheck();
    }
    getState() {
        return {
            config: { ...this.config },
            status: this.status,
            currentTasks: Array.from(this.currentTasks),
            completedTasks: this.completedTaskCount,
            failedTasks: this.failedTaskCount,
            lastActivity: this.lastActivity,
            health: { ...this.healthState },
        };
    }
    getStatus() {
        return this.status;
    }
    getConfig() {
        return { ...this.config };
    }
    getHealthState() {
        return { ...this.healthState };
    }
    initializeState() {
        return {
            config: { ...this.config },
            status: agent_interface_1.AgentStatus.IDLE,
            currentTasks: [],
            completedTasks: 0,
            failedTasks: 0,
            lastActivity: new Date(),
            health: {
                isHealthy: true,
                lastHealthCheck: new Date(),
                consecutiveFailures: 0,
                uptimeMs: 0,
            },
        };
    }
    registerTool(tool) {
        if (this.tools.has(tool.name)) {
            this.logger.warn(`Tool "${tool.name}" is already registered, overwriting`);
        }
        this.tools.set(tool.name, tool);
        this.logger.log(`Registered tool: ${tool.name}`);
    }
    unregisterTool(name) {
        const deleted = this.tools.delete(name);
        if (deleted) {
            this.logger.log(`Unregistered tool: ${name}`);
        }
        else {
            this.logger.warn(`Tool "${name}" not found for unregistration`);
        }
        return deleted;
    }
    getTool(name) {
        return this.tools.get(name);
    }
    getAllTools() {
        return Array.from(this.tools.values());
    }
    async executeTool(name, ...args) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new agent_interface_1.AgentError(`Tool "${name}" not found`, agent_interface_1.AgentErrorCode.EXECUTION_FAILED, this.config.id);
        }
        return tool.execute(...args);
    }
    async checkPermission(action, resource) {
        const permissionString = `${action}:${resource}`;
        const hasPermission = this.config.permissions.includes(permissionString) || this.config.permissions.includes('*');
        if (!hasPermission) {
            if (this.permissionEvaluator &&
                typeof this.permissionEvaluator.hasPermission === 'function') {
                const evaluated = await this.permissionEvaluator.hasPermission(this.config.id, action, resource);
                if (evaluated)
                    return true;
            }
            throw new agent_interface_1.AgentError(`Permission denied: ${permissionString}`, agent_interface_1.AgentErrorCode.PERMISSION_DENIED, this.config.id);
        }
        return true;
    }
    hasPermissionForResource(resource, action) {
        return (this.config.permissions.includes(`${action}:${resource}`) ||
            this.config.permissions.includes('*'));
    }
    async executeWithTimeout(input) {
        const timeoutMs = input.context?.timeout || this.config.timeout;
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.activeTimeouts.delete(input.taskId);
                reject(new agent_interface_1.AgentError(`Task timed out after ${timeoutMs}ms`, agent_interface_1.AgentErrorCode.TIMEOUT, this.config.id, input.taskId));
            }, timeoutMs);
            this.activeTimeouts.set(input.taskId, timeoutId);
            this.onExecute(input)
                .then((output) => {
                clearTimeout(timeoutId);
                this.activeTimeouts.delete(input.taskId);
                resolve(output);
            })
                .catch((error) => {
                clearTimeout(timeoutId);
                this.activeTimeouts.delete(input.taskId);
                reject(error);
            });
        });
    }
    withTimeout(promise, ms) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new agent_interface_1.AgentError(`Operation timed out after ${ms}ms`, agent_interface_1.AgentErrorCode.TIMEOUT, this.config.id));
            }, ms);
            promise
                .then((result) => {
                clearTimeout(timeoutId);
                resolve(result);
            })
                .catch((error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
    calculateBackoff(retryCount) {
        const { backoffMs, exponentialBackoff } = this.config.retryPolicy;
        if (exponentialBackoff) {
            return backoffMs * Math.pow(2, retryCount - 1) + Math.random() * 100;
        }
        return backoffMs;
    }
    async executeWithRetry(fn) {
        const { maxRetries, backoffMs, exponentialBackoff } = this.config.retryPolicy;
        let lastError = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                if (attempt >= maxRetries) {
                    this.logger.error(`All ${maxRetries} retries exhausted: ${lastError.message}`);
                    throw new agent_interface_1.AgentError(`Retry exhausted after ${maxRetries} attempts: ${lastError.message}`, agent_interface_1.AgentErrorCode.RETRY_EXHAUSTED, this.config.id, undefined, lastError);
                }
                const delay = exponentialBackoff
                    ? backoffMs * Math.pow(2, attempt) + Math.random() * 100
                    : backoffMs;
                this.logger.warn(`Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms: ${lastError.message}`);
                await this.sleep(delay);
            }
        }
        throw lastError;
    }
    collectMetrics(startTime, startMemory) {
        const memoryUsed = process.memoryUsage();
        return {
            executionTimeMs: Date.now() - startTime,
            memoryUsedMb: Math.round(((memoryUsed.heapUsed - startMemory) / 1024 / 1024) * 100) / 100,
            cpuUsagePercent: Math.round((process.cpuUsage().user ?? 0) / 1000) / 100,
        };
    }
    startHealthMonitoring() {
        const intervalMs = 30000;
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, intervalMs);
    }
    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    async performHealthCheck() {
        try {
            const customHealthy = await this.onHealthCheck();
            const isHealthy = customHealthy && this.status !== agent_interface_1.AgentStatus.ERROR;
            const previousHealth = this.healthState.isHealthy;
            this.healthState = {
                isHealthy,
                lastHealthCheck: new Date(),
                consecutiveFailures: isHealthy ? 0 : this.healthState.consecutiveFailures + 1,
                uptimeMs: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
            };
            if (!isHealthy && this.healthState.consecutiveFailures >= 3) {
                this.logger.warn(`Agent unhealthy: ${this.healthState.consecutiveFailures} consecutive failures`);
                this.emitEvent(agent_event_interface_1.AgentEventType.AGENT_HEALTH_CHANGED, {
                    isHealthy: false,
                    previousHealth,
                    consecutiveFailures: this.healthState.consecutiveFailures,
                });
            }
            return isHealthy;
        }
        catch (error) {
            this.healthState.consecutiveFailures++;
            this.healthState.isHealthy = false;
            this.healthState.lastHealthCheck = new Date();
            this.logger.error(`Health check failed: ${error.message}`);
            return false;
        }
    }
    startMetricsCollection() {
        this.metricsInterval = setInterval(() => {
            this.emitMetrics();
        }, 60000);
    }
    stopMetricsCollection() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }
    }
    emitMetrics() {
        const state = this.getState();
        this.emitEvent(agent_event_interface_1.AgentEventType.AGENT_STATUS_CHANGED, {
            agentId: this.config.id,
            status: this.status,
            activeTasks: this.currentTasks.size,
            completedTasks: this.completedTaskCount,
            failedTasks: this.failedTaskCount,
            healthState: this.healthState,
        });
    }
    async transitionTo(newStatus) {
        const previousStatus = this.status;
        if (!this.isValidTransition(previousStatus, newStatus)) {
            this.logger.warn(`Invalid state transition: ${previousStatus} → ${newStatus}`);
            if (newStatus !== agent_interface_1.AgentStatus.ERROR && newStatus !== agent_interface_1.AgentStatus.STOPPED) {
                throw new agent_interface_1.AgentError(`Invalid state transition: ${previousStatus} → ${newStatus}`, agent_interface_1.AgentErrorCode.EXECUTION_FAILED, this.config.id);
            }
        }
        this.status = newStatus;
        this.lastActivity = new Date();
        this.emitEvent(agent_event_interface_1.AgentEventType.AGENT_STATUS_CHANGED, {
            previousStatus,
            newStatus,
            reason: `Transition from ${previousStatus} to ${newStatus}`,
        });
        this.logger.log(`State transition: ${previousStatus} → ${newStatus}`);
    }
    isValidTransition(from, to) {
        const validTargets = agent_lifecycle_interface_1.VALID_TRANSITIONS[from];
        return validTargets ? validTargets.includes(to) : false;
    }
    emitEvent(type, payload) {
        if (this.eventBusService && typeof this.eventBusService.publish === 'function') {
            const event = {
                type: type,
                sourceAgentId: this.config.id,
                cluster: this.config.cluster,
                payload,
                priority: agent_event_interface_1.EventPriority.NORMAL,
                correlationId: this.correlationId,
                metadata: {
                    agentVersion: this.config.version,
                    agentCluster: this.config.cluster,
                },
            };
            this.eventBusService.publish(event).catch((error) => {
                this.logger.error(`Failed to emit event ${type}: ${error.message}`);
            });
        }
    }
    async storeInWorkingMemory(key, value, ttlMs) {
        if (this.memoryService) {
            await this.memoryService.store(this.config.id, key, value, agent_memory_interface_1.MemoryTier.WORKING, {
                ttlMs,
            });
        }
    }
    async retrieveFromWorkingMemory(key) {
        if (this.memoryService) {
            const entry = await this.memoryService.retrieve(this.config.id, key, agent_memory_interface_1.MemoryTier.WORKING);
            return entry?.value ?? null;
        }
        return null;
    }
    async storeInSessionMemory(key, value, sessionId, ttlMs) {
        if (this.memoryService) {
            await this.memoryService.store(this.config.id, key, value, agent_memory_interface_1.MemoryTier.SESSION, {
                sessionId,
                ttlMs,
            });
        }
    }
    async retrieveFromSessionMemory(key) {
        if (this.memoryService) {
            const entry = await this.memoryService.retrieve(this.config.id, key, agent_memory_interface_1.MemoryTier.SESSION);
            return entry?.value ?? null;
        }
        return null;
    }
    async storeInLongTermMemory(key, value) {
        if (this.memoryService) {
            await this.memoryService.store(this.config.id, key, value, agent_memory_interface_1.MemoryTier.LONG_TERM);
        }
    }
    async retrieveFromLongTermMemory(key) {
        if (this.memoryService) {
            const entry = await this.memoryService.retrieve(this.config.id, key, agent_memory_interface_1.MemoryTier.LONG_TERM);
            return entry?.value ?? null;
        }
        return null;
    }
    async queryMemory(query) {
        if (this.memoryService && typeof this.memoryService.query === 'function') {
            return this.memoryService.query(query);
        }
        return { entries: [], total: 0, hasMore: false };
    }
    async storeExecutionResult(input, output) {
        try {
            await this.storeInWorkingMemory(`task:${input.taskId}:result`, output, 300000);
            if (output.success) {
                await this.storeInLongTermMemory(`task:${input.taskId}:completed`, {
                    input: input.payload,
                    result: output.result,
                    metrics: output.metrics,
                    timestamp: output.timestamp,
                });
            }
            if (input.context?.sessionId) {
                await this.storeInSessionMemory(`task:${input.taskId}:result`, output, input.context.sessionId);
            }
        }
        catch (error) {
            this.logger.warn(`Failed to store execution result for task ${input.taskId}: ${error.message}`);
        }
    }
    recordCircuitBreakerSuccess() {
        if (this.circuitBreaker.state === 'half_open') {
            this.circuitBreaker.halfOpenSuccesses++;
            if (this.circuitBreaker.halfOpenSuccesses >= this.circuitBreaker.successThreshold) {
                this.circuitBreaker.state = 'closed';
                this.circuitBreaker.failureCount = 0;
                this.circuitBreaker.halfOpenSuccesses = 0;
                this.logger.log('Circuit breaker closed');
                this.emitEvent(agent_event_interface_1.AgentEventType.CIRCUIT_BREAKER_CLOSED, {
                    agentId: this.config.id,
                    state: 'closed',
                    failureCount: 0,
                    lastFailureTime: this.circuitBreaker.lastFailureTime || new Date(),
                });
            }
        }
        else if (this.circuitBreaker.state === 'closed') {
            this.circuitBreaker.failureCount = 0;
        }
    }
    recordCircuitBreakerFailure() {
        this.circuitBreaker.failureCount++;
        this.circuitBreaker.lastFailureTime = new Date();
        if (this.circuitBreaker.state === 'half_open') {
            this.circuitBreaker.state = 'open';
            this.logger.warn('Circuit breaker opened (failure during half-open)');
        }
        else if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
            this.circuitBreaker.state = 'open';
            this.logger.error(`Circuit breaker opened after ${this.circuitBreaker.failureCount} failures`);
            this.emitEvent(agent_event_interface_1.AgentEventType.CIRCUIT_BREAKER_OPENED, {
                agentId: this.config.id,
                state: 'open',
                failureCount: this.circuitBreaker.failureCount,
                lastFailureTime: this.circuitBreaker.lastFailureTime,
            });
            setTimeout(() => {
                if (this.circuitBreaker.state === 'open') {
                    this.circuitBreaker.state = 'half_open';
                    this.circuitBreaker.halfOpenSuccesses = 0;
                    this.logger.log('Circuit breaker transitioned to half-open');
                }
            }, this.circuitBreaker.resetTimeoutMs);
        }
    }
    initializeLifecycleHooks() {
        const phases = Object.values(agent_lifecycle_interface_1.LifecyclePhase);
        for (const phase of phases) {
            this.lifecycleHooks.set(phase, []);
        }
    }
    registerLifecycleHook(phase, hook) {
        const hooks = this.lifecycleHooks.get(phase) || [];
        hooks.push(hook);
        this.lifecycleHooks.set(phase, hooks);
    }
    removeLifecycleHook(phase, hook) {
        const hooks = this.lifecycleHooks.get(phase) || [];
        const index = hooks.indexOf(hook);
        if (index >= 0) {
            hooks.splice(index, 1);
        }
    }
    async executeLifecyclePhase(phase, extraContext) {
        this.lifecyclePhase = phase;
        const hooks = this.lifecycleHooks.get(phase) || [];
        const context = {
            agentId: this.config.id,
            phase,
            previousStatus: this.status,
            newStatus: this.status,
            timestamp: new Date(),
            correlationId: this.correlationId,
            ...extraContext,
        };
        for (const hook of hooks) {
            try {
                const result = await hook(context);
                if (!result.shouldProceed) {
                    this.logger.warn(`Lifecycle hook for ${phase} blocked execution: ${result.error?.message || 'No reason provided'}`);
                    break;
                }
            }
            catch (error) {
                this.logger.error(`Lifecycle hook error for ${phase}: ${error.message}`);
            }
        }
    }
    setCorrelationId(correlationId) {
        this.correlationId = correlationId;
    }
    getCorrelationId() {
        return this.correlationId;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    generateId() {
        return (0, uuid_1.v4)();
    }
    createAgentOutput(taskId, success, result, error, startTime) {
        return {
            taskId,
            success,
            result,
            error,
            metrics: startTime
                ? this.collectMetrics(startTime, process.memoryUsage().heapUsed)
                : { executionTimeMs: 0, memoryUsedMb: 0, cpuUsagePercent: 0 },
            timestamp: new Date(),
        };
    }
    hasCapability(capabilityName) {
        return this.config.capabilities.some((cap) => cap.name === capabilityName);
    }
    getCapabilities() {
        return this.config.capabilities.map((cap) => cap.name);
    }
    getCurrentTaskCount() {
        return this.currentTasks.size;
    }
    canAcceptTask() {
        return ((this.status === agent_interface_1.AgentStatus.RUNNING || this.status === agent_interface_1.AgentStatus.IDLE) &&
            this.currentTasks.size < this.config.maxConcurrentTasks &&
            this.circuitBreaker.state !== 'open');
    }
    async enterMaintenance() {
        await this.transitionTo(agent_interface_1.AgentStatus.MAINTENANCE);
        this.logger.log(`Agent entered maintenance mode: ${this.config.id}`);
    }
    async exitMaintenance() {
        await this.transitionTo(agent_interface_1.AgentStatus.IDLE);
        this.logger.log(`Agent exited maintenance mode: ${this.config.id}`);
    }
};
exports.BaseAgentService = BaseAgentService;
exports.BaseAgentService = BaseAgentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object, Object, Object])
], BaseAgentService);
//# sourceMappingURL=base-agent.service.js.map