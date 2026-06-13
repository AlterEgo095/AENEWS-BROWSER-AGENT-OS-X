import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const PROCUREMENT_AGENT_CONFIG: AgentConfig;
export declare class ProcurementAgentService extends BaseAgentService {
    private readonly bridge?;
    private vendors;
    private purchaseOrders;
    private shipments;
    private counter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createPurchaseOrder;
    private manageVendor;
    private trackShipment;
    private compareSuppliers;
    private negotiateContract;
    private generateProcurementReport;
    private seedVendors;
    private groupVendorsByField;
}
