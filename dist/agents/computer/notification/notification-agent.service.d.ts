import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const NOTIFICATION_AGENT_CONFIG: AgentConfig;
export declare class NotificationAgentService extends BaseAgentService {
    private readonly bridge?;
    private notifications;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    private reminders;
    private notificationCounter;
    private reminderCounter;
    private reminderCheckInterval;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private sendNotification;
    private listNotifications;
    private clearNotifications;
    private setReminder;
    private startReminderCheck;
    private checkReminders;
    private calculateNextOccurrence;
}
