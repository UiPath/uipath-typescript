/** The retry loop around `fetch`. Used by both `httpRequest` and ApiClient. */

import type { HttpMethod } from '../../models/common/request-spec';
import type { ResolvedRetryOptions } from '../../models/common/http.internal-types';
import { computeBackoffDelay, parseRetryAfter } from './retry-policy';

/**
 * Waits for a fixed duration before resolving.
 *
 * @param durationMs - How long to wait, in milliseconds.
 * @returns A promise that resolves once the duration has elapsed.
 *
 * @example
 * ```typescript
 * import { wait } from '@uipath/uipath-typescript/core';
 *
 * await wait(1000); // pause for one second
 * ```
 */
export function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, durationMs)));
}

const RETRY_AFTER = 'retry-after';

interface AttemptSignal {
  signal?: AbortSignal;
  dispose: () => void;
}

/**
 * Builds the signal for one attempt. With no timeout it is just the caller's signal; otherwise it
 * aborts on whichever comes first. Written by hand because older browsers lack `AbortSignal.any()`.
 */
function createAttemptSignal(timeoutMs: number | undefined, external?: AbortSignal): AttemptSignal {
  if (timeoutMs === undefined || !Number.isFinite(timeoutMs)) return { signal: external, dispose: () => {} };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
  const onExternalAbort = () => controller.abort(external?.reason);

  if (external) {
    if (external.aborted) {
      controller.abort(external.reason);
    } else {
      external.addEventListener('abort', onExternalAbort);
    }
  }

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      external?.removeEventListener('abort', onExternalAbort);
    },
  };
}

/** Waits before the next try, stopping early if the caller cancels. */
function delayBeforeRetry(durationMs: number, signal?: AbortSignal): Promise<void> {
  if (!signal) return wait(durationMs);
  if (signal.aborted) return Promise.reject(signal.reason);

  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, Math.max(0, durationMs));

    signal.addEventListener('abort', onAbort);
  });
}

/** What the loop needs besides the request itself. */
export interface FetchWithRetryOptions {
  /**
   * Retry options with defaults already applied. Each caller applies its own, so the loop does not
   * need to know who is calling. Required, so nobody picks up another caller's defaults by mistake.
   */
  retry: ResolvedRetryOptions;
  /** How long one attempt may take, in ms. Each retry gets a fresh one. */
  timeoutMs?: number;
  /** Cancels the call, both mid-request and while waiting to retry. */
  signal?: AbortSignal;
}

/**
 * Runs a `fetch`, retrying failed connections and retryable statuses.
 *
 * Any status the server sent is returned; a retryable one only after the tries run out. A failed
 * connection throws after the last try. A cancel by the caller throws straight away.
 */
export async function fetchWithRetry(
  url: string,
  init: Omit<RequestInit, 'signal'>,
  options: FetchWithRetryOptions
): Promise<Response> {
  // `init.signal` is left out of the type on purpose: the loop makes a new signal per attempt and
  // would overwrite one passed here. Pass cancellation in `options` instead.
  const settings = options.retry;
  const method = (init.method ?? 'GET').toUpperCase() as HttpMethod;
  const retriesAllowed = settings.retryMethods.includes(method) ? Math.max(0, settings.maxRetries) : 0;

  let attempt = 0;
  for (;;) {
    const { signal, dispose } = createAttemptSignal(options.timeoutMs, options.signal);

    let response: Response | undefined;
    let failure: unknown;
    try {
      response = await fetch(url, { ...init, signal });
    } catch (error) {
      failure = error;
    } finally {
      dispose();
    }

    // The caller cancelled, so report that rather than spending a retry on it
    if (options.signal?.aborted && failure !== undefined) throw failure;

    if (response && !settings.retryableStatusCodes.includes(response.status)) return response;
    if (failure !== undefined && !settings.retryNetworkErrors) throw failure;

    if (attempt >= retriesAllowed) {
      if (response) return response;
      throw failure;
    }

    const retryAfter = settings.respectRetryAfter && response
      ? parseRetryAfter(response.headers.get(RETRY_AFTER))
      : undefined;
    // `Retry-After` is what the server asked for, so use it as sent. `maxRetryAfterMs` caps it.
    const delay = retryAfter !== undefined
      ? Math.min(retryAfter, settings.maxRetryAfterMs)
      : computeBackoffDelay(attempt, settings);

    // An unreleased body holds its connection open. Failing here only leaks it, so retry anyway.
    response?.body?.cancel().catch((error) => {
      console.warn('[UiPath SDK] Could not release a discarded response body:', error);
    });

    await delayBeforeRetry(delay, options.signal);
    attempt++;
  }
}
