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
var BrowserConnector_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserConnector = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const interfaces_1 = require("../interfaces");
const llm_helper_1 = require("./llm-helper");
let BrowserConnector = BrowserConnector_1 = class BrowserConnector {
    constructor() {
        this.supportedPack = interfaces_1.CapabilityPack.BROWSER;
        this.logger = new common_1.Logger(BrowserConnector_1.name);
        this.llm = new llm_helper_1.LLMHelper();
    }
    supports(capabilityId) {
        return BrowserConnector_1.BROWSER_CAPABILITIES.has(capabilityId);
    }
    async execute(capabilityId, input) {
        const startTime = Date.now();
        const capId = capabilityId;
        this.logger.log(`Browser connector executing: ${capId} for mission ${input.missionId}`);
        try {
            let result;
            switch (capId) {
                case interfaces_1.BrowserCapability.SCREENSHOT:
                    result = await this.executeScreenshot(input);
                    break;
                case interfaces_1.BrowserCapability.NAVIGATION:
                    result = await this.executeNavigation(input);
                    break;
                case interfaces_1.BrowserCapability.LOGIN:
                    result = await this.executeLogin(input);
                    break;
                case interfaces_1.BrowserCapability.SEARCH:
                    result = await this.executeSearch(input);
                    break;
                case interfaces_1.BrowserCapability.FORM:
                    result = await this.executeForm(input);
                    break;
                case interfaces_1.BrowserCapability.VISION:
                    result = await this.executeVision(input);
                    break;
                case interfaces_1.BrowserCapability.OCR:
                    result = await this.executeOCR(input);
                    break;
                case interfaces_1.BrowserCapability.DOWNLOAD:
                    result = await this.executeDownload(input);
                    break;
                case interfaces_1.BrowserCapability.UPLOAD:
                    result = await this.executeUpload(input);
                    break;
                case interfaces_1.BrowserCapability.SESSION:
                    result = await this.executeSession(input);
                    break;
                case interfaces_1.BrowserCapability.COOKIE:
                    result = await this.executeCookie(input);
                    break;
                case interfaces_1.BrowserCapability.POPUP:
                    result = await this.executePopup(input);
                    break;
                default:
                    result = await this.executeGenericBrowser(capId, input);
            }
            result.durationMs = Date.now() - startTime;
            return result;
        }
        catch (error) {
            this.logger.error(`Browser connector failed for ${capId}: ${error.message}`);
            return {
                success: false,
                artifacts: [],
                output: { error: error.message },
                costUsd: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async executeScreenshot(input) {
        const url = input.parameters.url || input.parameters.target;
        if (!url) {
            return {
                success: false,
                artifacts: [],
                output: { error: 'No URL provided for screenshot' },
                costUsd: 0,
                durationMs: 0,
                error: 'Missing url parameter',
            };
        }
        const screenshotDir = path.join(input.workspaceDir, 'screenshots');
        fs.mkdirSync(screenshotDir, { recursive: true });
        const screenshotPath = path.join(screenshotDir, `screenshot-${Date.now()}.png`);
        try {
            const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            await page.screenshot({ path: screenshotPath, fullPage: true });
            await browser.close();
            const stats = fs.statSync(screenshotPath);
            this.logger.log(`Screenshot saved: ${screenshotPath} (${stats.size} bytes)`);
            return {
                success: true,
                artifacts: [this.makeArtifact(path.basename(screenshotPath), 'screenshot', screenshotPath, stats.size)],
                output: { url, screenshotPath, sizeBytes: stats.size },
                costUsd: 0.01,
                durationMs: 0,
            };
        }
        catch (error) {
            this.logger.warn(`Playwright screenshot failed: ${error.message}`);
            const reportPath = path.join(input.workspaceDir, 'docs', 'browser-report.md');
            const report = `# Browser Screenshot Report\n\nURL: ${url}\nStatus: FAILED\nError: ${error.message}\n\nNote: Playwright may not be installed. Run: npx playwright install chromium\n`;
            fs.mkdirSync(path.dirname(reportPath), { recursive: true });
            fs.writeFileSync(reportPath, report, 'utf-8');
            return {
                success: false,
                artifacts: [this.makeArtifact('browser-report.md', 'report', reportPath, report)],
                output: { url, error: error.message },
                costUsd: 0,
                durationMs: 0,
                error: error.message,
            };
        }
    }
    async executeNavigation(input) {
        const url = input.parameters.url || input.parameters.target;
        if (!url) {
            return this.missingParamResult('url', 'navigation');
        }
        try {
            const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            const title = await page.title();
            const content = await page.content();
            const contentDir = path.join(input.workspaceDir, 'browser-data');
            fs.mkdirSync(contentDir, { recursive: true });
            const htmlPath = path.join(contentDir, 'page.html');
            fs.writeFileSync(htmlPath, content, 'utf-8');
            const textContent = await page.evaluate(() => document.body?.innerText || '');
            const textPath = path.join(contentDir, 'page-text.txt');
            fs.writeFileSync(textPath, textContent, 'utf-8');
            await browser.close();
            return {
                success: true,
                artifacts: [
                    this.makeArtifact('page.html', 'source', htmlPath, content),
                    this.makeArtifact('page-text.txt', 'document', textPath, textContent),
                ],
                output: { url, title, textLength: textContent.length },
                costUsd: 0.01,
                durationMs: 0,
            };
        }
        catch (error) {
            return this.playwrightFallback(input, 'navigation', url, error);
        }
    }
    async executeLogin(input) {
        const url = input.parameters.url || input.parameters.loginUrl;
        const username = input.parameters.username || input.parameters.email;
        const password = input.parameters.password;
        if (!url || !username || !password) {
            return this.missingParamResult('url, username, password', 'login');
        }
        try {
            const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            const usernameSelectors = ['input[type="email"]', 'input[name="username"]', 'input[name="email"]', 'input[id="username"]', 'input[id="email"]'];
            const passwordSelectors = ['input[type="password"]', 'input[name="password"]', 'input[id="password"]'];
            let filledUsername = false;
            for (const selector of usernameSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        await element.fill(username);
                        filledUsername = true;
                        break;
                    }
                }
                catch { }
            }
            let filledPassword = false;
            for (const selector of passwordSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        await element.fill(password);
                        filledPassword = true;
                        break;
                    }
                }
                catch { }
            }
            if (filledUsername && filledPassword) {
                await page.keyboard.press('Enter');
                await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
            }
            const resultTitle = await page.title();
            const resultUrl = page.url();
            const screenshotDir = path.join(input.workspaceDir, 'screenshots');
            fs.mkdirSync(screenshotDir, { recursive: true });
            const screenshotPath = path.join(screenshotDir, 'post-login.png');
            await page.screenshot({ path: screenshotPath }).catch(() => { });
            await browser.close();
            return {
                success: filledUsername && filledPassword,
                artifacts: [this.makeArtifact('post-login.png', 'screenshot', screenshotPath, fs.existsSync(screenshotPath) ? fs.statSync(screenshotPath).size : 0)],
                output: { url, resultUrl, resultTitle, usernameFilled: filledUsername, passwordFilled: filledPassword },
                costUsd: 0.02,
                durationMs: 0,
            };
        }
        catch (error) {
            return this.playwrightFallback(input, 'login', url, error);
        }
    }
    async executeSearch(input) {
        const query = input.parameters.query || input.parameters.searchQuery;
        const engine = input.parameters.engine || 'google';
        if (!query) {
            return this.missingParamResult('query', 'search');
        }
        const searchUrls = {
            google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
        };
        const url = searchUrls[engine.toLowerCase()] || searchUrls.google;
        try {
            const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            const results = await page.evaluate(() => {
                const items = [];
                document.querySelectorAll('h3').forEach((h3, i) => {
                    if (i < 10) {
                        const link = h3.closest('a');
                        items.push({
                            title: h3.textContent || '',
                            url: link?.href || '',
                        });
                    }
                });
                return items;
            });
            const dataDir = path.join(input.workspaceDir, 'browser-data');
            fs.mkdirSync(dataDir, { recursive: true });
            const resultsPath = path.join(dataDir, 'search-results.json');
            fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf-8');
            const screenshotDir = path.join(input.workspaceDir, 'screenshots');
            fs.mkdirSync(screenshotDir, { recursive: true });
            const screenshotPath = path.join(screenshotDir, 'search-results.png');
            await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => { });
            await browser.close();
            return {
                success: results.length > 0,
                artifacts: [
                    this.makeArtifact('search-results.json', 'source', resultsPath, JSON.stringify(results)),
                    this.makeArtifact('search-results.png', 'screenshot', screenshotPath, fs.existsSync(screenshotPath) ? fs.statSync(screenshotPath).size : 0),
                ],
                output: { query, engine, resultCount: results.length, results: results.slice(0, 5) },
                costUsd: 0.02,
                durationMs: 0,
            };
        }
        catch (error) {
            return this.playwrightFallback(input, 'search', url, error);
        }
    }
    async executeForm(input) {
        const url = input.parameters.url;
        const fields = input.parameters.fields || {};
        if (!url) {
            return this.missingParamResult('url', 'form');
        }
        try {
            const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            const filledFields = [];
            for (const [selector, value] of Object.entries(fields)) {
                try {
                    await page.fill(selector, value);
                    filledFields.push(selector);
                }
                catch {
                    try {
                        await page.fill(`[name="${selector}"]`, value);
                        filledFields.push(`[name="${selector}"]`);
                    }
                    catch { }
                }
            }
            if (input.parameters.submit !== false) {
                await page.keyboard.press('Enter');
                await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
            }
            const resultUrl = page.url();
            await browser.close();
            return {
                success: filledFields.length > 0,
                artifacts: [],
                output: { url, resultUrl, filledFields, totalFields: Object.keys(fields).length },
                costUsd: 0.01,
                durationMs: 0,
            };
        }
        catch (error) {
            return this.playwrightFallback(input, 'form', url, error);
        }
    }
    async executeVision(input) {
        const url = input.parameters.url || input.parameters.target;
        if (!url) {
            return this.missingParamResult('url', 'vision');
        }
        const screenshotResult = await this.executeScreenshot(input);
        if (!screenshotResult.success) {
            return screenshotResult;
        }
        try {
            const llmResult = await this.llm.call({
                systemPrompt: 'You are a visual UI/UX analyst. Describe what you see in a webpage screenshot and provide insights.',
                userPrompt: `Analyze this webpage screenshot from ${url}. The mission is: "${input.instruction}". Describe the layout, identify any UI issues, and suggest improvements.`,
                maxTokens: 2048,
            });
            const analysisPath = path.join(input.workspaceDir, 'browser-data', 'visual-analysis.md');
            fs.mkdirSync(path.dirname(analysisPath), { recursive: true });
            fs.writeFileSync(analysisPath, llmResult.content, 'utf-8');
            return {
                success: true,
                artifacts: [
                    ...screenshotResult.artifacts,
                    this.makeArtifact('visual-analysis.md', 'document', analysisPath, llmResult.content),
                ],
                output: { url, analysis: llmResult.content.substring(0, 1000) },
                costUsd: screenshotResult.costUsd + llmResult.costUsd,
                durationMs: 0,
            };
        }
        catch (error) {
            return {
                ...screenshotResult,
                output: { ...screenshotResult.output, visionError: error.message },
            };
        }
    }
    async executeOCR(input) {
        const url = input.parameters.url || input.parameters.target;
        if (!url) {
            return this.missingParamResult('url', 'ocr');
        }
        const navResult = await this.executeNavigation(input);
        if (navResult.success && navResult.output?.textLength > 0) {
            return {
                success: true,
                artifacts: navResult.artifacts,
                output: {
                    url,
                    extractedText: navResult.output.textContent?.substring(0, 2000),
                    method: 'DOM extraction (more reliable than OCR for web)',
                },
                costUsd: navResult.costUsd,
                durationMs: 0,
            };
        }
        return navResult;
    }
    async executeDownload(input) {
        const url = input.parameters.url;
        const outputPath = input.parameters.outputPath;
        if (!url) {
            return this.missingParamResult('url', 'download');
        }
        try {
            const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            const downloadDir = path.join(input.workspaceDir, 'downloads');
            fs.mkdirSync(downloadDir, { recursive: true });
            const download = await page.waitForEvent('download', { timeout: 30000 });
            const fileName = outputPath || download.suggestedFilename() || `download-${Date.now()}`;
            const savePath = path.join(downloadDir, fileName);
            await download.saveAs(savePath);
            await browser.close();
            const stats = fs.statSync(savePath);
            return {
                success: true,
                artifacts: [this.makeArtifact(fileName, 'source', savePath, stats.size)],
                output: { url, savedTo: savePath, sizeBytes: stats.size },
                costUsd: 0.01,
                durationMs: 0,
            };
        }
        catch (error) {
            return this.playwrightFallback(input, 'download', url, error);
        }
    }
    async executeUpload(input) {
        const url = input.parameters.url;
        const filePath = input.parameters.filePath;
        const selector = input.parameters.selector || 'input[type="file"]';
        if (!url || !filePath) {
            return this.missingParamResult('url, filePath', 'upload');
        }
        try {
            const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            await page.setInputFiles(selector, filePath);
            if (input.parameters.autoSubmit !== true) {
                await page.keyboard.press('Enter').catch(() => { });
            }
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
            await browser.close();
            return {
                success: true,
                artifacts: [],
                output: { url, uploadedFile: filePath },
                costUsd: 0.01,
                durationMs: 0,
            };
        }
        catch (error) {
            return this.playwrightFallback(input, 'upload', url, error);
        }
    }
    async executeSession(input) {
        const url = input.parameters.url;
        if (!url) {
            return this.missingParamResult('url', 'session');
        }
        try {
            const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await chromium.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            const stateDir = path.join(input.workspaceDir, 'browser-data');
            fs.mkdirSync(stateDir, { recursive: true });
            const statePath = path.join(stateDir, 'session-state.json');
            await context.storageState({ path: statePath });
            await browser.close();
            const stateContent = fs.readFileSync(statePath, 'utf-8');
            return {
                success: true,
                artifacts: [this.makeArtifact('session-state.json', 'config', statePath, stateContent)],
                output: { url, statePath },
                costUsd: 0.01,
                durationMs: 0,
            };
        }
        catch (error) {
            return this.playwrightFallback(input, 'session', url, error);
        }
    }
    async executeCookie(input) {
        const url = input.parameters.url;
        if (!url) {
            return this.missingParamResult('url', 'cookie');
        }
        try {
            const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await chromium.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            if (input.parameters.cookies) {
                await context.addCookies(input.parameters.cookies);
            }
            const cookies = await context.cookies();
            await browser.close();
            const dataDir = path.join(input.workspaceDir, 'browser-data');
            fs.mkdirSync(dataDir, { recursive: true });
            const cookiesPath = path.join(dataDir, 'cookies.json');
            fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2), 'utf-8');
            return {
                success: true,
                artifacts: [this.makeArtifact('cookies.json', 'config', cookiesPath, JSON.stringify(cookies))],
                output: { url, cookieCount: cookies.length },
                costUsd: 0.01,
                durationMs: 0,
            };
        }
        catch (error) {
            return this.playwrightFallback(input, 'cookie', url, error);
        }
    }
    async executePopup(input) {
        const url = input.parameters.url;
        if (!url) {
            return this.missingParamResult('url', 'popup');
        }
        try {
            const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
            if (input.parameters.triggerSelector) {
                await page.click(input.parameters.triggerSelector).catch(() => { });
            }
            const popup = await popupPromise;
            let popupUrl = '';
            let popupTitle = '';
            if (popup) {
                popupUrl = popup.url();
                popupTitle = await popup.title();
            }
            await browser.close();
            return {
                success: true,
                artifacts: [],
                output: { url, popupUrl, popupTitle, popupDetected: !!popup },
                costUsd: 0.01,
                durationMs: 0,
            };
        }
        catch (error) {
            return this.playwrightFallback(input, 'popup', url, error);
        }
    }
    async executeGenericBrowser(capId, input) {
        const url = input.parameters.url;
        if (url) {
            return this.executeScreenshot(input);
        }
        return {
            success: false,
            artifacts: [],
            output: { message: `Browser capability ${capId} requires a url parameter` },
            costUsd: 0,
            durationMs: 0,
            error: `Missing url parameter for ${capId}`,
        };
    }
    makeArtifact(name, type, fullPath, contentOrSize) {
        const isString = typeof contentOrSize === 'string';
        return {
            name,
            type,
            path: fullPath,
            size: isString ? Buffer.byteLength(contentOrSize) : contentOrSize,
            content: isString ? contentOrSize.substring(0, 500) : undefined,
        };
    }
    missingParamResult(params, action) {
        return {
            success: false,
            artifacts: [],
            output: { error: `Missing required parameters: ${params}` },
            costUsd: 0,
            durationMs: 0,
            error: `Missing required parameters: ${params} for ${action}`,
        };
    }
    playwrightFallback(input, action, url, error) {
        this.logger.warn(`Playwright ${action} failed for ${url}: ${error.message}`);
        const reportPath = path.join(input.workspaceDir, 'docs', `browser-${action}-report.md`);
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        const report = `# Browser ${action} Report\n\nURL: ${url}\nAction: ${action}\nStatus: FAILED\nError: ${error.message}\n\n## Troubleshooting\n1. Ensure Playwright is installed: \`npx playwright install chromium\`\n2. Check if the URL is accessible\n3. Verify network connectivity\n`;
        fs.writeFileSync(reportPath, report, 'utf-8');
        return {
            success: false,
            artifacts: [this.makeArtifact(`browser-${action}-report.md`, 'report', reportPath, report)],
            output: { url, action, error: error.message },
            costUsd: 0,
            durationMs: 0,
            error: error.message,
        };
    }
};
exports.BrowserConnector = BrowserConnector;
BrowserConnector.BROWSER_CAPABILITIES = new Set(Object.values(interfaces_1.BrowserCapability));
exports.BrowserConnector = BrowserConnector = BrowserConnector_1 = __decorate([
    (0, common_1.Injectable)()
], BrowserConnector);
//# sourceMappingURL=browser-connector.js.map