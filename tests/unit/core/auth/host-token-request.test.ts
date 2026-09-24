import { describe, it, expect } from 'vitest';
import { isTokenExpired } from '@/core/auth/host-token-request';
import { TOKEN_EXPIRY_BUFFER_MS } from '@/core/auth/constants';
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

  it('returns true when expiry falls within the buffer', () => {
    const token: TokenInfo = {
      token: 'tok', type: 'secret', expiresAt: new Date(Date.now() + TOKEN_EXPIRY_BUFFER_MS / 2)
    };
    expect(isTokenExpired(token, TOKEN_EXPIRY_BUFFER_MS)).toBe(true);
  });

  it('returns false when expiry is beyond the buffer', () => {
    const token: TokenInfo = {
      token: 'tok', type: 'secret', expiresAt: new Date(Date.now() + TOKEN_EXPIRY_BUFFER_MS * 2)
    };
    expect(isTokenExpired(token, TOKEN_EXPIRY_BUFFER_MS)).toBe(false);
  });

  it('applies no buffer by default', () => {
    const token: TokenInfo = {
      token: 'tok', type: 'secret', expiresAt: new Date(Date.now() + TOKEN_EXPIRY_BUFFER_MS / 2)
    };
    expect(isTokenExpired(token)).toBe(false);
  });
});
