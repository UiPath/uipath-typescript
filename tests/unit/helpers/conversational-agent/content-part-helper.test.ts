// ===== IMPORTS =====
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ContentPartHelper } from '@/services/conversational-agent/helpers/content-part-helper';
import { CONVERSATIONAL_AGENT_TEST_CONSTANTS } from '@tests/utils/mocks';

// ===== TEST CONSTANTS =====
const createMockContentPart = (overrides: Partial<any> = {}): any => ({
  contentPartId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID,
  mimeType: 'text/plain',
  data: { inline: 'Hello world' },
  citations: [],
  isTranscript: undefined,
  isIncomplete: undefined,
  name: undefined,
  createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
  updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
  ...overrides,
});

// ===== TEST SUITE =====
describe('ContentPartHelper Unit Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should map all fields from content part', () => {
      const raw = createMockContentPart();
      const helper = new ContentPartHelper(raw);

      expect(helper.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID);
      expect(helper.contentPartId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID);
      expect(helper.mimeType).toBe('text/plain');
      expect(helper.data).toEqual({ inline: 'Hello world' });
      expect(helper.citations).toEqual([]);
      expect(helper.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect(helper.updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
    });

    it('should set id as alias for contentPartId', () => {
      const raw = createMockContentPart({ contentPartId: 'custom-id' });
      const helper = new ContentPartHelper(raw);

      expect(helper.id).toBe('custom-id');
      expect(helper.contentPartId).toBe('custom-id');
    });

    it('should map citations and add id alias for citationId', () => {
      const raw = createMockContentPart({
        citations: [
          {
            citationId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CITATION_ID,
            offset: 0,
            length: 5,
            sources: [{ title: 'Source 1', number: 1, url: 'https://example.com' }],
            createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
            updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
          },
          {
            citationId: 'cite-002',
            offset: 10,
            length: 3,
            sources: [{ title: 'Source 2', number: 2 }],
            createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
            updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
          }
        ]
      });
      const helper = new ContentPartHelper(raw);

      expect(helper.citations).toHaveLength(2);
      expect(helper.citations[0].id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CITATION_ID);
      expect(helper.citations[0].citationId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CITATION_ID);
      expect(helper.citations[0].offset).toBe(0);
      expect(helper.citations[0].sources[0].title).toBe('Source 1');
      expect(helper.citations[1].id).toBe('cite-002');
    });

    it('should handle null citations', () => {
      const raw = createMockContentPart({ citations: null });
      const helper = new ContentPartHelper(raw);

      expect(helper.citations).toEqual([]);
    });

    it('should handle undefined citations', () => {
      const raw = createMockContentPart({ citations: undefined });
      const helper = new ContentPartHelper(raw);

      expect(helper.citations).toEqual([]);
    });

    it('should preserve optional fields', () => {
      const raw = createMockContentPart({
        isTranscript: true,
        isIncomplete: false,
        name: 'transcript.txt',
      });
      const helper = new ContentPartHelper(raw);

      expect(helper.isTranscript).toBe(true);
      expect(helper.isIncomplete).toBe(false);
      expect(helper.name).toBe('transcript.txt');
    });
  });

  describe('isDataInline', () => {
    it('should return true for inline data', () => {
      const raw = createMockContentPart({ data: { inline: 'text content' } });
      const helper = new ContentPartHelper(raw);

      expect(helper.isDataInline).toBe(true);
    });

    it('should return false for external data', () => {
      const raw = createMockContentPart({ data: { uri: 'https://example.com/file.pdf' } });
      const helper = new ContentPartHelper(raw);

      expect(helper.isDataInline).toBe(false);
    });
  });

  describe('isDataExternal', () => {
    it('should return true for external data', () => {
      const raw = createMockContentPart({ data: { uri: 'https://example.com/file.pdf', byteCount: 1234 } });
      const helper = new ContentPartHelper(raw);

      expect(helper.isDataExternal).toBe(true);
    });

    it('should return false for inline data', () => {
      const raw = createMockContentPart({ data: { inline: 'text content' } });
      const helper = new ContentPartHelper(raw);

      expect(helper.isDataExternal).toBe(false);
    });
  });

  describe('isDataInline and isDataExternal are mutually exclusive', () => {
    it('should be inline but not external for inline data', () => {
      const raw = createMockContentPart({ data: { inline: 'test' } });
      const helper = new ContentPartHelper(raw);

      expect(helper.isDataInline).toBe(true);
      expect(helper.isDataExternal).toBe(false);
    });

    it('should be external but not inline for external data', () => {
      const raw = createMockContentPart({ data: { uri: 'https://example.com/doc' } });
      const helper = new ContentPartHelper(raw);

      expect(helper.isDataInline).toBe(false);
      expect(helper.isDataExternal).toBe(true);
    });
  });

  describe('getData()', () => {
    it('should return inline string for inline data', async () => {
      const raw = createMockContentPart({ data: { inline: 'Hello world' } });
      const helper = new ContentPartHelper(raw);

      const data = await helper.getData();

      expect(data).toBe('Hello world');
    });

    it('should return empty string for empty inline data', async () => {
      const raw = createMockContentPart({ data: { inline: '' } });
      const helper = new ContentPartHelper(raw);

      const data = await helper.getData();

      expect(data).toBe('');
    });

    it('should call fetch for external data', async () => {
      const mockResponse = { ok: true, text: () => Promise.resolve('External content') };
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);
      global.fetch = mockFetch;

      const raw = createMockContentPart({ data: { uri: 'https://example.com/content.txt' } });
      const helper = new ContentPartHelper(raw);

      const data = await helper.getData();

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/content.txt');
      expect(data).toEqual(mockResponse);
    });

    it('should pass through fetch response for external data', async () => {
      const mockFetchResponse = { ok: true, status: 200 };
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse);
      global.fetch = mockFetch;

      const raw = createMockContentPart({ data: { uri: 'https://example.com/doc.pdf' } });
      const helper = new ContentPartHelper(raw);

      const data = await helper.getData();

      expect(data).toEqual(mockFetchResponse);
    });
  });

  describe('different MIME types', () => {
    it('should handle text/plain content', () => {
      const helper = new ContentPartHelper(createMockContentPart({ mimeType: 'text/plain' }));
      expect(helper.mimeType).toBe('text/plain');
    });

    it('should handle text/markdown content', () => {
      const helper = new ContentPartHelper(createMockContentPart({ mimeType: 'text/markdown' }));
      expect(helper.mimeType).toBe('text/markdown');
    });

    it('should handle application/pdf content', () => {
      const helper = new ContentPartHelper(createMockContentPart({
        mimeType: 'application/pdf',
        data: { uri: 'https://example.com/file.pdf', byteCount: 54321 }
      }));
      expect(helper.mimeType).toBe('application/pdf');
      expect(helper.isDataExternal).toBe(true);
    });
  });
});
