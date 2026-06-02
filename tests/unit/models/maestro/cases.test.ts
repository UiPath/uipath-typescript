import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCaseWithMethods,
  CasesServiceModel
} from '../../../../src/models/maestro/cases.models';
import {
  MAESTRO_TEST_CONSTANTS,
  createMockCase
} from '../../../utils/mocks';

// ===== TEST SUITE =====
describe('Case Models', () => {
  let mockService: CasesServiceModel;

  beforeEach(() => {
    mockService = {
      getAll: vi.fn(),
      getTopRunCount: vi.fn(),
      getInstanceStatusTimeline: vi.fn(),
      getTopFaultedCount: vi.fn(),
      getTopExecutionDuration: vi.fn(),
      getElementStats: vi.fn()
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('bound methods on case', () => {
    describe('case.getElementStats()', () => {
      it('should call service.getElementStats with bound processKey and packageId', async () => {
        const mockCaseData = createMockCase();
        const caseObj = createCaseWithMethods(mockCaseData, mockService);

        const startTime = new Date('2026-04-01T00:00:00Z');
        const endTime = new Date('2026-05-01T00:00:00Z');

        mockService.getElementStats = vi.fn().mockResolvedValue([]);

        await caseObj.getElementStats(startTime, endTime, MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION);

        expect(mockService.getElementStats).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
          MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          startTime,
          endTime,
          MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION
        );
      });
    });

    describe('case.getInstanceStats()', () => {
      it('should call service.getInstanceStats with bound processKey and packageId', async () => {
        const mockCaseData = createMockCase();
        const caseObj = createCaseWithMethods(mockCaseData, mockService);

        const startTime = new Date('2026-04-01T00:00:00Z');
        const endTime = new Date('2026-05-01T00:00:00Z');

        mockService.getInstanceStats = vi.fn().mockResolvedValue({});

        await caseObj.getInstanceStats(startTime, endTime, MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION);

        expect(mockService.getInstanceStats).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
          MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          startTime,
          endTime,
          MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION
        );
      });
    });
  });
});
