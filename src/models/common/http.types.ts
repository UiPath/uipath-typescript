import type { HttpMethod, Headers, QueryParams, ResponseType } from './request-spec';

/**
 * How the delay between retries grows with each attempt.
 */
export type BackoffStrategy = 'constant' | 'linear' | 'exponential';

/**
 * Retry and backoff behavior applied to a single HTTP call.
 *
 * A call is retried when the transport fails (the connection never produced a response) or when
 * the server answers with a status listed in `retryableStatusCodes` — and only when the request
 * method is listed in `retryMethods`. Non-idempotent methods are excluded by default because a
 * retried POST can create the same resource twice.
 *
 * The delay before each retry grows from `initialDelayMs` according to `backoffStrategy`, capped at
 * `backoffMaxDelayMs`.
 */
export interface RetryOptions {
  /**
   * Number of additional attempts after the first one. `0` disables retrying.
   *
   * The default depends on who is making the call: `httpRequest` retries twice, while SDK
   * service methods do not retry at all unless a caller asks them to.
   * @default 2 for `httpRequest`, 0 for SDK service methods
   */
  maxRetries?: number;

  /**
   * Delay before the *first* retry, in milliseconds. Later delays grow from this value according
   * to `backoffStrategy` — it is the starting point, not a fixed gap between attempts (except
   * under `'constant'`, where it is both).
   * @default 500
   */
  initialDelayMs?: number;

  /**
   * How the delay grows between attempts, given an `initialDelayMs` of `d` and a
   * `backoffFactor` of `f`:
   *
   * - `constant` — `d, d, d, …`
   * - `linear` — `d, 2d, 3d, …`
   * - `exponential` — `d, d×f, d×f², …`
   *
   * @default 'exponential'
   */
  backoffStrategy?: BackoffStrategy;

  /**
   * Multiplier applied to the delay after each attempt. Used only when `backoffStrategy` is
   * `'exponential'`; ignored by the other strategies.
   * @default 2
   */
  backoffFactor?: number;

  /**
   * Upper bound for any single computed delay, in milliseconds. Does not apply to a delay taken
   * from a `Retry-After` header — see `maxRetryAfterMs` for that.
   * @default 30000
   */
  backoffMaxDelayMs?: number;

  /**
   * Response status codes that make the call eligible for a retry.
   * @default [408, 429, 500, 502, 503, 504]
   */
  retryableStatusCodes?: number[];

  /**
   * Request methods eligible for a retry. Defaults to the idempotent methods defined by
   * RFC 9110 — replaying any of these leaves the server in the same state as a single call.
   * @default ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']
   */
  retryMethods?: HttpMethod[];

  /**
   * Whether a request that never produced a response — a refused connection, a DNS failure, a
   * timeout — is eligible for a retry. Set to `false` to retry only on response status codes.
   * @default true
   */
  retryNetworkErrors?: boolean;

  /**
   * Whether a `Retry-After` response header overrides the computed backoff delay.
   * @default true
   */
  respectRetryAfter?: boolean;

  /**
   * Upper bound for a delay taken from a `Retry-After` header, in milliseconds. Unbounded by
   * default, so a server's explicit instruction is honoured as sent.
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
   * Request body. Plain objects and arrays are serialized as JSON and sent with a
   * `Content-Type: application/json` header unless one is already set. Strings, `FormData`,
   * `Blob`, `ArrayBuffer`, and `URLSearchParams` are sent as-is. A `ReadableStream` body is
   * also sent as-is, but disables retrying — a stream is consumed by the first attempt and
   * cannot be replayed.
   */
  body?: unknown;

  /** Query parameters appended to the URL. Array values are sent as repeated parameters. */
  params?: QueryParams;

  /**
   * How to read the response body. When omitted, a JSON `Content-Type` is parsed as JSON and
   * anything else is read as text.
   */
  responseType?: ResponseType;

  /**
   * Timeout for a single attempt, in milliseconds. Applies whether or not retrying is enabled;
   * when it is, each retry starts a fresh timeout. Unbounded by default.
   */
  timeoutMs?: number;

  /** Retry and backoff behavior for this call. */
  retry?: RetryOptions;

  /** Signal for cancelling the request, including any pending retry. */
  signal?: AbortSignal;
}

/**
 * The outcome of an `httpRequest` call. A response is returned for every status the server
 * produced — including 4xx and 5xx — so callers branch on `ok` or `status` rather than catching.
 */
export interface HttpResponse {
  /** Response status code. */
  status: number;

  /** Response status text, when the runtime supplies one. */
  statusText: string;

  /** Whether the status is in the 200–299 range. */
  ok: boolean;

  /** Response headers, with lowercased header names. */
  headers: Record<string, string>;

  /**
   * Parsed response body, or `undefined` when the response carried no body.
   *
   * Typed as `unknown` deliberately. The body is whatever the server sent: the shape you expect
   * on a 2xx, an error payload on a 4xx or 5xx, and nothing at all on a 204. Narrow or validate
   * it — usually after checking `ok` — rather than being promised a type that does not hold on
   * every path.
   */
  data: unknown;

  /** The final URL the response came from, after any redirects. */
  url: string;
}
