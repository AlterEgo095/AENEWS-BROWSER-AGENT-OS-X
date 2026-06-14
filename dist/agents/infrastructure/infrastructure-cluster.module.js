"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfrastructureClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const bridge_1 = require("../bridge");
const deployment_agent_service_1 = require("./deployment/deployment-agent.service");
const monitoring_agent_service_1 = require("./monitoring/monitoring-agent.service");
const logging_agent_service_1 = require("./logging/logging-agent.service");
const backup_agent_service_1 = require("./backup/backup-agent.service");
const scaling_agent_service_1 = require("./scaling/scaling-agent.service");
const network_agent_service_1 = require("./network/network-agent.service");
const container_agent_service_1 = require("./container/container-agent.service");
const configuration_agent_service_1 = require("./configuration/configuration-agent.service");
let InfrastructureClusterModule = class InfrastructureClusterModule {
};
exports.InfrastructureClusterModule = InfrastructureClusterModule;
exports.InfrastructureClusterModule = InfrastructureClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule, bridge_1.AgentConnectorBridgeModule],
        providers: [
            deployment_agent_service_1.DeploymentAgentService,
            monitoring_agent_service_1.MonitoringAgentService,
            logging_agent_service_1.LoggingAgentService,
            backup_agent_service_1.BackupAgentService,
            scaling_agent_service_1.ScalingAgentService,
            network_agent_service_1.NetworkAgentService,
            container_agent_service_1.ContainerAgentService,
            configuration_agent_service_1.ConfigurationAgentService,
        ],
        exports: [
            deployment_agent_service_1.DeploymentAgentService,
            monitoring_agent_service_1.MonitoringAgentService,
            logging_agent_service_1.LoggingAgentService,
            backup_agent_service_1.BackupAgentService,
            scaling_agent_service_1.ScalingAgentService,
            network_agent_service_1.NetworkAgentService,
            container_agent_service_1.ContainerAgentService,
            configuration_agent_service_1.ConfigurationAgentService,
        ],
    })
], InfrastructureClusterModule);
//# sourceMappingURL=infrastructure-cluster.module.js.map