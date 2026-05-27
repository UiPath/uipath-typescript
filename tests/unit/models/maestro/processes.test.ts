import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createProcessWithMethods,
  MaestroProcessesServiceModel
} from '../../../../src/models/maestro/processes.models';
import {
  MAESTRO_TEST_CONSTANTS,
  createMockProcess
} from '../../../utils/mocks';

// ===== TEST SUITE =====
describe('Process Models', () => {
  let mockService: MaestroProcessesServiceModel;

  beforeEach(() => {
    mockService = {
      getAll: vi.fn(),
      getIncidents: vi.fn(),
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

  describe('bound methods on process', () => {
    describe('process.getElementCountByStatus()', () => {
      it('should call service.getElementCountByStatus with bound processKey and packageId', async () => {
        const mockProcessData = createMockProcess();
        const process = createProcessWithMethods(mockProcessData, mockService);

        const startTime = new Date('2026-04-01T00:00:00Z');
        const endTime = new Date('2026-05-01T00:00:00Z');

        mockService.getElementCountByStatus = vi.fn().mockResolvedValue([]);

        await process.getElementCountByStatus(startTime, endTime, MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION);

        expect(mockService.getElementCountByStatus).toHaveBeenCalledWith(
          MAESTRO_TEST_CONSTANTS.PROCESS_KEY,
          MAESTRO_TEST_CONSTANTS.PACKAGE_ID,
          startTime,
          endTime,
          MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION
        );
      });

      it('should throw when processKey is undefined', () => {
        const mockProcessData = createMockProcess({ processKey: undefined });
        const process = createProcessWithMethods(mockProcessData, mockService);

        expect(() =>
          process.getElementCountByStatus(new Date(), new Date(), '1.0.0')
        ).toThrow('Process key is undefined');
      });

      it('should throw when packageId is undefined', () => {
        const mockProcessData = createMockProcess({ packageId: undefined });
        const process = createProcessWithMethods(mockProcessData, mockService);

        expect(() =>
          process.getElementCountByStatus(new Date(), new Date(), '1.0.0')
        ).toThrow('Package ID is undefined');
      });
    });
  });
});
