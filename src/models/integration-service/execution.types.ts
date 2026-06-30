/**
 * Integration Service — Execution passthrough types.
 */

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
export interface ExecuteOptions {
  /** Body to send for POST/PUT/PATCH. Serialized as JSON. */
  body?: unknown;
  /** Query string parameters. */
  queryParams?: Record<string, string>;
  /** Folder key (GUID) to scope the call via `x-uipath-folderkey`. */
  folderKey?: string;
}
