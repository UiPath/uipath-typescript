import { UiPathError } from './base';
import { HttpStatus, ErrorMessages, ErrorType } from './constants';
import { ErrorParams } from './types';

/**
 * Error thrown when authorization fails (403 errors)
 * Common scenarios:
 * - Insufficient permissions
 * - Access denied to resource
 * - Invalid scope
 */
export class AuthorizationError extends UiPathError {
  constructor(params: Partial<ErrorParams> = {}) {
    super(ErrorType.AUTHORIZATION, {
      message: params.message || ErrorMessages.ACCESS_DENIED,
      statusCode: params.statusCode ?? HttpStatus.FORBIDDEN,
      requestId: params.requestId
    });
  }
}