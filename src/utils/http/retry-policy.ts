/** Retry defaults and delay maths. Pure functions — nothing here makes a request. */

import type { HttpMethod } from '../../models/common/request-spec';
import type { RetryOptions } from '../../models/common/http.types';
import type { ResolvedRetryOptions } from '../../models/common/http.internal-types';

/** Statuses that usually mean "try again". */
export const DEFAULT_RETRYABLE_STATUS_CODES: number[] = [408, 429, 500, 502, 503, 504];

/**
 * Methods that are safe to repeat, per RFC 9110. POST and PATCH are left out because sending one
 * twice can create the same thing twice. TRACE is safe too but `HttpMethod` has no entry for it.
 */
export const DEFAULT_RETRY_METHODS: HttpMethod[] = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'];

/** Defaults for `httpRequest`, which retries by design. */
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

/** Defaults for SDK service calls: no retrying unless the caller asks for it. */
export const DEFAULT_API_CLIENT_RETRY: ResolvedRetryOptions = {
  ...DEFAULT_RETRY_OPTIONS,
  maxRetries: 0,
};

/** Applies the caller's options over the defaults, mapping the old field names to the new. */
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

  // The new field wins, so you can migrate one field at a time.
  if (retryDelay !== undefined && live.initialDelayMs === undefined) {
    resolved.initialDelayMs = retryDelay;
  }
  if (useExponentialBackoff !== undefined && live.backoffStrategy === undefined) {
    resolved.backoffStrategy = useExponentialBackoff ? 'exponential' : 'constant';
  }

  return resolved;
}

/** How long to wait after attempt `n`, counting from 0. Never more than `backoffMaxDelayMs`. */
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

/** Turns a `Retry-After` header (seconds or a date) into ms. `undefined` if it cannot be read. */
export function parseRetryAfter(value: string | null | undefined, now: number = Date.now()): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - now);
}
