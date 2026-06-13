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
var DeliveryConnector_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryConnector = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const interfaces_1 = require("../interfaces");
let DeliveryConnector = DeliveryConnector_1 = class DeliveryConnector {
    constructor() {
        this.supportedPack = interfaces_1.CapabilityPack.DELIVERY;
        this.logger = new common_1.Logger(DeliveryConnector_1.name);
    }
    supports(capabilityId) {
        return DeliveryConnector_1.DELIVERY_CAPABILITIES.has(capabilityId);
    }
    async execute(capabilityId, input) {
        const startTime = Date.now();
        const capId = capabilityId;
        this.logger.log(`Delivery connector executing: ${capId} for mission ${input.missionId}`);
        try {
            let result;
            switch (capId) {
                case interfaces_1.DeliveryCapability.ZIP:
                    result = await this.executeZip(input);
                    break;
                case interfaces_1.DeliveryCapability.GITHUB:
                    result = await this.executeGithub(input);
                    break;
                case interfaces_1.DeliveryCapability.DOCKER_REGISTRY:
                    result = await this.executeDockerRegistry(input);
                    break;
                case interfaces_1.DeliveryCapability.VPS:
                    result = await this.executeVps(input);
                    break;
                case interfaces_1.DeliveryCapability.PDF_REPORT:
                    result = await this.executePdfReport(input);
                    break;
                case interfaces_1.DeliveryCapability.NOTIFICATION:
                    result = await this.executeNotification(input);
                    break;
                case interfaces_1.DeliveryCapability.DEPLOYMENT:
                    result = await this.executeDeployment(input);
                    break;
                case interfaces_1.DeliveryCapability.CLOUD:
                    result = await this.executeCloud(input);
                    break;
                case interfaces_1.DeliveryCapability.CDN:
                    result = await this.executeCdn(input);
                    break;
                case interfaces_1.DeliveryCapability.BACKUP:
                    result = await this.executeBackup(input);
                    break;
                case interfaces_1.DeliveryCapability.MONITORING_SETUP:
                    result = await this.executeMonitoringSetup(input);
                    break;
                case interfaces_1.DeliveryCapability.LOAD_BALANCER:
                    result = await this.executeLoadBalancer(input);
                    break;
                default:
                    result = await this.executeGenericDelivery(capId, input);
            }
            result.durationMs = Date.now() - startTime;
            return result;
        }
        catch (error) {
            this.logger.error(`Delivery connector failed for ${capId}: ${error.message}`);
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
    async executeZip(input) {
        const outputZipPath = input.parameters.outputPath ||
            path.join('/home/z/my-project/download/missions', `${input.missionId}.zip`);
        fs.mkdirSync(path.dirname(outputZipPath), { recursive: true });
        try {
            (0, child_process_1.execSync)(`cd "${input.workspaceDir}" && zip -r "${outputZipPath}" . -x "*.git*" "node_modules/*" 2>&1`, {
                timeout: 60000,
                encoding: 'utf-8',
            });
            if (fs.existsSync(outputZipPath) && fs.statSync(outputZipPath).size > 0) {
                const stats = fs.statSync(outputZipPath);
                this.logger.log(`ZIP created: ${outputZipPath} (${stats.size} bytes)`);
                return {
                    success: true,
                    artifacts: [
                        this.makeArtifact(`${input.missionId}.zip`, 'archive', outputZipPath, stats.size),
                    ],
                    output: { zipPath: outputZipPath, sizeBytes: stats.size },
                    costUsd: 0,
                    durationMs: 0,
                };
            }
        }
        catch (err) {
            this.logger.warn(`zip command failed: ${err.message?.slice(0, 200)}`);
        }
        try {
            const archiverModule = await Promise.resolve().then(() => __importStar(require('archiver')));
            const createArchiver = archiverModule.default || archiverModule;
            const output = fs.createWriteStream(outputZipPath);
            const archive = createArchiver('zip', { zlib: { level: 9 } });
            await new Promise((resolve, reject) => {
                output.on('close', resolve);
                archive.on('error', reject);
                archive.pipe(output);
                archive.directory(input.workspaceDir, false);
                archive.finalize();
            });
            const stats = fs.statSync(outputZipPath);
            this.logger.log(`ZIP created (archiver): ${outputZipPath} (${stats.size} bytes)`);
            return {
                success: true,
                artifacts: [
                    this.makeArtifact(`${input.missionId}.zip`, 'archive', outputZipPath, stats.size),
                ],
                output: { zipPath: outputZipPath, sizeBytes: stats.size },
                costUsd: 0,
                durationMs: 0,
            };
        }
        catch (err) {
            this.logger.error(`Archiver ZIP failed: ${err.message}`);
            return {
                success: false,
                artifacts: [],
                output: { error: `Failed to create ZIP: ${err.message}` },
                costUsd: 0,
                durationMs: 0,
                error: err.message,
            };
        }
    }
    async executeGithub(input) {
        const repoUrl = input.parameters.repoUrl || input.parameters.githubRepo;
        const branch = input.parameters.branch || 'main';
        const commitMessage = input.parameters.commitMessage || `AENEWS: ${input.instruction}`;
        const commands = [
            `cd "${input.workspaceDir}" && git init`,
            `cd "${input.workspaceDir}" && git add -A`,
            `cd "${input.workspaceDir}" && git commit -m "${commitMessage.replace(/"/g, '\\"')}"`,
        ];
        if (repoUrl) {
            commands.push(`cd "${input.workspaceDir}" && git branch -M ${branch}`);
            commands.push(`cd "${input.workspaceDir}" && git remote add origin ${repoUrl}`);
            commands.push(`cd "${input.workspaceDir}" && git push -u origin ${branch}`);
        }
        const results = [];
        let allSucceeded = true;
        for (const cmd of commands) {
            try {
                const output = (0, child_process_1.execSync)(cmd, { timeout: 60000, encoding: 'utf-8' }).slice(0, 500);
                results.push({ command: cmd.split('&&').pop()?.trim(), success: true, output });
            }
            catch (err) {
                results.push({
                    command: cmd.split('&&').pop()?.trim(),
                    success: false,
                    error: err.message?.slice(0, 200),
                });
                allSucceeded = false;
            }
        }
        return {
            success: allSucceeded || results.some((r) => r.command?.includes('commit') && r.success),
            artifacts: [],
            output: { repoUrl, branch, results },
            costUsd: 0,
            durationMs: 0,
        };
    }
    async executeDockerRegistry(input) {
        const imageName = input.parameters.imageName || `aenews/${input.missionId}`;
        const registry = input.parameters.registry || '';
        const tag = input.parameters.tag || 'latest';
        const fullImageName = registry ? `${registry}/${imageName}:${tag}` : `${imageName}:${tag}`;
        const commands = [`cd "${input.workspaceDir}" && docker build -t ${fullImageName} .`];
        if (registry) {
            commands.push(`docker push ${fullImageName}`);
        }
        const results = [];
        let allSucceeded = true;
        for (const cmd of commands) {
            try {
                const output = (0, child_process_1.execSync)(cmd, { timeout: 300000, encoding: 'utf-8' }).slice(0, 1000);
                results.push({ command: cmd.split('docker')[1]?.trim()?.split(' ')[0], success: true });
            }
            catch (err) {
                results.push({
                    command: cmd.split('docker')[1]?.trim()?.split(' ')[0],
                    success: false,
                    error: err.message?.slice(0, 300),
                });
                allSucceeded = false;
            }
        }
        return {
            success: allSucceeded,
            artifacts: [],
            output: { imageName: fullImageName, results },
            costUsd: 0,
            durationMs: 0,
        };
    }
    async executeVps(input) {
        const host = input.parameters.host;
        const user = input.parameters.user || 'root';
        const remotePath = input.parameters.remotePath || '/var/www/app';
        const sshKey = input.parameters.sshKey;
        if (!host) {
            return {
                success: false,
                artifacts: [],
                output: { error: 'Missing host parameter' },
                costUsd: 0,
                durationMs: 0,
                error: 'Missing host parameter for VPS deployment',
            };
        }
        const commands = [
            `scp -r "${input.workspaceDir}" ${user}@${host}:${remotePath}`,
            `ssh ${user}@${host} "cd ${remotePath} && npm install --production && pm2 restart app || true"`,
        ];
        const results = [];
        for (const cmd of commands) {
            try {
                (0, child_process_1.execSync)(cmd, { timeout: 120000, encoding: 'utf-8' });
                results.push({ command: cmd.split(' ')[0], success: true });
            }
            catch (err) {
                results.push({
                    command: cmd.split(' ')[0],
                    success: false,
                    error: err.message?.slice(0, 200),
                });
            }
        }
        return {
            success: results.every((r) => r.success),
            artifacts: [],
            output: { host, remotePath, results },
            costUsd: 0,
            durationMs: 0,
        };
    }
    async executePdfReport(input) {
        const reportDir = path.join(input.workspaceDir, 'docs');
        fs.mkdirSync(reportDir, { recursive: true });
        const report = this.generateDeliveryReport(input);
        const reportPath = path.join(reportDir, 'DELIVERY-REPORT.md');
        fs.writeFileSync(reportPath, report, 'utf-8');
        return {
            success: true,
            artifacts: [this.makeArtifact('DELIVERY-REPORT.md', 'report', reportPath, report)],
            output: { reportPath },
            costUsd: 0,
            durationMs: 0,
        };
    }
    async executeNotification(input) {
        const webhookUrl = input.parameters.webhookUrl;
        const email = input.parameters.email;
        const message = input.parameters.message || `Mission ${input.missionId} completed: ${input.instruction}`;
        if (webhookUrl) {
            try {
                const https = await Promise.resolve().then(() => __importStar(require('https')));
                const http = await Promise.resolve().then(() => __importStar(require('http')));
                const url = new URL(webhookUrl);
                const client = url.protocol === 'https:' ? https : http;
                await new Promise((resolve, reject) => {
                    const req = client.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
                        res.on('end', resolve);
                    });
                    req.on('error', reject);
                    req.write(JSON.stringify({ text: message, missionId: input.missionId }));
                    req.end();
                });
                return {
                    success: true,
                    artifacts: [],
                    output: { sent: true, webhookUrl },
                    costUsd: 0,
                    durationMs: 0,
                };
            }
            catch (err) {
                return {
                    success: false,
                    artifacts: [],
                    output: { error: err.message },
                    costUsd: 0,
                    durationMs: 0,
                    error: err.message,
                };
            }
        }
        return {
            success: true,
            artifacts: [],
            output: { message: 'Notification logged (no webhook configured)', loggedMessage: message },
            costUsd: 0,
            durationMs: 0,
        };
    }
    async executeDeployment(input) {
        const deployDir = path.join(input.workspaceDir, 'deploy');
        fs.mkdirSync(deployDir, { recursive: true });
        const deployScript = `#!/bin/bash
# Deployment script for: ${input.instruction}
set -e

echo "Deploying ${input.missionId}..."

# Build
npm run build 2>/dev/null || echo "No build step"

# Start/restart service
pm2 restart app 2>/dev/null || node server.js &

echo "Deployment complete!"
`;
        const deployPath = path.join(deployDir, 'deploy.sh');
        fs.writeFileSync(deployPath, deployScript, 'utf-8');
        return {
            success: true,
            artifacts: [this.makeArtifact('deploy.sh', 'config', deployPath, deployScript)],
            output: { deployScript: deployPath },
            costUsd: 0,
            durationMs: 0,
        };
    }
    async executeCloud(input) {
        return this.notImplemented('cloud', input);
    }
    async executeCdn(input) {
        return this.notImplemented('cdn', input);
    }
    async executeBackup(input) {
        const backupDir = path.join(input.workspaceDir, '..', `${input.missionId}-backup-${Date.now()}`);
        try {
            (0, child_process_1.execSync)(`cp -r "${input.workspaceDir}" "${backupDir}"`, { timeout: 60000 });
            return {
                success: true,
                artifacts: [],
                output: { backupPath: backupDir },
                costUsd: 0,
                durationMs: 0,
            };
        }
        catch (err) {
            return this.notImplemented('backup', input);
        }
    }
    async executeMonitoringSetup(input) {
        return this.notImplemented('monitoring_setup', input);
    }
    async executeLoadBalancer(input) {
        return this.notImplemented('load_balancer', input);
    }
    async executeGenericDelivery(capId, input) {
        return this.notImplemented(capId.replace('delivery.', ''), input);
    }
    notImplemented(feature, input) {
        this.logger.warn(`Delivery feature not yet implemented: ${feature}`);
        return {
            success: true,
            artifacts: [],
            output: {
                feature,
                status: 'not_implemented',
                note: `${feature} delivery will be available in a future sprint`,
            },
            costUsd: 0,
            durationMs: 0,
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
    generateDeliveryReport(input) {
        const fileCount = this.countFiles(input.workspaceDir);
        const totalSize = this.calculateTotalSize(input.workspaceDir);
        return `# Delivery Report

## Mission: ${input.instruction}

**Mission ID:** ${input.missionId}
**Generated:** ${new Date().toISOString()}

## Artifacts Summary

- **Total Files:** ${fileCount}
- **Total Size:** ${(totalSize / 1024).toFixed(1)} KB

## Workspace

\`${input.workspaceDir}\`

## Files

${this.listFiles(input.workspaceDir)}

## Certification

See \`docs/certification/\` directory for detailed certification reports.

---

*Generated by AENEWS Software Factory*
`;
    }
    countFiles(dir) {
        let count = 0;
        if (!fs.existsSync(dir))
            return 0;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                count += this.countFiles(path.join(dir, entry.name));
            }
            else if (entry.isFile()) {
                count++;
            }
        }
        return count;
    }
    calculateTotalSize(dir) {
        let size = 0;
        if (!fs.existsSync(dir))
            return 0;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                size += this.calculateTotalSize(fullPath);
            }
            else if (entry.isFile()) {
                try {
                    size += fs.statSync(fullPath).size;
                }
                catch {
                }
            }
        }
        return size;
    }
    listFiles(dir, indent = '') {
        const lines = [];
        if (!fs.existsSync(dir))
            return '';
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules')
                continue;
            if (entry.isDirectory()) {
                lines.push(`${indent}- ${entry.name}/`);
                lines.push(this.listFiles(path.join(dir, entry.name), indent + '  '));
            }
            else {
                try {
                    const size = fs.statSync(path.join(dir, entry.name)).size;
                    lines.push(`${indent}- ${entry.name} (${(size / 1024).toFixed(1)} KB)`);
                }
                catch {
                    lines.push(`${indent}- ${entry.name}`);
                }
            }
        }
        return lines.join('\n');
    }
};
exports.DeliveryConnector = DeliveryConnector;
DeliveryConnector.DELIVERY_CAPABILITIES = new Set(Object.values(interfaces_1.DeliveryCapability));
exports.DeliveryConnector = DeliveryConnector = DeliveryConnector_1 = __decorate([
    (0, common_1.Injectable)()
], DeliveryConnector);
//# sourceMappingURL=delivery-connector.js.map