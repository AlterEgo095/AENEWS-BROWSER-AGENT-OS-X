import { MissionContract, MissionQuality, DeliverableType, ContractNegotiationResult, ContractViolation, MissionConstraint } from '../interfaces';
export declare class MissionContractService {
    private readonly logger;
    private readonly contracts;
    private readonly violations;
    createContract(params: {
        mission: string;
        description?: string;
        quality?: MissionQuality;
        deadline?: Date;
        budgetMaxUsd?: number;
        deliverables?: DeliverableType[];
        acceptanceCriteria?: string[];
        constraints?: MissionConstraint[];
        tags?: string[];
        createdBy?: string;
    }): MissionContract;
    negotiate(contract: MissionContract): ContractNegotiationResult;
    getContract(contractId: string): MissionContract | undefined;
    updateContract(contractId: string, updates: Partial<MissionContract>): MissionContract | undefined;
    trackSpend(contractId: string, amountUsd: number, computeHours?: number): ContractViolation | null;
    validateDeliverable(contractId: string, deliverableType: DeliverableType, path: string): boolean;
    verifyAcceptanceCriterion(contractId: string, criterionId: string, verifiedBy: string, notes?: string): boolean;
    getViolations(contractId: string): ContractViolation[];
    areDeliverablesComplete(contractId: string): boolean;
    areCriteriaMet(contractId: string): boolean;
    getCompletionPercentage(contractId: string): number;
    private inferDeliverables;
    private generateDefaultMilestones;
    private generateDefaultCriteria;
}
