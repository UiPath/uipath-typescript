/**
 * The retry loop: issues a `fetch`, decides whether the outcome is worth another attempt, and
 * waits out the delay the policy asks for. Shared by the public `httpRequest` helper and the
 * SDK's internal ApiClient, so the retry behavior lives in one place.
 */

import type { HttpMethod } from '../../models/common/request-spec';
import type { ResolvedRetryOptions } from '../../models/common/http.internal-types';
import { wait } from '../wait';
import { computeBackoffDelay, parseRetryAfter } from './retry-policy';

const RETRY_AFTER = 'retry-after';

interface AttemptSignal {
  signal?: AbortSignal;
  dispose: () => void;
}

/**
 * Builds the signal for one attempt: the caller's signal when there is no timeout, otherwise a
 * controller that aborts on whichever comes first. Written by hand rather than with
 * `AbortSignal.any()`, which is missing from browsers the SDK still supports.
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

/** Waits out the backoff, rejecting early if the caller cancels mid-delay. */
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

/** A stream body is consumed by the first attempt, so it can never be replayed. */
function isReplayableBody(body: BodyInit | null | undefined): boolean {
  return !(typeof ReadableStream !== 'undefined' && body instanceof ReadableStream);
}

/** Everything the retry loop needs beyond the request itself. */
export interface FetchWithRetryOptions {
  /**
   * Fully resolved retry behavior. Callers apply their own defaults with
   * {@link resolveRetryOptions} — `httpRequest` retries by default, SDK service calls do not —
   * so the loop itself has no opinion about who is calling it. Required, so a caller cannot
   * silently inherit someone else's defaults by omitting it.
   */
  retry: ResolvedRetryOptions;
  /**
   * Timeout for a single attempt, in milliseconds. Independent of retrying — it bounds one
   * attempt whether or not more follow. Each retry starts a fresh timeout.
   */
  timeoutMs?: number;
  /** Caller cancellation, honoured during an attempt and during a backoff delay. */
  signal?: AbortSignal;
}

/**
 * Issues a `fetch`, retrying transport failures and retryable statuses according to `settings`.
 *
 * A response is returned for every status the server produced — retryable statuses only reach
 * the caller once the attempts are exhausted. Transport failures are rethrown after the last
 * attempt; caller cancellation is rethrown immediately without consuming a retry.
 */
export async function fetchWithRetry(
  url: string,
  init: Omit<RequestInit, 'signal'>,
  options: FetchWithRetryOptions
): Promise<Response> {
  // `init.signal` is deliberately absent from the type: the loop builds a fresh signal per
  // attempt and would silently overwrite one passed here. Cancellation belongs in `options`.
  const settings = options.retry;
  const method = (init.method ?? 'GET').toUpperCase() as HttpMethod;
  const eligible = settings.retryMethods.includes(method) && isReplayableBody(init.body);
  const retriesAllowed = eligible ? Math.max(0, settings.maxRetries) : 0;

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

    // The caller cancelled — surface that instead of burning a retry on it
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
    // A `Retry-After` is the server's explicit instruction, so it is honoured as sent rather
    // than being squeezed under the backoff cap; `maxRetryAfterMs` bounds it separately.
    const delay = retryAfter !== undefined
      ? Math.min(retryAfter, settings.maxRetryAfterMs)
      : computeBackoffDelay(attempt, settings);

    // The discarded response still holds its connection open until the body is released
    response?.body?.cancel().catch(() => {});

    await delayBeforeRetry(delay, options.signal);
    attempt++;
  }
}
