import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GovernanceService } from '../../../../src/services/governance/governance';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { GOVERNANCE_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { GOVERNANCE_TEST_CONSTANTS, TEST_CONSTANTS } from '../../../utils/constants';
import {
  createMockRawPolicyEvaluationTrace,
  createMockRawPolicyEvaluationTracesResponse,
} from '../../../utils/mocks/governance';
import {
  PolicyEvaluationResult,
  PolicyEvaluationTracesGetAllOptions,
} from '../../../../src/models/governance/governance.types';
import type { PaginatedResponse } from '../../../../src/utils/pagination/types';
import type { PolicyEvaluationTrace } from '../../../../src/models/governance/governance.types';

vi.mock('../../../../src/core/http/api-client');

describe('GovernanceService Unit Tests', () => {
  let governanceService: GovernanceService;
  let mockApiClient: any;
  const startTime = new Date(GOVERNANCE_TEST_CONSTANTS.START_TIME_ISO);

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
    governanceService = new GovernanceService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPolicyEvaluationTraces - non-paginated', () => {
    it('should return camelCase items wrapped in NonPaginatedResponse', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawPolicyEvaluationTracesResponse());

      const result = await governanceService.getPolicyEvaluationTraces(startTime);

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.tenantId).toBe(GOVERNANCE_TEST_CONSTANTS.TENANT_ID);
      expect(item.policyId).toBe(GOVERNANCE_TEST_CONSTANTS.POLICY_ID);
      expect(item.policyName).toBe(GOVERNANCE_TEST_CONSTANTS.POLICY_NAME);
      expect(item.policyStatus).toBe(GOVERNANCE_TEST_CONSTANTS.POLICY_STATUS_ACTIVE);
      expect(item.finalEnforcement).toBe('Deny');
      expect(item.traceId).toBe(GOVERNANCE_TEST_CONSTANTS.TRACE_ID);
      expect(item.folderKey).toBe(GOVERNANCE_TEST_CONSTANTS.FOLDER_KEY);
      // NonPaginatedResponse has no pagination fields
      expect((result as PaginatedResponse<PolicyEvaluationTrace>).hasNextPage).toBeUndefined();
    });

    it('should expose only camelCase fields (API returns camelCase, no transform applied)', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawPolicyEvaluationTracesResponse());

      const result = await governanceService.getPolicyEvaluationTraces(startTime);
      const item = result.items[0];

      const pascalKeys = Object.keys(item).filter((k) => /^[A-Z]/.test(k));
      expect(pascalKeys).toEqual([]);
    });

    it('should send required startTime, omit pagination params, and use endpoint', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawPolicyEvaluationTracesResponse());

      await governanceService.getPolicyEvaluationTraces(startTime);

      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(GOVERNANCE_ENDPOINTS.POLICY.TRACES);
      expect(body.startTime).toBe(GOVERNANCE_TEST_CONSTANTS.START_TIME_ISO);
      expect(body.pageNumber).toBeUndefined();
      expect(body.pageSize).toBeUndefined();
    });

    it('should serialize endTime Date to ISO and pass array filters through', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawPolicyEvaluationTracesResponse());

      const endTime = new Date(GOVERNANCE_TEST_CONSTANTS.END_TIME_ISO);
      await governanceService.getPolicyEvaluationTraces(startTime, {
        endTime,
        evaluationResult: [PolicyEvaluationResult.Deny, PolicyEvaluationResult.SimulatedDeny],
        policyId: [GOVERNANCE_TEST_CONSTANTS.POLICY_ID],
        fullOrganization: true,
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.endTime).toBe(GOVERNANCE_TEST_CONSTANTS.END_TIME_ISO);
      expect(body.evaluationResult).toEqual(['Deny', 'SimulatedDeny']);
      expect(body.policyId).toEqual([GOVERNANCE_TEST_CONSTANTS.POLICY_ID]);
      expect(body.fullOrganization).toBe(true);
    });

    it('should return an empty items array when API returns no items', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await governanceService.getPolicyEvaluationTraces(startTime);

      expect(result.items).toEqual([]);
    });
  });

  describe('getPolicyEvaluationTraces - paginated', () => {
    it('should return PaginatedResponse with currentPage starting at 1 (SDK 1-based)', async () => {
      mockApiClient.post.mockResolvedValue(
        createMockRawPolicyEvaluationTracesResponse([createMockRawPolicyEvaluationTrace()]),
      );

      const result = await governanceService.getPolicyEvaluationTraces(startTime, {
        pageSize: TEST_CONSTANTS.PAGE_SIZE,
      }) as PaginatedResponse<PolicyEvaluationTrace>;

      expect(result.currentPage).toBe(1);
      expect(result.supportsPageJump).toBe(true);
      expect(result.hasNextPage).toBe(false);
      expect(result.previousCursor).toBeUndefined();
    });

    it('should map SDK 1-based pageNumber to API 0-based on the first paginated call', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawPolicyEvaluationTracesResponse());

      await governanceService.getPolicyEvaluationTraces(startTime, { pageSize: 5 });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.pageNumber).toBe(0);
      expect(body.pageSize).toBe(5);
    });

    it('should subtract 1 from jumpToPage before sending to API', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawPolicyEvaluationTracesResponse());

      await governanceService.getPolicyEvaluationTraces(startTime, { jumpToPage: 3, pageSize: 5 });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.pageNumber).toBe(2);
      expect(body.pageSize).toBe(5);
    });

    it('should set hasNextPage=true when page is exactly full', async () => {
      const pageSize = 2;
      const items = Array.from({ length: pageSize }, (_, i) =>
        createMockRawPolicyEvaluationTrace({ traceId: `trace-${i}` }),
      );
      mockApiClient.post.mockResolvedValue(createMockRawPolicyEvaluationTracesResponse(items));

      const result = await governanceService.getPolicyEvaluationTraces(startTime, {
        pageSize,
      }) as PaginatedResponse<PolicyEvaluationTrace>;

      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });

    it('should set hasNextPage=false when page is partial', async () => {
      const pageSize = 5;
      mockApiClient.post.mockResolvedValue(
        createMockRawPolicyEvaluationTracesResponse([createMockRawPolicyEvaluationTrace()]),
      );

      const result = await governanceService.getPolicyEvaluationTraces(startTime, {
        pageSize,
      }) as PaginatedResponse<PolicyEvaluationTrace>;

      expect(result.hasNextPage).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should round-trip pageNumber via cursor (next page → page 2 → API page 1)', async () => {
      const pageSize = 2;
      const fullPage = Array.from({ length: pageSize }, (_, i) =>
        createMockRawPolicyEvaluationTrace({ traceId: `trace-${i}` }),
      );
      mockApiClient.post.mockResolvedValueOnce(createMockRawPolicyEvaluationTracesResponse(fullPage));

      const page1 = await governanceService.getPolicyEvaluationTraces(startTime, { pageSize }) as PaginatedResponse<PolicyEvaluationTrace>;
      expect(page1.nextCursor).toBeDefined();
      expect(page1.hasNextPage).toBe(true);

      mockApiClient.post.mockResolvedValueOnce(
        createMockRawPolicyEvaluationTracesResponse([createMockRawPolicyEvaluationTrace()]),
      );

      const page2 = await governanceService.getPolicyEvaluationTraces(startTime, {
        cursor: page1.nextCursor,
      }) as PaginatedResponse<PolicyEvaluationTrace>;

      const [, body] = mockApiClient.post.mock.calls[1];
      expect(body.pageNumber).toBe(1);
      expect(body.pageSize).toBe(pageSize);
      expect(page2.currentPage).toBe(2);
    });
  });

  describe('getPolicyEvaluationTraces - validation', () => {
    it('should throw ValidationError when startTime is undefined', async () => {
      const callWithoutStartTime = governanceService.getPolicyEvaluationTraces.bind(
        governanceService,
      ) as (startTime?: Date) => Promise<unknown>;
      await expect(callWithoutStartTime()).rejects.toThrow('startTime is required');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when pageSize is zero', async () => {
      await expect(
        governanceService.getPolicyEvaluationTraces(startTime, { pageSize: 0 } as PolicyEvaluationTracesGetAllOptions),
      ).rejects.toThrow('pageSize must be a positive number');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when jumpToPage is zero', async () => {
      await expect(
        governanceService.getPolicyEvaluationTraces(startTime, { jumpToPage: 0 } as PolicyEvaluationTracesGetAllOptions),
      ).rejects.toThrow('jumpToPage must be a positive number');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when cursor is malformed', async () => {
      await expect(
        governanceService.getPolicyEvaluationTraces(startTime, {
          cursor: { value: 'not-a-valid-base64-json' },
        } as PolicyEvaluationTracesGetAllOptions),
      ).rejects.toThrow();
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('getPolicyEvaluationTraces - error propagation', () => {
    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(GOVERNANCE_TEST_CONSTANTS.ERROR_GOVERNANCE_REQUEST_FAILED));

      await expect(governanceService.getPolicyEvaluationTraces(startTime)).rejects.toThrow(
        GOVERNANCE_TEST_CONSTANTS.ERROR_GOVERNANCE_REQUEST_FAILED,
      );
    });
  });
});
