"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfficeClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const bridge_1 = require("../bridge");
const email_agent_service_1 = require("./email/email-agent.service");
const calendar_agent_service_1 = require("./calendar/calendar-agent.service");
const document_agent_service_1 = require("./document/document-agent.service");
const spreadsheet_agent_service_1 = require("./spreadsheet/spreadsheet-agent.service");
const presentation_agent_service_1 = require("./presentation/presentation-agent.service");
const task_management_agent_service_1 = require("./task-management/task-management-agent.service");
let OfficeClusterModule = class OfficeClusterModule {
};
exports.OfficeClusterModule = OfficeClusterModule;
exports.OfficeClusterModule = OfficeClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule, bridge_1.AgentConnectorBridgeModule],
        providers: [
            email_agent_service_1.EmailAgentService,
            calendar_agent_service_1.CalendarAgentService,
            document_agent_service_1.DocumentAgentService,
            spreadsheet_agent_service_1.SpreadsheetAgentService,
            presentation_agent_service_1.PresentationAgentService,
            task_management_agent_service_1.TaskManagementAgentService,
        ],
        exports: [
            email_agent_service_1.EmailAgentService,
            calendar_agent_service_1.CalendarAgentService,
            document_agent_service_1.DocumentAgentService,
            spreadsheet_agent_service_1.SpreadsheetAgentService,
            presentation_agent_service_1.PresentationAgentService,
            task_management_agent_service_1.TaskManagementAgentService,
        ],
    })
], OfficeClusterModule);
//# sourceMappingURL=office-cluster.module.js.map