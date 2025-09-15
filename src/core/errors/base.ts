import { ErrorParams } from './types';

/**
 * Base error class for all UiPath SDK errors
 * Pure TypeScript class with clean interface
 */
export abstract class UiPathError {
  /**
   * Error type identifier (e.g., "AuthenticationError", "ValidationError")
   */
  public readonly type: string;

  /**
   * Error message describing what went wrong
   */
  public readonly message: string;

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

  /**
   * Stack trace for debugging
   */
  public readonly stack?: string;

  protected constructor(type: string, params: ErrorParams) {
    this.type = type;
    this.message = params.message;
    this.statusCode = params.statusCode;
    this.requestId = params.requestId;
    this.timestamp = new Date();
    
    // Capture stack trace for debugging
    this.stack = (new Error()).stack;
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