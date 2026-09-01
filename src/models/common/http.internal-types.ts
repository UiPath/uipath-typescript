import type { RetryOptions } from './http.types';

/**
 * Retry options once defaults are applied: every live field has a value, and the deprecated
 * inputs have already been folded into their replacements.
 *
 * Internal to the retry engine. Not re-exported from `index.ts` — consumers configure retrying
 * with {@link RetryOptions}, where every field is optional.
 */
export type ResolvedRetryOptions = Required<
  Omit<RetryOptions, 'retryDelay' | 'useExponentialBackoff'>
>;
