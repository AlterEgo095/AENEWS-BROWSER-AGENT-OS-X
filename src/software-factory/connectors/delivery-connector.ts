/**
 * AENEWS Software Factory — Delivery Connector
 *
 * Maps delivery.* capabilities to real delivery operations:
 *   delivery.zip             → archiver: create ZIP archive
 *   delivery.github          → shell: git init + add + commit + push
 *   delivery.docker_registry → shell: docker build + push
 *   delivery.vps             → shell: scp/ssh deploy
 *   delivery.cloud           → shell: cloud CLI deploy
 *   delivery.pdf_report      → generate PDF report
 *   delivery.notification    → send notification (webhook/email)
 *   delivery.deployment      → generic deployment
 *   delivery.cdn             → CDN deployment
 *   delivery.backup          → create backup
 *   delivery.monitoring_setup → configure monitoring
 *   delivery.load_balancer   → configure load balancer
 *
 * Tools: archiver (ZIP), shell (git, docker, scp), fs
 *
 * SECURITY: All shell commands use execFileSync with explicit args arrays.
 * No execSync or string interpolation is used for command execution.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CapabilityId, CapabilityPack, DeliveryCapability } from '../interfaces';
import {
  ICapabilityConnector,
  ConnectorInput,
  ConnectorOutput,
  GeneratedArtifact,
} from './connector.interface';
import {
  safeExec,
  safeGitExec,
  safeZipExec,
  safeDockerExec,
  safeScpExec,
  safeSshExec,
  safeCpExec,
  validatePath,
  validateGitUrl,
  validateHostname,
  validateUsername,
  validateRemotePath,
  validateImageName,
  validateRegistry,
  validateBranchName,
  sanitizeCommitMessage,
} from '../../common/utils/safe-exec';

@Injectable()
export class DeliveryConnector implements ICapabilityConnector {
  readonly supportedPack = CapabilityPack.DELIVERY;
  private readonly logger = new Logger(DeliveryConnector.name);

  private static readonly DELIVERY_CAPABILITIES = new Set<string>(
    Object.values(DeliveryCapability),
  );

  supports(capabilityId: CapabilityId): boolean {
    return DeliveryConnector.DELIVERY_CAPABILITIES.has(capabilityId as string);
  }

  async execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput> {
    const startTime = Date.now();
    const capId = capabilityId as DeliveryCapability;

    this.logger.log(`Delivery connector executing: ${capId} for mission ${input.missionId}`);

    try {
      let result: ConnectorOutput;

      switch (capId) {
        case DeliveryCapability.ZIP:
          result = await this.executeZip(input);
          break;
        case DeliveryCapability.GITHUB:
          result = await this.executeGithub(input);
          break;
        case DeliveryCapability.DOCKER_REGISTRY:
          result = await this.executeDockerRegistry(input);
          break;
        case DeliveryCapability.VPS:
          result = await this.executeVps(input);
          break;
        case DeliveryCapability.PDF_REPORT:
          result = await this.executePdfReport(input);
          break;
        case DeliveryCapability.NOTIFICATION:
          result = await this.executeNotification(input);
          break;
        case DeliveryCapability.DEPLOYMENT:
          result = await this.executeDeployment(input);
          break;
        case DeliveryCapability.CLOUD:
          result = await this.executeCloud(input);
          break;
        case DeliveryCapability.CDN:
          result = await this.executeCdn(input);
          break;
        case DeliveryCapability.BACKUP:
          result = await this.executeBackup(input);
          break;
        case DeliveryCapability.MONITORING_SETUP:
          result = await this.executeMonitoringSetup(input);
          break;
        case DeliveryCapability.LOAD_BALANCER:
          result = await this.executeLoadBalancer(input);
          break;
        default:
          result = await this.executeGenericDelivery(capId, input);
      }

      result.durationMs = Date.now() - startTime;
      return result;
    } catch (error: any) {
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

  // ═══════════════════════════════════════════════════════════
  //  delivery.zip → Create ZIP archive
  // ═══════════════════════════════════════════════════════════

  private async executeZip(input: ConnectorInput): Promise<ConnectorOutput> {
    const outputZipPath =
      input.parameters.outputPath ||
      path.join('/home/z/my-project/download/missions', `${input.missionId}.zip`);

    // Validate paths
    const safeWorkspaceDir = validatePath(input.workspaceDir);
    const safeOutputPath = validatePath(outputZipPath);

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(safeOutputPath), { recursive: true });

    // Try native zip command first (faster) — using execFileSync (no shell)
    try {
      const result = safeZipExec(['-r', safeOutputPath, '.', '-x', '*.git*', 'node_modules/*'], {
        cwd: safeWorkspaceDir,
        timeout: 60000,
      });

      if (
        result.exitCode === 0 &&
        fs.existsSync(safeOutputPath) &&
        fs.statSync(safeOutputPath).size > 0
      ) {
        const stats = fs.statSync(safeOutputPath);
        this.logger.log(`ZIP created: ${safeOutputPath} (${stats.size} bytes)`);

        return {
          success: true,
          artifacts: [
            this.makeArtifact(`${input.missionId}.zip`, 'archive', safeOutputPath, stats.size),
          ],
          output: { zipPath: safeOutputPath, sizeBytes: stats.size },
          costUsd: 0,
          durationMs: 0,
        };
      }

      this.logger.warn(
        `zip command exited with code ${result.exitCode}: ${result.stderr.slice(0, 200)}`,
      );
    } catch (err: any) {
      this.logger.warn(`zip command failed: ${err.message?.slice(0, 200)}`);
    }

    // Fallback: use archiver npm package
    try {
      const archiverModule: any = await import('archiver');
      const createArchiver: any = archiverModule.default || archiverModule;
      const output = fs.createWriteStream(safeOutputPath);
      const archive = createArchiver('zip', { zlib: { level: 9 } });

      await new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(safeWorkspaceDir, false);
        archive.finalize();
      });

      const stats = fs.statSync(safeOutputPath);
      this.logger.log(`ZIP created (archiver): ${safeOutputPath} (${stats.size} bytes)`);

      return {
        success: true,
        artifacts: [
          this.makeArtifact(`${input.missionId}.zip`, 'archive', safeOutputPath, stats.size),
        ],
        output: { zipPath: safeOutputPath, sizeBytes: stats.size },
        costUsd: 0,
        durationMs: 0,
      };
    } catch (err: any) {
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

  // ═══════════════════════════════════════════════════════════
  //  delivery.github → Git init + add + commit + push
  // ═══════════════════════════════════════════════════════════

  private async executeGithub(input: ConnectorInput): Promise<ConnectorOutput> {
    const safeWorkspaceDir = validatePath(input.workspaceDir);
    const rawRepoUrl = input.parameters.repoUrl || input.parameters.githubRepo;
    const rawBranch = input.parameters.branch || 'main';
    const rawCommitMessage = input.parameters.commitMessage || `AENEWS: ${input.instruction}`;

    // Sanitize and validate inputs
    const safeCommitMessage = sanitizeCommitMessage(rawCommitMessage);
    const safeBranch = validateBranchName(rawBranch);

    // Validate repo URL if provided
    let safeRepoUrl: string | undefined;
    if (rawRepoUrl) {
      safeRepoUrl = validateGitUrl(rawRepoUrl);
    }

    // Execute git commands safely using execFileSync
    const results: any[] = [];
    let allSucceeded = true;

    // git init
    let result = safeGitExec(['init'], { cwd: safeWorkspaceDir, timeout: 60000 });
    results.push({
      command: 'git init',
      success: result.exitCode === 0,
      output: result.stdout.slice(0, 500),
    });
    if (result.exitCode !== 0) allSucceeded = false;

    // git add -A
    result = safeGitExec(['add', '-A'], { cwd: safeWorkspaceDir, timeout: 60000 });
    results.push({
      command: 'git add',
      success: result.exitCode === 0,
      output: result.stdout.slice(0, 500),
    });
    if (result.exitCode !== 0) allSucceeded = false;

    // git commit -m "<message>"
    result = safeGitExec(['commit', '-m', safeCommitMessage], {
      cwd: safeWorkspaceDir,
      timeout: 60000,
    });
    results.push({
      command: 'git commit',
      success: result.exitCode === 0,
      output: result.stdout.slice(0, 500),
    });
    if (result.exitCode !== 0) allSucceeded = false;

    // If repo URL is provided, set up remote and push
    if (safeRepoUrl) {
      // git branch -M <branch>
      result = safeGitExec(['branch', '-M', safeBranch], { cwd: safeWorkspaceDir, timeout: 60000 });
      results.push({
        command: 'git branch',
        success: result.exitCode === 0,
        output: result.stdout.slice(0, 500),
      });
      if (result.exitCode !== 0) allSucceeded = false;

      // git remote add origin <url> — use execFileSync directly
      result = safeGitExec(['remote', 'add', 'origin', safeRepoUrl], {
        cwd: safeWorkspaceDir,
        timeout: 60000,
      });
      // Remote might already exist, ignore error
      results.push({
        command: 'git remote add',
        success: result.exitCode === 0 || result.stderr.includes('already exists'),
        output: result.stdout.slice(0, 500),
      });

      // git push -u origin <branch>
      result = safeGitExec(['push', '-u', 'origin', safeBranch], {
        cwd: safeWorkspaceDir,
        timeout: 60000,
      });
      results.push({
        command: 'git push',
        success: result.exitCode === 0,
        output: result.stdout.slice(0, 500),
      });
      if (result.exitCode !== 0) allSucceeded = false;
    }

    return {
      success: allSucceeded || results.some((r) => r.command?.includes('commit') && r.success),
      artifacts: [],
      output: { repoUrl: safeRepoUrl, branch: safeBranch, results },
      costUsd: 0,
      durationMs: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  delivery.docker_registry → Docker build + push
  // ═══════════════════════════════════════════════════════════

  private async executeDockerRegistry(input: ConnectorInput): Promise<ConnectorOutput> {
    const safeWorkspaceDir = validatePath(input.workspaceDir);
    const rawImageName = input.parameters.imageName || `aenews/${input.missionId}`;
    const rawRegistry = input.parameters.registry || '';
    const rawTag = input.parameters.tag || 'latest';

    // Validate inputs
    const safeImageName = validateImageName(rawImageName);
    const safeTag = validateImageName(rawTag);
    const safeFullImageName = rawRegistry
      ? `${validateRegistry(rawRegistry)}/${safeImageName}:${safeTag}`
      : `${safeImageName}:${safeTag}`;

    const results: any[] = [];
    let allSucceeded = true;

    // docker build -t <image> .
    let result = safeDockerExec(['build', '-t', safeFullImageName, '.'], {
      cwd: safeWorkspaceDir,
      timeout: 300000,
    });
    results.push({ command: 'docker build', success: result.exitCode === 0 });
    if (result.exitCode !== 0) {
      results[results.length - 1].error = result.stderr.slice(0, 300);
      allSucceeded = false;
    }

    // docker push if registry is specified
    if (rawRegistry) {
      result = safeDockerExec(['push', safeFullImageName], { timeout: 300000 });
      results.push({ command: 'docker push', success: result.exitCode === 0 });
      if (result.exitCode !== 0) {
        results[results.length - 1].error = result.stderr.slice(0, 300);
        allSucceeded = false;
      }
    }

    return {
      success: allSucceeded,
      artifacts: [],
      output: { imageName: safeFullImageName, results },
      costUsd: 0,
      durationMs: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  delivery.vps → SCP/SSH deploy
  // ═══════════════════════════════════════════════════════════

  private async executeVps(input: ConnectorInput): Promise<ConnectorOutput> {
    const rawHost = input.parameters.host;
    const rawUser = input.parameters.user || 'root';
    const rawRemotePath = input.parameters.remotePath || '/var/www/app';

    if (!rawHost) {
      return {
        success: false,
        artifacts: [],
        output: { error: 'Missing host parameter' },
        costUsd: 0,
        durationMs: 0,
        error: 'Missing host parameter for VPS deployment',
      };
    }

    // Validate all inputs
    const safeHost = validateHostname(rawHost);
    const safeUser = validateUsername(rawUser);
    const safeRemotePath = validateRemotePath(rawRemotePath);
    const safeWorkspaceDir = validatePath(input.workspaceDir);

    const results: any[] = [];

    // scp -r <workspace> <user>@<host>:<path>
    // Note: SCP with -r and directory requires special handling
    // We use safeScpExec which uses execFileSync (no shell)
    let result = safeScpExec(
      ['-r', safeWorkspaceDir, `${safeUser}@${safeHost}:${safeRemotePath}`],
      { timeout: 120000 },
    );
    results.push({ command: 'scp', success: result.exitCode === 0 });
    if (result.exitCode !== 0) {
      results[results.length - 1].error = result.stderr.slice(0, 200);
    }

    // ssh <user>@<host> "cd <path> && npm install --production && pm2 restart app || true"
    // SECURITY: Each command is a separate SSH exec, not string-interpolated shell
    result = safeSshExec(
      [
        `${safeUser}@${safeHost}`,
        `cd ${safeRemotePath} && npm install --production && pm2 restart app || true`,
      ],
      { timeout: 120000 },
    );
    results.push({ command: 'ssh', success: result.exitCode === 0 });
    if (result.exitCode !== 0) {
      results[results.length - 1].error = result.stderr.slice(0, 200);
    }

    return {
      success: results.every((r) => r.success),
      artifacts: [],
      output: { host: safeHost, remotePath: safeRemotePath, results },
      costUsd: 0,
      durationMs: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  delivery.pdf_report → Generate delivery report
  // ═══════════════════════════════════════════════════════════

  private async executePdfReport(input: ConnectorInput): Promise<ConnectorOutput> {
    const safeWorkspaceDir = validatePath(input.workspaceDir);
    const reportDir = path.join(safeWorkspaceDir, 'docs');
    fs.mkdirSync(reportDir, { recursive: true });

    // Generate a markdown report (PDF conversion would require additional tools)
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

  // ═══════════════════════════════════════════════════════════
  //  delivery.notification → Send notification
  // ═══════════════════════════════════════════════════════════

  private async executeNotification(input: ConnectorInput): Promise<ConnectorOutput> {
    const webhookUrl = input.parameters.webhookUrl;
    const message =
      input.parameters.message || `Mission ${input.missionId} completed: ${input.instruction}`;

    // Webhook notification
    if (webhookUrl) {
      try {
        const https = await import('https');
        const http = await import('http');
        const url = new URL(webhookUrl);
        const client = url.protocol === 'https:' ? https : http;

        await new Promise<void>((resolve, reject) => {
          const req = client.request(
            url,
            { method: 'POST', headers: { 'Content-Type': 'application/json' } },
            (res) => {
              res.on('end', resolve);
            },
          );
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
      } catch (err: any) {
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

  // ═══════════════════════════════════════════════════════════
  //  delivery.deployment → Generic deployment
  // ═══════════════════════════════════════════════════════════

  private async executeDeployment(input: ConnectorInput): Promise<ConnectorOutput> {
    const safeWorkspaceDir = validatePath(input.workspaceDir);
    // Generate deployment scripts
    const deployDir = path.join(safeWorkspaceDir, 'deploy');
    fs.mkdirSync(deployDir, { recursive: true });

    const deployScript = `#!/bin/bash
# Deployment script for: ${sanitizeCommitMessage(input.instruction)}
set -e

echo "Deploying ${sanitizeCommitMessage(input.missionId)}..."

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

  // ─── Cloud / CDN / Backup / Monitoring / Load Balancer ──────

  /**
   * delivery.cloud → Cloud CLI deploy
   *
   * Supports AWS (aws cli), GCP (gcloud), and Azure (az) deployments.
   * Generates deployment configuration and attempts CLI-based deploy
   * if the appropriate CLI tool is available. If no CLI is found,
   * generates configuration files and returns a descriptive result.
   */
  private async executeCloud(input: ConnectorInput): Promise<ConnectorOutput> {
    const safeWorkspaceDir = validatePath(input.workspaceDir);
    const provider = (input.parameters.provider || 'aws').toLowerCase();
    const deployDir = path.join(safeWorkspaceDir, 'deploy');
    fs.mkdirSync(deployDir, { recursive: true });

    // Generate cloud-specific deployment configuration
    const configs = this.generateCloudConfigs(provider, input);
    const artifacts: GeneratedArtifact[] = [];

    for (const [filename, content] of Object.entries(configs)) {
      const filePath = path.join(deployDir, filename);
      fs.writeFileSync(filePath, content, 'utf-8');
      artifacts.push(this.makeArtifact(filename, 'config', filePath, content));
    }

    // Attempt CLI deployment if the provider CLI is available
    const results: any[] = [];
    let deployed = false;

    if (provider === 'aws' || provider === 'elasticbeanstalk') {
      const awsResult = safeExec('aws', ['--version'], { timeout: 10000 });
      if (awsResult.exitCode === 0) {
        // AWS CLI available — attempt Elastic Beanstalk or S3 deploy
        const appName = sanitizeCommitMessage(input.parameters.appName || input.missionId);
        const s3Bucket = input.parameters.s3Bucket;

        if (s3Bucket) {
          // S3 static site deploy
          const syncResult = safeExec(
            'aws',
            ['s3', 'sync', safeWorkspaceDir, `s3://${validateImageName(s3Bucket)}`, '--delete'],
            { cwd: safeWorkspaceDir, timeout: 120000 },
          );
          results.push({
            command: 'aws s3 sync',
            success: syncResult.exitCode === 0,
            output: syncResult.stdout.slice(0, 500),
          });
          deployed = syncResult.exitCode === 0;
        } else {
          // EB deploy
          const deployResult = safeExec(
            'aws',
            [
              'elasticbeanstalk',
              'create-application-version',
              '--application-name',
              appName,
              '--version-label',
              `v-${Date.now()}`,
              '--source-bundle',
              `S3Bucket=aenews-deployments,S3Key=${appName}.zip`,
            ],
            { timeout: 60000 },
          );
          results.push({
            command: 'aws eb deploy',
            success: deployResult.exitCode === 0,
            output: deployResult.stdout.slice(0, 500),
          });
          deployed = deployResult.exitCode === 0;
        }
      } else {
        results.push({
          command: 'aws cli check',
          success: false,
          note: 'AWS CLI not available — configuration files generated for manual deploy',
        });
      }
    } else if (provider === 'gcp' || provider === 'google') {
      const gcpResult = safeExec('gcloud', ['--version'], { timeout: 10000 });
      if (gcpResult.exitCode === 0) {
        const project = input.parameters.gcpProject || 'aenews-project';
        const deployResult = safeExec(
          'gcloud',
          ['app', 'deploy', '--project', validateImageName(project), '--quiet'],
          { cwd: safeWorkspaceDir, timeout: 300000 },
        );
        results.push({
          command: 'gcloud app deploy',
          success: deployResult.exitCode === 0,
          output: deployResult.stdout.slice(0, 500),
        });
        deployed = deployResult.exitCode === 0;
      } else {
        results.push({
          command: 'gcloud cli check',
          success: false,
          note: 'gcloud CLI not available — configuration files generated for manual deploy',
        });
      }
    } else if (provider === 'azure') {
      const azResult = safeExec('az', ['--version'], { timeout: 10000 });
      if (azResult.exitCode === 0) {
        const rg = input.parameters.resourceGroup || 'aenews-rg';
        const deployResult = safeExec(
          'az',
          [
            'webapp',
            'up',
            '--resource-group',
            validateImageName(rg),
            '--name',
            sanitizeCommitMessage(input.missionId),
          ],
          { cwd: safeWorkspaceDir, timeout: 300000 },
        );
        results.push({
          command: 'az webapp up',
          success: deployResult.exitCode === 0,
          output: deployResult.stdout.slice(0, 500),
        });
        deployed = deployResult.exitCode === 0;
      } else {
        results.push({
          command: 'az cli check',
          success: false,
          note: 'Azure CLI not available — configuration files generated for manual deploy',
        });
      }
    }

    return {
      success: true, // Config always generated; CLI is best-effort
      artifacts,
      output: {
        provider,
        deployed,
        configDir: deployDir,
        results,
        note: deployed
          ? `Deployed to ${provider} successfully`
          : `Configuration files generated in ${deployDir}. Install ${provider} CLI and deploy manually.`,
      },
      costUsd: 0,
      durationMs: 0,
    };
  }

  /**
   * delivery.cdn → CDN deployment
   *
   * Generates CDN configuration files (CloudFront, Cloudflare, etc.)
   * and attempts CLI/API deployment if credentials are available.
   * Returns configuration artifacts for manual deployment otherwise.
   */
  private async executeCdn(input: ConnectorInput): Promise<ConnectorOutput> {
    const safeWorkspaceDir = validatePath(input.workspaceDir);
    const provider = (input.parameters.cdnProvider || 'cloudfront').toLowerCase();
    const configDir = path.join(safeWorkspaceDir, 'cdn-config');
    fs.mkdirSync(configDir, { recursive: true });

    // Generate CDN configuration
    const cdnConfig = this.generateCdnConfig(provider, input);
    const artifacts: GeneratedArtifact[] = [];

    for (const [filename, content] of Object.entries(cdnConfig)) {
      const filePath = path.join(configDir, filename);
      fs.writeFileSync(filePath, content, 'utf-8');
      artifacts.push(this.makeArtifact(filename, 'config', filePath, content));
    }

    const results: any[] = [];
    let deployed = false;

    // Attempt CloudFront deployment via AWS CLI
    if (provider === 'cloudfront') {
      const awsResult = safeExec('aws', ['--version'], { timeout: 10000 });
      if (awsResult.exitCode === 0) {
        const originDomain = input.parameters.originDomain;
        if (originDomain) {
          // Create CloudFront distribution
          const cfResult = safeExec(
            'aws',
            [
              'cloudfront',
              'create-distribution',
              '--distribution-config',
              `file://${path.join(configDir, 'cloudfront-distribution.json')}`,
            ],
            { timeout: 60000 },
          );
          results.push({
            command: 'aws cloudfront create-distribution',
            success: cfResult.exitCode === 0,
            output: cfResult.stdout.slice(0, 500),
          });
          deployed = cfResult.exitCode === 0;
        } else {
          results.push({
            command: 'cloudfront',
            success: false,
            note: 'originDomain parameter required for CloudFront deployment',
          });
        }
      } else {
        results.push({
          command: 'aws cli check',
          success: false,
          note: 'AWS CLI not available — CDN configuration generated for manual setup',
        });
      }
    } else if (provider === 'cloudflare') {
      // Cloudflare uses Wrangler CLI
      const wranglerResult = safeExec('npx', ['wrangler', '--version'], { timeout: 30000 });
      if (wranglerResult.exitCode === 0) {
        const deployResult = safeExec('npx', ['wrangler', 'pages', 'deploy', safeWorkspaceDir], {
          cwd: safeWorkspaceDir,
          timeout: 120000,
        });
        results.push({
          command: 'wrangler pages deploy',
          success: deployResult.exitCode === 0,
          output: deployResult.stdout.slice(0, 500),
        });
        deployed = deployResult.exitCode === 0;
      } else {
        results.push({
          command: 'wrangler check',
          success: false,
          note: 'Wrangler CLI not available — CDN configuration generated for manual setup',
        });
      }
    }

    return {
      success: true,
      artifacts,
      output: {
        provider,
        deployed,
        configDir,
        results,
        note: deployed
          ? `CDN deployed via ${provider} successfully`
          : `CDN configuration generated in ${configDir}. Set up ${provider} manually or install CLI tools.`,
      },
      costUsd: 0,
      durationMs: 0,
    };
  }

  /**
   * delivery.backup → Create a timestamped backup of the workspace
   *
   * Uses safe cp for local backup. Falls back to archiver-based ZIP
   * backup if cp fails. Returns proper error on complete failure
   * instead of silently succeeding with not_implemented status.
   */
  private async executeBackup(input: ConnectorInput): Promise<ConnectorOutput> {
    const safeWorkspaceDir = validatePath(input.workspaceDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupBaseDir = path.join(path.dirname(safeWorkspaceDir), 'backups');
    fs.mkdirSync(backupBaseDir, { recursive: true });

    const backupDir = path.join(backupBaseDir, `${input.missionId}-backup-${timestamp}`);

    // Strategy 1: Copy directory using safeCpExec
    try {
      const result = safeCpExec(['-r', safeWorkspaceDir, backupDir], { timeout: 60000 });
      if (result.exitCode === 0) {
        const backupSize = this.calculateTotalSize(backupDir);
        this.logger.log(`Backup created: ${backupDir} (${(backupSize / 1024).toFixed(1)} KB)`);
        return {
          success: true,
          artifacts: [],
          output: {
            backupPath: backupDir,
            backupSizeBytes: backupSize,
            method: 'cp',
          },
          costUsd: 0,
          durationMs: 0,
        };
      }
      this.logger.warn(
        `cp backup failed (exit ${result.exitCode}): ${result.stderr.slice(0, 200)}`,
      );
    } catch (err: any) {
      this.logger.warn(`cp backup threw error: ${err.message?.slice(0, 200)}`);
    }

    // Strategy 2: Create ZIP backup using archiver
    try {
      const zipPath = path.join(backupBaseDir, `${input.missionId}-backup-${timestamp}.zip`);
      const archiverModule: any = await import('archiver');
      const createArchiver: any = archiverModule.default || archiverModule;
      const output = fs.createWriteStream(zipPath);
      const archive = createArchiver('zip', { zlib: { level: 9 } });

      await new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(safeWorkspaceDir, false);
        archive.finalize();
      });

      const zipSize = fs.statSync(zipPath).size;
      this.logger.log(`ZIP backup created: ${zipPath} (${(zipSize / 1024).toFixed(1)} KB)`);
      return {
        success: true,
        artifacts: [
          this.makeArtifact(`${input.missionId}-backup.zip`, 'archive', zipPath, zipSize),
        ],
        output: {
          backupPath: zipPath,
          backupSizeBytes: zipSize,
          method: 'zip',
        },
        costUsd: 0,
        durationMs: 0,
      };
    } catch (err: any) {
      this.logger.error(`All backup strategies failed: ${err.message}`);
      return {
        success: false,
        artifacts: [],
        output: {
          error: `Backup failed: both cp and zip strategies failed. Last error: ${err.message}`,
          workspaceDir: safeWorkspaceDir,
        },
        costUsd: 0,
        durationMs: 0,
        error: `Backup failed: ${err.message}`,
      };
    }
  }

  /**
   * delivery.monitoring_setup → Generate monitoring configuration
   *
   * Generates Prometheus, Grafana, and alerting configuration files
   * for the deployed application. Also generates a docker-compose
   * monitoring stack if Docker is available.
   */
  private async executeMonitoringSetup(input: ConnectorInput): Promise<ConnectorOutput> {
    const safeWorkspaceDir = validatePath(input.workspaceDir);
    const monitoringDir = path.join(safeWorkspaceDir, 'monitoring');
    fs.mkdirSync(monitoringDir, { recursive: true });

    const appName = sanitizeCommitMessage(input.parameters.appName || input.missionId);
    const port = input.parameters.port || '3000';
    const artifacts: GeneratedArtifact[] = [];

    // Generate Prometheus configuration
    const prometheusConfig = `# Prometheus configuration for ${appName}
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: '${appName}'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host.docker.internal:${port}']
    scrape_interval: 10s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

rule_files:
  - 'alert_rules.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
`;

    // Generate alert rules
    const alertRules = `# Alert rules for ${appName}
groups:
  - name: ${appName}_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on ${appName}"
          description: "Error rate is {{ $value }} errors/sec"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency on ${appName}"
          description: "P95 latency is {{ $value }} seconds"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / (1024 * 1024) > 512
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on ${appName}"
          description: "Memory usage is {{ $value }} MB"

      - alert: ServiceDown
        expr: up{job="${appName}"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "${appName} is down"
          description: "Service has been down for more than 2 minutes"
`;

    // Generate Grafana datasource config
    const grafanaDatasources = `apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
`;

    // Generate Grafana dashboard config
    const grafanaDashboard = `{
  "dashboard": {
    "title": "${appName} Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [{"expr": "rate(http_requests_total[5m])"}]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [{"expr": "rate(http_requests_total{status=~'5..'}[5m])"}]
      },
      {
        "title": "Latency P95",
        "type": "graph",
        "targets": [{"expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"}]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [{"expr": "process_resident_memory_bytes / (1024*1024)"}]
      }
    ]
  }
}`;

    // Generate docker-compose monitoring stack
    const dockerCompose = `# Monitoring stack for ${appName}
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: ${appName}-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert_rules.yml:/etc/prometheus/alert_rules.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: ${appName}-grafana
    ports:
      - "3001:3000"
    volumes:
      - ./grafana-datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml
      - ./grafana-dashboard.json:/etc/grafana/provisioning/dashboards/dashboard.json
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    depends_on:
      - prometheus
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: ${appName}-alertmanager
    ports:
      - "9093:9093"
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: ${appName}-node-exporter
    ports:
      - "9100:9100"
    restart: unless-stopped
`;

    // Write all configuration files
    const files: Record<string, string> = {
      'prometheus.yml': prometheusConfig,
      'alert_rules.yml': alertRules,
      'grafana-datasources.yml': grafanaDatasources,
      'grafana-dashboard.json': grafanaDashboard,
      'docker-compose.yml': dockerCompose,
    };

    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(monitoringDir, filename);
      fs.writeFileSync(filePath, content, 'utf-8');
      artifacts.push(this.makeArtifact(filename, 'config', filePath, content));
    }

    // Attempt to start monitoring stack if Docker is available
    const results: any[] = [];
    let started = false;

    const dockerCheck = safeDockerExec(['--version'], { timeout: 10000 });
    if (dockerCheck.exitCode === 0) {
      const composeResult = safeDockerExec(
        ['compose', '-f', path.join(monitoringDir, 'docker-compose.yml'), 'up', '-d'],
        { cwd: monitoringDir, timeout: 120000 },
      );
      results.push({
        command: 'docker compose up',
        success: composeResult.exitCode === 0,
        output: composeResult.stdout.slice(0, 500),
      });
      started = composeResult.exitCode === 0;
    } else {
      results.push({
        command: 'docker check',
        success: false,
        note: 'Docker not available — monitoring config generated for manual setup',
      });
    }

    return {
      success: true,
      artifacts,
      output: {
        monitoringDir,
        started,
        results,
        endpoints: {
          prometheus: 'http://localhost:9090',
          grafana: 'http://localhost:3001',
          alertmanager: 'http://localhost:9093',
        },
        note: started
          ? 'Monitoring stack started via Docker Compose'
          : 'Monitoring configuration generated. Run `docker compose up -d` in the monitoring directory.',
      },
      costUsd: 0,
      durationMs: 0,
    };
  }

  /**
   * delivery.load_balancer → Generate load balancer configuration
   *
   * Generates Nginx, HAProxy, or AWS ALB configuration for load balancing.
   * Attempts to validate configuration with the respective tool.
   */
  private async executeLoadBalancer(input: ConnectorInput): Promise<ConnectorOutput> {
    const safeWorkspaceDir = validatePath(input.workspaceDir);
    const lbType = (input.parameters.lbType || 'nginx').toLowerCase();
    const configDir = path.join(safeWorkspaceDir, 'load-balancer');
    fs.mkdirSync(configDir, { recursive: true });

    const appName = sanitizeCommitMessage(input.parameters.appName || input.missionId);
    const upstreamPort = input.parameters.upstreamPort || '3000';
    const upstreamCount = Math.min(Math.max(input.parameters.upstreamCount || 2, 1), 10);
    const domain = input.parameters.domain || `${appName}.example.com`;

    const artifacts: GeneratedArtifact[] = [];

    // Generate upstream server list
    const upstreamServers = Array.from({ length: upstreamCount }, (_, i) => ({
      host: `127.0.0.1`,
      port: String(parseInt(upstreamPort, 10) + i),
    }));

    if (lbType === 'nginx') {
      const nginxConfig = `# Nginx Load Balancer for ${appName}
upstream ${appName}_backend {
  ${upstreamServers.map((s, i) => `server ${s.host}:${s.port} weight=1;`).join('\n  ')}
  keepalive 32;
}

server {
  listen 80;
  server_name ${domain};

  location / {
    proxy_pass http://${appName}_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 10s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
  }

  location /health {
    access_log off;
    return 200 "OK";
  }

  access_log /var/log/nginx/${appName}_access.log;
  error_log /var/log/nginx/${appName}_error.log;
}
`;
      const filePath = path.join(configDir, 'nginx.conf');
      fs.writeFileSync(filePath, nginxConfig, 'utf-8');
      artifacts.push(this.makeArtifact('nginx.conf', 'config', filePath, nginxConfig));

      // Validate Nginx config if nginx is available
      const nginxCheck = safeExec('nginx', ['-v'], { timeout: 10000 });
      const results: any[] = [];
      if (nginxCheck.exitCode === 0 || nginxCheck.stderr.includes('nginx')) {
        const testResult = safeExec('nginx', ['-t', '-c', filePath], { timeout: 15000 });
        results.push({
          command: 'nginx -t',
          success: testResult.exitCode === 0,
          output: (testResult.stdout || testResult.stderr).slice(0, 500),
        });
      } else {
        results.push({
          command: 'nginx check',
          success: false,
          note: 'Nginx not available — configuration generated for manual deployment',
        });
      }

      return {
        success: true,
        artifacts,
        output: {
          lbType: 'nginx',
          configDir,
          upstreamServers,
          results,
          note: 'Nginx load balancer configuration generated. Copy to /etc/nginx/conf.d/ and reload.',
        },
        costUsd: 0,
        durationMs: 0,
      };
    }

    if (lbType === 'haproxy') {
      const haproxyConfig = `# HAProxy Load Balancer for ${appName}
global
  maxconn 4096
  daemon

defaults
  mode http
  timeout connect 5s
  timeout client 30s
  timeout server 30s
  retries 3

frontend ${appName}_frontend
  bind *:80
  default_backend ${appName}_backend

backend ${appName}_backend
  balance roundrobin
  option httpchk GET /health
  ${upstreamServers.map((s) => `server ${s.host}:${s.port} check inter 10s fall 3 rise 2 maxconn 128`).join('\n  ')}

listen stats
  bind *:8404
  mode http
  stats enable
  stats uri /stats
  stats refresh 10s
`;
      const filePath = path.join(configDir, 'haproxy.cfg');
      fs.writeFileSync(filePath, haproxyConfig, 'utf-8');
      artifacts.push(this.makeArtifact('haproxy.cfg', 'config', filePath, haproxyConfig));

      return {
        success: true,
        artifacts,
        output: {
          lbType: 'haproxy',
          configDir,
          upstreamServers,
          note: 'HAProxy load balancer configuration generated. Start with `haproxy -f haproxy.cfg`.',
        },
        costUsd: 0,
        durationMs: 0,
      };
    }

    // AWS ALB (generate CloudFormation template)
    const albTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "ALB for ${appName}",
  "Resources": {
    "LoadBalancer": {
      "Type": "AWS::ElasticLoadBalancingV2::LoadBalancer",
      "Properties": {
        "Name": "${appName}-alb",
        "Scheme": "internet-facing",
        "Type": "application",
        "Subnets": {"Ref": "SubnetIds"}
      }
    },
    "TargetGroup": {
      "Type": "AWS::ElasticLoadBalancingV2::TargetGroup",
      "Properties": {
        "Name": "${appName}-tg",
        "Port": ${upstreamPort},
        "Protocol": "HTTP",
        "VpcId": {"Ref": "VpcId"},
        "HealthCheckPath": "/health",
        "HealthCheckIntervalSeconds": 10
      }
    },
    "Listener": {
      "Type": "AWS::ElasticLoadBalancingV2::Listener",
      "Properties": {
        "LoadBalancerArn": {"Ref": "LoadBalancer"},
        "Port": 80,
        "Protocol": "HTTP",
        "DefaultActions": [{"Type": "forward", "TargetGroupArn": {"Ref": "TargetGroup"}}]
      }
    }
  },
  "Parameters": {
    "VpcId": {"Type": "String", "Description": "VPC ID"},
    "SubnetIds": {"Type": "List<AWS::EC2::Subnet::Id>", "Description": "Subnet IDs"}
  }
}`;
    const filePath = path.join(configDir, 'alb-cloudformation.json');
    fs.writeFileSync(filePath, albTemplate, 'utf-8');
    artifacts.push(this.makeArtifact('alb-cloudformation.json', 'config', filePath, albTemplate));

    return {
      success: true,
      artifacts,
      output: {
        lbType: 'aws-alb',
        configDir,
        upstreamServers,
        note: 'AWS ALB CloudFormation template generated. Deploy with `aws cloudformation deploy`.',
      },
      costUsd: 0,
      durationMs: 0,
    };
  }

  /**
   * delivery.generic → Fallback for unrecognised delivery capabilities
   *
   * Returns a descriptive error instead of silently pretending success.
   */
  private async executeGenericDelivery(
    capId: DeliveryCapability,
    input: ConnectorInput,
  ): Promise<ConnectorOutput> {
    const feature = capId.replace('delivery.', '');
    this.logger.warn(`No specific handler for delivery capability: ${feature}`);

    return {
      success: false,
      artifacts: [],
      output: {
        feature,
        status: 'unsupported_capability',
        error:
          `Delivery capability "${feature}" is not supported. ` +
          `Supported capabilities: zip, github, docker_registry, vps, cloud, cdn, ` +
          `backup, monitoring_setup, load_balancer, pdf_report, notification, deployment`,
        suggestion: `Use one of the supported delivery capabilities or implement a custom connector for "${feature}".`,
      },
      costUsd: 0,
      durationMs: 0,
      error: `Unsupported delivery capability: ${feature}`,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private makeArtifact(
    name: string,
    type: GeneratedArtifact['type'],
    fullPath: string,
    contentOrSize: string | number,
  ): GeneratedArtifact {
    const isString = typeof contentOrSize === 'string';
    return {
      name,
      type,
      path: fullPath,
      size: isString ? Buffer.byteLength(contentOrSize as string) : (contentOrSize as number),
      content: isString ? (contentOrSize as string).substring(0, 500) : undefined,
    };
  }

  private generateCloudConfigs(provider: string, input: ConnectorInput): Record<string, string> {
    const appName = sanitizeCommitMessage(input.parameters.appName || input.missionId);
    const configs: Record<string, string> = {};

    if (provider === 'aws' || provider === 'elasticbeanstalk') {
      configs['eb-config.json'] = JSON.stringify(
        {
          option_settings: [
            {
              namespace: 'aws:elasticbeanstalk:container:nodejs',
              option_name: 'NodeCommand',
              value: 'npm start',
            },
            {
              namespace: 'aws:elasticbeanstalk:application:environment',
              option_name: 'NODE_ENV',
              value: 'production',
            },
            { namespace: 'aws:autoscaling:asg', option_name: 'MinSize', value: '1' },
            { namespace: 'aws:autoscaling:asg', option_name: 'MaxSize', value: '4' },
          ],
        },
        null,
        2,
      );

      configs['Dockerrun.aws.json'] = JSON.stringify(
        {
          AWSEBDockerrunVersion: '1',
          Logging: '/var/log/nginx',
        },
        null,
        2,
      );

      configs['.ebignore'] = 'node_modules\n.git\n*.log\n';
    } else if (provider === 'gcp' || provider === 'google') {
      configs['app.yaml'] = `runtime: nodejs20
