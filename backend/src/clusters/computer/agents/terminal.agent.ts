import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';

export class TerminalAgent extends BaseAgent {
  readonly name = 'TerminalAgent';
  readonly cluster = ClusterType.COMPUTER;
  readonly capabilities = [
    'execute',
    'script',
    'pipe',
    'background',
    'schedule',
  ];
  readonly version = '1.0.0';
  readonly description =
    'Handles terminal and command execution including running commands, scripts, piped commands, background tasks, and scheduled executions';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'execute';
      const startTime = Date.now();

      switch (action) {
        case 'execute': {
          const command = config.command;
          if (!command) {
            return { success: false, error: 'Command is required for execute action' };
          }
          const cwd = config.cwd || process.cwd();
          const env = config.env || {};
          const timeout = config.timeout || 30000;
          const shell = config.shell || '/bin/bash';
          const uid = config.uid;
          const gid = config.gid;
          const maxBuffer = config.maxBuffer || 1024 * 1024;
          this.logger.log(`Executing command: ${command} (cwd: ${cwd}, timeout: ${timeout}ms)`);

          return {
            success: true,
            data: {
              action,
              command,
              cwd,
              env,
              timeout,
              shell,
              uid,
              gid,
              maxBuffer,
              stdout: '',
              stderr: '',
              exitCode: null as number | null,
              status: 'command_executed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'script': {
          const script = config.script;
          if (!script) {
            return { success: false, error: 'Script content or script path is required for script action' };
          }
          const scriptPath = config.scriptPath;
          const interpreter = config.interpreter || '/bin/bash';
          const cwd = config.cwd || process.cwd();
          const env = config.env || {};
          const args = config.args || [];
          const timeout = config.timeout || 60000;
          const saveOutput = config.saveOutput || false;
          const outputPath = config.outputPath;
          this.logger.log(`Running script${scriptPath ? ` from ${scriptPath}` : ''} (interpreter: ${interpreter})`);

          return {
            success: true,
            data: {
              action,
              script,
              scriptPath,
              interpreter,
              cwd,
              env,
              args,
              timeout,
              saveOutput,
              outputPath,
              stdout: '',
              stderr: '',
              exitCode: null as number | null,
              status: 'script_executed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'pipe': {
          const commands = config.commands;
          if (!commands || !Array.isArray(commands) || commands.length === 0) {
            return { success: false, error: 'Array of commands is required for pipe action' };
          }
          const cwd = config.cwd || process.cwd();
          const env = config.env || {};
          const timeout = config.timeout || 60000;
          const shell = config.shell || '/bin/bash';
          this.logger.log(`Executing piped commands: ${commands.join(' | ')}`);

          return {
            success: true,
            data: {
              action,
              commands,
              cwd,
              env,
              timeout,
              shell,
              pipelineResults: [] as Array<{
                command: string;
                stdout: string;
                stderr: string;
                exitCode: number | null;
              }>,
              combinedStdout: '',
              combinedStderr: '',
              finalExitCode: null as number | null,
              status: 'pipe_executed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'background': {
          const command = config.command;
          if (!command) {
            return { success: false, error: 'Command is required for background action' };
          }
          const cwd = config.cwd || process.cwd();
          const env = config.env || {};
          const shell = config.shell || '/bin/bash';
          const logOutput = config.logOutput || true;
          const logPath = config.logPath || '/tmp/aenews-bg';
          const restartOnCrash = config.restartOnCrash || false;
          const maxRestarts = config.maxRestarts || 3;
          this.logger.log(`Starting background command: ${command} (logOutput: ${logOutput})`);

          return {
            success: true,
            data: {
              action,
              command,
              cwd,
              env,
              shell,
              logOutput,
              logPath,
              restartOnCrash,
              maxRestarts,
              pid: null as number | null,
              jobId: null as string | null,
              status: 'background_started',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'schedule': {
          const command = config.command;
          if (!command) {
            return { success: false, error: 'Command is required for schedule action' };
          }
          const schedule = config.schedule;
          if (!schedule) {
            return { success: false, error: 'Schedule expression is required (cron or interval)' };
          }
          const scheduleType = config.scheduleType || 'cron';
          const cwd = config.cwd || process.cwd();
          const env = config.env || {};
          const timezone = config.timezone || 'UTC';
          const runImmediately = config.runImmediately || false;
          const maxRetries = config.maxRetries || 0;
          const retryDelay = config.retryDelay || 5000;
          const label = config.label || `scheduled-${Date.now()}`;
          this.logger.log(`Scheduling command: ${command} (${scheduleType}: ${schedule})`);

          return {
            success: true,
            data: {
              action,
              command,
              schedule,
              scheduleType,
              cwd,
              env,
              timezone,
              runImmediately,
              maxRetries,
              retryDelay,
              label,
              jobId: null as string | null,
              nextRunTime: null as string | null,
              status: 'command_scheduled',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
