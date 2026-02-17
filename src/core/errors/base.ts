import { ErrorParams } from './types';

/**
 * Base error class for all UiPath SDK errors
 * Extends Error for standard error handling compatibility
 */
export abstract class UiPathError extends Error {
  /**
   * Error type identifier (e.g., "AuthenticationError", "ValidationError")
   */
  public readonly type: string;

  /**
   * HTTP status code (400, 401, 403, 404, 500, etc.)
   */
  public readonly statusCode?: number;

  /**
   * Request ID for tracking with UiPath support
   */
  public readonly requestId?: string;

  /**
   * Timestamp when the error occurred
   */
  public readonly timestamp: Date;

  protected constructor(type: string, params: ErrorParams) {
    super(params.message);
    this.name = type;
    this.type = type;
    this.statusCode = params.statusCode;
    this.requestId = params.requestId;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a clean JSON representation of the error
   */
  private toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      message: this.message,
      statusCode: this.statusCode,
      requestId: this.requestId,
      timestamp: this.timestamp
    };
  }

  /**
   * Returns detailed debug information including stack trace
   */
  getDebugInfo(): Record<string, unknown> {
    return {
      ...this.toJSON(),
      stack: this.stack
    };
  }
}