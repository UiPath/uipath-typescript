import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock('node-fetch', () => ({ default: mockFetch }));

vi.mock('../../../../src/utils/error-handler.js', () => ({
  handleHttpError: vi.fn().mockImplementation(async (res: any) => {
    throw new Error(`HTTP Error ${res.status}`);
  }),
}));

import {
  generatePKCEChallenge,
  getAuthorizationUrl,
  getTokenEndpoint,
  parseJWT,
  authenticateWithClientCredentials,
} from '../../../../src/auth/core/oidc.js';

function createJWT(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `${header}.${body}.signature`;
}

describe('auth/core/oidc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePKCEChallenge', () => {
    it('should return codeVerifier, codeChallenge, and state', () => {
      const result = generatePKCEChallenge();
      expect(result.codeVerifier).toBeDefined();
      expect(result.codeChallenge).toBeDefined();
      expect(result.state).toBeDefined();
    });

    it('should return base64url-encoded strings', () => {
      const result = generatePKCEChallenge();
      expect(result.codeVerifier).not.toContain('+');
      expect(result.codeVerifier).not.toContain('/');
      expect(result.codeVerifier).not.toContain('=');
    });

    it('should return unique values each time', () => {
      const a = generatePKCEChallenge();
      const b = generatePKCEChallenge();
      expect(a.codeVerifier).not.toBe(b.codeVerifier);
      expect(a.state).not.toBe(b.state);
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should return URL with PKCE params', () => {
      const pkce = generatePKCEChallenge();
      const url = getAuthorizationUrl('cloud', pkce);
      expect(url).toContain('code_challenge=');
      expect(url).toContain('state=');
      expect(url).toContain('response_type=');
      expect(url).toContain('redirect_uri=');
    });
  });

  describe('getTokenEndpoint', () => {
    it('should return token endpoint URL', () => {
      const url = getTokenEndpoint('cloud');
      expect(url).toContain('/token');
    });
  });

  describe('parseJWT', () => {
    it('should parse JWT claims', () => {
      const token = createJWT({
        sub: 'user-1',
        prt_id: 'prt-1',
        client_id: 'client-1',
        exp: 999999,
        iss: 'https://issuer',
        aud: 'api',
        iat: 100000,
        auth_time: 100000,
        email: 'test@example.com',
      });
      const result = parseJWT(token);
      expect(result.sub).toBe('user-1');
      expect(result.email).toBe('test@example.com');
      expect(result.prtId).toBe('prt-1');
    });

    it('should handle missing email', () => {
      const token = createJWT({ sub: 'u', prt_id: 'p', client_id: 'c', exp: 1, iss: 'i', aud: 'a', iat: 1, auth_time: 1 });
      const result = parseJWT(token);
      expect(result.email).toBeUndefined();
    });

    it('should use organization_id when present', () => {
      const token = createJWT({ sub: 'u', prt_id: 'p', client_id: 'c', exp: 1, iss: 'i', aud: 'a', iat: 1, auth_time: 1, organization_id: 'org-1' });
      const result = parseJWT(token);
      expect(result.organizationId).toBe('org-1');
    });
  });

  describe('authenticateWithClientCredentials', () => {
    it('should return token response on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'openid',
        }),
      });
      const result = await authenticateWithClientCredentials({
        clientId: 'client',
        clientSecret: 'secret',
        domain: 'cloud',
      });
      expect(result.accessToken).toBe('token');
    });

    it('should pass scope when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'custom',
        }),
      });
      await authenticateWithClientCredentials({
        clientId: 'client',
        clientSecret: 'secret',
        domain: 'cloud',
        scope: 'custom',
      });
      const body = mockFetch.mock.calls[0][1].body;
      expect(body).toContain('scope=custom');
    });

    it('should throw on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401 });
      await expect(authenticateWithClientCredentials({
        clientId: 'client',
        clientSecret: 'secret',
        domain: 'cloud',
      })).rejects.toThrow();
    });
  });
});
