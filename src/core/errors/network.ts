import { UiPathError } from './base';
import { ErrorMessages, ErrorType } from './constants';
import { ErrorParams } from './types';

/**
 * Error thrown when network/connection issues occur
 * Common scenarios:
 * - Connection timeout
 * - DNS resolution failure
 * - Network unreachable
 * - Request aborted
 */
export class NetworkError extends UiPathError {
  constructor(params: Partial<ErrorParams> = {}) {
    super(ErrorType.NETWORK, {
      message: params.message || ErrorMessages.NETWORK_ERROR,
      statusCode: params.statusCode, // Network errors typically don't have HTTP status codes
      requestId: params.requestId
    });
  }
}