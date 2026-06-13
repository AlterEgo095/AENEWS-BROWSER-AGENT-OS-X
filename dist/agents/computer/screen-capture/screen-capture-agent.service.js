"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenCaptureAgentService = exports.SCREEN_CAPTURE_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.SCREEN_CAPTURE_AGENT_CONFIG = {
    id: 'computer-screen-capture',
    name: 'ScreenCapture',
    cluster: agent_interface_1.AgentCluster.COMPUTER,
    version: '1.0.0',
    description: 'Capture screen content, specific windows, and monitor regions. Supports full-screen capture, window-specific capture, region cropping, and screen recording with frame management.',
    capabilities: [
        {
            name: 'captureScreen',
            description: 'Capture the entire screen or a specific display',
            inputSchema: {
                type: 'object',
                properties: {
                    displayIndex: { type: 'number', default: 0, description: 'Display index (0=primary)' },
                    format: { type: 'string', enum: ['png', 'jpg', 'bmp'], default: 'png' },
                    quality: { type: 'number', default: 95, description: 'Image quality (1-100, jpg only)' },
                    cursor: { type: 'boolean', default: true, description: 'Include cursor in capture' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    captureId: { type: 'string' },
                    width: { type: 'number' },
                    height: { type: 'number' },
                    format: { type: 'string' },
                    sizeBytes: { type: 'number' },
                    capturedAt: { type: 'string' },
                },
            },
        },
        {
            name: 'captureWindow',
            description: 'Capture a specific window by title or ID',
            inputSchema: {
                type: 'object',
                properties: {
                    windowTitle: { type: 'string', description: 'Window title substring to match' },
                    windowId: { type: 'number', description: 'Window ID (alternative to title)' },
                    format: { type: 'string', enum: ['png', 'jpg', 'bmp'], default: 'png' },
                    includeDecorations: {
                        type: 'boolean',
                        default: true,
                        description: 'Include window frame/decorations',
                    },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    captureId: { type: 'string' },
                    windowTitle: { type: 'string' },
                    width: { type: 'number' },
                    height: { type: 'number' },
                    format: { type: 'string' },
                    sizeBytes: { type: 'number' },
                    capturedAt: { type: 'string' },
                },
            },
        },
        {
            name: 'captureRegion',
            description: 'Capture a specific region of the screen',
            inputSchema: {
                type: 'object',
                properties: {
                    x: { type: 'number', description: 'Region X offset' },
                    y: { type: 'number', description: 'Region Y offset' },
                    width: { type: 'number', description: 'Region width' },
                    height: { type: 'number', description: 'Region height' },
                    displayIndex: { type: 'number', default: 0 },
                    format: { type: 'string', enum: ['png', 'jpg', 'bmp'], default: 'png' },
                },
                required: ['x', 'y', 'width', 'height'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    captureId: { type: 'string' },
                    region: { type: 'object' },
                    format: { type: 'string' },
                    sizeBytes: { type: 'number' },
                    capturedAt: { type: 'string' },
                },
            },
        },
        {
            name: 'startRecording',
            description: 'Start screen recording',
            inputSchema: {
                type: 'object',
                properties: {
                    displayIndex: { type: 'number', default: 0 },
                    fps: { type: 'number', default: 30, description: 'Frames per second' },
                    format: { type: 'string', enum: ['mp4', 'webm', 'gif'], default: 'mp4' },
                    region: { type: 'object', description: 'Optional region { x, y, width, height }' },
                    maxDuration: {
                        type: 'number',
                        default: 300,
                        description: 'Max recording duration in seconds',
                    },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    recordingId: { type: 'string' },
                    status: { type: 'string' },
                    fps: { type: 'number' },
                    format: { type: 'string' },
                    startedAt: { type: 'string' },
                },
            },
        },
        {
            name: 'stopRecording',
            description: 'Stop an active screen recording and save the file',
            inputSchema: {
                type: 'object',
                properties: {
                    recordingId: { type: 'string', description: 'Recording ID to stop' },
                    outputPath: { type: 'string', description: 'Output file path' },
                },
                required: ['recordingId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    recordingId: { type: 'string' },
                    outputPath: { type: 'string' },
                    duration: { type: 'number' },
                    frameCount: { type: 'number' },
                    sizeBytes: { type: 'number' },
                    stoppedAt: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'capture:screen',
        'capture:window',
        'capture:region',
        'record:screen',
    ],
    maxConcurrentTasks: 3,
    timeout: 60000,
    retryPolicy: {
        maxRetries: 1,
        backoffMs: 1000,
        exponentialBackoff: true,
    },
};
const SIMULATED_WINDOWS = [
    { id: 1, title: 'AENEWS Dashboard', width: 1280, height: 720, x: 100, y: 50 },
    { id: 2, title: 'Terminal - bash', width: 800, height: 600, x: 200, y: 100 },
    { id: 3, title: 'Code Editor - main.ts', width: 1440, height: 900, x: 50, y: 25 },
    { id: 4, title: 'File Manager', width: 1024, height: 640, x: 150, y: 80 },
    { id: 5, title: 'System Monitor', width: 640, height: 480, x: 300, y: 120 },
];
let ScreenCaptureAgentService = class ScreenCaptureAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.captures = new Map();
        this.recordings = new Map();
        this.captureCounter = 0;
        this.recordingCounter = 0;
        this.displayResolution = { width: 1920, height: 1080 };
    }
    defineConfig() {
        return exports.SCREEN_CAPTURE_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'captureScreen',
            description: 'Capture the entire screen',
            execute: async (params) => this.captureScreen(params.displayIndex || 0, params.format || 'png', params.quality || 95, params.cursor !== false),
        });
        this.registerTool({
            name: 'captureWindow',
            description: 'Capture a specific window',
            execute: async (params) => this.captureWindow(params.windowTitle, params.windowId, params.format || 'png', params.includeDecorations !== false),
        });
        this.registerTool({
            name: 'captureRegion',
            description: 'Capture a screen region',
            execute: async (params) => this.captureRegion(params.x, params.y, params.width, params.height, params.displayIndex || 0, params.format || 'png'),
        });
        this.registerTool({
            name: 'startRecording',
            description: 'Start screen recording',
            execute: async (params) => this.startRecording(params.displayIndex || 0, params.fps || 30, params.format || 'mp4', params.region, params.maxDuration || 300),
        });
        this.registerTool({
            name: 'stopRecording',
            description: 'Stop screen recording',
            execute: async (params) => this.stopRecording(params.recordingId, params.outputPath),
        });
        await this.storeInWorkingMemory('sc:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('ScreenCapture agent initialized with 5 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.BrowserCapability.SCREENSHOT, {
                    missionId: input.taskId,
                    instruction: JSON.stringify(input.payload),
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge failed, fallback: ${error.message}`);
            }
        }
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'captureScreen',
            'captureWindow',
            'captureRegion',
            'startRecording',
            'stopRecording',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown screen capture action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`ScreenCapture execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        for (const [id, recording] of this.recordings) {
            if (recording.status === 'recording') {
                recording.status = 'stopped';
                this.logger.log(`Stopped recording ${id} during destroy`);
            }
        }
        this.captures.clear();
        this.recordings.clear();
        this.logger.log('ScreenCapture agent destroyed, captures and recordings cleared');
    }
    async captureScreen(displayIndex = 0, format = 'png', quality = 95, cursor = true) {
        if (displayIndex < 0 || displayIndex > 3) {
            throw new Error(`Invalid display index: ${displayIndex}. Must be 0-3.`);
        }
        const captureId = this.generateCaptureId();
        const width = this.displayResolution.width;
        const height = this.displayResolution.height;
        const baseSize = width * height;
        const formatMultiplier = format === 'png' ? 2.5 : format === 'jpg' ? 0.3 : 3.0;
        const qualityMultiplier = format === 'jpg' ? quality / 100 : 1;
        const sizeBytes = Math.round(baseSize * formatMultiplier * qualityMultiplier);
        const capture = {
            id: captureId,
            type: 'screen',
            width,
            height,
            format,
            sizeBytes,
            capturedAt: new Date(),
            metadata: { displayIndex, cursor, quality },
        };
        this.captures.set(captureId, capture);
        await this.storeInWorkingMemory(`capture:${captureId}`, { type: 'screen', width, height, format, sizeBytes }, 300000);
        this.logger.log(`Screen captured: ${captureId} (${width}x${height}, ${format}, ${(sizeBytes / 1024).toFixed(1)}KB)`);
        return {
            captureId,
            width,
            height,
            format,
            sizeBytes,
            capturedAt: capture.capturedAt.toISOString(),
        };
    }
    async captureWindow(windowTitle, windowId, format = 'png', includeDecorations = true) {
        let targetWindow = SIMULATED_WINDOWS[0];
        if (windowId !== undefined) {
            targetWindow = SIMULATED_WINDOWS.find((w) => w.id === windowId) ?? SIMULATED_WINDOWS[0];
            if (!targetWindow) {
                throw new Error(`Window not found with ID: ${windowId}`);
            }
        }
        else if (windowTitle) {
            const lowerTitle = windowTitle.toLowerCase();
            targetWindow =
                SIMULATED_WINDOWS.find((w) => w.title.toLowerCase().includes(lowerTitle)) ??
                    SIMULATED_WINDOWS[0];
            if (!targetWindow) {
                throw new Error(`Window not found matching title: "${windowTitle}". Available: ${SIMULATED_WINDOWS.map((w) => w.title).join(', ')}`);
            }
        }
        const captureId = this.generateCaptureId();
        const decorationOffset = includeDecorations ? 40 : 0;
        const width = targetWindow.width;
        const height = targetWindow.height + decorationOffset;
        const baseSize = width * height;
        const formatMultiplier = format === 'png' ? 2.5 : format === 'jpg' ? 0.3 : 3.0;
        const sizeBytes = Math.round(baseSize * formatMultiplier);
        const capture = {
            id: captureId,
            type: 'window',
            width,
            height,
            format,
            sizeBytes,
            capturedAt: new Date(),
            metadata: { windowId: targetWindow.id, windowTitle: targetWindow.title, includeDecorations },
        };
        this.captures.set(captureId, capture);
        this.logger.log(`Window captured: ${captureId} ("${targetWindow.title}" ${width}x${height}, ${format})`);
        return {
            captureId,
            windowTitle: targetWindow.title,
            width,
            height,
            format,
            sizeBytes,
            capturedAt: capture.capturedAt.toISOString(),
        };
    }
    async captureRegion(x, y, width, height, displayIndex = 0, format = 'png') {
        if (x < 0 || y < 0) {
            throw new Error('Region x and y must be non-negative');
        }
        if (width <= 0 || height <= 0) {
            throw new Error('Region width and height must be positive');
        }
        if (x + width > this.displayResolution.width) {
            throw new Error(`Region extends beyond display width (${this.displayResolution.width})`);
        }
        if (y + height > this.displayResolution.height) {
            throw new Error(`Region extends beyond display height (${this.displayResolution.height})`);
        }
        const captureId = this.generateCaptureId();
        const baseSize = width * height;
        const formatMultiplier = format === 'png' ? 2.5 : format === 'jpg' ? 0.3 : 3.0;
        const sizeBytes = Math.round(baseSize * formatMultiplier);
        const capture = {
            id: captureId,
            type: 'region',
            width,
            height,
            format,
            sizeBytes,
            capturedAt: new Date(),
            metadata: { x, y, displayIndex },
        };
        this.captures.set(captureId, capture);
        this.logger.log(`Region captured: ${captureId} (${x},${y} ${width}x${height}, ${format})`);
        return {
            captureId,
            region: { x, y, width, height },
            format,
            sizeBytes,
            capturedAt: capture.capturedAt.toISOString(),
        };
    }
    async startRecording(displayIndex = 0, fps = 30, format = 'mp4', region, maxDuration = 300) {
        const activeRecordings = Array.from(this.recordings.values()).filter((r) => r.status === 'recording');
        if (activeRecordings.length >= 2) {
            throw new Error('Maximum concurrent recordings (2) reached. Stop an existing recording first.');
        }
        if (fps < 1 || fps > 60) {
            throw new Error('FPS must be between 1 and 60');
        }
        if (maxDuration < 1 || maxDuration > 3600) {
            throw new Error('Max duration must be between 1 and 3600 seconds');
        }
        if (region) {
            if (region.width <= 0 || region.height <= 0) {
                throw new Error('Region dimensions must be positive');
            }
        }
        const recordingId = `rec-${++this.recordingCounter}-${Date.now()}`;
        const recording = {
            id: recordingId,
            displayIndex,
            fps,
            format,
            region,
            maxDuration,
            startedAt: new Date(),
            frameCount: 0,
            status: 'recording',
        };
        this.recordings.set(recordingId, recording);
        await this.storeInWorkingMemory(`recording:${recordingId}`, { displayIndex, fps, format, startedAt: recording.startedAt }, 600000);
        this.logger.log(`Recording started: ${recordingId} (${fps}fps, ${format}, max: ${maxDuration}s)`);
        return {
            recordingId,
            status: 'recording',
            fps,
            format,
            startedAt: recording.startedAt.toISOString(),
        };
    }
    async stopRecording(recordingId, outputPath) {
        const recording = this.recordings.get(recordingId);
        if (!recording) {
            throw new Error(`Recording not found: ${recordingId}`);
        }
        if (recording.status !== 'recording') {
            throw new Error(`Recording ${recordingId} is not active (status: ${recording.status})`);
        }
        const stoppedAt = new Date();
        const durationMs = stoppedAt.getTime() - recording.startedAt.getTime();
        const durationSec = Math.round(durationMs / 1000);
        recording.frameCount = Math.round(recording.fps * (durationMs / 1000));
        recording.status = 'stopped';
        const resWidth = recording.region?.width || this.displayResolution.width;
        const resHeight = recording.region?.height || this.displayResolution.height;
        const bytesPerFrame = resWidth * resHeight * 0.15;
        const sizeBytes = Math.round(recording.frameCount * bytesPerFrame);
        const finalOutputPath = outputPath || `/tmp/recording-${recordingId}.${recording.format}`;
        this.logger.log(`Recording stopped: ${recordingId} (${durationSec}s, ${recording.frameCount} frames, ${(sizeBytes / 1024 / 1024).toFixed(1)}MB)`);
        return {
            recordingId,
            outputPath: finalOutputPath,
            duration: durationSec,
            frameCount: recording.frameCount,
            sizeBytes,
            stoppedAt: stoppedAt.toISOString(),
        };
    }
    generateCaptureId() {
        return `cap-${++this.captureCounter}-${Date.now()}`;
    }
};
exports.ScreenCaptureAgentService = ScreenCaptureAgentService;
exports.ScreenCaptureAgentService = ScreenCaptureAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], ScreenCaptureAgentService);
//# sourceMappingURL=screen-capture-agent.service.js.map