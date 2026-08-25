import { describe, it, expect } from 'vitest';
import type { ResolvedRetryOptions } from '../../../../src/models/common/http.internal-types';
import {
  DEFAULT_RETRY_OPTIONS,
  DEFAULT_API_CLIENT_RETRY,
  DEFAULT_RETRY_METHODS,
  computeBackoffDelay,
  parseRetryAfter,
  resolveRetryOptions,
} from '../../../../src/utils/http/retry-policy';
import { HTTP_TEST_CONSTANTS } from '../../../utils/constants';

describe('resolveRetryOptions', () => {
  it('returns the defaults unchanged when no settings are supplied', () => {
    expect(resolveRetryOptions()).toEqual(DEFAULT_RETRY_OPTIONS);
  });

  it('merges supplied settings over the defaults', () => {
    const resolved = resolveRetryOptions({ maxRetries: 5 });

    expect(resolved.maxRetries).toBe(5);
    expect(resolved.initialDelayMs).toBe(DEFAULT_RETRY_OPTIONS.initialDelayMs);
  });

  it('ignores keys explicitly set to undefined instead of clobbering the default', () => {
    const resolved = resolveRetryOptions({ maxRetries: undefined, initialDelayMs: 10 });

    expect(resolved.maxRetries).toBe(DEFAULT_RETRY_OPTIONS.maxRetries);
    expect(resolved.initialDelayMs).toBe(10);
  });

  it('applies the supplied defaults when the caller passes none', () => {
    expect(resolveRetryOptions(undefined, DEFAULT_API_CLIENT_RETRY).maxRetries).toBe(0);
  });

  it('lets caller settings override the api client defaults', () => {
    const resolved = resolveRetryOptions({ maxRetries: 3 }, DEFAULT_API_CLIENT_RETRY);

    expect(resolved.maxRetries).toBe(3);
  });
});

describe('resolveRetryOptions — deprecated inputs', () => {
  it('maps retryDelay onto initialDelayMs', () => {
    expect(resolveRetryOptions({ retryDelay: 250 }).initialDelayMs).toBe(250);
  });

  it('lets initialDelayMs win over the deprecated retryDelay', () => {
    const resolved = resolveRetryOptions({ retryDelay: 250, initialDelayMs: 900 });

    expect(resolved.initialDelayMs).toBe(900);
  });

  it('maps useExponentialBackoff onto backoffStrategy', () => {
    expect(resolveRetryOptions({ useExponentialBackoff: true }).backoffStrategy).toBe('exponential');
    expect(resolveRetryOptions({ useExponentialBackoff: false }).backoffStrategy).toBe('constant');
  });

  it('lets backoffStrategy win over the deprecated useExponentialBackoff', () => {
    const resolved = resolveRetryOptions({ useExponentialBackoff: false, backoffStrategy: 'linear' });

    expect(resolved.backoffStrategy).toBe('linear');
  });

  it('keeps the deprecated keys out of the resolved options', () => {
    const resolved = resolveRetryOptions({ retryDelay: 250, useExponentialBackoff: true });

    expect('retryDelay' in resolved).toBe(false);
    expect('useExponentialBackoff' in resolved).toBe(false);
  });

  it('still accepts the fields that survived from the released shape', () => {
    const resolved = resolveRetryOptions({ maxRetries: 7, retryableStatusCodes: [503] });

    expect(resolved.maxRetries).toBe(7);
    expect(resolved.retryableStatusCodes).toEqual([503]);
  });
});

