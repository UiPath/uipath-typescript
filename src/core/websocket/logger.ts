/**
 * WebSocketLogger - Simple logger for WebSocket operations
 */

import { LogLevel } from './types';

/**
 * Log level priority order
 */
const LOG_LEVELS: LogLevel[] = [LogLevel.Debug, LogLevel.Info, LogLevel.Warn, LogLevel.Error];

/**
 * Simple logger for WebSocket operations
 *
 * @example
 * ```typescript
 * const logger = new WebSocketLogger('ConversationalSession', 'debug');
 * logger.debug('Connecting...');
 * logger.info('Connected', { socketId: '123' });
 * logger.warn('Reconnecting...');
 * logger.error('Connection failed', error);
 * ```
 */
export class WebSocketLogger {
  private _prefix: string;
  private _level: LogLevel;

  constructor(prefix: string, level: LogLevel = LogLevel.Info) {
    this._prefix = prefix;
    this._level = level;
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this._level = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this._level;
  }

  /**
   * Check if a message at the given level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(this._level);
  }

  /**
   * Log a debug message
   */
  debug(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.Debug)) {
      console.debug(`[${this._prefix}]`, ...args);
    }
  }

  /**
   * Log an info message
   */
  info(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.Info)) {
      console.info(`[${this._prefix}]`, ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.Warn)) {
      console.warn(`[${this._prefix}]`, ...args);
    }
  }

  /**
   * Log an error message
   */
  error(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.Error)) {
      console.error(`[${this._prefix}]`, ...args);
    }
  }
}
