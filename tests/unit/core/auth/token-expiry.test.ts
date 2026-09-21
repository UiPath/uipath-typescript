import { describe, it, expect } from 'vitest';
import { getExpiryMs } from '@/core/auth/token-expiry';

const FIXED_ISO = '2026-01-01T00:00:00.000Z';
const FIXED_MS = Date.parse(FIXED_ISO);

describe('getExpiryMs', () => {
  it('returns the timestamp of a Date value', () => {
    expect(getExpiryMs(new Date(FIXED_ISO))).toBe(FIXED_MS);
  });

  it('parses an ISO 8601 string to the same timestamp as the equivalent Date', () => {
    expect(getExpiryMs(FIXED_ISO)).toBe(FIXED_MS);
    expect(getExpiryMs(FIXED_ISO)).toBe(getExpiryMs(new Date(FIXED_ISO)));
  });

  it('returns NaN for an unparseable string, so comparisons treat the token as not expired', () => {
    const result = getExpiryMs('not-a-date');

    expect(Number.isNaN(result)).toBe(true);
    // Every relational comparison against NaN is false — the pre-existing behaviour
    // for malformed values, preserved deliberately.
    expect(Date.now() >= result).toBe(false);
  });

  it('returns NaN for an invalid Date instance', () => {
    expect(Number.isNaN(getExpiryMs(new Date('not-a-date')))).toBe(true);
  });
});
