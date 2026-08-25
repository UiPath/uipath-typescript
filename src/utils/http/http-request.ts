import type { HttpRequestInit, HttpResponse } from '../../models/common/http.types';
import type { ResponseType } from '../../models/common/request-spec';
import { CONTENT_TYPES, RESPONSE_TYPES } from '../constants/headers';
import { ErrorFactory } from '../../core/errors/error-factory';
import { ServerError } from '../../core/errors/server';
import { appendSearchParams } from './params';
import { fetchWithRetry } from './fetch-with-retry';
import { resolveRetryOptions } from './retry-policy';

const CONTENT_TYPE_HEADER = 'content-type';
const JSON_CONTENT_TYPE = /\bjson\b/i;

/** Body shapes `fetch` already knows how to send; everything else is serialized as JSON. */
function isNativeBody(body: unknown): body is BodyInit {
  return (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    body instanceof ReadableStream
  );
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === name);
}

/** `Headers` is not iterable under the SDK's TS lib target, so collect it by callback. */
function collectHeaders(headers: Headers): Record<string, string> {
  const collected: Record<string, string> = {};
  headers.forEach((value, key) => {
    collected[key.toLowerCase()] = value;
  });
  return collected;
}

interface PreparedBody {
  body?: BodyInit;
  contentType?: string;
}

function prepareBody(body: unknown): PreparedBody {
  if (body === undefined || body === null) return {};
  if (isNativeBody(body)) return { body };
  return { body: JSON.stringify(body), contentType: CONTENT_TYPES.JSON };
}

async function readBody(response: Response, responseType?: ResponseType): Promise<unknown> {
  if (response.status === 204) return undefined;

  switch (responseType) {
    case RESPONSE_TYPES.BLOB:
      return response.blob();
    case RESPONSE_TYPES.ARRAYBUFFER:
      return response.arrayBuffer();
    case RESPONSE_TYPES.STREAM:
      return response.body;
    case RESPONSE_TYPES.TEXT:
      return response.text();
    default:
      break;
  }

  const text = await response.text();
  if (!text) return undefined;

  const isJson = JSON_CONTENT_TYPE.test(response.headers.get(CONTENT_TYPE_HEADER) ?? '');
  if (responseType !== RESPONSE_TYPES.JSON && !isJson) return text;

  try {
    return JSON.parse(text);
  } catch (error) {
    // Auto-detection is a guess — a host can label an HTML error page as JSON, so fall back to
    // the raw text rather than failing a request the server actually answered. When the caller
    // asked for JSON explicitly, an unparseable body is a real problem worth surfacing.
    if (responseType !== RESPONSE_TYPES.JSON) return text;
    throw new ServerError({
      message: `Failed to parse response as JSON (${response.status} ${response.url}): ${(error as Error).message}`,
      statusCode: response.status,
    });
  }
}

/**
 * Sends an HTTP request to any URL, with optional retries and exponential backoff.
 *
 * This helper carries no UiPath authentication and adds no UiPath headers — it is a plain
 * `fetch` convenience for arbitrary endpoints. Pass `retry` to control retry behavior; by
 * default the idempotent methods are retried up to twice on a transient failure, and `POST` and
 * `PATCH` are not retried at all.
 *
 * Unlike the SDK's service methods, this never throws because of the response status: a 404 or a
 * 500 comes back as a resolved response with `ok: false`. A transport failure — a request that
 * never produced a response — throws as a {@link NetworkError}. The one other throwing case is
 * asking for `responseType: 'json'` explicitly and receiving a body that does not parse, which
 * raises a {@link ServerError}.
 *
 * @param url - Absolute URL to send the request to
 * @param init - Request method, headers, body, query parameters, timeout, and retry behavior
 * @returns A promise resolving to an {@link HttpResponse} carrying the status, headers, and parsed
 * body. `data` is `unknown` — narrow or validate it once you have checked `ok`, since the body is
 * the shape you expect only on a success, an error payload on a 4xx or 5xx, and absent on a 204.
 *
 * @example
 * ```typescript
 * import { httpRequest } from '@uipath/uipath-typescript';
 *
 * const response = await httpRequest('https://api.example.com/v1/orders');
 * if (response.ok) {
 *   console.log(response.data);
 * } else {
 *   console.log('Request failed with status', response.status);
 * }
 * ```
 *
 * @example
 * ```typescript
 * import { httpRequest } from '@uipath/uipath-typescript';
 *
 * // POST with a JSON body, a per-attempt timeout, and retries enabled for a non-idempotent method
 * const response = await httpRequest('https://api.example.com/v1/orders', {
 *   method: 'POST',
 *   headers: { 'x-api-key': '<apiKey>' },
 *   body: { sku: 'ABC-123', quantity: 2 },
 *   timeoutMs: 10000,
 *   retry: {
 *     maxRetries: 4,
 *     initialDelayMs: 1000,
 *     backoffStrategy: 'linear',
 *     retryMethods: ['GET', 'HEAD', 'POST']
 *   }
 * });
 *
 * if (response.ok) {
 *   // `data` is unknown, so give it a shape once you know the call succeeded
 *   const order = response.data as { id: string };
 *   console.log(response.status, order.id);
 * }
 * ```
 */
export async function httpRequest(
  url: string,
  init: HttpRequestInit = {}
): Promise<HttpResponse> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = { ...init.headers };

  const { body, contentType } = prepareBody(init.body);
  if (contentType && !hasHeader(headers, CONTENT_TYPE_HEADER)) {
    headers[CONTENT_TYPE_HEADER] = contentType;
  }

  const settings = resolveRetryOptions(init.retry);

  let response: Response;
  try {
    response = await fetchWithRetry(
      appendSearchParams(url, init.params),
      { method, headers, body },
      { retry: settings, timeoutMs: init.timeoutMs, signal: init.signal }
    );
  } catch (error) {
    throw ErrorFactory.createNetworkError(error);
  }

  return {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: collectHeaders(response.headers),
    data: await readBody(response, init.responseType),
    url: response.url,
  };
}
