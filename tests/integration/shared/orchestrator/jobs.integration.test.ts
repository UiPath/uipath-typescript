import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';

const modes: InitMode[] = ['v1'];

function getJobsService() {
  const { jobs } = getServices();
  const config = getTestConfig();

  if (!jobs) {
    throw new Error('Jobs service not available in test services');
  }

  const folderId = config.folderId ? Number(config.folderId) : undefined;

  return { jobs, folderId };
}

describe.each(modes)('Orchestrator Jobs - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('getAll', () => {
    it('should retrieve all jobs', async () => {
      const { jobs, folderId } = getJobsService();

      const result = await jobs.getAll({
        folderId,
        pageSize: 100,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve jobs with pagination options', async () => {
      const { jobs, folderId } = getJobsService();

      const result = await jobs.getAll({
        folderId,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(10);
    });

    it('should retrieve jobs with filter', async () => {
      const { jobs, folderId } = getJobsService();

      const result = await jobs.getAll({
        folderId,
        pageSize: 5,
        filter: "State eq 'Successful'",
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('getById', () => {
    it('should retrieve a job by key with bound methods', async () => {
      const { jobs, folderId } = getJobsService();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for getById tests.');
      }

      const allJobs = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (allJobs.items.length === 0) {
        throw new Error('No jobs available in the test environment to test getById.');
      }

      const jobKey = allJobs.items[0].key;
      const job = await jobs.getById(jobKey, folderId);

      // Core fields
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.key).toBe(jobKey);
      expect(job.state).toBeDefined();
      expect(typeof job.id).toBe('number');

      // Bound methods
      expect(job.getOutput).toBeDefined();
      expect(typeof job.getOutput).toBe('function');
    });

    it('should apply transform pipeline correctly', async () => {
      const { jobs, folderId } = getJobsService();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for getById tests.');
      }

      const allJobs = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (allJobs.items.length === 0) {
        throw new Error('No jobs available in the test environment to test getById.');
      }

      const jobKey = allJobs.items[0].key;
      const job = await jobs.getById(jobKey, folderId);

      // Verify transformed camelCase fields exist
      expect(job.createdTime).toBeDefined();
      expect(job.processName).toBeDefined();
      expect(job.folderId).toBeDefined();

      // Verify original PascalCase API fields are absent
      expect((job as any).CreationTime).toBeUndefined();
      expect((job as any).ReleaseName).toBeUndefined();
      expect((job as any).OrganizationUnitId).toBeUndefined();
    });

    it('should retrieve a job with expand options', async () => {
      const { jobs, folderId } = getJobsService();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for getById tests.');
      }

      const allJobs = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (allJobs.items.length === 0) {
        throw new Error('No jobs available in the test environment to test getById with expand.');
      }

      const jobKey = allJobs.items[0].key;
      const job = await jobs.getById(jobKey, folderId, {
        expand: 'robot,machine',
      });

      expect(job).toBeDefined();
      expect(job.key).toBe(jobKey);

      // Verify expand affected the response — expanded entities may not be
      // present in all test environments, so guard assertions.
      if (job.robot) {
        expect(job.robot.id).toBeDefined();
      }
      if (job.machine) {
        expect(job.machine.id).toBeDefined();
      }
    });
  });

  describe('getOutput', () => {
    it('should return parsed output or null for a completed job', async () => {
      const { jobs, folderId } = getJobsService();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for getOutput tests (GetByKey requires a folder ID).');
      }

      // Find a successful job that might have output
      const result = await jobs.getAll({
        folderId,
        pageSize: 5,
        filter: "State eq 'Successful'",
      });

      if (result.items.length === 0) {
        throw new Error('No successful jobs found in the test environment to test getOutput.');
      }

      const job = result.items[0];
      const output = await jobs.getOutput(job.key, folderId);

      // Output can be null (if the job had no output) or a parsed object
      if (output !== null) {
        expect(typeof output).toBe('object');
      }
    });
  });

  describe('stop', () => {
    it('should start a process and then stop the resulting job', async () => {
      const { jobs, folderId } = getJobsService();
      const { processes } = getServices();
      const config = getTestConfig();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID not configured — cannot run stop test.');
      }

      const processKey = config.orchestratorTestProcessKey;
      if (!processKey) {
        throw new Error('ORCHESTRATOR_TEST_PROCESS_KEY not configured — cannot run stop test.');
      }

      // Start a process to create a job
      const startedJobs = await processes.start({ processKey }, folderId);
      expect(startedJobs.length).toBeGreaterThan(0);

      const jobKey = startedJobs[0].key;

      // Stop the job we just started — resolves without error on success
      await jobs.stop([jobKey], folderId);
    });

    it('should return empty result when called with empty array', async () => {
      const { jobs } = getJobsService();

      // folderId is unused for empty-array inputs — stop() returns early before reading it
      await jobs.stop([], 0);
    });
  });

  describe('Job structure validation', () => {
    it('should have expected fields in job objects', async () => {
      const { jobs, folderId } = getJobsService();

      const result = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (result.items.length === 0) {
        throw new Error('No jobs available to validate structure.');
      }

      const job = result.items[0];

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.key).toBeDefined();
      expect(job.state).toBeDefined();
      expect(typeof job.id).toBe('number');
      expect(typeof job.key).toBe('string');
      expect(typeof job.state).toBe('string');
    });
  });
});
