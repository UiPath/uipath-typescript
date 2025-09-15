import { UiPathError } from './base';
import { HttpStatus, ErrorMessages, ErrorType } from './constants';
import { ErrorParams } from './types';

/**
 * Error thrown when validation fails (400 errors or client-side validation)
 * Common scenarios:
 * - Invalid input parameters
 * - Missing required fields
 * - Invalid data format
 */
export class ValidationError extends UiPathError {
  constructor(params: Partial<ErrorParams> = {}) {
    super(ErrorType.VALIDATION, {
      message: params.message || ErrorMessages.VALIDATION_FAILED,
      statusCode: params.statusCode ?? HttpStatus.BAD_REQUEST,
      requestId: params.requestId
    });
  }
}