describe('default retry settings', () => {
  it('retries the idempotent methods and excludes POST and PATCH', () => {
    expect(DEFAULT_RETRY_METHODS).toEqual(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']);
    expect(DEFAULT_RETRY_METHODS).not.toContain('POST');
    expect(DEFAULT_RETRY_METHODS).not.toContain('PATCH');
  });

  it('does not treat a timeout as a retry setting', () => {
    expect('timeoutMs' in DEFAULT_RETRY_OPTIONS).toBe(false);
  });

  it('retries network errors and leaves Retry-After unbounded by default', () => {
    expect(DEFAULT_RETRY_OPTIONS.retryNetworkErrors).toBe(true);
    expect(DEFAULT_RETRY_OPTIONS.maxRetryAfterMs).toBe(Infinity);
  });

  it('defaults to the exponential backoffStrategy', () => {
    expect(DEFAULT_RETRY_OPTIONS.backoffStrategy).toBe('exponential');
  });
});

describe('computeBackoffDelay', () => {
  const settings: ResolvedRetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    initialDelayMs: HTTP_TEST_CONSTANTS.RETRY_DELAY_MS,
    backoffFactor: HTTP_TEST_CONSTANTS.BACKOFF_FACTOR,
  };
  const d = HTTP_TEST_CONSTANTS.RETRY_DELAY_MS;
  const sequence = (s: ResolvedRetryOptions) => [0, 1, 2, 3].map((attempt) => computeBackoffDelay(attempt, s));

  it('grows geometrically under the exponential backoffStrategy', () => {
    expect(sequence({ ...settings, backoffStrategy: 'exponential' })).toEqual([d, d * 2, d * 4, d * 8]);
  });

  it('grows by a fixed increment under the linear backoffStrategy', () => {
    expect(sequence({ ...settings, backoffStrategy: 'linear' })).toEqual([d, d * 2, d * 3, d * 4]);
  });

  it('stays flat under the constant backoffStrategy', () => {
    expect(sequence({ ...settings, backoffStrategy: 'constant' })).toEqual([d, d, d, d]);
  });

  it('ignores backoffFactor for the non-exponential strategies', () => {
    const factored = { ...settings, backoffFactor: 10 };

    expect(sequence({ ...factored, backoffStrategy: 'linear' })).toEqual([d, d * 2, d * 3, d * 4]);
    expect(sequence({ ...factored, backoffStrategy: 'constant' })).toEqual([d, d, d, d]);
  });

  it('clamps every backoffStrategy at backoffMaxDelayMs', () => {
    const capped = { ...settings, backoffMaxDelayMs: d * 3 };

    expect(computeBackoffDelay(10, { ...capped, backoffStrategy: 'exponential' })).toBe(d * 3);
    expect(computeBackoffDelay(10, { ...capped, backoffStrategy: 'linear' })).toBe(d * 3);
  });

  it('keeps the delay constant when backoffFactor is 1', () => {
    const flat = { ...settings, backoffFactor: 1, backoffStrategy: 'exponential' as const };

    expect(sequence(flat)).toEqual([d, d, d, d]);
  });
});

describe('parseRetryAfter', () => {
  it('reads a delay expressed in seconds', () => {
    expect(parseRetryAfter(String(HTTP_TEST_CONSTANTS.RETRY_AFTER_SECONDS))).toBe(
      HTTP_TEST_CONSTANTS.RETRY_AFTER_SECONDS * 1000
    );
  });

  it('reads a delay expressed as an HTTP date', () => {
    const now = Date.parse('2026-08-25T12:00:00.000Z');
    const future = new Date(now + HTTP_TEST_CONSTANTS.RETRY_AFTER_SECONDS * 1000).toUTCString();

    expect(parseRetryAfter(future, now)).toBe(HTTP_TEST_CONSTANTS.RETRY_AFTER_SECONDS * 1000);
  });

  it('clamps a date already in the past to zero', () => {
    const now = Date.parse('2026-08-25T12:00:00.000Z');
    const past = new Date(now - 60_000).toUTCString();

    expect(parseRetryAfter(past, now)).toBe(0);
  });

  it('returns undefined for a missing, empty, or unparseable header', () => {
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter(undefined)).toBeUndefined();
    expect(parseRetryAfter('   ')).toBeUndefined();
    expect(parseRetryAfter('not-a-date')).toBeUndefined();
  });
});
