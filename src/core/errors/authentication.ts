import { UiPathError } from './base';
import { HttpStatus, ErrorMessages, ErrorType } from './constants';
import { ErrorParams } from './types';

/**
 * Error thrown when authentication fails (401 errors)
 * Common scenarios:
 * - Invalid credentials
 * - Expired token
 * - Missing authentication
 */
export class AuthenticationError extends UiPathError {
  constructor(params: Partial<ErrorParams> = {}) {
    super(ErrorType.AUTHENTICATION, {
      message: params.message || ErrorMessages.AUTHENTICATION_FAILED,
      statusCode: params.statusCode ?? HttpStatus.UNAUTHORIZED,
      requestId: params.requestId
    });
  }
}