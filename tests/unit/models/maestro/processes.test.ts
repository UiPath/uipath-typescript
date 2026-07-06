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

  describe('bound methods on process', () => {
    describe('process.getElementStats()', () => {
      it('should call service.getElementStats with bound processKey and packageId', async () => {
        const mockProcessData = createMockProcess();
        const process = createProcessWithMethods(mockProcessData, mockService);

        const startTime = new Date('2026-04-01T00:00:00Z');
        const endTime = new Date('2026-05-01T00:00:00Z');

        await process.getElementStats(startTime, endTime, MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION);

        expect(mockService.getElementStats).toHaveBeenCalledWith({
          processKey: MAESTRO_TEST_CONSTANTS.PROCESS_KEY,
          packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_ID,
          packageVersion: MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION,
          startTime,
          endTime,
        });
      });

      it('should throw when processKey is undefined', () => {
        const mockProcessData = createMockProcess({ processKey: undefined });
        const process = createProcessWithMethods(mockProcessData, mockService);

        expect(() =>
          process.getElementStats(new Date(), new Date(), '1.0.0')
        ).toThrow('Process key is undefined');
      });

      it('should throw when packageId is undefined', () => {
        const mockProcessData = createMockProcess({ packageId: undefined });
        const process = createProcessWithMethods(mockProcessData, mockService);

        expect(() =>
          process.getElementStats(new Date(), new Date(), '1.0.0')
        ).toThrow('Package ID is undefined');
      });
    });

    describe('process.getInstanceStats()', () => {
      it('should call service.getInstanceStats with bound processKey and packageId', async () => {
        const mockProcessData = createMockProcess();
        const process = createProcessWithMethods(mockProcessData, mockService);

        const startTime = new Date('2026-04-01T00:00:00Z');
        const endTime = new Date('2026-05-01T00:00:00Z');

        await process.getInstanceStats(startTime, endTime, MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION);

        expect(mockService.getInstanceStats).toHaveBeenCalledWith({
          processKey: MAESTRO_TEST_CONSTANTS.PROCESS_KEY,
          packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_ID,
          packageVersion: MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION,
          startTime,
          endTime,
        });
      });

      it('should throw when processKey is undefined', () => {
        const mockProcessData = createMockProcess({ processKey: undefined });
        const process = createProcessWithMethods(mockProcessData, mockService);

        expect(() =>
          process.getInstanceStats(new Date(), new Date(), '1.0.0')
        ).toThrow('Process key is undefined');
      });

      it('should throw when packageId is undefined', () => {
        const mockProcessData = createMockProcess({ packageId: undefined });
        const process = createProcessWithMethods(mockProcessData, mockService);

        expect(() =>
          process.getInstanceStats(new Date(), new Date(), '1.0.0')
        ).toThrow('Package ID is undefined');
      });
    });

    describe('process.getInstanceStatusTimeline()', () => {
      it('should call service.getInstanceStatusTimeline with bound processKey', async () => {
        const mockProcessData = createMockProcess();
        const process = createProcessWithMethods(mockProcessData, mockService);

        const startTime = new Date('2026-04-01T00:00:00Z');
        const endTime = new Date('2026-05-01T00:00:00Z');

        mockService.getInstanceStatusTimeline = vi.fn().mockResolvedValue([]);

        await process.getInstanceStatusTimeline(startTime, endTime);

        expect(mockService.getInstanceStatusTimeline).toHaveBeenCalledWith(
          startTime,
          endTime,
          { processKeys: [MAESTRO_TEST_CONSTANTS.PROCESS_KEY] }
        );
      });

      it('should throw when processKey is undefined', () => {
        const mockProcessData = createMockProcess({ processKey: undefined });
        const process = createProcessWithMethods(mockProcessData, mockService);

        expect(() =>
          process.getInstanceStatusTimeline(new Date(), new Date())
        ).toThrow('Process key is undefined');
      });
    });

    describe('process.getIncidentsTimeline()', () => {
      it('should call service.getIncidentsTimeline with bound processKey', async () => {
        const mockProcessData = createMockProcess();
        const process = createProcessWithMethods(mockProcessData, mockService);

        const startTime = new Date('2026-04-01T00:00:00Z');
        const endTime = new Date('2026-05-01T00:00:00Z');

        mockService.getIncidentsTimeline = vi.fn().mockResolvedValue([]);

        await process.getIncidentsTimeline(startTime, endTime);

        expect(mockService.getIncidentsTimeline).toHaveBeenCalledWith(
          startTime,
          endTime,
          { processKeys: [MAESTRO_TEST_CONSTANTS.PROCESS_KEY] }
        );
      });

      it('should throw when processKey is undefined', () => {
        const mockProcessData = createMockProcess({ processKey: undefined });
        const process = createProcessWithMethods(mockProcessData, mockService);

        expect(() =>
          process.getIncidentsTimeline(new Date(), new Date())
        ).toThrow('Process key is undefined');
      });
    });
  });
});
