import { WorkerProfile, WorkerSpawnRequest, WorkerSpawnResult, WorkerTerminateRequest, WorkerTerminateResult, WorkerExecutionRequest, WorkerExecutionResult, WorkerPoolStatistics, WorkerPoolConstraints } from '../interfaces';
import { CapabilityRegistryService } from '../capability-registry/capability-registry.service';
export declare class WorkerFactoryService {
    private readonly capabilityRegistry;
    private readonly logger;
    private readonly workers;
    private readonly archive;
    private constraints;
    constructor(capabilityRegistry: CapabilityRegistryService);
    spawn(request: WorkerSpawnRequest): Promise<WorkerSpawnResult>;
    terminate(request: WorkerTerminateRequest): Promise<WorkerTerminateResult>;
    terminateMissionWorkers(missionId: string, reason: WorkerTerminateRequest['reason']): Promise<WorkerTerminateResult[]>;
    execute(execRequest: WorkerExecutionRequest): Promise<WorkerExecutionResult>;
    getWorker(workerId: string): WorkerProfile | undefined;
    getWorkersByMission(missionId: string): WorkerProfile[];
    getStatistics(): WorkerPoolStatistics;
    getConstraints(): WorkerPoolConstraints;
    updateConstraints(constraints: Partial<WorkerPoolConstraints>): void;
    private initializeWorker;
    private executeCapability;
    private getActiveCount;
    private getActiveWorkers;
}
