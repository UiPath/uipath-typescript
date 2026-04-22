import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createJobWithMethods,
  JobServiceModel
} from '../../../../src/models/orchestrator/jobs.models';
import { createBasicJob } from '../../../utils/mocks/jobs';
import { JOB_TEST_CONSTANTS } from '../../../utils/constants/jobs';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { StopStrategy } from '../../../../src/models/orchestrator/processes.types';

// ===== TEST SUITE =====
describe('Job Models', () => {
  let mockService: JobServiceModel;

  beforeEach(() => {
    mockService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      getOutput: vi.fn(),
      stop: vi.fn(),
      resume: vi.fn(),
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

        expect(mockService.getOutput).toHaveBeenCalledWith(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);
        expect(result).toEqual(mockOutput);
      });

      it('should return null when service returns null', async () => {
        const mockJobData = createBasicJob();
        const job = createJobWithMethods(mockJobData, mockService);

        vi.mocked(mockService.getOutput).mockResolvedValue(null);

        const result = await job.getOutput();

        expect(mockService.getOutput).toHaveBeenCalledWith(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);
        expect(result).toBeNull();
      });

      it('should throw when job key is undefined', async () => {
        const mockJobData = createBasicJob({ key: '' as any });
        const job = createJobWithMethods(mockJobData, mockService);

        await expect(job.getOutput()).rejects.toThrow('Job key is undefined');
      });

      it('should throw when job folderId is undefined', async () => {
        const mockJobData = createBasicJob({ folderId: undefined as any });
        const job = createJobWithMethods(mockJobData, mockService);

        await expect(job.getOutput()).rejects.toThrow('Job folderId is undefined');
      });
    });

    describe('job.stop()', () => {
      it('should call service.stop with the job key and folderId', async () => {
        const mockJobData = createBasicJob();
        const job = createJobWithMethods(mockJobData, mockService);

        const mockResult = undefined;
        vi.mocked(mockService.stop).mockResolvedValue(mockResult);

        const result = await job.stop();

        expect(mockService.stop).toHaveBeenCalledWith(
          [JOB_TEST_CONSTANTS.JOB_KEY],
          TEST_CONSTANTS.FOLDER_ID,
          undefined
        );
        expect(result).toEqual(mockResult);
      });

      it('should pass options to service.stop', async () => {
        const mockJobData = createBasicJob();
        const job = createJobWithMethods(mockJobData, mockService);

        const mockResult = undefined;
        vi.mocked(mockService.stop).mockResolvedValue(mockResult);

        await job.stop({ strategy: StopStrategy.Kill });

        expect(mockService.stop).toHaveBeenCalledWith(
          [JOB_TEST_CONSTANTS.JOB_KEY],
          TEST_CONSTANTS.FOLDER_ID,
          { strategy: StopStrategy.Kill }
        );
      });

      it('should throw when job key is undefined', async () => {
        const mockJobData = createBasicJob({ key: '' as any });
        const job = createJobWithMethods(mockJobData, mockService);

        await expect(job.stop()).rejects.toThrow('Job key is undefined');
      });

      it('should throw when job folderId is undefined', async () => {
        const mockJobData = createBasicJob({ folderId: undefined as any });
        const job = createJobWithMethods(mockJobData, mockService);

        await expect(job.stop()).rejects.toThrow('Job folderId is undefined');
      });
    });

    describe('job.resume()', () => {
      it('should call service.resume with the job key and folderId', async () => {
        const mockJobData = createBasicJob();
        const job = createJobWithMethods(mockJobData, mockService);

        vi.mocked(mockService.resume).mockResolvedValue(undefined);

        await job.resume();

        expect(mockService.resume).toHaveBeenCalledWith(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID, undefined);
      });

      it('should pass options to service.resume', async () => {
        const mockJobData = createBasicJob();
        const job = createJobWithMethods(mockJobData, mockService);

        vi.mocked(mockService.resume).mockResolvedValue(undefined);

        await job.resume({ inputArguments: JOB_TEST_CONSTANTS.INPUT_ARGUMENTS });

        expect(mockService.resume).toHaveBeenCalledWith(
          JOB_TEST_CONSTANTS.JOB_KEY,
          TEST_CONSTANTS.FOLDER_ID,
          { inputArguments: JOB_TEST_CONSTANTS.INPUT_ARGUMENTS }
        );
      });

      it('should throw when job key is undefined', async () => {
        const mockJobData = createBasicJob({ key: '' as any });
        const job = createJobWithMethods(mockJobData, mockService);

        await expect(job.resume()).rejects.toThrow('Job key is undefined');
      });

      it('should throw when job folderId is undefined', async () => {
        const mockJobData = createBasicJob({ folderId: undefined as any });
        const job = createJobWithMethods(mockJobData, mockService);

        await expect(job.resume()).rejects.toThrow('Job folderId is undefined');
      });
    });
  });
});
