import { PaginationType } from '../../utils/pagination/internal-types';
import type { RetryOptions } from './http.types';

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
 * Options for request timeouts
 *
 * @deprecated Set {@link RequestSpec.timeoutMs} on the request instead. Note that
 * `abortOnTimeout` has never had an effect: with `fetch`, a timeout *is* an abort.
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
 * Pagination metadata for API requests
 */
export interface PaginationMetadata {
  /** Type of pagination used by the API endpoint */
  paginationType: PaginationType;
  /** Response field containing items array (defaults to 'value') */
  itemsField?: string;
  /** Response field containing total count (defaults to '@odata.count') */
  totalCountField?: string;
  /** Response field containing continuation token (defaults to 'continuationToken') */
  continuationTokenField?: string;
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
  
  /** Timeout for a single attempt, in milliseconds. Unbounded unless supplied. */
  timeoutMs?: number;

  /**
   * Request timeout options.
   *
   * @deprecated Use {@link RequestSpec.timeoutMs}. `timeoutOptions.timeout` is still honoured
   * when `timeoutMs` is not supplied; scheduled for removal in a future minor release.
   */
  timeoutOptions?: TimeoutOptions;
  
  /**
   * Retry and backoff behavior for this request. Service calls do not retry unless this is
   * supplied — `maxRetries` defaults to `0` here, not to the `2` that `httpRequest` uses.
   */
  retry?: RetryOptions;

  /**
   * Retry behavior options.
   *
   * @deprecated Use {@link RequestSpec.retry}. Still honoured when `retry` is not supplied;
   * scheduled for removal in a future minor release.
   */
  retryOptions?: RetryOptions;
  
  /** Body transformation options */
  bodyOptions?: BodyOptions;
  
  /** AbortSignal for cancelling the request */
  signal?: AbortSignal;

  /** Pagination metadata for the request */
  pagination?: PaginationMetadata;
}
