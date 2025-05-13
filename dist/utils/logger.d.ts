/**
 * Logger levels enum matching Python's logging levels
 */
export declare enum LogLevel {
    DEBUG = 10,
    INFO = 20,
    WARNING = 30,
    ERROR = 40,
    CRITICAL = 50
}
export declare class Logger {
    private static instance;
    private level;
    private constructor();
    static getInstance(): Logger;
    /**
     * Configure logging settings
     * @param options - Logging configuration options
     */
    setup(options?: {
        debug?: boolean;
    }): void;
    /**
     * Format log message with timestamp and metadata
     */
    private formatMessage;
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    critical(message: string, meta?: Record<string, unknown>): void;
}
export declare const logger: Logger;
