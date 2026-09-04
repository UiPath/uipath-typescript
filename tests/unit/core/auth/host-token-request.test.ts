import { describe, it, expect } from 'vitest';
import { isTokenExpired } from '@/core/auth/host-token-request';
import type { TokenInfo } from '@/core/auth/types';

describe('isTokenExpired', () => {
  it('returns true when expiresAt is undefined', () => {
    const token: TokenInfo = { token: 'tok', type: 'secret' };
    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true when token is past expiry', () => {
    const token: TokenInfo = { token: 'tok', type: 'secret', expiresAt: new Date(0) };
    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns false when token has not expired', () => {
    const token: TokenInfo = { token: 'tok', type: 'secret', expiresAt: new Date(Date.now() + 3600_000) };
    expect(isTokenExpired(token)).toBe(false);
  });
});
