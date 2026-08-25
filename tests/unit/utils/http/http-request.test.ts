import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { httpRequest } from '../../../../src/utils/http/http-request';
import { NetworkError } from '../../../../src/core/errors/network';
import { ServerError } from '../../../../src/core/errors/server';
import { CONTENT_TYPES } from '../../../../src/utils/constants/headers';
import { HTTP_TEST_CONSTANTS, TEST_CONSTANTS } from '../../../utils/constants';

const JSON_HEADERS = { 'content-type': CONTENT_TYPES.JSON };
const TEXT_HEADERS = { 'content-type': 'text/plain' };

/** Retries with no delay keep the attempt-count assertions fast without faking timers. */
const IMMEDIATE_RETRIES = { initialDelayMs: 0 };

function jsonResponse(body: unknown, status: number = HTTP_TEST_CONSTANTS.STATUS_OK): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

let fetchMock: Mock<typeof fetch>;

/**
 * `httpRequest` always calls fetch with a string URL and a plain-object `headers`, so these
 * accessors narrow to that shape once, with a runtime guard, rather than casting per assertion.
 */
function sentUrl(callIndex = 0): string {
  const url = fetchMock.mock.calls[callIndex]?.[0];
  if (typeof url !== 'string') throw new Error(`fetch call ${callIndex} had no string URL`);
  return url;
}

