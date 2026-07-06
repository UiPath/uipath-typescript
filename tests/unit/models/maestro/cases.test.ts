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
      getIncidentsTimeline: vi.fn(),
      getTopFaultedCount: vi.fn(),
      getTopExecutionDuration: vi.fn(),
      getElementStats: vi.fn(),
      getInstanceStats: vi.fn()
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

        await caseObj.getElementStats(startTime, endTime, MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION);

        expect(mockService.getElementStats).toHaveBeenCalledWith({
          processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
          packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          packageVersion: MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION,
          startTime,
          endTime,
        });
      });
    });

    describe('case.getInstanceStats()', () => {
      it('should call service.getInstanceStats with bound processKey and packageId', async () => {
        const mockCaseData = createMockCase();
        const caseObj = createCaseWithMethods(mockCaseData, mockService);

        const startTime = new Date('2026-04-01T00:00:00Z');
        const endTime = new Date('2026-05-01T00:00:00Z');

        await caseObj.getInstanceStats(startTime, endTime, MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION);

        expect(mockService.getInstanceStats).toHaveBeenCalledWith({
          processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
          packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          packageVersion: MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION,
          startTime,
          endTime,
        });
      });
    });

    describe('case.getInstanceStatusTimeline()', () => {
      it('should call service.getInstanceStatusTimeline with bound processKey', async () => {
        const mockCaseData = createMockCase();
        const caseObj = createCaseWithMethods(mockCaseData, mockService);

        const startTime = new Date('2026-04-01T00:00:00Z');
        const endTime = new Date('2026-05-01T00:00:00Z');

        mockService.getInstanceStatusTimeline = vi.fn().mockResolvedValue([]);

        await caseObj.getInstanceStatusTimeline(startTime, endTime);

        expect(mockService.getInstanceStatusTimeline).toHaveBeenCalledWith(
          startTime,
          endTime,
          { processKeys: [MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY] }
        );
      });
    });

    describe('case.getIncidentsTimeline()', () => {
      it('should call service.getIncidentsTimeline with bound processKey', async () => {
        const mockCaseData = createMockCase();
        const caseObj = createCaseWithMethods(mockCaseData, mockService);

        const startTime = new Date('2026-04-01T00:00:00Z');
        const endTime = new Date('2026-05-01T00:00:00Z');

        mockService.getIncidentsTimeline = vi.fn().mockResolvedValue([]);

        await caseObj.getIncidentsTimeline(startTime, endTime);

        expect(mockService.getIncidentsTimeline).toHaveBeenCalledWith(
          startTime,
          endTime,
          { processKeys: [MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY] }
        );
      });
    });
  });
});
