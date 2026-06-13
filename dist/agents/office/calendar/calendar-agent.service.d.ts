import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const CALENDAR_AGENT_CONFIG: AgentConfig;
export declare class CalendarAgentService extends BaseAgentService {
    private events;
    private eventCounter;
    private reminderCounter;
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
