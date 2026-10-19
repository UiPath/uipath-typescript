import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DecisionsService } from '../../../../../../src/services/observability/traces/decisions/decisions';
import { ApiClient } from '../../../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../../../utils/setup';
import { DECISIONS_ENDPOINTS } from '../../../../../../src/utils/constants/endpoints';
import { DECISIONS_TEST_CONSTANTS } from '../../../../../utils/constants';
import { createMockDecision, createMockRawDecisionResponse, createMockIngestAck } from '../../../../../utils/mocks';
import { ValidationError } from '../../../../../../src/core/errors';

vi.mock('../../../../../../src/core/http/api-client');

describe('DecisionsService Unit Tests', () => {
  let decisionsService: DecisionsService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
    decisionsService = new DecisionsService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should write decisions and return one ack per item', async () => {
      mockApiClient.post.mockResolvedValue([createMockIngestAck()]);

      const result = await decisionsService.create(
        DECISIONS_TEST_CONSTANTS.TRACE_ID,
        [createMockDecision()],
        DECISIONS_TEST_CONSTANTS.FOLDER_KEY
      );

      expect(result).toEqual([createMockIngestAck()]);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.ROOT,
        [createMockDecision()],
        expect.objectContaining({
          params: { traceId: DECISIONS_TEST_CONSTANTS.TRACE_ID },
          headers: expect.objectContaining({ 'X-UIPATH-FolderKey': DECISIONS_TEST_CONSTANTS.FOLDER_KEY }),
        })
      );
    });

    it('should throw ValidationError for a malformed traceId', async () => {
      await expect(decisionsService.create(
        DECISIONS_TEST_CONSTANTS.INVALID_TRACE_ID,
        [createMockDecision()],
        DECISIONS_TEST_CONSTANTS.FOLDER_KEY
      )).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for a malformed decisionId', async () => {
      await expect(decisionsService.create(
        DECISIONS_TEST_CONSTANTS.TRACE_ID,
        [createMockDecision({ decisionId: DECISIONS_TEST_CONSTANTS.INVALID_DECISION_ID })],
        DECISIONS_TEST_CONSTANTS.FOLDER_KEY
      )).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when folderKey is missing', async () => {
      await expect(decisionsService.create(
        DECISIONS_TEST_CONSTANTS.TRACE_ID,
        [createMockDecision()],
        ''
      )).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for an empty decisions array', async () => {
      await expect(decisionsService.create(
        DECISIONS_TEST_CONSTANTS.TRACE_ID,
        [],
        DECISIONS_TEST_CONSTANTS.FOLDER_KEY
      )).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should propagate an error from the API', async () => {
      const error = new Error(DECISIONS_TEST_CONSTANTS.ERROR_DECISION_NOT_FOUND);
      mockApiClient.post.mockRejectedValue(error);

      await expect(decisionsService.create(
        DECISIONS_TEST_CONSTANTS.TRACE_ID,
        [createMockDecision()],
        DECISIONS_TEST_CONSTANTS.FOLDER_KEY
      )).rejects.toThrow(DECISIONS_TEST_CONSTANTS.ERROR_DECISION_NOT_FOUND);
    });
  });

  describe('getById', () => {
    it('should get a decision by ID', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawDecisionResponse());

      const result = await decisionsService.getById(DECISIONS_TEST_CONSTANTS.DECISION_ID, { folderKey: DECISIONS_TEST_CONSTANTS.FOLDER_KEY });

      expect(result.feedbackId).toBe(DECISIONS_TEST_CONSTANTS.FEEDBACK_ID);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.GET_BY_ID(DECISIONS_TEST_CONSTANTS.DECISION_ID),
        expect.objectContaining({ headers: expect.objectContaining({ 'X-UIPATH-FolderKey': DECISIONS_TEST_CONSTANTS.FOLDER_KEY }) })
      );
    });

    it('should get a decision without a folderKey', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawDecisionResponse());

      await decisionsService.getById(DECISIONS_TEST_CONSTANTS.DECISION_ID);

      expect(mockApiClient.get).toHaveBeenCalled();
    });

    it('should transform createdAt/updatedAt to createdTime/updatedTime', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawDecisionResponse());

      const result = await decisionsService.getById(DECISIONS_TEST_CONSTANTS.DECISION_ID);

      expect(result.createdTime).toBe(DECISIONS_TEST_CONSTANTS.CREATED_AT);
      expect(result.updatedTime).toBe(DECISIONS_TEST_CONSTANTS.UPDATED_AT);
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });

    it('should pass includeSpans through as a query param', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawDecisionResponse());

      await decisionsService.getById(DECISIONS_TEST_CONSTANTS.DECISION_ID, { includeSpans: false });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.GET_BY_ID(DECISIONS_TEST_CONSTANTS.DECISION_ID),
        expect.objectContaining({ params: { includeSpans: false } })
      );
    });

    it('should throw ValidationError for a malformed decisionId', async () => {
      await expect(decisionsService.getById(DECISIONS_TEST_CONSTANTS.INVALID_DECISION_ID)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate an error from the API', async () => {
      const error = new Error(DECISIONS_TEST_CONSTANTS.ERROR_DECISION_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(decisionsService.getById(DECISIONS_TEST_CONSTANTS.DECISION_ID)).rejects.toThrow(DECISIONS_TEST_CONSTANTS.ERROR_DECISION_NOT_FOUND);
    });
  });

  describe('list', () => {
    it('should list decisions for a trace', async () => {
      mockApiClient.get.mockResolvedValue({ items: [createMockRawDecisionResponse()], totalCount: 1 });

      const result = await decisionsService.list({ traceId: DECISIONS_TEST_CONSTANTS.TRACE_ID });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].createdTime).toBe(DECISIONS_TEST_CONSTANTS.CREATED_AT);
      expect((result.items[0] as any).createdAt).toBeUndefined();
      expect((result.items[0] as any).updatedAt).toBeUndefined();
      expect(mockApiClient.get).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.ROOT,
        expect.objectContaining({ params: expect.objectContaining({ traceId: DECISIONS_TEST_CONSTANTS.TRACE_ID }) })
      );
    });

    it('should send processKey and processName without a $ prefix', async () => {
      mockApiClient.get.mockResolvedValue({ items: [], totalCount: 0 });

      await decisionsService.list({ processKey: DECISIONS_TEST_CONSTANTS.PROCESS_KEY, processName: DECISIONS_TEST_CONSTANTS.PROCESS_NAME });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.ROOT,
        expect.objectContaining({
          params: expect.objectContaining({
            processKey: DECISIONS_TEST_CONSTANTS.PROCESS_KEY,
            processName: DECISIONS_TEST_CONSTANTS.PROCESS_NAME,
          }),
        })
      );
    });

    it('should send the folderKey as a header, not as a query param', async () => {
      mockApiClient.get.mockResolvedValue({ items: [], totalCount: 0 });

      await decisionsService.list({ folderKey: DECISIONS_TEST_CONSTANTS.FOLDER_KEY });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.ROOT,
        expect.objectContaining({
          params: expect.not.objectContaining({ folderKey: expect.anything() }),
          headers: expect.objectContaining({ 'X-UIPATH-FolderKey': DECISIONS_TEST_CONSTANTS.FOLDER_KEY }),
        })
      );
    });

    it('should list decisions without a folderKey', async () => {
      mockApiClient.get.mockResolvedValue({ items: [], totalCount: 0 });

      await decisionsService.list();

      expect(mockApiClient.get).toHaveBeenCalled();
    });

    it('should convert from/to Date filters to ISO strings', async () => {
      mockApiClient.get.mockResolvedValue({ items: [], totalCount: 0 });
      const from = new Date('2026-01-01T00:00:00.000Z');
      const to = new Date('2026-01-31T00:00:00.000Z');

      await decisionsService.list({ from, to });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.ROOT,
        expect.objectContaining({ params: expect.objectContaining({ from: from.toISOString(), to: to.toISOString() }) })
      );
    });

    it('should send skip/take for a paginated request', async () => {
      mockApiClient.get.mockResolvedValue({ items: [createMockRawDecisionResponse()], totalCount: 1 });

      await decisionsService.list({ pageSize: 10 });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.ROOT,
        expect.objectContaining({ params: expect.objectContaining({ take: 10 }) })
      );
    });

    it('should propagate an error from the API', async () => {
      const error = new Error(DECISIONS_TEST_CONSTANTS.ERROR_DECISION_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(decisionsService.list()).rejects.toThrow(DECISIONS_TEST_CONSTANTS.ERROR_DECISION_NOT_FOUND);
    });
  });

  describe('query', () => {
    it('should query decisions and transform items', async () => {
      mockApiClient.post.mockResolvedValue({ items: [createMockRawDecisionResponse()], totalCount: 1, effectiveFrom: DECISIONS_TEST_CONSTANTS.CREATED_AT });

      const result = await decisionsService.query({ processKey: 'my-process' });

      expect(result.totalCount).toBe(1);
      expect(result.effectiveFrom).toBe(DECISIONS_TEST_CONSTANTS.CREATED_AT);
      expect(result.items[0].createdTime).toBe(DECISIONS_TEST_CONSTANTS.CREATED_AT);
      expect((result.items[0] as any).createdAt).toBeUndefined();
      expect((result.items[0] as any).updatedAt).toBeUndefined();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.QUERY,
        expect.objectContaining({ processKey: 'my-process' }),
        expect.any(Object)
      );
    });

    it.each([
      ['ActionCenter', 0],
      ['CodedApp', 1],
      ['VerticalUi', 2],
    ] as const)('should map platform %s to wire value %i', async (platform, wireValue) => {
      mockApiClient.post.mockResolvedValue({ items: [], totalCount: 0 });

      await decisionsService.query({ platform });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.QUERY,
        expect.objectContaining({ platform: wireValue }),
        expect.any(Object)
      );
    });

    it.each([
      ['Automation', 0],
      ['Human', 1],
      ['Rule', 2],
      ['Agent', 3],
    ] as const)('should map actorKind %s to wire value %i', async (actorKind, wireValue) => {
      mockApiClient.post.mockResolvedValue({ items: [], totalCount: 0 });

      await decisionsService.query({ actorKind });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.QUERY,
        expect.objectContaining({ actorKind: wireValue }),
        expect.any(Object)
      );
    });

    it.each([
      ['UpdatedAt', 0],
      ['CreatedAt', 1],
    ] as const)('should map sortBy %s to wire value %i', async (sortBy, wireValue) => {
      mockApiClient.post.mockResolvedValue({ items: [], totalCount: 0 });

      await decisionsService.query({ sortBy });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.QUERY,
        expect.objectContaining({ sortBy: wireValue }),
        expect.any(Object)
      );
    });

    it('should send processName in the body', async () => {
      mockApiClient.post.mockResolvedValue({ items: [], totalCount: 0 });

      await decisionsService.query({ processName: DECISIONS_TEST_CONSTANTS.PROCESS_NAME });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.QUERY,
        expect.objectContaining({ processName: DECISIONS_TEST_CONSTANTS.PROCESS_NAME }),
        expect.any(Object)
      );
    });

    it('should convert from/to Date filters to ISO strings', async () => {
      mockApiClient.post.mockResolvedValue({ items: [], totalCount: 0 });
      const from = new Date('2026-01-01T00:00:00.000Z');

      await decisionsService.query({ from });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.QUERY,
        expect.objectContaining({ from: from.toISOString() }),
        expect.any(Object)
      );
    });

    it('should send the folderKey as a header, not in the body', async () => {
      mockApiClient.post.mockResolvedValue({ items: [], totalCount: 0 });

      await decisionsService.query({ folderKey: DECISIONS_TEST_CONSTANTS.FOLDER_KEY, traceId: DECISIONS_TEST_CONSTANTS.TRACE_ID });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DECISIONS_ENDPOINTS.QUERY,
        expect.not.objectContaining({ folderKey: expect.anything() }),
        expect.objectContaining({ headers: expect.objectContaining({ 'X-UIPATH-FolderKey': DECISIONS_TEST_CONSTANTS.FOLDER_KEY }) })
      );
    });

    it('should propagate an error from the API', async () => {
      const error = new Error(DECISIONS_TEST_CONSTANTS.ERROR_DECISION_NOT_FOUND);
      mockApiClient.post.mockRejectedValue(error);

      await expect(decisionsService.query()).rejects.toThrow(DECISIONS_TEST_CONSTANTS.ERROR_DECISION_NOT_FOUND);
    });
  });
});