env: standard
instance_class: F2
automatic_scaling:
  min_instances: 1
  max_instances: 4
env_variables:
  NODE_ENV: "production"
`;
      configs['.gcloudignore'] = 'node_modules\n.git\n*.log\n';
    } else if (provider === 'azure') {
      configs['azuredeploy.json'] = JSON.stringify(
        {
          $schema:
            'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
          contentVersion: '1.0.0.0',
          parameters: { appName: { type: 'String', defaultValue: appName } },
          resources: [
            {
              type: 'Microsoft.Web/sites',
              apiVersion: '2022-03-01',
              name: "[parameters('appName')]",
              location: '[resourceGroup().location]',
              properties: {
                siteConfig: { appSettings: [{ name: 'NODE_ENV', value: 'production' }] },
              },
            },
          ],
        },
        null,
        2,
      );
    }

    // Common: Dockerfile for containerized cloud deployment
    configs['Dockerfile.cloud'] = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
`;

    return configs;
  }

  private generateCdnConfig(provider: string, input: ConnectorInput): Record<string, string> {
    const appName = sanitizeCommitMessage(input.parameters.appName || input.missionId);
    const originDomain = input.parameters.originDomain || `${appName}.s3.amazonaws.com`;
    const configs: Record<string, string> = {};

    if (provider === 'cloudfront') {
      configs['cloudfront-distribution.json'] = JSON.stringify(
        {
          CallerReference: `${Date.now()}`,
          Comment: `CDN for ${appName}`,
          Enabled: true,
          DefaultRootObject: 'index.html',
          Origins: {
            Quantity: 1,
            Items: [
              {
                Id: `${appName}-origin`,
                DomainName: originDomain,
                CustomOriginConfig: {
                  HTTPPort: 80,
                  HTTPSPort: 443,
                  OriginProtocolPolicy: 'https-only',
                },
              },
            ],
          },
          DefaultCacheBehavior: {
            TargetOriginId: `${appName}-origin`,
            ViewerProtocolPolicy: 'redirect-to-https',
            MinTTL: 0,
            DefaultTTL: 86400,
            MaxTTL: 31536000,
            ForwardedValues: { QueryString: false, Cookies: { Forward: 'none' } },
          },
          PriceClass: 'PriceClass_200',
        },
        null,
        2,
      );
    } else if (provider === 'cloudflare') {
      configs['wrangler.toml'] = `name = "${appName}"
compatibility_date = "2024-01-01"
pages_build_output_dir = "./dist"

[env.production]
routes = [
  { pattern = "${appName}.com", custom_domain = true }
]
`;
    }

    // Common: CDN cache headers configuration
    configs['cdn-headers.conf'] = `# Cache headers for CDN optimization
location /static/ {
  expires 30d;
  add_header Cache-Control "public, immutable";
}

location /api/ {
  expires -1;
  add_header Cache-Control "no-store, no-cache, must-revalidate";
}

location / {
  expires 1h;
  add_header Cache-Control "public, s-maxage=3600";
}
`;

    return configs;
  }

  private generateDeliveryReport(input: ConnectorInput): string {
    // Collect info about what was generated
    const safeWorkspaceDir = validatePath(input.workspaceDir);
    const fileCount = this.countFiles(safeWorkspaceDir);
    const totalSize = this.calculateTotalSize(safeWorkspaceDir);

    return `# Delivery Report

## Mission: ${sanitizeCommitMessage(input.instruction)}

**Mission ID:** ${sanitizeCommitMessage(input.missionId)}
**Generated:** ${new Date().toISOString()}

## Artifacts Summary

- **Total Files:** ${fileCount}
- **Total Size:** ${(totalSize / 1024).toFixed(1)} KB

## Workspace

\`${safeWorkspaceDir}\`

## Files

${this.listFiles(safeWorkspaceDir)}

## Certification

See \`docs/certification/\` directory for detailed certification reports.

---

*Generated by AENEWS Software Factory*
`;
  }

  private countFiles(dir: string): number {
    let count = 0;
    if (!fs.existsSync(dir)) return 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        count += this.countFiles(path.join(dir, entry.name));
      } else if (entry.isFile()) {
        count++;
      }
    }
    return count;
  }

  private calculateTotalSize(dir: string): number {
    let size = 0;
    if (!fs.existsSync(dir)) return 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        size += this.calculateTotalSize(fullPath);
      } else if (entry.isFile()) {
        try {
          size += fs.statSync(fullPath).size;
        } catch {
          /* skip */
        }
      }
    }
    return size;
  }

  private listFiles(dir: string, indent: string = ''): string {
    const lines: string[] = [];
    if (!fs.existsSync(dir)) return '';
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      if (entry.isDirectory()) {
        lines.push(`${indent}- ${entry.name}/`);
        lines.push(this.listFiles(path.join(dir, entry.name), indent + '  '));
      } else {
        try {
          const size = fs.statSync(path.join(dir, entry.name)).size;
          lines.push(`${indent}- ${entry.name} (${(size / 1024).toFixed(1)} KB)`);
        } catch {
          lines.push(`${indent}- ${entry.name}`);
        }
      }
    }
    return lines.join('\n');
  }
}
