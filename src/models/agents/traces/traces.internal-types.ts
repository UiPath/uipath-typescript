import type { SpanResponse } from './traces.types';

/**
 * Raw span record as returned by the Traceview API, before the
 * `expiryTimeUtc` → `expiredTime` semantic rename ({@link SpanResponse}).
 */
export type RawSpanResponse = Omit<SpanResponse, 'expiredTime'> & {
  /** Span retention expiry time. May be `null`. */
  expiryTimeUtc: string | null;
};
