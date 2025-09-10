/**
 * HTTP status code constants for error handling
 */
export const HttpStatus = {
  // Client errors (4xx)
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

/**
 * Error type constants for consistent error identification
 */
export const ErrorType = {
  AUTHENTICATION: 'AuthenticationError',
  AUTHORIZATION: 'AuthorizationError',
  VALIDATION: 'ValidationError',
  NOT_FOUND: 'NotFoundError',
  RATE_LIMIT: 'RateLimitError',
  SERVER: 'ServerError',
  NETWORK: 'NetworkError'
} as const;

/**
 * HTTP header constants for error handling
 */
export const HttpHeaders = {
  X_REQUEST_ID: 'x-request-id'
} as const;

/**
 * Standard error message constants
 */
export const ErrorMessages = {
  // Authentication errors
  AUTHENTICATION_FAILED: 'Authentication failed',
  
  // Authorization errors  
  ACCESS_DENIED: 'Access denied',
  
  // Validation errors
  VALIDATION_FAILED: 'Validation failed',
  
  // Not found errors
  RESOURCE_NOT_FOUND: 'Resource not found',
  FOLDER_NOT_FOUND: 'Folder not found',
  
  // Rate limit errors
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  TOO_MANY_REQUESTS: 'Too many requests',
  
  // Server errors
  INTERNAL_SERVER_ERROR: 'Internal Server error occurred',
  
  // Network errors
  NETWORK_ERROR: 'Network error occurred',
  REQUEST_TIMEOUT: 'Request timed out',
  REQUEST_ABORTED: 'Request was aborted',

} as const;

/**
 * Error name constants for network error identification
 */
export const ErrorNames = {
  ABORT_ERROR: 'AbortError',
  TIMEOUT_ERROR: 'TimeoutError'
} as const;

