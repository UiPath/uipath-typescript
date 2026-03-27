import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('fs-extra', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue('<html>callback</html>'),
    appendFile: vi.fn(),
  },
}));

vi.mock('../../../../src/auth/server/rate-limiter.js', () => ({
  authRateLimiter: (_req: any, _res: any, next: any) => next(),
  tokenRateLimiter: (_req: any, _res: any, next: any) => next(),
  errorRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../../../src/auth/utils/validation.js', () => ({
  validateTokenExchangeRequest: vi.fn().mockImplementation((body: any) => body),
  validateTokenResponse: vi.fn().mockImplementation((data: any) => data),
}));

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.stubGlobal('fetch', mockFetch);

import { AuthServer } from '../../../../src/auth/server/auth-server.js';

describe('auth/server/auth-server', () => {
  let server: AuthServer;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (server) {
      server.stop();
    }
  });

  it('should create an AuthServer instance', () => {
    server = new AuthServer({
      port: 0,
      domain: 'cloud',
      codeVerifier: 'verifier',
      expectedState: 'state-123',
    });
    expect(server).toBeDefined();
  });

  it('should stop gracefully when not started', () => {
    server = new AuthServer({
      port: 0,
      domain: 'cloud',
      codeVerifier: 'verifier',
      expectedState: 'state-123',
    });
    expect(() => server.stop()).not.toThrow();
  });

  it('should handle double stop gracefully', () => {
    server = new AuthServer({
      port: 0,
      domain: 'cloud',
      codeVerifier: 'verifier',
      expectedState: 'state-123',
    });
    server.stop();
    server.stop(); // double stop should be safe
  });
});
