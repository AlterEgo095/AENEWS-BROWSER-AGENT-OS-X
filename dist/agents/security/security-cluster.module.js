"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const bridge_1 = require("../bridge");
const threat_detection_agent_service_1 = require("./threat-detection/threat-detection-agent.service");
const authentication_agent_service_1 = require("./authentication/authentication-agent.service");
const encryption_agent_service_1 = require("./encryption/encryption-agent.service");
const access_control_agent_service_1 = require("./access-control/access-control-agent.service");
const audit_agent_service_1 = require("./audit/audit-agent.service");
const incident_response_agent_service_1 = require("./incident-response/incident-response-agent.service");
let SecurityClusterModule = class SecurityClusterModule {
};
exports.SecurityClusterModule = SecurityClusterModule;
exports.SecurityClusterModule = SecurityClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule, bridge_1.AgentConnectorBridgeModule],
        providers: [
            threat_detection_agent_service_1.ThreatDetectionAgentService,
            authentication_agent_service_1.AuthenticationAgentService,
            encryption_agent_service_1.EncryptionAgentService,
            access_control_agent_service_1.AccessControlAgentService,
            audit_agent_service_1.AuditAgentService,
            incident_response_agent_service_1.IncidentResponseAgentService,
        ],
        exports: [
            threat_detection_agent_service_1.ThreatDetectionAgentService,
            authentication_agent_service_1.AuthenticationAgentService,
            encryption_agent_service_1.EncryptionAgentService,
            access_control_agent_service_1.AccessControlAgentService,
            audit_agent_service_1.AuditAgentService,
            incident_response_agent_service_1.IncidentResponseAgentService,
        ],
    })
], SecurityClusterModule);
//# sourceMappingURL=security-cluster.module.js.map