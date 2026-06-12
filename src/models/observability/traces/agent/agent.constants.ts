/**
 * Maps Span fields to canonical SDK names (semantic renames only).
 * Case conversion is not needed — the Traceview API already returns camelCase.
 */
export const SpanMap: { [key: string]: string } = {
  expiryTimeUtc: 'expiredTime',
};
