import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateExpirationTime, getFormattedExpirationDate } from '../../../../src/auth/utils/date.js';

describe('auth/utils/date', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateExpirationTime', () => {
    it('should return timestamp in the future', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1000000);
      const result = calculateExpirationTime(3600);
      expect(result).toBe(1000000 + 3600 * 1000);
    });
  });

  describe('getFormattedExpirationDate', () => {
    it('should return a formatted date string', () => {
      vi.spyOn(Date, 'now').mockReturnValue(0);
      const result = getFormattedExpirationDate(3600);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
