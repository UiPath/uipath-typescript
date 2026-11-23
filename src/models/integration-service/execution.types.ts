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

/**
 * A file sent with an {@link executeActivity} call.
 */
export interface ExecuteFile {
  /** Name of the form part the connector reads the file from, e.g. `file`. */
  name: string;
  /** The file's bytes. */
  content: Uint8Array | Blob;
  /** File name reported to the connector. */
  fileName?: string;
  /** Content type of the file. Defaults to `application/octet-stream`. */
  contentType?: string;
}

/**
 * Where a paged list stands after an {@link executeActivity} call.
 */
export interface ExecutePage {
  /** True when the connector has more records after this page. */
  hasMore: boolean;
  /** Token for the next page. Pass it as the `nextPage` query parameter to fetch that page. */
  nextPageToken: string;
}

/**
 * Result envelope returned by {@link executeActivity}.
 *
 * `body` is the parsed JSON when the response is JSON and the raw text otherwise. A file response
 * (a binary content type, or an attachment that is not JSON, XML, CSV or plain text) is a
 * `Uint8Array`.
 */
export interface ExecuteActivityResult extends ExecuteResult {
  /**
   * Paging state of a list response. Absent when the response is not a paged list, when the
   * connector reported its last page, or when `maxRecords` already gathered the pages.
   */
  page?: ExecutePage;
}

/**
 * Options accepted by {@link executeActivity}.
 *
 * A top-level key of `body` can be a path: `{ 'fields.summary': 'x' }` is sent as
 * `{ fields: { summary: 'x' } }`. A path can address an array item (`items[0].name`) or every
 * item of an array (`items[*].name`).
 */
export interface ExecuteActivityOptions extends ExecuteOptions {
  /**
   * Files to upload. The call is sent as a multipart form with one part per file, and a
   * non-empty `body` travels as a JSON part named by `bodyPartName`.
   */
  files?: ExecuteFile[];
  /** Name of the form part that carries `body` when `files` is set. Defaults to `body`. */
  bodyPartName?: string;
  /**
   * Names of the query parameters the connector marks as accepting a URL. A listed parameter
   * whose value is an http or https URL is sent Base64-encoded, which is the form the connector
   * expects for such a field.
   */
  urlInputFields?: string[];
  /**
   * Read a successful response as a file: `body` is a `Uint8Array` whatever content type the
   * connector reports. Without it a file is still detected from the response headers.
   */
  fileResponse?: boolean;
  /**
   * How many records a `GET` list call should return in total. The call follows the connector's
   * pages until it has this many records or the list ends, then returns them as one array.
   * Pass `-1` to fetch every record. Without it a single page is returned, with `page` on the
   * result when more records exist. Ignored for methods other than `GET`.
   */
  maxRecords?: number;
  /**
   * Version of the connector behind the connection, e.g. `4.0.0`. A connector of version 4 or
   * later runs its activities on the version 4 engine, and the call is sent there; without a
   * version, or with an earlier one, the call uses the version 3 engine.
   *
   * On the version 4 engine `objectName` names the activity's script, and `files`,
   * `bodyPartName`, `fileResponse`, `urlInputFields` and `maxRecords` are refused with a
   * `ValidationError`.
   */
  connectorVersion?: string;
  /**
   * Key of the connector behind the connection, e.g. `uipath-salesforce-slack`. Required on the
   * version 4 engine. Taken from the handle when the connection is a `resource.connection()`
   * handle.
   */
  connectorKey?: string;
  /**
   * Reference of the script the version 4 engine runs for this activity, as the activity's
   * metadata names it. Defaults to `objectName`. Refused without a version 4 connector.
   */
  scriptRef?: string;
  /** Headers the activity's script reads from the call. Refused without a version 4 connector. */
  headers?: Record<string, string>;
}

/**
 * Result returned by {@link executeHttp}.
 *
 * `ok`, `status`, `statusText`, `headers` and `body` describe the vendor's response, not the
 * Integration Service call that carried it. Like {@link execute}, this does not throw on
 * non-2xx responses.
 */
export interface ExecuteHttpResult extends ExecuteResult {
  /**
   * True when the vendor answered with a non-2xx status. False when the call failed before
   * reaching the vendor, in which case the fields describe the Integration Service response.
   */
  isVendorError: boolean;
}

/**
 * Options accepted by {@link executeHttp}.
 */
export interface ExecuteHttpOptions extends ExecuteOptions {
  /** Headers to send to the vendor. The connection's authentication is added for you. */
  headers?: Record<string, string>;
  /** Body to send to the vendor. A string is sent as is; anything else is serialized as JSON. */
  body?: unknown;
  /**
   * Retry and backoff behavior for this call. Retrying is off unless `maxRetries` is set.
   *
   * `retryMethods` is matched against the method sent to the vendor, so by default a `GET`
   * is retried and a `POST` is not. Only a failure of the Integration Service call itself is
   * retried; a vendor error status is returned as the result.
   */
  retry?: RetryOptions;
}
