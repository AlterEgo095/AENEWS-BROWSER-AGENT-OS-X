"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const navigation_agent_service_1 = require("./navigation/navigation-agent.service");
const click_agent_service_1 = require("./click/click-agent.service");
const form_filling_agent_service_1 = require("./form-filling/form-filling-agent.service");
const data_extraction_agent_service_1 = require("./data-extraction/data-extraction-agent.service");
const screenshot_agent_service_1 = require("./screenshot/screenshot-agent.service");
const cookie_management_agent_service_1 = require("./cookie-management/cookie-management-agent.service");
const session_management_agent_service_1 = require("./session-management/session-management-agent.service");
const tab_management_agent_service_1 = require("./tab-management/tab-management-agent.service");
const popup_handling_agent_service_1 = require("./popup-handling/popup-handling-agent.service");
const file_download_agent_service_1 = require("./file-download/file-download-agent.service");
const file_upload_agent_service_1 = require("./file-upload/file-upload-agent.service");
const wait_strategy_agent_service_1 = require("./wait-strategy/wait-strategy-agent.service");
const javascript_execution_agent_service_1 = require("./javascript-execution/javascript-execution-agent.service");
const network_intercept_agent_service_1 = require("./network-intercept/network-intercept-agent.service");
const iframe_handling_agent_service_1 = require("./iframe-handling/iframe-handling-agent.service");
const scroll_management_agent_service_1 = require("./scroll-management/scroll-management-agent.service");
const captcha_solving_agent_service_1 = require("./captcha-solving/captcha-solving-agent.service");
let BrowserClusterModule = class BrowserClusterModule {
};
exports.BrowserClusterModule = BrowserClusterModule;
exports.BrowserClusterModule = BrowserClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule],
        providers: [
            navigation_agent_service_1.NavigationAgentService,
            click_agent_service_1.ClickAgentService,
            form_filling_agent_service_1.FormFillingAgentService,
            data_extraction_agent_service_1.DataExtractionAgentService,
            screenshot_agent_service_1.ScreenshotAgentService,
            cookie_management_agent_service_1.CookieManagementAgentService,
            session_management_agent_service_1.SessionManagementAgentService,
            tab_management_agent_service_1.TabManagementAgentService,
            popup_handling_agent_service_1.PopupHandlingAgentService,
            file_download_agent_service_1.FileDownloadAgentService,
            file_upload_agent_service_1.FileUploadAgentService,
            wait_strategy_agent_service_1.WaitStrategyAgentService,
            javascript_execution_agent_service_1.JavaScriptExecutionAgentService,
            network_intercept_agent_service_1.NetworkInterceptAgentService,
            iframe_handling_agent_service_1.IframeHandlingAgentService,
            scroll_management_agent_service_1.ScrollManagementAgentService,
            captcha_solving_agent_service_1.CaptchaSolvingAgentService,
        ],
        exports: [
            navigation_agent_service_1.NavigationAgentService,
            click_agent_service_1.ClickAgentService,
            form_filling_agent_service_1.FormFillingAgentService,
            data_extraction_agent_service_1.DataExtractionAgentService,
            screenshot_agent_service_1.ScreenshotAgentService,
            cookie_management_agent_service_1.CookieManagementAgentService,
            session_management_agent_service_1.SessionManagementAgentService,
            tab_management_agent_service_1.TabManagementAgentService,
            popup_handling_agent_service_1.PopupHandlingAgentService,
            file_download_agent_service_1.FileDownloadAgentService,
            file_upload_agent_service_1.FileUploadAgentService,
            wait_strategy_agent_service_1.WaitStrategyAgentService,
            javascript_execution_agent_service_1.JavaScriptExecutionAgentService,
            network_intercept_agent_service_1.NetworkInterceptAgentService,
            iframe_handling_agent_service_1.IframeHandlingAgentService,
            scroll_management_agent_service_1.ScrollManagementAgentService,
            captcha_solving_agent_service_1.CaptchaSolvingAgentService,
        ],
    })
], BrowserClusterModule);
//# sourceMappingURL=browser-cluster.module.js.map