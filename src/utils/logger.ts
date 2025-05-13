/**
 * Logger levels enum matching Python's logging levels
 */
export enum LogLevel {
  DEBUG = 10,
  INFO = 20,
  WARNING = 30,
  ERROR = 40,
  CRITICAL = 50
}

export class Logger {
  private static instance: Logger;
  private level: LogLevel = LogLevel.INFO;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Configure logging settings
   * @param options - Logging configuration options
   */
  setup(options: { debug?: boolean } = {}): void {
    this.level = options.debug ? LogLevel.DEBUG : LogLevel.INFO;
  }

  /**
   * Format log message with timestamp and metadata
   */
  private formatMessage(level: string, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp} - ${level}]${metaStr} ${message}`;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.WARNING) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, meta));
    }
  }

  critical(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.CRITICAL) {
      console.error(this.formatMessage('CRITICAL', message, meta));
    }
  }
}

export const logger = Logger.getInstance(); 