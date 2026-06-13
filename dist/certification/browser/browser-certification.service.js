"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var BrowserCertificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserCertificationService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const BROWSER_DIR = path.join(SOURCE_ROOT, 'agents', 'browser');
let BrowserCertificationService = BrowserCertificationService_1 = class BrowserCertificationService {
    constructor() {
        this.logger = new common_1.Logger(BrowserCertificationService_1.name);
        this.agentAnalyses = null;
    }
    async runAll() {
        const startTime = Date.now();
        this.logger.log('Starting Browser certification...');
        const tests = [];
        const criticalFailures = [];
        const agents = await this.analyzeBrowserAgents();
        this.logger.log(`Analyzed ${agents.size} browser agents`);
        const testMethods = [
            { name: 'Navigation', fn: () => this.testNavigation(agents) },
            { name: 'Authentication', fn: () => this.testAuthentication(agents) },
            { name: 'Form Handling', fn: () => this.testFormHandling(agents) },
            { name: 'Downloads', fn: () => this.testDownloads(agents) },
            { name: 'Uploads', fn: () => this.testUploads(agents) },
            { name: 'Popup Handling', fn: () => this.testPopupHandling(agents) },
            { name: 'Screenshots', fn: () => this.testScreenshots(agents) },
            { name: 'Session Persistence', fn: () => this.testSessionPersistence(agents) },
            { name: 'Wait Strategies', fn: () => this.testWaitStrategies(agents) },
            { name: 'JavaScript Execution', fn: () => this.testJavaScriptExecution(agents) },
        ];
        for (const testDef of testMethods) {
            try {
                const result = await testDef.fn();
                tests.push(result);
                if (!result.passed && result.score < 50) {
                    criticalFailures.push(`${testDef.name}: Score ${result.score}/100`);
                }
            }
            catch (error) {
                const errMsg = error.message;
                this.logger.error(`Test "${testDef.name}" execution failed: ${errMsg}`);
                tests.push({
                    name: testDef.name,
                    passed: false,
                    score: 0,
                    durationMs: 0,
                    error: errMsg,
                });
                criticalFailures.push(`Test "${testDef.name}" execution error: ${errMsg}`);
            }
        }
        const testWeights = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
        let weightedSum = 0;
        for (let i = 0; i < tests.length; i++) {
            const weight = testWeights[i] || 0.1;
            weightedSum += tests[i].score * weight;
        }
        const score = Math.round(weightedSum);
        const passed = score >= 90 && criticalFailures.length === 0;
        const durationMs = Date.now() - startTime;
        this.logger.log(`Browser certification complete: score=${score}, passed=${passed}, ` +
            `duration=${durationMs}ms, criticalFailures=${criticalFailures.length}`);
        return {
            domain: types_1.CertificationDomain.BROWSER,
            weight: 0.1,
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async testNavigation(agents) {
        const startTime = Date.now();
        const name = 'Navigation';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const nav = agents.get('navigation');
            if (nav) {
                score += 10;
            }
            else {
                issues.push('NavigationAgentService not found');
            }
            if (nav) {
                if (nav.capabilities.includes('navigateTo') || nav.tools.includes('navigateTo')) {
                    score += 15;
                }
                else {
                    issues.push('Missing navigateTo capability');
                }
                if (nav.capabilities.includes('goBack') || nav.tools.includes('goBack')) {
                    score += 10;
                }
                else {
                    issues.push('Missing goBack capability');
                }
                if (nav.capabilities.includes('goForward') || nav.tools.includes('goForward')) {
                    score += 10;
                }
                else {
                    issues.push('Missing goForward capability');
                }
                if (nav.capabilities.includes('refresh') || nav.tools.includes('refresh')) {
                    score += 10;
                }
                else {
                    issues.push('Missing refresh capability');
                }
                if (nav.content.includes('new URL(') ||
                    nav.content.includes('URL validation') ||
                    nav.content.includes('Invalid URL')) {
                    score += 10;
                }
                else {
                    issues.push('Missing URL validation');
                }
                if (nav.content.includes('redirectChain') || nav.content.includes('redirect')) {
                    score += 10;
                }
                if (nav.hasInputValidation) {
                    score += 5;
                }
                if (nav.hasErrorHandling) {
                    score += 5;
                }
                if (nav.hasOutputStructure) {
                    score += 5;
                }
                if (nav.capabilities.includes('waitForNavigation') ||
                    nav.tools.includes('waitForNavigation')) {
                    score += 5;
                }
                if (nav.content.includes('simulateRedirect') ||
                    nav.content.includes('simulateStatus') ||
                    nav.content.includes('navigationHistory')) {
                    score += 5;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!nav,
                    capabilitiesFound: nav?.capabilities || [],
                    toolsFound: nav?.tools || [],
                    hasUrlValidation: nav?.content.includes('new URL(') || false,
                    hasRedirectHandling: nav?.content.includes('redirectChain') || false,
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testAuthentication(agents) {
        const startTime = Date.now();
        const name = 'Authentication';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const session = agents.get('session-management');
            if (session) {
                score += 10;
            }
            else {
                issues.push('SessionManagementAgentService not found');
            }
            if (session) {
                if (session.capabilities.includes('login') || session.tools.includes('login')) {
                    score += 15;
                }
                else {
                    issues.push('Missing login capability');
                }
                if (session.capabilities.includes('logout') || session.tools.includes('logout')) {
                    score += 10;
                }
                else {
                    issues.push('Missing logout capability');
                }
                if (session.capabilities.includes('refreshSession') ||
                    session.tools.includes('refreshSession')) {
                    score += 10;
                }
                else {
                    issues.push('Missing session refresh');
                }
                if (session.capabilities.includes('checkSession') ||
                    session.tools.includes('checkSession')) {
                    score += 10;
                }
                if (session.content.includes('cookies') || session.content.includes('sessionToken')) {
                    score += 10;
                }
                if (session.capabilities.includes('switchAccount') ||
                    session.tools.includes('switchAccount')) {
                    score += 5;
                }
                if (session.hasInputValidation) {
                    score += 10;
                }
                if (session.hasErrorHandling) {
                    score += 10;
                }
                if (session.hasOutputStructure) {
                    score += 5;
                }
                if (session.content.includes('sessionToken') && session.content.includes('expiresAt')) {
                    score += 5;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!session,
                    capabilitiesFound: session?.capabilities || [],
                    toolsFound: session?.tools || [],
                    hasCookieHandling: session?.content.includes('cookies') || false,
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testFormHandling(agents) {
        const startTime = Date.now();
        const name = 'Form Handling';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const form = agents.get('form-filling');
            if (form) {
                score += 10;
            }
            else {
                issues.push('FormFillingAgentService not found');
            }
            if (form) {
                if (form.capabilities.includes('fillField') || form.tools.includes('fillField')) {
                    score += 15;
                }
                else {
                    issues.push('Missing fillField capability');
                }
                if (form.capabilities.includes('selectDropdown') || form.tools.includes('selectDropdown')) {
                    score += 10;
                }
                else {
                    issues.push('Missing selectDropdown capability');
                }
                if (form.capabilities.includes('checkCheckbox') || form.tools.includes('checkCheckbox')) {
                    score += 10;
                }
                else {
                    issues.push('Missing checkbox handling');
                }
                if (form.capabilities.includes('selectRadio') || form.tools.includes('selectRadio')) {
                    score += 10;
                }
                else {
                    issues.push('Missing radio button handling');
                }
                if (form.capabilities.includes('clearField') || form.tools.includes('clearField')) {
                    score += 5;
                }
                if (form.capabilities.includes('uploadFile') || form.tools.includes('uploadFile')) {
                    score += 5;
                }
                if (form.hasInputValidation) {
                    score += 10;
                }
                if (form.hasErrorHandling) {
                    score += 10;
                }
                if (form.hasOutputStructure) {
                    score += 5;
                }
                if (form.content.includes('formState') || form.content.includes('FieldState')) {
                    score += 10;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!form,
                    capabilitiesFound: form?.capabilities || [],
                    toolsFound: form?.tools || [],
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testDownloads(agents) {
        const startTime = Date.now();
        const name = 'Downloads';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const download = agents.get('file-download');
            if (download) {
                score += 10;
            }
            else {
                issues.push('FileDownloadAgentService not found');
            }
            if (download) {
                if (download.capabilities.includes('downloadFile') ||
                    download.tools.includes('downloadFile')) {
                    score += 15;
                }
                else {
                    issues.push('Missing downloadFile capability');
                }
                if (download.capabilities.includes('waitForDownload') ||
                    download.tools.includes('waitForDownload')) {
                    score += 15;
                }
                else {
                    issues.push('Missing progress monitoring');
                }
                if (download.capabilities.includes('verifyDownload') ||
                    download.tools.includes('verifyDownload')) {
                    score += 10;
                }
                else {
                    issues.push('Missing download verification');
                }
                if (download.capabilities.includes('cancelDownload') ||
                    download.tools.includes('cancelDownload')) {
                    score += 10;
                }
                if (download.capabilities.includes('getDownloadHistory') ||
                    download.tools.includes('getDownloadHistory')) {
                    score += 10;
                }
                if (download.hasInputValidation) {
                    score += 10;
                }
                if (download.hasErrorHandling) {
                    score += 10;
                }
                if (download.hasOutputStructure) {
                    score += 5;
                }
                if (download.content.includes('bytesDownloaded') || download.content.includes('progress')) {
                    score += 5;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!download,
                    capabilitiesFound: download?.capabilities || [],
                    toolsFound: download?.tools || [],
                    hasProgressMonitoring: download?.content.includes('bytesDownloaded') || false,
                    hasVerification: download?.capabilities.includes('verifyDownload') || false,
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testUploads(agents) {
        const startTime = Date.now();
        const name = 'Uploads';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const upload = agents.get('file-upload');
            if (upload) {
                score += 10;
            }
            else {
                issues.push('FileUploadAgentService not found');
            }
            if (upload) {
                if (upload.capabilities.includes('uploadFile') ||
                    upload.capabilities.includes('upload') ||
                    upload.tools.includes('uploadFile') ||
                    upload.tools.includes('upload')) {
                    score += 20;
                }
                else {
                    issues.push('Missing uploadFile capability');
                }
                if (upload.hasInputValidation) {
                    score += 15;
                }
                else {
                    issues.push('Missing input validation for uploads');
                }
                if (upload.hasErrorHandling) {
                    score += 15;
                }
                if (upload.hasOutputStructure) {
                    score += 10;
                }
                if (upload.content.includes('multiple') ||
                    upload.content.includes('multi') ||
                    upload.capabilities.includes('uploadMultiple')) {
                    score += 10;
                }
                if (upload.content.includes('drag') ||
                    upload.content.includes('drop') ||
                    upload.capabilities.includes('dragDrop')) {
                    score += 5;
                }
                if (upload.content.includes('accept') ||
                    upload.content.includes('fileType') ||
                    upload.content.includes('extension')) {
                    score += 10;
                }
                if (upload.content.includes('fileSize') ||
                    upload.content.includes('maxSize') ||
                    upload.content.includes('maxFileSize')) {
                    score += 5;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!upload,
                    capabilitiesFound: upload?.capabilities || [],
                    toolsFound: upload?.tools || [],
                    hasMultiUpload: upload?.content.includes('multiple') || upload?.content.includes('multi') || false,
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testPopupHandling(agents) {
        const startTime = Date.now();
        const name = 'Popup Handling';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const popup = agents.get('popup-handling');
            if (popup) {
                score += 10;
            }
            else {
                issues.push('PopupHandlingAgentService not found');
            }
            if (popup) {
                if (popup.capabilities.includes('handleAlert') || popup.tools.includes('handleAlert')) {
                    score += 15;
                }
                else {
                    issues.push('Missing handleAlert capability');
                }
                if (popup.capabilities.includes('handleConfirm') || popup.tools.includes('handleConfirm')) {
                    score += 10;
                }
                else {
                    issues.push('Missing handleConfirm capability');
                }
                if (popup.capabilities.includes('handlePrompt') || popup.tools.includes('handlePrompt')) {
                    score += 10;
                }
                else {
                    issues.push('Missing handlePrompt capability');
                }
                if (popup.capabilities.includes('detectPopup') || popup.tools.includes('detectPopup')) {
                    score += 10;
                }
                if (popup.capabilities.includes('closePopup') || popup.tools.includes('closePopup')) {
                    score += 10;
                }
                if (popup.hasInputValidation) {
                    score += 10;
                }
                if (popup.hasErrorHandling) {
                    score += 10;
                }
                if (popup.hasOutputStructure) {
                    score += 5;
                }
                if (popup.content.includes('dialogHistory') || popup.content.includes('DialogRecord')) {
                    score += 10;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!popup,
                    capabilitiesFound: popup?.capabilities || [],
                    toolsFound: popup?.tools || [],
                    hasAlertHandling: popup?.capabilities.includes('handleAlert') || false,
                    hasConfirmHandling: popup?.capabilities.includes('handleConfirm') || false,
                    hasPromptHandling: popup?.capabilities.includes('handlePrompt') || false,
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testScreenshots(agents) {
        const startTime = Date.now();
        const name = 'Screenshots';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const screenshot = agents.get('screenshot');
            if (screenshot) {
                score += 10;
            }
            else {
                issues.push('ScreenshotAgentService not found');
            }
            if (screenshot) {
                if (screenshot.capabilities.includes('takeScreenshot') ||
                    screenshot.tools.includes('takeScreenshot')) {
                    score += 15;
                }
                else {
                    issues.push('Missing takeScreenshot capability');
                }
                if (screenshot.capabilities.includes('screenshotElement') ||
                    screenshot.tools.includes('screenshotElement')) {
                    score += 15;
                }
                else {
                    issues.push('Missing element-specific screenshot');
                }
                if (screenshot.capabilities.includes('screenshotFullPage') ||
                    screenshot.tools.includes('screenshotFullPage')) {
                    score += 10;
                }
                else {
                    issues.push('Missing full-page screenshot');
                }
                if (screenshot.capabilities.includes('compareScreenshots') ||
                    screenshot.tools.includes('compareScreenshots')) {
                    score += 10;
                }
                if (screenshot.hasInputValidation) {
                    score += 10;
                }
                if (screenshot.hasErrorHandling) {
                    score += 10;
                }
                if (screenshot.hasOutputStructure) {
                    score += 10;
                }
                if (screenshot.content.includes('png') &&
                    (screenshot.content.includes('jpeg') || screenshot.content.includes('webp'))) {
                    score += 5;
                }
                if (screenshot.content.includes('screenshotHistory') ||
                    screenshot.content.includes('ScreenshotRecord')) {
                    score += 5;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!screenshot,
                    capabilitiesFound: screenshot?.capabilities || [],
                    toolsFound: screenshot?.tools || [],
                    hasFullPage: screenshot?.capabilities.includes('screenshotFullPage') || false,
                    hasElementScreenshot: screenshot?.capabilities.includes('screenshotElement') || false,
                    hasComparison: screenshot?.capabilities.includes('compareScreenshots') || false,
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testSessionPersistence(agents) {
        const startTime = Date.now();
        const name = 'Session Persistence';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const cookie = agents.get('cookie-management');
            const session = agents.get('session-management');
            if (cookie) {
                score += 10;
            }
            else {
                issues.push('CookieManagementAgentService not found');
            }
            if (session) {
                score += 10;
            }
            else {
                issues.push('SessionManagementAgentService not found');
            }
            if (cookie) {
                if (cookie.capabilities.includes('getCookies') || cookie.tools.includes('getCookies')) {
                    score += 10;
                }
                if (cookie.capabilities.includes('setCookie') || cookie.tools.includes('setCookie')) {
                    score += 10;
                }
                if (cookie.capabilities.includes('deleteCookie') || cookie.tools.includes('deleteCookie')) {
                    score += 5;
                }
                if (cookie.capabilities.includes('clearCookies') || cookie.tools.includes('clearCookies')) {
                    score += 5;
                }
                if (cookie.capabilities.includes('handleCookieBanner') ||
                    cookie.tools.includes('handleCookieBanner')) {
                    score += 5;
                }
                if (cookie.content.includes('cookieStore') || cookie.content.includes('Map<')) {
                    score += 5;
                }
            }
            if (session) {
                if (session.content.includes('cookies') || session.content.includes('sessionToken')) {
                    score += 5;
                }
                if (session.content.includes('expiresAt') || session.content.includes('lastRefreshedAt')) {
                    score += 5;
                }
                if (session.content.includes('storeInSessionMemory') ||
                    session.content.includes('storeInWorkingMemory')) {
                    score += 5;
                }
                if (session.hasOnDestroy && session.hasCleanup) {
                    score += 5;
                }
            }
            const simResult = this.simulateSessionPersistence(!!cookie, !!session);
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    cookieServiceFound: !!cookie,
                    sessionServiceFound: !!session,
                    cookieCapabilities: cookie?.capabilities || [],
                    sessionCapabilities: session?.capabilities || [],
                    issues,
                    simulated: simResult,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testWaitStrategies(agents) {
        const startTime = Date.now();
        const name = 'Wait Strategies';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const wait = agents.get('wait-strategy');
            if (wait) {
                score += 10;
            }
            else {
                issues.push('WaitStrategyAgentService not found');
            }
            if (wait) {
                if (wait.capabilities.includes('waitForSelector') ||
                    wait.tools.includes('waitForSelector')) {
                    score += 15;
                }
                else {
                    issues.push('Missing waitForSelector capability');
                }
                if (wait.capabilities.includes('waitForNavigation') ||
                    wait.tools.includes('waitForNavigation')) {
                    score += 10;
                }
                else {
                    issues.push('Missing waitForNavigation capability');
                }
                if (wait.capabilities.includes('waitForNetworkIdle') ||
                    wait.tools.includes('waitForNetworkIdle')) {
                    score += 10;
                }
                else {
                    issues.push('Missing waitForNetworkIdle capability');
                }
                if (wait.capabilities.includes('waitForFunction') ||
                    wait.tools.includes('waitForFunction')) {
                    score += 10;
                }
                else {
                    issues.push('Missing waitForFunction capability');
                }
                if (wait.capabilities.includes('waitForTimeout') || wait.tools.includes('waitForTimeout')) {
                    score += 10;
                }
                else {
                    issues.push('Missing waitForTimeout capability');
                }
                if (wait.hasInputValidation) {
                    score += 10;
                }
                if (wait.hasErrorHandling) {
                    score += 10;
                }
                if (wait.hasOutputStructure) {
                    score += 5;
                }
                if (wait.content.includes('activeWaits') && wait.content.includes('clearTimeout')) {
                    score += 10;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!wait,
                    capabilitiesFound: wait?.capabilities || [],
                    toolsFound: wait?.tools || [],
                    strategiesCount: wait?.capabilities.filter((c) => c.startsWith('waitFor')).length || 0,
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testJavaScriptExecution(agents) {
        const startTime = Date.now();
        const name = 'JavaScript Execution';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const jsExec = agents.get('javascript-execution');
            if (jsExec) {
                score += 10;
            }
            else {
                issues.push('JavaScriptExecutionAgentService not found');
            }
            if (jsExec) {
                if (jsExec.capabilities.includes('evaluateExpression') ||
                    jsExec.tools.includes('evaluateExpression')) {
                    score += 15;
                }
                else {
                    issues.push('Missing evaluateExpression capability');
                }
                if (jsExec.capabilities.includes('executeScript') ||
                    jsExec.tools.includes('executeScript')) {
                    score += 15;
                }
                else {
                    issues.push('Missing executeScript capability');
                }
                if (jsExec.capabilities.includes('injectScript') || jsExec.tools.includes('injectScript')) {
                    score += 10;
                }
                if (jsExec.capabilities.includes('evaluateFunction') ||
                    jsExec.tools.includes('evaluateFunction')) {
                    score += 10;
                }
                if (jsExec.content.includes('validateScriptSafety') ||
                    jsExec.content.includes('safety') ||
                    jsExec.content.includes('dangerousPatterns')) {
                    score += 15;
                }
                else {
                    issues.push('Missing script safety validation');
                }
                if (jsExec.hasInputValidation) {
                    score += 10;
                }
                if (jsExec.hasErrorHandling) {
                    score += 5;
                }
                if (jsExec.hasOutputStructure) {
                    score += 5;
                }
                if (jsExec.content.includes('executionHistory') ||
                    jsExec.content.includes('ExecutionRecord')) {
                    score += 5;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!jsExec,
                    capabilitiesFound: jsExec?.capabilities || [],
                    toolsFound: jsExec?.tools || [],
                    hasSafetyValidation: jsExec?.content.includes('validateScriptSafety') || false,
                    hasEvaluateExpression: jsExec?.capabilities.includes('evaluateExpression') || false,
                    hasExecuteScript: jsExec?.capabilities.includes('executeScript') || false,
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    simulateSessionPersistence(hasCookieService, hasSessionService) {
        return {
            cookiesPersistAcrossNav: hasCookieService,
            sessionsPersistAcrossRefresh: hasSessionService,
            stateMaintainedAfterMemoryStore: hasCookieService && hasSessionService,
        };
    }
    async analyzeBrowserAgents() {
        if (this.agentAnalyses) {
            return this.agentAnalyses;
        }
        const results = new Map();
        if (!fs.existsSync(BROWSER_DIR)) {
            this.logger.warn(`Browser directory not found: ${BROWSER_DIR}`);
            return results;
        }
        const entries = fs
            .readdirSync(BROWSER_DIR, { withFileTypes: true })
            .filter((d) => d.isDirectory());
        for (const entry of entries) {
            const agentDir = path.join(BROWSER_DIR, entry.name);
            const agentFiles = fs.readdirSync(agentDir).filter((f) => f.endsWith('-agent.service.ts'));
            for (const fileName of agentFiles) {
                const filePath = path.join(agentDir, fileName);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const classMatch = content.match(/export\s+class\s+(\w+)/);
                    const className = classMatch ? classMatch[1] : '';
                    const capabilityRegex = /name:\s*['"](\w+)['"]/g;
                    const capabilities = [];
                    let capMatch;
                    while ((capMatch = capabilityRegex.exec(content)) !== null) {
                        capabilities.push(capMatch[1]);
                    }
                    const toolRegex = /registerTool\s*\(\s*\{\s*name:\s*['"](\w+)['"]/g;
                    const tools = [];
                    let toolMatch;
                    while ((toolMatch = toolRegex.exec(content)) !== null) {
                        if (!capabilities.includes(toolMatch[1])) {
                            tools.push(toolMatch[1]);
                        }
                    }
                    const methodRegex = /(?:async\s+)?(\w+)\s*\(/g;
                    const methods = [];
                    let methodMatch;
                    while ((methodMatch = methodRegex.exec(content)) !== null) {
                        const mName = methodMatch[1];
                        if (![
                            'if',
                            'for',
                            'while',
                            'switch',
                            'catch',
                            'constructor',
                            'return',
                            'new',
                            'throw',
                            'typeof',
                        ].includes(mName)) {
                            methods.push(mName);
                        }
                    }
                    const uniqueMethods = Array.from(new Set(methods));
                    const hasInputValidation = content.includes('throw new Error(') ||
                        content.includes('if (!') ||
                        content.includes('if(!') ||
                        content.includes('required') ||
                        content.includes('validate');
                    const hasErrorHandling = (content.match(/try\s*\{/g) || []).length > 0 &&
                        (content.match(/catch\s*\(/g) || []).length > 0;
                    const hasOutputStructure = content.includes('Promise<{') ||
                        content.includes('Promise<') ||
                        content.includes(': {') ||
                        content.includes('outputSchema');
                    const hasOnDestroy = content.includes('onDestroy') || content.includes('async onDestroy(');
                    const onDestroyMatch = content.match(/onDestroy[\s\S]*?\{([\s\S]*?)\n\s{2}\}/);
                    const onDestroyBody = onDestroyMatch ? onDestroyMatch[1] : '';
                    const hasCleanup = onDestroyBody.includes('.clear()') ||
                        onDestroyBody.includes('= []') ||
                        onDestroyBody.includes('= null') ||
                        onDestroyBody.includes('= 0') ||
                        onDestroyBody.includes('= -1');
                    results.set(entry.name, {
                        filePath,
                        fileName,
                        dirName: entry.name,
                        content,
                        className,
                        tools,
                        capabilities,
                        methods: uniqueMethods,
                        hasInputValidation,
                        hasErrorHandling,
                        hasOutputStructure,
                        hasOnDestroy,
                        hasCleanup,
                        extendsBaseAgent: content.includes('extends BaseAgentService'),
                        hasInjectable: content.includes('@Injectable'),
                        hasLogger: content.includes('Logger') || content.includes('this.logger'),
                    });
                }
                catch (error) {
                    this.logger.warn(`Failed to analyze ${filePath}: ${error.message}`);
                }
            }
        }
        this.agentAnalyses = results;
        return results;
    }
};
exports.BrowserCertificationService = BrowserCertificationService;
exports.BrowserCertificationService = BrowserCertificationService = BrowserCertificationService_1 = __decorate([
    (0, common_1.Injectable)()
], BrowserCertificationService);
//# sourceMappingURL=browser-certification.service.js.map