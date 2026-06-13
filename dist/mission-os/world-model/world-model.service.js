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
var WorldModelService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldModelService = exports.ObjectiveStatus = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const uuid_1 = require("uuid");
var ObjectiveStatus;
(function (ObjectiveStatus) {
    ObjectiveStatus["PENDING"] = "pending";
    ObjectiveStatus["IN_PROGRESS"] = "in_progress";
    ObjectiveStatus["COMPLETED"] = "completed";
    ObjectiveStatus["ABANDONED"] = "abandoned";
})(ObjectiveStatus || (exports.ObjectiveStatus = ObjectiveStatus = {}));
const WORLD_EVENT_CRITICAL = 'world.event.critical';
const MAX_HISTORY_SIZE = 10_000;
const MAX_CURRENT_EVENTS_SIZE = 1_000;
const MAX_CHANGE_LOG_SIZE = 50_000;
let WorldModelService = WorldModelService_1 = class WorldModelService {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(WorldModelService_1.name);
        this.changeLog = [];
        this.subscribers = new Map();
        this.objectiveIndex = new Map();
        this.constraintIndex = new Map();
        this.state = this.createDefaultState();
    }
    initialize(initialState) {
        this.logger.log('Initializing World Model');
        const defaults = this.createDefaultState();
        if (initialState) {
            this.state = {
                ...defaults,
                ...initialState,
                systemState: {
                    ...defaults.systemState,
                    ...(initialState.systemState ?? {}),
                    memoryUsage: {
                        ...defaults.systemState.memoryUsage,
                        ...(initialState.systemState?.memoryUsage ?? {}),
                    },
                },
                lastUpdated: new Date(),
            };
        }
        else {
            this.state = defaults;
        }
        this.rebuildObjectiveIndex(this.state.objectives);
        this.rebuildConstraintIndex(this.state.constraints);
        this.logger.log(`World Model initialized — ${this.objectiveIndex.size} objectives, ${this.constraintIndex.size} constraints`);
    }
    getState() {
        return this.deepClone(this.state);
    }
    updateUser(user) {
        const previous = this.state.currentUser;
        this.state.currentUser = { ...user };
        this.state.lastUpdated = new Date();
        this.recordChange('currentUser', previous, this.state.currentUser);
        this.notifySubscribers();
        this.logger.debug?.(`User context updated: ${user.name} (${user.id})`);
    }
    updateProject(project) {
        const previous = this.state.currentProject;
        this.state.currentProject = {
            ...project,
            deadlines: project.deadlines.map((d) => ({ ...d })),
        };
        this.state.lastUpdated = new Date();
        this.recordChange('currentProject', previous, this.state.currentProject);
        this.notifySubscribers();
        this.logger.debug?.(`Project context updated: ${project.name} (${project.id})`);
    }
    addObjective(objective) {
        if (this.objectiveIndex.has(objective.id)) {
            throw new Error(`Objective with id "${objective.id}" already exists`);
        }
        const inserted = {
            ...objective,
            subObjectives: objective.subObjectives.map((s) => ({ ...s })),
        };
        this.state.objectives.push(inserted);
        this.indexObjectiveRecursive(inserted);
        this.state.lastUpdated = new Date();
        this.recordChange('objectives', null, inserted);
        this.notifySubscribers();
        this.logger.log(`Objective added: ${inserted.id} — "${inserted.description}"`);
    }
    updateObjective(objectiveId, updates) {
        const objective = this.findObjective(objectiveId);
        if (!objective) {
            throw new Error(`Objective with id "${objectiveId}" not found`);
        }
        const previous = { ...objective };
        if (updates.description !== undefined)
            objective.description = updates.description;
        if (updates.priority !== undefined)
            objective.priority = updates.priority;
        if (updates.status !== undefined)
            objective.status = updates.status;
        if (updates.targetDate !== undefined)
            objective.targetDate = updates.targetDate;
        if (updates.progress !== undefined)
            objective.progress = updates.progress;
        if (updates.assignedAgents !== undefined)
            objective.assignedAgents = [...updates.assignedAgents];
        if (updates.metadata !== undefined)
            objective.metadata = { ...updates.metadata };
        if (updates.subObjectives !== undefined) {
            this.removeObjectiveIndexes(objective.subObjectives);
            objective.subObjectives = updates.subObjectives.map((s) => ({ ...s }));
            this.indexObjectiveRecursive(objective);
        }
        this.state.lastUpdated = new Date();
        this.recordChange(`objective:${objectiveId}`, previous, { ...objective });
        this.notifySubscribers();
        this.logger.debug?.(`Objective updated: ${objectiveId} — status=${objective.status}`);
    }
    removeObjective(objectiveId) {
        const objective = this.findObjective(objectiveId);
        if (!objective) {
            throw new Error(`Objective with id "${objectiveId}" not found`);
        }
        const previous = { ...objective };
        objective.status = ObjectiveStatus.ABANDONED;
        objective.progress = 0;
        this.state.lastUpdated = new Date();
        this.recordChange(`objective:${objectiveId}`, previous, { ...objective });
        this.notifySubscribers();
        this.logger.log(`Objective abandoned: ${objectiveId}`);
    }
    addConstraint(constraint) {
        const conflicts = this.findConstraintConflicts(constraint);
        if (conflicts.length > 0) {
            this.logger.warn(`Constraint "${constraint.id}" conflicts with: ${conflicts.map((c) => c.id).join(', ')}`);
        }
        if (this.constraintIndex.has(constraint.id)) {
            throw new Error(`Constraint with id "${constraint.id}" already exists`);
        }
        const inserted = { ...constraint };
        this.state.constraints.push(inserted);
        this.constraintIndex.set(inserted.id, inserted);
        this.state.lastUpdated = new Date();
        this.recordChange('constraints', null, inserted);
        this.notifySubscribers();
        this.logger.log(`Constraint added: ${inserted.id} — type=${inserted.type}, enforced=${inserted.enforced}`);
    }
    removeConstraint(constraintId) {
        const constraint = this.constraintIndex.get(constraintId);
        if (!constraint) {
            throw new Error(`Constraint with id "${constraintId}" not found`);
        }
        this.state.constraints = this.state.constraints.filter((c) => c.id !== constraintId);
        this.constraintIndex.delete(constraintId);
        this.state.lastUpdated = new Date();
        this.recordChange('constraints', constraint, null);
        this.notifySubscribers();
        this.logger.log(`Constraint removed: ${constraintId}`);
    }
    recordEvent(event) {
        const stored = { ...event };
        this.state.history.push(stored);
        if (this.state.history.length > MAX_HISTORY_SIZE) {
            this.state.history = this.state.history.slice(-MAX_HISTORY_SIZE);
        }
        this.state.currentEvents.push(stored);
        if (this.state.currentEvents.length > MAX_CURRENT_EVENTS_SIZE) {
            this.state.currentEvents = this.state.currentEvents.slice(-MAX_CURRENT_EVENTS_SIZE);
        }
        this.state.lastUpdated = new Date();
        this.recordChange('history', null, stored);
        this.notifySubscribers();
        if (event.impact === 'critical') {
            this.eventEmitter.emit(WORLD_EVENT_CRITICAL, stored);
            this.logger.warn(`CRITICAL world event: ${event.type} from ${event.source}`);
        }
        this.logger.debug?.(`Event recorded: ${event.type} (impact=${event.impact}) from ${event.source}`);
    }
    updateSystemState(partial) {
        const previous = { ...this.state.systemState };
        this.state.systemState = {
            ...this.state.systemState,
            ...partial,
            memoryUsage: {
                ...this.state.systemState.memoryUsage,
                ...(partial.memoryUsage ?? {}),
                byTier: {
                    ...this.state.systemState.memoryUsage.byTier,
                    ...(partial.memoryUsage?.byTier ?? {}),
                },
            },
        };
        this.state.lastUpdated = new Date();
        this.recordChange('systemState', previous, { ...this.state.systemState });
        this.notifySubscribers();
    }
    updateKnowledge(key, value) {
        const previous = this.state.knowledgeBase[key];
        this.state.knowledgeBase[key] = value;
        this.state.lastUpdated = new Date();
        this.recordChange(`knowledge:${key}`, previous, value);
        this.notifySubscribers();
        this.logger.debug?.(`Knowledge updated: ${key}`);
    }
    queryKnowledge(query) {
        const pattern = this.globToRegex(query);
        const results = {};
        for (const [key, value] of Object.entries(this.state.knowledgeBase)) {
            if (pattern.test(key)) {
                results[key] = value;
            }
        }
        return results;
    }
    getObjectivesByStatus(status) {
        const results = [];
        const collect = (objectives) => {
            for (const obj of objectives) {
                if (obj.status === status) {
                    results.push({ ...obj, subObjectives: obj.subObjectives.map((s) => ({ ...s })) });
                }
                if (obj.subObjectives.length > 0) {
                    collect(obj.subObjectives);
                }
            }
        };
        collect(this.state.objectives);
        return results;
    }
    getActiveConstraints() {
        return this.state.constraints
            .filter((c) => c.enforced)
            .map((c) => ({ ...c }));
    }
    evaluateConstraints(action) {
        const violations = [];
        const activeConstraints = this.state.constraints.filter((c) => c.enforced);
        for (const constraint of activeConstraints) {
            switch (constraint.type) {
                case 'budget': {
                    const cost = action.cost ?? action.budget ?? action.price;
                    if (cost !== undefined && typeof constraint.value === 'number' && cost > constraint.value) {
                        violations.push(`Budget constraint "${constraint.description}" exceeded: ${cost} > ${constraint.value}`);
                    }
                    break;
                }
                case 'time': {
                    const deadline = action.deadline ?? action.dueDate ?? action.targetDate;
                    if (deadline !== undefined &&
                        constraint.value instanceof Date &&
                        new Date(deadline) > constraint.value) {
                        violations.push(`Time constraint "${constraint.description}" exceeded: ${new Date(deadline).toISOString()} > ${constraint.value.toISOString()}`);
                    }
                    break;
                }
                case 'resource': {
                    const resourceName = action.resource ?? action.resourceName;
                    const blockedResources = Array.isArray(constraint.value) ? constraint.value : [constraint.value];
                    if (resourceName !== undefined &&
                        blockedResources.some((r) => (typeof r === 'string' && r === resourceName) ||
                            (typeof r === 'object' && r?.name === resourceName))) {
                        violations.push(`Resource constraint "${constraint.description}" violated: ${resourceName} is restricted`);
                    }
                    break;
                }
                case 'policy': {
                    const actionType = action.type ?? action.actionType;
                    const forbiddenTypes = Array.isArray(constraint.value) ? constraint.value : [];
                    if (actionType !== undefined &&
                        forbiddenTypes.some((t) => t === actionType || (typeof t === 'string' && t === actionType))) {
                        violations.push(`Policy constraint "${constraint.description}" violated: action type "${actionType}" is not allowed`);
                    }
                    break;
                }
                case 'technical': {
                    if (typeof constraint.value === 'object' && constraint.value !== null) {
                        const cv = constraint.value;
                        for (const [metric, limit] of Object.entries(cv)) {
                            if (action[metric] !== undefined && typeof limit === 'number' && action[metric] > limit) {
                                violations.push(`Technical constraint "${constraint.description}" violated: ${metric}=${action[metric]} exceeds limit ${limit}`);
                            }
                        }
                    }
                    break;
                }
            }
        }
        return {
            violated: violations.length > 0,
            violations,
        };
    }
    getSnapshot() {
        return this.deepClone(this.state);
    }
    diff(sinceTimestamp) {
        return this.changeLog.filter((c) => c.timestamp > sinceTimestamp);
    }
    subscribe(callback) {
        const id = (0, uuid_1.v4)();
        this.subscribers.set(id, callback);
        this.logger.debug?.(`Subscriber added: ${id} (total: ${this.subscribers.size})`);
        return () => {
            this.subscribers.delete(id);
            this.logger.debug?.(`Subscriber removed: ${id} (total: ${this.subscribers.size})`);
        };
    }
    createDefaultState() {
        return {
            currentUser: null,
            currentProject: null,
            context: {},
            objectives: [],
            constraints: [],
            history: [],
            knowledgeBase: {},
            currentEvents: [],
            systemState: {
                uptime: 0,
                activeAgents: 0,
                activeMissions: 0,
                eqiScore: 0,
                memoryUsage: { total: 0, used: 0, byTier: {} },
                cpuLoad: 0,
                networkLatency: 0,
            },
            lastUpdated: new Date(),
        };
    }
    recordChange(field, previousValue, newValue) {
        this.changeLog.push({
            timestamp: new Date(),
            field,
            previousValue,
            newValue,
        });
        if (this.changeLog.length > MAX_CHANGE_LOG_SIZE) {
            this.changeLog.splice(0, this.changeLog.length - MAX_CHANGE_LOG_SIZE);
        }
    }
    notifySubscribers() {
        const currentState = this.getState();
        const recentChanges = this.changeLog.slice(-10);
        for (const [id, callback] of this.subscribers) {
            try {
                callback(currentState, recentChanges);
            }
            catch (error) {
                this.logger.error(`Subscriber ${id} callback error: ${error.message}`);
            }
        }
    }
    findObjective(objectiveId) {
        const search = (objectives) => {
            for (const obj of objectives) {
                if (obj.id === objectiveId)
                    return obj;
                const found = search(obj.subObjectives);
                if (found)
                    return found;
            }
            return null;
        };
        return search(this.state.objectives);
    }
    rebuildObjectiveIndex(objectives) {
        this.objectiveIndex.clear();
        for (const obj of objectives) {
            this.indexObjectiveRecursive(obj);
        }
    }
    indexObjectiveRecursive(objective) {
        this.objectiveIndex.set(objective.id, objective);
        for (const sub of objective.subObjectives) {
            this.indexObjectiveRecursive(sub);
        }
    }
    removeObjectiveIndexes(objectives) {
        for (const obj of objectives) {
            this.objectiveIndex.delete(obj.id);
            this.removeObjectiveIndexes(obj.subObjectives);
        }
    }
    rebuildConstraintIndex(constraints) {
        this.constraintIndex.clear();
        for (const c of constraints) {
            this.constraintIndex.set(c.id, c);
        }
    }
    findConstraintConflicts(constraint) {
        return this.state.constraints.filter((existing) => {
            if (existing.type !== constraint.type)
                return false;
            if (existing.id === constraint.id)
                return true;
            switch (constraint.type) {
                case 'budget': {
                    return (typeof existing.value === 'number' &&
                        typeof constraint.value === 'number' &&
                        Math.abs(existing.value - constraint.value) < Number.EPSILON);
                }
                case 'resource': {
                    const existingResources = Array.isArray(existing.value)
                        ? existing.value
                        : [existing.value];
                    const newResources = Array.isArray(constraint.value)
                        ? constraint.value
                        : [constraint.value];
                    return existingResources.some((r) => newResources.some((nr) => (typeof r === 'string' && r === nr) ||
                        (typeof r === 'object' && typeof nr === 'object' && r?.name === nr?.name)));
                }
                case 'time': {
                    if (existing.value instanceof Date &&
                        constraint.value instanceof Date &&
                        existing.value.getTime() === constraint.value.getTime()) {
                        return true;
                    }
                    return false;
                }
                case 'policy': {
                    const existingTypes = Array.isArray(existing.value) ? existing.value : [];
                    const newTypes = Array.isArray(constraint.value) ? constraint.value : [];
                    return existingTypes.some((t) => newTypes.includes(t));
                }
                default:
                    return false;
            }
        });
    }
    globToRegex(pattern) {
        const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*');
        return new RegExp(`^${escaped}$`);
    }
    deepClone(value) {
        try {
            return structuredClone(value);
        }
        catch {
            return JSON.parse(JSON.stringify(value));
        }
    }
};
exports.WorldModelService = WorldModelService;
exports.WorldModelService = WorldModelService = WorldModelService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], WorldModelService);
//# sourceMappingURL=world-model.service.js.map