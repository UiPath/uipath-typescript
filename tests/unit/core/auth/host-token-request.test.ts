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

  it('returns true for any uipath.com subdomain', () => {
    expect(isValidHostOrigin('https://govcloud.uipath.com')).toBe(true);
    expect(isValidHostOrigin('https://tenant.region.uipath.com')).toBe(true);
  });

  it('returns true for a uipath-dev.com subdomain', () => {
    expect(isValidHostOrigin('https://alpha.uipath-dev.com')).toBe(true);
  });

  it('returns true for a deeply nested Service Fabric uipath-dev.com host', () => {
    expect(
      isValidHostOrigin('https://ci-asaksdev13200355.infra-sf-ea.infra.uipath-dev.com')
    ).toBe(true);
  });

  it('returns true for a trusted host carrying an explicit port', () => {
    expect(isValidHostOrigin('https://tenant.uipath.com:8080')).toBe(true);
  });

  it('returns true for the apex domains', () => {
    expect(isValidHostOrigin('https://uipath.com')).toBe(true);
    expect(isValidHostOrigin('https://uipath-dev.com')).toBe(true);
  });

  it('returns true for localhost', () => {
    expect(isValidHostOrigin('http://localhost:3000')).toBe(true);
  });

  it('returns false for an untrusted domain', () => {
    expect(isValidHostOrigin('https://evil.example.com')).toBe(false);
  });

  // The trust check compares the parsed hostname, so a look-alike registrable domain
  // that merely ends in the trusted domain is not delegated any trust.
  it('returns false for a look-alike domain that ends in a trusted domain', () => {
    expect(isValidHostOrigin('https://evil-uipath.com')).toBe(false);
    expect(isValidHostOrigin('https://notuipath.com')).toBe(false);
    expect(isValidHostOrigin('https://evil-uipath-dev.com')).toBe(false);
  });

  it('returns false when a trusted domain appears only as a subdomain prefix', () => {
    expect(isValidHostOrigin('https://uipath.com.evil.io')).toBe(false);
  });

  // `basedomain` is a caller-supplied query parameter, so the origin can be any string —
  // an untrusted host must not become trusted by embedding a trusted domain in the
  // query, path, or fragment. postMessage would reduce such a targetOrigin to the
  // untrusted host and deliver the delegated token there.
  it('returns false when a trusted domain is embedded in the query, path, or fragment', () => {
    expect(isValidHostOrigin('https://evil.com/?x=.uipath.com')).toBe(false);
    expect(isValidHostOrigin('https://evil.com/.uipath.com')).toBe(false);
    expect(isValidHostOrigin('https://evil.com/#.uipath.com')).toBe(false);
  });

  it('returns false when a trusted domain appears only in the userinfo', () => {
    expect(isValidHostOrigin('https://x.uipath.com@evil.com')).toBe(false);
  });

  it('returns false and logs a warning for a malformed URL', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(isValidHostOrigin('not-a-url')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      'isValidHostOrigin: received a malformed origin URL',
      'not-a-url',
      expect.any(TypeError)
    );
    warnSpy.mockRestore();
  });
});
