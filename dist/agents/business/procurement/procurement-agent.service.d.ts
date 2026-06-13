import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const PROCUREMENT_AGENT_CONFIG: AgentConfig;
export declare class ProcurementAgentService extends BaseAgentService {
    private vendors;
    private purchaseOrders;
    private shipments;
    private counter;
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
