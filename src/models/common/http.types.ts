import type { HttpMethod, Headers, QueryParams, ResponseType } from './request-spec';

/** How the wait between retries grows. */
export type BackoffStrategy = 'constant' | 'linear' | 'exponential';

/** How a failed request is retried. */
export interface RetryOptions {
  /**
   * How many extra tries after the first. `0` turns retrying off.
   * @default 2
   */
  maxRetries?: number;

  /**
   * How long to wait before the first retry, in ms. Later waits grow from this.
   * @default 500
   */
  initialDelayMs?: number;

  /**
   * How the wait grows. For a delay `d` and factor `f`:
   * `constant` d, d, d | `linear` d, 2d, 3d | `exponential` d, d×f, d×f².
   * @default 'exponential'
   */
  backoffStrategy?: BackoffStrategy;

  /**
   * The multiplier. Used by `'exponential'` only.
   * @default 2
   */
  backoffFactor?: number;

  /**
   * Longest wait allowed, in ms. A `Retry-After` wait uses `maxRetryAfterMs` instead.
   * @default 30000
   */
  backoffMaxDelayMs?: number;

  /**
   * Which statuses are worth retrying.
   * @default [408, 429, 500, 502, 503, 504]
   */
  retryableStatusCodes?: number[];

  /**
   * Which methods are worth retrying. Defaults to the ones RFC 9110 says are safe to repeat.
   * @default ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']
   */
  retryMethods?: HttpMethod[];

  /**
   * Retry when the request never reached the server.
   * @default true
   */
  retryNetworkErrors?: boolean;

  /**
   * Let a `Retry-After` header decide the wait instead.
   * @default true
   */
  respectRetryAfter?: boolean;

  /**
   * Longest `Retry-After` wait allowed, in ms. Unlimited by default.
   * @default Infinity
   */
  maxRetryAfterMs?: number;

  /**
   * Base delay between retries in milliseconds.
   *
   * @deprecated Use {@link RetryOptions.initialDelayMs}. Still honoured when
   * `initialDelayMs` is not supplied; scheduled for removal in a future minor release.
   */
  retryDelay?: number;

  /**
   * Whether to use exponential backoff.
   *
   * @deprecated Use {@link RetryOptions.backoffStrategy} — `true` maps to `'exponential'` and
   * `false` to `'constant'`. Still honoured when `backoffStrategy` is not supplied; scheduled for
   * removal in a future minor release.
   */
  useExponentialBackoff?: boolean;
}

/**
 * Options for a single HTTP call made with `httpRequest`.
 */
export interface HttpRequestInit {
  /**
   * Request method.
   * @default 'GET'
   */
  method?: HttpMethod;

  /** Headers to send with the request. */
  headers?: Headers;

  /**
   * Request body. Objects and arrays are sent as JSON; strings, `FormData`, `Blob`,
   * `ArrayBuffer` and `URLSearchParams` are sent as-is.
   */
  body?: unknown;

  /** Query parameters appended to the URL. Array values are sent as repeated parameters. */
  params?: QueryParams;

  /** How to read the body. By default JSON is parsed and everything else is text. */
  responseType?: ResponseType;

  /** How long one attempt may take, in ms. Each retry gets a fresh one. No limit by default. */
  timeoutMs?: number;

  /** How to retry this call. */
  retry?: RetryOptions;

  /** Cancels the request, including a retry that is waiting. */
  signal?: AbortSignal;
}

/**
 * What `httpRequest` returns. Every status the server sent comes back here, including 4xx and
 * 5xx, so check `ok` or `status` instead of catching.
 */
export interface HttpResponse {
  /** Response status code. */
  status: number;

  /** The status text. Empty on HTTP/2, which does not send one. */
  statusText: string;

  /** True when the status is 200–299. */
  ok: boolean;

  /** Response headers. Names are lowercased. */
  headers: Record<string, string>;

  /**
   * The parsed body, or `undefined` if there was none. It is `unknown` because a failed call
   * returns an error payload rather than what you asked for. Check `ok`, then narrow it.
   */
  data: unknown;

  /** The URL the response came from, after any redirects. */
  url: string;

  /** Whether the request was redirected. Often the reason an API returns 200 with HTML. */
  redirected: boolean;
}
