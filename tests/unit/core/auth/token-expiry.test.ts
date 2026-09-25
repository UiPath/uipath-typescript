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

  it('returns the epoch for an unparseable string, so the token reads as expired', () => {
    const result = getExpiryMs('not-a-date');

    expect(result).toBe(0);
    // The point of the epoch over NaN: NaN makes every comparison false, which
    // would leave the token looking like it never expires.
    expect(Date.now() >= result).toBe(true);
  });

  it('returns the epoch for an invalid Date instance', () => {
    expect(getExpiryMs(new Date('not-a-date'))).toBe(0);
  });
});
