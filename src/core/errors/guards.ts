import { UiPathError } from './base';
import { AuthenticationError } from './authentication';
import { AuthorizationError } from './authorization';
import { ValidationError } from './validation';
import { NotFoundError } from './not-found';
import { RateLimitError } from './rate-limit';
import { ServerError } from './server';
import { NetworkError } from './network';

/**
 * Type guard to check if an error is a UiPathError
 */
export function isUiPathError(error: unknown): error is UiPathError {
  return error instanceof UiPathError;
}

/**
 * Type guard to check if an error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard to check if an error is an AuthorizationError
 */
export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is a NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * Type guard to check if an error is a RateLimitError
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

/**
 * Type guard to check if an error is a ServerError
 */
export function isServerError(error: unknown): error is ServerError {
  return error instanceof ServerError;
}

/**
 * Type guard to check if an error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Helper to get error details in a safe way
 */
export function getErrorDetails(error: unknown): { message: string; statusCode?: number } {
  if (isUiPathError(error)) {
    return {
      message: error.message,
      statusCode: error.statusCode
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message
    };
  }

  return {
    message: String(error)
  };
}