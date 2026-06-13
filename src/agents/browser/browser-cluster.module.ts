/**
 * AENEWS Agent OS X - Browser Cluster Module
 * Aggregates all 17 browser agents into a single NestJS module.
 * Imports the BaseAgentModule for shared infrastructure (event bus, memory).
 * Provides all browser agent services for dependency injection.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { AgentConnectorBridgeModule } from '../bridge';
import { NavigationAgentService } from './navigation/navigation-agent.service';
import { ClickAgentService } from './click/click-agent.service';
import { FormFillingAgentService } from './form-filling/form-filling-agent.service';
import { DataExtractionAgentService } from './data-extraction/data-extraction-agent.service';
import { ScreenshotAgentService } from './screenshot/screenshot-agent.service';
import { CookieManagementAgentService } from './cookie-management/cookie-management-agent.service';
import { SessionManagementAgentService } from './session-management/session-management-agent.service';
import { TabManagementAgentService } from './tab-management/tab-management-agent.service';
import { PopupHandlingAgentService } from './popup-handling/popup-handling-agent.service';
import { FileDownloadAgentService } from './file-download/file-download-agent.service';
import { FileUploadAgentService } from './file-upload/file-upload-agent.service';
import { WaitStrategyAgentService } from './wait-strategy/wait-strategy-agent.service';
import { JavaScriptExecutionAgentService } from './javascript-execution/javascript-execution-agent.service';
import { NetworkInterceptAgentService } from './network-intercept/network-intercept-agent.service';
import { IframeHandlingAgentService } from './iframe-handling/iframe-handling-agent.service';
import { ScrollManagementAgentService } from './scroll-management/scroll-management-agent.service';
import { CaptchaSolvingAgentService } from './captcha-solving/captcha-solving-agent.service';

@Module({
  imports: [BaseAgentModule, AgentConnectorBridgeModule],
  providers: [
    // 1. Navigation — URL navigation, redirects, history
    NavigationAgentService,
    // 2. Click — element clicking, double/right click, drag-drop, hover
    ClickAgentService,
    // 3. Form Filling — text input, dropdowns, checkboxes, radio, file upload
    FormFillingAgentService,
    // 4. Data Extraction — text, tables, lists, links, metadata, structured data
    DataExtractionAgentService,
    // 5. Screenshot — viewport, element, full-page, visual comparison
    ScreenshotAgentService,
    // 6. Cookie Management — get/set/delete/clear cookies, consent banners
    CookieManagementAgentService,
    // 7. Session Management — login/logout, session check, refresh, account switch
    SessionManagementAgentService,
    // 8. Tab Management — open/close/switch tabs, list, wait for tab
    TabManagementAgentService,
    // 9. Popup Handling — alerts, confirms, prompts, modal detection, close
    PopupHandlingAgentService,
    // 10. File Download — download, wait, verify, cancel, history
    FileDownloadAgentService,
    // 11. File Upload — single/multiple/drag-drop upload, verify
    FileUploadAgentService,
    // 12. Wait Strategy — selector, navigation, network idle, function, timeout
    WaitStrategyAgentService,
    // 13. JavaScript Execution — evaluate, execute, inject, function
    JavaScriptExecutionAgentService,
    // 14. Network Intercept — intercept, mock, block, modify headers, log
    NetworkInterceptAgentService,
    // 15. Iframe Handling — switch to/from iframe, list frames, execute in frame
    IframeHandlingAgentService,
    // 16. Scroll Management — scroll to element/by/top/bottom, infinite scroll
    ScrollManagementAgentService,
    // 17. Captcha Solving — detect, solve reCAPTCHA/hCaptcha/simple, report
    CaptchaSolvingAgentService,
  ],
  exports: [
    NavigationAgentService,
    ClickAgentService,
    FormFillingAgentService,
    DataExtractionAgentService,
    ScreenshotAgentService,
    CookieManagementAgentService,
    SessionManagementAgentService,
    TabManagementAgentService,
    PopupHandlingAgentService,
    FileDownloadAgentService,
    FileUploadAgentService,
    WaitStrategyAgentService,
    JavaScriptExecutionAgentService,
    NetworkInterceptAgentService,
    IframeHandlingAgentService,
    ScrollManagementAgentService,
    CaptchaSolvingAgentService,
  ],
})
export class BrowserClusterModule {}
