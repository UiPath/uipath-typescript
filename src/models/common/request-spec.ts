/**
 * HTTP methods supported by the API client
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Supported response types for API requests
 */
export type ResponseType = 'json' | 'text' | 'blob' | 'arraybuffer' | 'stream';

/**
 * Query parameters type with support for arrays and nested objects
 */
export type QueryParams = Record<string, string | number | boolean | Array<string | number | boolean> | null | undefined>;

/**
 * Standard HTTP headers type
 */
export type Headers = Record<string, string>;

/**
 * Options for request retries
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Base delay between retries in milliseconds */
  retryDelay?: number;
  /** Whether to use exponential backoff */
  useExponentialBackoff?: boolean;
  /** Status codes that should trigger a retry */
  retryableStatusCodes?: number[];
}

/**
 * Options for request timeouts
 */
export interface TimeoutOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to abort the request on timeout */
  abortOnTimeout?: boolean;
}

/**
 * Options for request body transformation
 */
export interface BodyOptions {
  /** Whether to stringify the body */
  stringify?: boolean;
  /** Content type override */
  contentType?: string;
}

/**
 * Base interface for all API requests
 */
export interface RequestSpec {
  /** HTTP method for the request */
  method?: HttpMethod;
  
  /** URL endpoint for the request */
  url?: string;
  
  /** Query parameters to be appended to the URL */
  params?: QueryParams;
  
  /** HTTP headers to include with the request */
  headers?: Headers;
  
  /** Raw body content (takes precedence over data) */
  body?: unknown;
  
  /** Expected response type */
  responseType?: ResponseType;
  
  /** Request timeout options */
  timeoutOptions?: TimeoutOptions;
  
  /** Retry behavior options */
  retryOptions?: RetryOptions;
  
  /** Body transformation options */
  bodyOptions?: BodyOptions;
  
  /** AbortSignal for cancelling the request */
  signal?: AbortSignal;
}
