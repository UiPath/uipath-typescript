import { UiPathError } from './base';
import { HttpStatus, ErrorMessages, ErrorType } from './constants';
import { ErrorParams } from './types';

/**
 * Error thrown when server encounters an error (5xx errors)
 * Common scenarios:
 * - Internal server error
 * - Service unavailable
 * - Gateway timeout
 */
export class ServerError extends UiPathError {
  constructor(params: Partial<ErrorParams> = {}) {
    super(ErrorType.SERVER, {
      message: params.message || ErrorMessages.INTERNAL_SERVER_ERROR,
      statusCode: params.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR,
      requestId: params.requestId
    });
  }

  /**
   * Checks if this is a temporary error that might succeed on retry
   */
  get isRetryable(): boolean {
    return this.statusCode === HttpStatus.BAD_GATEWAY || 
           this.statusCode === HttpStatus.SERVICE_UNAVAILABLE || 
           this.statusCode === HttpStatus.GATEWAY_TIMEOUT;
  }
}