// ===== IMPORTS =====
import { describe, it, expect } from 'vitest';
import {
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  getLimitedPageSize
} from '../../../../src/utils/pagination/constants';

// ===== TEST SUITE =====
describe('Pagination Constants Unit Tests', () => {
  describe('getLimitedPageSize', () => {
    it('should return DEFAULT_PAGE_SIZE when pageSize is undefined', () => {
      const result = getLimitedPageSize(undefined);
      expect(result).toBe(DEFAULT_PAGE_SIZE);
    });

    it('should return DEFAULT_PAGE_SIZE when pageSize is null', () => {
      const result = getLimitedPageSize(null as any);
      expect(result).toBe(DEFAULT_PAGE_SIZE);
    });

    it('should return the pageSize when within valid range', () => {
      const result = getLimitedPageSize(50);
      expect(result).toBe(50);
    });

    it('should return MAX_PAGE_SIZE when pageSize is over maximum', () => {
      const result = getLimitedPageSize(MAX_PAGE_SIZE + 1);
      expect(result).toBe(MAX_PAGE_SIZE);
    });

    it('should return 1 when pageSize is below 1', () => {
      const result = getLimitedPageSize(0.5);
      expect(result).toBe(1);
    });
  });
});
