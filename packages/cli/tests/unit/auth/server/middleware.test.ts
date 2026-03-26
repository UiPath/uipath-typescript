import { describe, it, expect } from 'vitest';
import {
  rateLimitedAuthHandler,
  rateLimitedTokenHandler,
  rateLimitedErrorHandler,
} from '../../../../src/auth/server/middleware.js';

describe('auth/server/middleware', () => {
  it('should export rateLimitedAuthHandler as an array', () => {
    expect(Array.isArray(rateLimitedAuthHandler)).toBe(true);
    expect(rateLimitedAuthHandler.length).toBeGreaterThan(0);
  });

  it('should export rateLimitedTokenHandler as an array', () => {
    expect(Array.isArray(rateLimitedTokenHandler)).toBe(true);
  });

  it('should export rateLimitedErrorHandler as an array', () => {
    expect(Array.isArray(rateLimitedErrorHandler)).toBe(true);
  });
});
