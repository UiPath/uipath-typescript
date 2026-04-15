import { describe, it, expect, vi } from 'vitest';
import { createHttpErrorMessage, handleHttpError } from '../../../src/utils/error-handler.js';

function makeMockResponse(status: number, text: string = ''): any {
  return {
    status,
    text: vi.fn().mockResolvedValue(text),
  };
}

describe('error-handler', () => {
  describe('createHttpErrorMessage', () => {
    it('should include user-friendly message for 401', async () => {
      const msg = await createHttpErrorMessage(makeMockResponse(401));
      expect(msg).toContain('Authentication failed');
    });

    it('should include context for 403', async () => {
      const msg = await createHttpErrorMessage(makeMockResponse(403), 'app deployment');
      expect(msg).toContain('app deployment');
    });

    it('should include API response text when present', async () => {
      const msg = await createHttpErrorMessage(makeMockResponse(500, 'Internal Server Error'));
      expect(msg).toContain('Internal Server Error');
    });

    it('should show no details message for empty response', async () => {
      const msg = await createHttpErrorMessage(makeMockResponse(500, ''));
      expect(msg).toContain('No additional error details');
    });

    it('should handle 404', async () => {
      const msg = await createHttpErrorMessage(makeMockResponse(404));
      expect(msg).toContain('not found');
    });

    it('should handle 429 rate limit', async () => {
      const msg = await createHttpErrorMessage(makeMockResponse(429));
      expect(msg).toContain('Rate limit');
    });

    it('should handle 502/503/504 service unavailable', async () => {
      for (const status of [502, 503, 504]) {
        const msg = await createHttpErrorMessage(makeMockResponse(status));
        expect(msg).toContain('unavailable');
      }
    });

    it('should handle unknown status codes', async () => {
      const msg = await createHttpErrorMessage(makeMockResponse(418));
      expect(msg).toContain('418');
    });
  });

  describe('handleHttpError', () => {
    it('should throw an error with the message', async () => {
      await expect(handleHttpError(makeMockResponse(401))).rejects.toThrow('Authentication failed');
    });
  });
});
