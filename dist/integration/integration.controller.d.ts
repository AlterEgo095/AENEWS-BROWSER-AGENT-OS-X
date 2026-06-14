import { IntegrationService, MissionIntegrationContext } from './integration.service';
export declare class IntegrationController {
    private readonly integration;
    constructor(integration: IntegrationService);
    executeIntegratedMission(body: {
        instruction: string;
        description?: string;
        quality?: string;
        budgetMaxUsd?: number;
        submittedBy?: string;
        tenantId?: string;
    }): Promise<{
        success: boolean;
        data: MissionIntegrationContext;
    }>;
    getMissionContext(id: string): {
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: MissionIntegrationContext;
        error?: undefined;
    };
    getActiveMissions(): {
        success: boolean;
        data: MissionIntegrationContext[];
    };
    getUnifiedSnapshot(): Promise<{
        success: boolean;
        data: any;
    }>;
    getIntegrationStats(): {
        success: boolean;
        data: {
            totalMissionsIntegrated: number;
            totalAgentFailuresHandled: number;
            totalConstitutionalChecks: number;
            totalHumanApprovals: number;
            totalRecoveryActions: number;
            activeMissions: number;
        };
    };
    checkConstitutionalCompliance(body: {
        prompt: string;
    }): Promise<{
        success: boolean;
        data: {
            allowed: boolean;
            reason?: string;
            modified?: string;
        };
    }>;
    validateAction(body: {
        agentId: string;
        action: string;
        resource: string;
        input: any;
    }): Promise<{
        success: boolean;
        data: {
            allowed: boolean;
            reason?: string;
        };
    }>;
}
