"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
/**
 * Logger levels enum matching Python's logging levels
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 10] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 20] = "INFO";
    LogLevel[LogLevel["WARNING"] = 30] = "WARNING";
    LogLevel[LogLevel["ERROR"] = 40] = "ERROR";
    LogLevel[LogLevel["CRITICAL"] = 50] = "CRITICAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.level = LogLevel.INFO;
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    /**
     * Configure logging settings
     * @param options - Logging configuration options
     */
    setup(options = {}) {
        this.level = options.debug ? LogLevel.DEBUG : LogLevel.INFO;
    }
    /**
     * Format log message with timestamp and metadata
     */
    formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp} - ${level}]${metaStr} ${message}`;
    }
    debug(message, meta) {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(this.formatMessage('DEBUG', message, meta));
        }
    }
    info(message, meta) {
        if (this.level <= LogLevel.INFO) {
            console.info(this.formatMessage('INFO', message, meta));
        }
    }
    warn(message, meta) {
        if (this.level <= LogLevel.WARNING) {
            console.warn(this.formatMessage('WARN', message, meta));
        }
    }
    error(message, meta) {
        if (this.level <= LogLevel.ERROR) {
            console.error(this.formatMessage('ERROR', message, meta));
        }
    }
    critical(message, meta) {
        if (this.level <= LogLevel.CRITICAL) {
            console.error(this.formatMessage('CRITICAL', message, meta));
        }
    }
}
exports.Logger = Logger;
exports.logger = Logger.getInstance();
