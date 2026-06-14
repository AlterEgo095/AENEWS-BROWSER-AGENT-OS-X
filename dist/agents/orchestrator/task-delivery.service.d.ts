import { StepExecutionResult } from './task-executor.service';
import { ValidationResult } from './task-validator.service';
import { EventBusService } from '../events/event-bus.service';
import { MemoryService } from '../memory/memory.service';
export declare enum DeliveryFormat {
    RAW = "raw",
    SUMMARY = "summary",
    DETAILED = "detailed",
    STRUCTURED = "structured",
    COMPACT = "compact"
}
export interface DeliveryResult {
    taskId: string;
    deliveredOutput: any;
    format: DeliveryFormat;
    deliveredAt: Date;
    deliveryMethod: string;
    recipient?: string;
    metadata: Record<string, any>;
}
export interface DeliveryOptions {
    format?: DeliveryFormat;
    recipient?: string;
    persist?: boolean;
    notify?: boolean;
    includeMetrics?: boolean;
    includeSteps?: boolean;
    cleanup?: boolean;
    metadata?: Record<string, any>;
}
export declare class TaskDeliveryService {
    private readonly eventBusService;
    private readonly memoryService;
    private readonly logger;
    constructor(eventBusService: EventBusService, memoryService: MemoryService);
    deliver(taskId: string, results: StepExecutionResult[], validation: ValidationResult, options?: DeliveryOptions): Promise<DeliveryResult>;
    private formatOutput;
    private formatRaw;
    private formatSummary;
    private formatDetailed;
    private formatStructured;
    private formatCompact;
    private extractMainResult;
    private aggregateResults;
    private persistResult;
    private notifyDelivery;
    private cleanupTemporaryResources;
}
