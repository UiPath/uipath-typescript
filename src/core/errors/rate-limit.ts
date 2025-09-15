import { UiPathError } from './base';
import { HttpStatus, ErrorMessages, ErrorType } from './constants';
import { ErrorParams } from './types';

/**
 * Error thrown when rate limit is exceeded (429 errors)
 * Common scenarios:
 * - Too many requests in a time window
 * - API throttling
 */
export class RateLimitError extends UiPathError {
  constructor(params: Partial<ErrorParams> = {}) {
    super(ErrorType.RATE_LIMIT, {
      message: params.message || ErrorMessages.RATE_LIMIT_EXCEEDED,
      statusCode: params.statusCode ?? HttpStatus.TOO_MANY_REQUESTS,
      requestId: params.requestId
    });
  }
}