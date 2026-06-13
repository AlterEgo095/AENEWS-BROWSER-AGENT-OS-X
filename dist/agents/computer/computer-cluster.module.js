"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComputerClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const filesystem_agent_service_1 = require("./filesystem/filesystem-agent.service");
const process_manager_agent_service_1 = require("./process-manager/process-manager-agent.service");
const terminal_agent_service_1 = require("./terminal/terminal-agent.service");
const clipboard_agent_service_1 = require("./clipboard/clipboard-agent.service");
const screen_capture_agent_service_1 = require("./screen-capture/screen-capture-agent.service");
const notification_agent_service_1 = require("./notification/notification-agent.service");
const system_monitor_agent_service_1 = require("./system-monitor/system-monitor-agent.service");
let ComputerClusterModule = class ComputerClusterModule {
};
exports.ComputerClusterModule = ComputerClusterModule;
exports.ComputerClusterModule = ComputerClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule],
        providers: [
            filesystem_agent_service_1.FileSystemAgentService,
            process_manager_agent_service_1.ProcessManagerAgentService,
            terminal_agent_service_1.TerminalAgentService,
            clipboard_agent_service_1.ClipboardAgentService,
            screen_capture_agent_service_1.ScreenCaptureAgentService,
            notification_agent_service_1.NotificationAgentService,
            system_monitor_agent_service_1.SystemMonitorAgentService,
        ],
        exports: [
            filesystem_agent_service_1.FileSystemAgentService,
            process_manager_agent_service_1.ProcessManagerAgentService,
            terminal_agent_service_1.TerminalAgentService,
            clipboard_agent_service_1.ClipboardAgentService,
            screen_capture_agent_service_1.ScreenCaptureAgentService,
            notification_agent_service_1.NotificationAgentService,
            system_monitor_agent_service_1.SystemMonitorAgentService,
        ],
    })
], ComputerClusterModule);
//# sourceMappingURL=computer-cluster.module.js.map