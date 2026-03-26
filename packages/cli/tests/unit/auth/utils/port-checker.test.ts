import { describe, it, expect } from 'vitest';
import { isPortAvailable } from '../../../../src/auth/utils/port-checker.js';

describe('auth/utils/port-checker', () => {
  it('should export isPortAvailable as a function', () => {
    expect(typeof isPortAvailable).toBe('function');
  });

  it('should return a boolean for a high port', async () => {
    // Use a high port that's almost certainly free
    const result = await isPortAvailable(59123);
    expect(typeof result).toBe('boolean');
  }, 10000);
});
