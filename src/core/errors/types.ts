import { AuthenticationError } from './authentication';
import { AuthorizationError } from './authorization';
import { ValidationError } from './validation';
import { NotFoundError } from './not-found';
import { RateLimitError } from './rate-limit';
import { ServerError } from './server';

/**
 * Error response type definitions for different UiPath services
 * These interfaces represent the actual error structures returned by various APIs
 */

/**
 * Standard error format used by Orchestrator and Task services
 * @example
 * {
 *   "message": "Folder does not exist or the user does not have access to the folder.",
 *   "errorCode": 1100,
 *   "traceId": "00-0f9a884dc5cd6cc9e71da27364547871-4c3fa2d22823c8d7-00"
 * }
 */
export interface OrchestratorErrorResponse {
  message: string;
  errorCode: number;
  traceId: string;
}

/**
 * Entity service (Data Fabric) error format
 * @example
 * {
 *   "error": "You are not authenticated to access Data Service. Make sure your Assistant or Robot is connected to a modern folder in your account.",
 *   "traceId": "9061e86e6d5f4897ac8cf419dffdd24f"
 * }
 */
export interface EntityErrorResponse {
  error: string;
  traceId: string;
}

/**
 * Process Intelligence (PIMS/Maestro) error format
 * @example
 * {
 *   "type": "PIMS-150001",
 *   "title": "Required header 'x-uipath-folderkey' is missing or empty",
 *   "status": 400,
 *   "traceId": "70caeaf9b076437b8760eb9c6ba96cc4"
 * }
 * 
 * Alternative validation error format:
 * {
 *   "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
 *   "title": "One or more validation errors occurred.",
 *   "status": 400,
 *   "errors": {
 *     "instanceId": ["The value '2a1b7940-e65e-4087-b4dc-e0838afc845b12' is not valid."]
 *   },
 *   "traceId": "00-70caeaf9b076437b8760eb9c6ba96cc4-5012c93dcea83aca-01"
 * }
 */
export interface PimsErrorResponse {
  type: string;
  title: string;
  status: number;
  errors?: Record<string, string[]>;
  traceId: string;
}


/**
 * Internal interface for normalized error data from different UiPath services.
 * This is used internally by error parsers to standardize responses before 
 * creating UiPathError instances that users will interact with.
 */
export interface ParsedErrorInfo {
  message: string;
  code: string;
  details: Record<string, unknown>;
  requestId?: string;
}


/**
 * Union type for all HTTP-based errors that can be created from status codes
 */
export type HttpError = 
  | AuthenticationError
  | AuthorizationError  
  | ValidationError
  | NotFoundError
  | RateLimitError
  | ServerError;
/**
 * Base error creation parameters - only what's needed
 */
export interface ErrorParams {
  message: string;
  statusCode?: number;
  requestId?: string;
}

/**
 * Type guards for error response types
 */
export function isOrchestratorError(error: unknown): error is OrchestratorErrorResponse {
  return typeof error === 'object' && 
         error !== null &&
         'message' in error &&
         'errorCode' in error &&
         typeof (error as any).message === 'string' &&
         typeof (error as any).errorCode === 'number';
}

export function isEntityError(error: unknown): error is EntityErrorResponse {
  return typeof error === 'object' && 
         error !== null &&
         'error' in error &&
         typeof (error as any).error === 'string';
}

export function isPimsError(error: unknown): error is PimsErrorResponse {
  return typeof error === 'object' && 
         error !== null &&
         'type' in error &&
         'title' in error &&
         'status' in error &&
         typeof (error as any).type === 'string' &&
         typeof (error as any).title === 'string' &&
         typeof (error as any).status === 'number';
}