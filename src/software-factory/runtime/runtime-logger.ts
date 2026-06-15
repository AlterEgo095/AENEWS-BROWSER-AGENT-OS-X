/**
 * AENEWS Software Factory — Runtime Logger
 *
 * Simple logger for standalone runtime scripts that don't have
 * access to the NestJS Logger. Replaces raw console.log/warn/error
 * with structured, level-aware logging.
 *
 * Usage:
 *   const log = new RuntimeLogger('StandaloneRunner');
 *   log.info('Mission started', { missionId });
 *   log.warn('Low quality score', { score });
 *   log.error('Mission failed', error);
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export class RuntimeLogger {
  private readonly context: string;
  private readonly level: LogLevel;

  constructor(context: string, level?: LogLevel) {
    this.context = context;
    this.level =
      level ??
      (process.env.LOG_LEVEL === 'debug'
        ? LogLevel.DEBUG
        : process.env.LOG_LEVEL === 'warn'
          ? LogLevel.WARN
          : process.env.LOG_LEVEL === 'error'
            ? LogLevel.ERROR
            : process.env.LOG_LEVEL === 'silent'
              ? LogLevel.SILENT
              : LogLevel.INFO);
  }

  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[DEBUG] [${this.context}] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`[INFO]  [${this.context}] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN]  [${this.context}] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] [${this.context}] ${message}`, ...args);
    }
  }

  /** Create a child logger with a sub-context */
  child(subContext: string): RuntimeLogger {
    return new RuntimeLogger(`${this.context}:${subContext}`, this.level);
  }
}
