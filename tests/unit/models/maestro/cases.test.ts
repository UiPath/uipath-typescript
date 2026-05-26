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
      getElementCountByStatus: vi.fn()
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('bound methods on case', () => {
    describe('case.getElementCountByStatus()', () => {
      it('should call service.getElementCountByStatus with bound processKey and packageId', async () => {
        const mockCaseData = createMockCase();
        const caseObj = createCaseWithMethods(mockCaseData, mockService);

        const startTime = new Date('2026-04-01T00:00:00Z');
        const endTime = new Date('2026-05-01T00:00:00Z');

        mockService.getElementCountByStatus = vi.fn().mockResolvedValue([]);

        await caseObj.getElementCountByStatus(startTime, endTime, MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION);

        expect(mockService.getElementCountByStatus).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
          MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          startTime,
          endTime,
          MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION
        );
      });

      it('should throw when processKey is undefined', () => {
        const mockCaseData = createMockCase({ processKey: undefined });
        const caseObj = createCaseWithMethods(mockCaseData, mockService);

        expect(() =>
          caseObj.getElementCountByStatus(new Date(), new Date(), '1.0.0')
        ).toThrow('Process key is undefined');
      });

      it('should throw when packageId is undefined', () => {
        const mockCaseData = createMockCase({ packageId: undefined });
        const caseObj = createCaseWithMethods(mockCaseData, mockService);

        expect(() =>
          caseObj.getElementCountByStatus(new Date(), new Date(), '1.0.0')
        ).toThrow('Package ID is undefined');
      });
    });
  });
});
