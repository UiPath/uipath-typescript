import { describe, it, expect } from 'vitest';
import { authRateLimiter, tokenRateLimiter, errorRateLimiter } from '../../../../src/auth/server/rate-limiter.js';

describe('auth/server/rate-limiter', () => {
  it('should export authRateLimiter as a function', () => {
    expect(typeof authRateLimiter).toBe('function');
  });

  it('should export tokenRateLimiter as a function', () => {
    expect(typeof tokenRateLimiter).toBe('function');
  });

  it('should export errorRateLimiter as a function', () => {
    expect(typeof errorRateLimiter).toBe('function');
  });
});
