import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const CALENDAR_AGENT_CONFIG: AgentConfig;
export declare class CalendarAgentService extends BaseAgentService {
    private readonly bridge?;
    private events;
    private eventCounter;
    private reminderCounter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createEvent;
    private updateEvent;
    private deleteEvent;
    private findFreeSlots;
    private getSchedule;
    private sendInvitation;
    private setReminder;
    private generateEventId;
    private findConflicts;
    private mergeIntervals;
}
