import {
  OrchestratorErrorResponse,
  EntityErrorResponse,
  PimsErrorResponse,
  ParsedErrorInfo,
  isOrchestratorError,
  isEntityError,
  isPimsError
} from './types';
import { HttpHeaders } from './constants';

/**
 * Strategy interface for parsing different error response formats
 */
interface ErrorParsingStrategy {
  canParse(errorBody: unknown): boolean;
  parse(errorBody: unknown, response?: Response): ParsedErrorInfo;
}

/**
 * Parser for Orchestrator/Task error format
 */
class OrchestratorErrorParser implements ErrorParsingStrategy {
  canParse(errorBody: unknown): boolean {
    return isOrchestratorError(errorBody);
  }

  parse(errorBody: unknown, response: Response): ParsedErrorInfo {
    const error = errorBody as OrchestratorErrorResponse;
    return {
      message: error.message,
      code: response?.status?.toString(),
      details: {
        errorCode: error.errorCode,
        traceId: error.traceId,
        originalResponse: error
      },
      requestId: error.traceId
    };
  }
}

/**
 * Parser for Entity (Data Fabric) error format
 */
class EntityErrorParser implements ErrorParsingStrategy {
  canParse(errorBody: unknown): boolean {
    return isEntityError(errorBody);
  }

  parse(errorBody: unknown, response: Response): ParsedErrorInfo {
    const error = errorBody as EntityErrorResponse;
    return {
      message: error.error,
      code: response?.status?.toString(),
      details: {
        error: error.error,
        traceId: error.traceId,
        originalResponse: error
      },
      requestId: error.traceId
    };
  }
}

/**
 * Parser for PIMS error format
 */
class PimsErrorParser implements ErrorParsingStrategy {
  canParse(errorBody: unknown): boolean {
    return isPimsError(errorBody);
  }

  parse(errorBody: unknown, response: Response): ParsedErrorInfo {
    const error = errorBody as PimsErrorResponse;
    let message = error.title;
    
    // If there are validation errors, append them to the message for better visibility
    if (error.errors && Object.keys(error.errors).length > 0) {
      const errorMessages = Object.entries(error.errors)
        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
        .join('; ');
      message += `. Validation errors: ${errorMessages}`;
    }

    return {
      message,
      code: response?.status?.toString(),
      details: {
        type: error.type,
        title: error.title,
        status: error.status,
        errors: error.errors,
        traceId: error.traceId,
        originalResponse: error
      },
      requestId: error.traceId
    };
  }
}

/**
 * Fallback parser for unrecognized formats
 */
class GenericErrorParser implements ErrorParsingStrategy {
  canParse(_errorBody: unknown): boolean {
    return true; // Always can parse as last resort
  }

  parse(errorBody: unknown, response: Response): ParsedErrorInfo {
    // For unknown error formats, just pass through the raw error with fallback message
    const message = response?.statusText || 'An error occurred';

    return {
      message,
      code: response?.status?.toString(),
      details: {
        originalResponse: errorBody
      },
    };
  }
}

/**
 * Main error response parser using Chain of Responsibility pattern
 * 
 * This parser standardizes error responses from different UiPath services into a
 * consistent format, regardless of the original error structure.
 * 
 * Supported formats:
 * 1. Orchestrator/Task: { message, errorCode, traceId }
 * 2. Entity (Data Fabric): { error, traceId }
 * 3. PIMS/Maestro: { type, title, status, errors?, traceId? }
 * 4. Generic: Fallback for any other format
 * 
 * @example
 * const parser = new ErrorResponseParser();
 * const errorInfo = await parser.parse(response);
 * // errorInfo will have consistent structure regardless of service
 */
export class ErrorResponseParser {
  private readonly strategies: ErrorParsingStrategy[] = [
    new OrchestratorErrorParser(),
    new EntityErrorParser(),
    new PimsErrorParser(),
    new GenericErrorParser() // Must be last
  ];

  /**
   * Parses error response body into standardized format
   * @param response - The HTTP response object
   * @returns Standardized error information
   */
  async parse(response: Response): Promise<ParsedErrorInfo> {
    try {
      const errorBody = await response.json();
      
      // Find the first strategy that can parse this error format
      const strategy = this.strategies.find(s => s.canParse(errorBody));
      
      // GenericErrorParser always returns true, so this will never be null
      return strategy!.parse(errorBody, response);
    } catch (error) {
      // Handle non-JSON responses
      const responseText = await response.text().catch(() => '');
      return {
        message: response.statusText,
        code: response.status.toString(),
        details: { 
          parseError: 'Failed to parse error response as JSON',
          responseText 
        },
        requestId: response.headers.get(HttpHeaders.X_REQUEST_ID) || undefined
      };
    }
  }
}

// Export singleton instance
export const errorResponseParser = new ErrorResponseParser();