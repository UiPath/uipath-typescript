import type { HttpRequestInit, HttpResponse } from '../../models/common/http.types';
import type { ResponseType } from '../../models/common/request-spec';
import { CONTENT_TYPES, RESPONSE_TYPES } from '../constants/headers';
import { ErrorFactory } from '../../core/errors/error-factory';
import { ServerError } from '../../core/errors/server';
import { ValidationError } from '../../core/errors/validation';
import { appendSearchParams } from './params';
import { fetchWithRetry } from './fetch-with-retry';
import { resolveRetryOptions } from './retry-policy';

const CONTENT_TYPE_HEADER = 'content-type';
const JSON_CONTENT_TYPE = /\bjson\b/i;

/** Types `fetch` can send as-is. Anything else becomes JSON. */
function isNativeBody(body: unknown): body is BodyInit {
  return (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  );
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === name);
}

/** `Headers` is not iterable under our TS lib setting, so read it with a callback. */
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
  // Rejected ahead of the JSON fallback, which would otherwise send a stream as "{}"
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
    throw new ValidationError({
      message: 'Streaming request bodies are not supported. Use a string, Blob, ArrayBuffer, FormData, or URLSearchParams.',
    });
  }
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
    // Guessing the type can be wrong — a server may label an HTML error page as JSON — so fall
    // back to text. If the caller asked for JSON, a body that will not parse is a real problem.
    if (responseType !== RESPONSE_TYPES.JSON) return text;
    throw new ServerError({
      message: `Failed to parse response as JSON (${response.status} ${response.url}): ${(error as Error).message}`,
      statusCode: response.status,
    });
  }
}

/**
 * Sends an HTTP request to any URL, with optional retries and backoff.
 *
 * Sends no UiPath authentication — it targets third-party endpoints. A non-2xx status resolves
 * with `ok: false` instead of throwing; only a request that never reached the server throws.
 *
 * @param url - Absolute URL to send the request to
 * @param init - Method, headers, body, query parameters, timeout, and retry behavior
 * @returns An {@link HttpResponse}. `data` is `unknown` — narrow it after checking `ok`.
 *
 * @example
 * ```typescript
 * import { httpRequest } from '@uipath/uipath-typescript/core';
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
 * import { httpRequest } from '@uipath/uipath-typescript/core';
 *
 * // POST with retries, which are off for non-idempotent methods by default
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
    redirected: response.redirected,
  };
}
