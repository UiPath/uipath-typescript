/**
 * Integration Service — Execution passthrough types.
 */

import { IntegrationServiceFolderContextOptions } from './integration-service.types';
import type { RetryOptions } from '../common/http.types';

/**
 * HTTP method for an execute call.
 */
export type ExecuteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Result envelope returned by {@link execute}.
 *
 * Unlike most SDK methods this *does not* throw on non-2xx responses — the
 * caller inspects `ok` / `status` and `body` to handle connector-specific
 * errors. This is required because the underlying Integration Service API
 * proxies arbitrary third-party HTTP calls, and the body carries vendor
 * error details that callers need to surface.
 */
export interface ExecuteResult {
  /** True for HTTP 2xx responses. */
  ok: boolean;
  /** HTTP status code from the underlying call. */
  status: number;
  /** HTTP status text from the underlying call. */
  statusText: string;
  /** Parsed JSON body when the response is JSON, raw text otherwise. */
  body: unknown;
  /** Response headers as a flat record. */
  headers: Record<string, string>;
}

/**
 * Options accepted by {@link execute}.
 */
export interface ExecuteOptions extends IntegrationServiceFolderContextOptions {
  /** Body to send for POST/PUT/PATCH. Serialized as JSON. */
  body?: unknown;
  /** Query string parameters. */
  queryParams?: Record<string, string>;
  /**
   * Retry and backoff behavior for this call. Retrying is off unless `maxRetries` is set.
   *
   * Only the idempotent methods of RFC 9110 (`GET`, `HEAD`, `PUT`, `DELETE`, `OPTIONS`) are
   * retried by default — a replayed `POST` can create the same record twice through the
   * connector. To retry a `POST` or `PATCH`, list it explicitly in `retryMethods`.
   */
  retry?: RetryOptions;
  /**
   * Timeout for a single attempt, in milliseconds. Applies whether or not retrying is enabled;
   * each retry starts a fresh timeout. Unbounded by default.
   */
  timeoutMs?: number;
  /** Signal for cancelling the request, including any pending retry. */
  signal?: AbortSignal;
}
