import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  NetworkError,
} from './index';
import { ParsedErrorInfo, HttpError } from './types';
import { HttpStatus, ErrorMessages, ErrorNames } from './constants';

/**
 * Factory for creating typed errors based on HTTP status codes
 * Follows the Factory pattern for clean error instantiation
 */
export class ErrorFactory {
  /**
   * Creates appropriate error instance based on HTTP status code
   */
  static createFromHttpStatus(
    statusCode: number,
    errorInfo: ParsedErrorInfo,
  ): HttpError {
    const { message, requestId } = errorInfo;

    // Map status codes to error types
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return new ValidationError({ message, statusCode, requestId });
      
      case HttpStatus.UNAUTHORIZED:
        return new AuthenticationError({ message, statusCode, requestId });
      
      case HttpStatus.FORBIDDEN:
        return new AuthorizationError({ message, statusCode, requestId });
      
      case HttpStatus.NOT_FOUND:
        return new NotFoundError({ message, statusCode, requestId });
      
      case HttpStatus.TOO_MANY_REQUESTS:
        return new RateLimitError({ message, statusCode, requestId });
      
      default:
        // For 5xx errors or any other status code
        if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
          return new ServerError({ message, statusCode, requestId });
        }
        
        // For unknown client errors, treat as validation error
        return new ValidationError({ 
          message: `${message} (HTTP ${statusCode})`, 
          statusCode, 
          requestId
        });
    }
  }

  /**
   * Creates a NetworkError from a fetch/network error
   */
  static createNetworkError(error: unknown): NetworkError {
    let message: string = ErrorMessages.NETWORK_ERROR;

    if (error instanceof Error) {
      if (error.name === ErrorNames.ABORT_ERROR) {
        message = ErrorMessages.REQUEST_ABORTED;
      } else if (error.message.includes('timeout')) {
        message = ErrorMessages.REQUEST_TIMEOUT;
      } else {
        message = error.message;
      }
    }

    return new NetworkError({ message });
  }
}