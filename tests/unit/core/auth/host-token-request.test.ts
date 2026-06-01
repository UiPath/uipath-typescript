import { describe, it, expect, vi } from 'vitest';
import { isTokenExpired, isValidHostOrigin } from '@/core/auth/host-token-request';
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

describe('isValidHostOrigin', () => {
  it('returns false for null', () => {
    expect(isValidHostOrigin(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidHostOrigin('')).toBe(false);
  });

  it('returns true for cloud.uipath.com', () => {
    expect(isValidHostOrigin('https://cloud.uipath.com')).toBe(true);
  });

  it('returns true for alpha.uipath.com', () => {
    expect(isValidHostOrigin('https://alpha.uipath.com')).toBe(true);
  });

  it('returns true for staging.uipath.com', () => {
    expect(isValidHostOrigin('https://staging.uipath.com')).toBe(true);
  });

  it('returns true for localhost', () => {
    expect(isValidHostOrigin('http://localhost:3000')).toBe(true);
  });

  it('returns false for an unlisted domain', () => {
    expect(isValidHostOrigin('https://evil.example.com')).toBe(false);
  });

  it('returns false for an unlisted uipath.com subdomain', () => {
    expect(isValidHostOrigin('https://unknown.uipath.com')).toBe(false);
  });

  it('returns false and logs a warning for a malformed URL', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(isValidHostOrigin('not-a-url')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      'isValidHostOrigin: received a malformed origin URL',
      'not-a-url'
    );
    warnSpy.mockRestore();
  });
});