function sentInit(callIndex = 0): RequestInit & { headers: Record<string, string> } {
  const init = fetchMock.mock.calls[callIndex]?.[1];
  if (!init) throw new Error(`fetch call ${callIndex} had no init`);
  return init as RequestInit & { headers: Record<string, string> };
}

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>();
  global.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('httpRequest', () => {
  it('returns the parsed JSON body of a successful response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    const response = await httpRequest(HTTP_TEST_CONSTANTS.URL);

    expect(response.ok).toBe(true);
    expect(response.status).toBe(HTTP_TEST_CONSTANTS.STATUS_OK);
    expect(response.data).toEqual(HTTP_TEST_CONSTANTS.JSON_BODY);
    expect(response.headers['content-type']).toBe(CONTENT_TYPES.JSON);
  });

  it('resolves rather than throwing when the server answers with a non-2xx status', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: TEST_CONSTANTS.ERROR_MESSAGE }, HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND));

    const response = await httpRequest(HTTP_TEST_CONSTANTS.URL);

    expect(response.ok).toBe(false);
    expect(response.status).toBe(HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND);
    expect(response.data).toEqual({ message: TEST_CONSTANTS.ERROR_MESSAGE });
  });

  it('sends no UiPath authentication or tracing headers', async () => {
    fetchMock.mockResolvedValue(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    await httpRequest(HTTP_TEST_CONSTANTS.URL, {
      headers: { [HTTP_TEST_CONSTANTS.API_KEY_HEADER]: HTTP_TEST_CONSTANTS.API_KEY_VALUE },
    });

    const sentHeaders = sentInit().headers;
    const headerNames = Object.keys(sentHeaders).map((name) => name.toLowerCase());

    expect(sentHeaders[HTTP_TEST_CONSTANTS.API_KEY_HEADER]).toBe(HTTP_TEST_CONSTANTS.API_KEY_VALUE);
    expect(headerNames).not.toContain('authorization');
    expect(headerNames).not.toContain('traceparent');
    expect(headerNames).not.toContain('x-uipath-traceparent-id');
  });

  it('appends query parameters, repeating array values', async () => {
    fetchMock.mockResolvedValue(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    await httpRequest(HTTP_TEST_CONSTANTS.URL, { params: { status: ['open', 'closed'], page: 2 } });

    expect(sentUrl()).toBe(`${HTTP_TEST_CONSTANTS.URL}?status=open&status=closed&page=2`);
  });

  it('omits null and undefined query parameters rather than sending them as strings', async () => {
    fetchMock.mockResolvedValue(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    await httpRequest(HTTP_TEST_CONSTANTS.URL, {
      params: { keep: 'yes', drop: undefined, alsoDrop: null, list: ['a', 'b'] },
    });

    const sent = sentUrl();
    expect(sent).toBe(`${HTTP_TEST_CONSTANTS.URL}?keep=yes&list=a&list=b`);
    expect(sent).not.toContain('undefined');
    expect(sent).not.toContain('null');
  });

  it('merges query parameters into a URL that already has a query string', async () => {
    fetchMock.mockResolvedValue(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    await httpRequest(HTTP_TEST_CONSTANTS.URL_WITH_QUERY, { params: { size: 10 } });

    expect(sentUrl()).toBe(`${HTTP_TEST_CONSTANTS.URL_WITH_QUERY}&size=10`);
  });

  it('serializes a plain object body as JSON and sets the content type', async () => {
    fetchMock.mockResolvedValue(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    await httpRequest(HTTP_TEST_CONSTANTS.URL, { method: 'POST', body: HTTP_TEST_CONSTANTS.JSON_BODY });

    const init = sentInit();
    expect(init.body).toBe(JSON.stringify(HTTP_TEST_CONSTANTS.JSON_BODY));
    expect(init.headers['content-type']).toBe(CONTENT_TYPES.JSON);
  });

  it('keeps a caller-supplied content type instead of overwriting it', async () => {
    fetchMock.mockResolvedValue(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    await httpRequest(HTTP_TEST_CONSTANTS.URL, {
      method: 'POST',
      headers: { 'Content-Type': CONTENT_TYPES.XML },
      body: HTTP_TEST_CONSTANTS.JSON_BODY,
    });

    const sentHeaders = sentInit().headers;
    expect(sentHeaders['Content-Type']).toBe(CONTENT_TYPES.XML);
    expect(sentHeaders['content-type']).toBeUndefined();
  });

  it('passes a string body through without serializing it again', async () => {
    fetchMock.mockResolvedValue(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    await httpRequest(HTTP_TEST_CONSTANTS.URL, { method: 'POST', body: HTTP_TEST_CONSTANTS.TEXT_BODY });

    const init = sentInit();
    expect(init.body).toBe(HTTP_TEST_CONSTANTS.TEXT_BODY);
    expect(init.headers['content-type']).toBeUndefined();
  });
});

describe('httpRequest body parsing', () => {
  it('returns text when the response is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response(HTTP_TEST_CONSTANTS.TEXT_BODY, { headers: TEXT_HEADERS }));

    const response = await httpRequest(HTTP_TEST_CONSTANTS.URL);

    expect(response.data).toBe(HTTP_TEST_CONSTANTS.TEXT_BODY);
  });

  it('returns undefined data for a 204 response', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: HTTP_TEST_CONSTANTS.STATUS_NO_CONTENT }));

    const response = await httpRequest(HTTP_TEST_CONSTANTS.URL);

    expect(response.data).toBeUndefined();
  });

  it('falls back to raw text when an auto-detected JSON body does not parse', async () => {
    fetchMock.mockResolvedValue(
      new Response(HTTP_TEST_CONSTANTS.MALFORMED_JSON_BODY, { headers: JSON_HEADERS })
    );

    const response = await httpRequest(HTTP_TEST_CONSTANTS.URL);

    expect(response.data).toBe(HTTP_TEST_CONSTANTS.MALFORMED_JSON_BODY);
  });

  it('throws a ServerError when JSON was requested explicitly but the body does not parse', async () => {
    fetchMock.mockResolvedValue(
      new Response(HTTP_TEST_CONSTANTS.MALFORMED_JSON_BODY, { headers: JSON_HEADERS })
    );

    await expect(httpRequest(HTTP_TEST_CONSTANTS.URL, { responseType: 'json' })).rejects.toBeInstanceOf(
      ServerError
    );
  });

  it('returns a Blob when responseType is blob', async () => {
    fetchMock.mockResolvedValue(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    const response = await httpRequest(HTTP_TEST_CONSTANTS.URL, { responseType: 'blob' });

    expect(response.data).toBeInstanceOf(Blob);
  });

  it('returns an ArrayBuffer when responseType is arraybuffer', async () => {
    fetchMock.mockResolvedValue(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    const response = await httpRequest(HTTP_TEST_CONSTANTS.URL, { responseType: 'arraybuffer' });

    expect(response.data).toBeInstanceOf(ArrayBuffer);
  });

  it('returns the unread stream when responseType is stream', async () => {
    fetchMock.mockResolvedValue(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    const response = await httpRequest(HTTP_TEST_CONSTANTS.URL, { responseType: 'stream' });

    expect(response.data).toBeInstanceOf(ReadableStream);
  });

  it.each(['json', 'text', 'blob', 'arraybuffer', 'stream'] as const)(
    'returns undefined data for a 204 regardless of responseType (%s)',
    async (responseType) => {
      fetchMock.mockResolvedValue(new Response(null, { status: HTTP_TEST_CONSTANTS.STATUS_NO_CONTENT }));

      const response = await httpRequest(HTTP_TEST_CONSTANTS.URL, { responseType });

      expect(response.data).toBeUndefined();
    }
  );

  it('reads the body as text when responseType is text, even for a JSON content type', async () => {
    fetchMock.mockResolvedValue(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    const response = await httpRequest(HTTP_TEST_CONSTANTS.URL, { responseType: 'text' });

    expect(response.data).toBe(JSON.stringify(HTTP_TEST_CONSTANTS.JSON_BODY));
  });
});

describe('httpRequest retries', () => {
  it('retries a GET on a retryable status and returns the eventual success', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: HTTP_TEST_CONSTANTS.STATUS_SERVICE_UNAVAILABLE }))
      .mockResolvedValueOnce(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    const response = await httpRequest(HTTP_TEST_CONSTANTS.URL, { retry: IMMEDIATE_RETRIES });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.ok).toBe(true);
  });

  it('returns the last retryable response once the attempts are exhausted', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR }));

    const response = await httpRequest(HTTP_TEST_CONSTANTS.URL, { retry: IMMEDIATE_RETRIES });

    expect(fetchMock).toHaveBeenCalledTimes(HTTP_TEST_CONSTANTS.MAX_RETRIES + 1);
    expect(response.status).toBe(HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR);
  });

  it('does not retry a POST by default', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: HTTP_TEST_CONSTANTS.STATUS_SERVICE_UNAVAILABLE }));

    const response = await httpRequest(HTTP_TEST_CONSTANTS.URL, {
      method: 'POST',
      retry: IMMEDIATE_RETRIES,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(HTTP_TEST_CONSTANTS.STATUS_SERVICE_UNAVAILABLE);
  });

  it('retries a POST when the caller opts it into retryMethods', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: HTTP_TEST_CONSTANTS.STATUS_SERVICE_UNAVAILABLE }))
      .mockResolvedValueOnce(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    await httpRequest(HTTP_TEST_CONSTANTS.URL, {
      method: 'POST',
      retry: { ...IMMEDIATE_RETRIES, retryMethods: ['GET', 'HEAD', 'POST'] },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry when maxRetries is 0', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR }));

    await httpRequest(HTTP_TEST_CONSTANTS.URL, { retry: { maxRetries: 0 } });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a status outside retryableStatusCodes', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: HTTP_TEST_CONSTANTS.STATUS_NOT_FOUND }));

    await httpRequest(HTTP_TEST_CONSTANTS.URL, { retry: IMMEDIATE_RETRIES });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws a NetworkError once a transport failure has exhausted the retries', async () => {
    fetchMock.mockRejectedValue(new Error(HTTP_TEST_CONSTANTS.TRANSPORT_ERROR_MESSAGE));

    await expect(
      httpRequest(HTTP_TEST_CONSTANTS.URL, { retry: IMMEDIATE_RETRIES })
    ).rejects.toBeInstanceOf(NetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(HTTP_TEST_CONSTANTS.MAX_RETRIES + 1);
  });

  it('waits the backoff delay between attempts', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR }))
      .mockResolvedValueOnce(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    const pending = httpRequest(HTTP_TEST_CONSTANTS.URL, {
      retry: { initialDelayMs: HTTP_TEST_CONSTANTS.RETRY_DELAY_MS },
    });

    await vi.advanceTimersByTimeAsync(HTTP_TEST_CONSTANTS.RETRY_DELAY_MS - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('waits the Retry-After duration instead of the computed backoff', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: HTTP_TEST_CONSTANTS.STATUS_TOO_MANY_REQUESTS,
          headers: { 'retry-after': String(HTTP_TEST_CONSTANTS.RETRY_AFTER_SECONDS) },
        })
      )
      .mockResolvedValueOnce(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    const pending = httpRequest(HTTP_TEST_CONSTANTS.URL, {
      retry: { initialDelayMs: HTTP_TEST_CONSTANTS.RETRY_DELAY_MS },
    });

    await vi.advanceTimersByTimeAsync(HTTP_TEST_CONSTANTS.RETRY_DELAY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(HTTP_TEST_CONSTANTS.RETRY_AFTER_SECONDS * 1000);
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ignores Retry-After when respectRetryAfter is false', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: HTTP_TEST_CONSTANTS.STATUS_TOO_MANY_REQUESTS,
          headers: { 'retry-after': String(HTTP_TEST_CONSTANTS.RETRY_AFTER_SECONDS) },
        })
      )
      .mockResolvedValueOnce(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    const pending = httpRequest(HTTP_TEST_CONSTANTS.URL, {
      retry: { initialDelayMs: HTTP_TEST_CONSTANTS.RETRY_DELAY_MS, respectRetryAfter: false },
    });

    await vi.advanceTimersByTimeAsync(HTTP_TEST_CONSTANTS.RETRY_DELAY_MS);
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('httpRequest cancellation', () => {
  it('throws a NetworkError when the per-attempt timeout elapses', async () => {
    fetchMock.mockImplementation((_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      })
    );

    await expect(
      httpRequest(HTTP_TEST_CONSTANTS.URL, { timeoutMs: 1, retry: { maxRetries: 0 } })
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it('applies a timeout with no retry settings supplied at all', async () => {
    fetchMock.mockImplementation((_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      })
    );

    // The point of keeping `timeoutMs` off RetryOptions: bounding one attempt should not
    // require opening — or disabling — a bag of retry options.
    await expect(httpRequest(HTTP_TEST_CONSTANTS.URL, { timeoutMs: 1 })).rejects.toBeInstanceOf(
      NetworkError
    );
  });

  it('stops immediately when the caller aborts, without consuming a retry', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation((_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        controller.abort(new Error('cancelled by caller'));
      })
    );

    await expect(
      httpRequest(HTTP_TEST_CONSTANTS.URL, { signal: controller.signal, retry: IMMEDIATE_RETRIES })
    ).rejects.toBeInstanceOf(NetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('httpRequest retry eligibility', () => {
  function unavailable(): Response {
    return new Response(null, { status: HTTP_TEST_CONSTANTS.STATUS_SERVICE_UNAVAILABLE });
  }

  it.each(['PUT', 'DELETE', 'OPTIONS'] as const)(
    'retries %s by default, since it is idempotent',
    async (method) => {
      fetchMock.mockResolvedValue(unavailable());

      await httpRequest(HTTP_TEST_CONSTANTS.URL, { method, retry: IMMEDIATE_RETRIES });

      expect(fetchMock).toHaveBeenCalledTimes(HTTP_TEST_CONSTANTS.MAX_RETRIES + 1);
    }
  );

  it.each(['POST', 'PATCH'] as const)('does not retry %s by default', async (method) => {
    fetchMock.mockResolvedValue(unavailable());

    await httpRequest(HTTP_TEST_CONSTANTS.URL, { method, retry: IMMEDIATE_RETRIES });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a ReadableStream body, which cannot be replayed', async () => {
    fetchMock.mockResolvedValue(unavailable());
    const body = new ReadableStream({ start: (controller) => controller.close() });

    await httpRequest(HTTP_TEST_CONSTANTS.URL, {
      method: 'PUT',
      body,
      retry: IMMEDIATE_RETRIES,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a transport failure by default', async () => {
    fetchMock.mockRejectedValue(new Error(HTTP_TEST_CONSTANTS.TRANSPORT_ERROR_MESSAGE));

    await expect(
      httpRequest(HTTP_TEST_CONSTANTS.URL, { retry: IMMEDIATE_RETRIES })
    ).rejects.toBeInstanceOf(NetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(HTTP_TEST_CONSTANTS.MAX_RETRIES + 1);
  });

  it('does not retry a transport failure when retryNetworkErrors is false', async () => {
    fetchMock.mockRejectedValue(new Error(HTTP_TEST_CONSTANTS.TRANSPORT_ERROR_MESSAGE));

    await expect(
      httpRequest(HTTP_TEST_CONSTANTS.URL, { retry: { ...IMMEDIATE_RETRIES, retryNetworkErrors: false } })
    ).rejects.toBeInstanceOf(NetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still retries a retryable status when retryNetworkErrors is false', async () => {
    fetchMock.mockResolvedValue(unavailable());

    await httpRequest(HTTP_TEST_CONSTANTS.URL, {
      retry: { ...IMMEDIATE_RETRIES, retryNetworkErrors: false },
    });

    expect(fetchMock).toHaveBeenCalledTimes(HTTP_TEST_CONSTANTS.MAX_RETRIES + 1);
  });
});

describe('httpRequest backoff strategies', () => {
  function retryAfterResponse(seconds: number): Response {
    return new Response(null, {
      status: HTTP_TEST_CONSTANTS.STATUS_TOO_MANY_REQUESTS,
      headers: { 'retry-after': String(seconds) },
    });
  }

  it('waits a linearly growing delay under the linear backoffStrategy', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(new Response(null, { status: HTTP_TEST_CONSTANTS.STATUS_SERVER_ERROR }));

    const pending = httpRequest(HTTP_TEST_CONSTANTS.URL, {
      retry: { backoffStrategy: 'linear', initialDelayMs: HTTP_TEST_CONSTANTS.RETRY_DELAY_MS, maxRetries: 2 },
    });

    await vi.advanceTimersByTimeAsync(HTTP_TEST_CONSTANTS.RETRY_DELAY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // second delay is 2x the first, so the same advance is not yet enough
    await vi.advanceTimersByTimeAsync(HTTP_TEST_CONSTANTS.RETRY_DELAY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(HTTP_TEST_CONSTANTS.RETRY_DELAY_MS);
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('honours a Retry-After longer than backoffMaxDelayMs', async () => {
    vi.useFakeTimers();
    const retryAfterMs = HTTP_TEST_CONSTANTS.RETRY_AFTER_SECONDS * 1000;
    fetchMock
      .mockResolvedValueOnce(retryAfterResponse(HTTP_TEST_CONSTANTS.RETRY_AFTER_SECONDS))
      .mockResolvedValueOnce(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    const pending = httpRequest(HTTP_TEST_CONSTANTS.URL, {
      // a cap well below the header value — it must not clamp the server's instruction
      retry: { backoffMaxDelayMs: 10, initialDelayMs: 10 },
    });

    await vi.advanceTimersByTimeAsync(retryAfterMs - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clamps Retry-After at maxRetryAfterMs when one is supplied', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(retryAfterResponse(HTTP_TEST_CONSTANTS.RETRY_AFTER_SECONDS))
      .mockResolvedValueOnce(jsonResponse(HTTP_TEST_CONSTANTS.JSON_BODY));

    const pending = httpRequest(HTTP_TEST_CONSTANTS.URL, {
      retry: { maxRetryAfterMs: HTTP_TEST_CONSTANTS.TIMEOUT_MS },
    });

    await vi.advanceTimersByTimeAsync(HTTP_TEST_CONSTANTS.TIMEOUT_MS);
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
