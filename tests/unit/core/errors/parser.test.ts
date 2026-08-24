// ===== IMPORTS =====
import { describe, it, expect } from 'vitest';
import { errorResponseParser } from '../../../../src/core/errors/parser';
import { ERROR_PARSER_TEST_CONSTANTS } from '../../../utils/constants/errors';

// ===== TEST SUITE =====
describe('ErrorResponseParser Unit Tests', () => {
  describe('parse', () => {
    it('should parse an Orchestrator JSON error body', async () => {
      const response = new Response(
        JSON.stringify({
          message: ERROR_PARSER_TEST_CONSTANTS.ORCHESTRATOR_ERROR_MESSAGE,
          errorCode: ERROR_PARSER_TEST_CONSTANTS.ORCHESTRATOR_ERROR_CODE,
          traceId: ERROR_PARSER_TEST_CONSTANTS.ORCHESTRATOR_TRACE_ID,
        }),
        { status: 400, statusText: 'Bad Request', headers: { 'content-type': 'application/json' } }
      );

      const result = await errorResponseParser.parse(response);

      expect(result.message).toBe(ERROR_PARSER_TEST_CONSTANTS.ORCHESTRATOR_ERROR_MESSAGE);
      expect(result.code).toBe('400');
      expect(result.requestId).toBe(ERROR_PARSER_TEST_CONSTANTS.ORCHESTRATOR_TRACE_ID);
    });

    it('should preserve a non-JSON error body in responseText', async () => {
      // Blob storage answers with XML, not JSON. Parsing the response directly
      // consumes the body, leaving nothing for the fallback to read — so the
      // provider's own error code would be lost to anyone debugging an upload.
      const response = new Response(ERROR_PARSER_TEST_CONSTANTS.XML_ERROR_BODY, {
        status: 403,
        statusText: ERROR_PARSER_TEST_CONSTANTS.XML_ERROR_STATUS_TEXT,
        headers: { 'content-type': 'application/xml' },
      });

      const result = await errorResponseParser.parse(response);

      expect(result.details.responseText).toBe(ERROR_PARSER_TEST_CONSTANTS.XML_ERROR_BODY);
      expect(result.details.parseError).toBeDefined();
    });

    it('should fall back to statusText as the message for a non-JSON body', async () => {
      const response = new Response(ERROR_PARSER_TEST_CONSTANTS.XML_ERROR_BODY, {
        status: 403,
        statusText: ERROR_PARSER_TEST_CONSTANTS.XML_ERROR_STATUS_TEXT,
        headers: { 'content-type': 'application/xml' },
      });

      const result = await errorResponseParser.parse(response);

      expect(result.message).toBe(ERROR_PARSER_TEST_CONSTANTS.XML_ERROR_STATUS_TEXT);
      expect(result.code).toBe('403');
    });

    it('should handle an empty body', async () => {
      const response = new Response('', { status: 500, statusText: 'Internal Server Error' });

      const result = await errorResponseParser.parse(response);

      expect(result.message).toBe('Internal Server Error');
      expect(result.details.responseText).toBe('');
    });
  });
});
