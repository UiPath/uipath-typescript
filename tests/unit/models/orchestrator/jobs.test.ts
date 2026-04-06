import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createJobWithMethods,
  JobServiceModel
} from '../../../../src/models/orchestrator/jobs.models';
import { createBasicJob } from '../../../utils/mocks/jobs';
import { JOB_TEST_CONSTANTS } from '../../../utils/constants/jobs';

// ===== TEST SUITE =====
describe('Job Models', () => {
  let mockService: JobServiceModel;

  beforeEach(() => {
    mockService = {
      getAll: vi.fn(),
      getOutput: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('bound methods on job', () => {
    describe('job.getOutput()', () => {
      it('should call service.getOutput with the job key', async () => {
        const mockJobData = createBasicJob();
        const job = createJobWithMethods(mockJobData, mockService);

        const mockOutput = JOB_TEST_CONSTANTS.PARSED_OUTPUT;
        vi.mocked(mockService.getOutput).mockResolvedValue(mockOutput);

        const result = await job.getOutput();

        expect(mockService.getOutput).toHaveBeenCalledWith(JOB_TEST_CONSTANTS.JOB_KEY);
        expect(result).toEqual(mockOutput);
      });

      it('should return null when service returns null', async () => {
        const mockJobData = createBasicJob();
        const job = createJobWithMethods(mockJobData, mockService);

        vi.mocked(mockService.getOutput).mockResolvedValue(null);

        const result = await job.getOutput();

        expect(mockService.getOutput).toHaveBeenCalledWith(JOB_TEST_CONSTANTS.JOB_KEY);
        expect(result).toBeNull();
      });

      it('should throw when job key is undefined', async () => {
        const mockJobData = createBasicJob({ key: '' as any });
        const job = createJobWithMethods(mockJobData, mockService);

        await expect(job.getOutput()).rejects.toThrow('Job key is undefined');
      });
    });
  });
});
