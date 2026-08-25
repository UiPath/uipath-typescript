/**
 * Retry policy: the defaults, how caller options resolve against them, and how long to wait
 * before the next attempt. Pure functions — nothing here issues a request.
 */

import type { HttpMethod } from '../../models/common/request-spec';
import type { RetryOptions } from '../../models/common/http.types';
import type { ResolvedRetryOptions } from '../../models/common/http.internal-types';

/** Statuses that indicate a transient condition worth retrying. */
export const DEFAULT_RETRYABLE_STATUS_CODES: number[] = [408, 429, 500, 502, 503, 504];

/**
 * The idempotent methods of RFC 9110 §9.2.2 — replaying any of them leaves the server in the
 * same state as a single call. POST and PATCH are excluded: a replayed POST can create the same
 * resource twice. TRACE is idempotent too but is absent from `HttpMethod`, so it cannot be sent.
 */
export const DEFAULT_RETRY_METHODS: HttpMethod[] = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'];

/** Defaults for `httpRequest`, where retrying is the reason the helper exists. */
export const DEFAULT_RETRY_OPTIONS: ResolvedRetryOptions = {
  maxRetries: 2,
  initialDelayMs: 500,
  backoffStrategy: 'exponential',
  backoffFactor: 2,
  backoffMaxDelayMs: 30_000,
  retryableStatusCodes: DEFAULT_RETRYABLE_STATUS_CODES,
  retryMethods: DEFAULT_RETRY_METHODS,
  retryNetworkErrors: true,
  respectRetryAfter: true,
  maxRetryAfterMs: Infinity,
};

/**
 * Defaults for SDK service calls: retrying is off unless a caller opts in per request, so
 * existing service methods behave exactly as before.
 */
export const DEFAULT_API_CLIENT_RETRY: ResolvedRetryOptions = {
  ...DEFAULT_RETRY_OPTIONS,
  maxRetries: 0,
};

/**
 * Merges caller options over defaults, ignoring keys explicitly set to `undefined`, and folds the
 * deprecated inputs onto their replacements so the engine only ever sees the live fields.
 */
export function resolveRetryOptions(
  settings?: RetryOptions,
  defaults: ResolvedRetryOptions = DEFAULT_RETRY_OPTIONS
): ResolvedRetryOptions {
  if (!settings) return defaults;

  const { retryDelay, useExponentialBackoff, ...live } = settings;

  const resolved = { ...defaults };
  for (const [key, value] of Object.entries(live)) {
    if (value !== undefined) {
      (resolved as Record<string, unknown>)[key] = value;
    }
  }

  // Deprecated inputs lose to their replacements, so a caller migrating field by field gets the
  // new value rather than a silent regression to the old one.
  if (retryDelay !== undefined && live.initialDelayMs === undefined) {
    resolved.initialDelayMs = retryDelay;
  }
  if (useExponentialBackoff !== undefined && live.backoffStrategy === undefined) {
    resolved.backoffStrategy = useExponentialBackoff ? 'exponential' : 'constant';
  }

  return resolved;
}

/**
 * Delay before the retry that follows `attempt`, where `attempt` is zero-based: `0` is the delay
 * after the first try. Capped at `backoffMaxDelayMs`.
 */
export function computeBackoffDelay(attempt: number, settings: ResolvedRetryOptions): number {
  const base = Math.max(0, settings.initialDelayMs);

  let delay: number;
  switch (settings.backoffStrategy) {
    case 'constant':
      delay = base;
      break;
    case 'linear':
      delay = base * (attempt + 1);
      break;
    default:
      delay = base * Math.pow(settings.backoffFactor, attempt);
  }

  return Math.min(delay, settings.backoffMaxDelayMs);
}

/**
 * Reads a `Retry-After` header, which carries either a number of seconds or an HTTP date.
 * Returns milliseconds to wait, or `undefined` when the header is absent or unparseable.
 */
export function parseRetryAfter(value: string | null | undefined, now: number = Date.now()): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - now);
}
