import { UiPathError } from './base';
import { HttpStatus, ErrorMessages, ErrorType } from './constants';
import { ErrorParams } from './types';

/**
 * Error thrown when a resource is not found (404 errors)
 * Common scenarios:
 * - Resource doesn't exist
 * - Invalid ID provided
 * - Resource deleted
 */
export class NotFoundError extends UiPathError {
  constructor(params: Partial<ErrorParams> = {}) {
    super(ErrorType.NOT_FOUND, {
      message: params.message || ErrorMessages.RESOURCE_NOT_FOUND,
      statusCode: params.statusCode ?? HttpStatus.NOT_FOUND,
      requestId: params.requestId
    });
  }
}