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

  describe('getByKey', () => {
    it('should retrieve a job by key', async () => {
      const { jobs, folderId } = getJobsService();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for getByKey tests.');
      }

      // First get a job key from getAll
      const allJobs = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (allJobs.items.length === 0) {
        throw new Error('No jobs available to test getByKey.');
      }

      const jobKey = allJobs.items[0].key;
      const job = await jobs.getByKey(jobKey, folderId);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.key).toBe(jobKey);
      expect(job.state).toBeDefined();
      expect(typeof job.id).toBe('number');
    });

    it('should retrieve a job with expand options', async () => {
      const { jobs, folderId } = getJobsService();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for getByKey tests.');
      }

      const allJobs = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (allJobs.items.length === 0) {
        throw new Error('No jobs available to test getByKey with expand.');
      }

      const jobKey = allJobs.items[0].key;
      const job = await jobs.getByKey(jobKey, folderId, {
        expand: 'Robot,Machine,Release',
      });

      expect(job).toBeDefined();
      expect(job.key).toBe(jobKey);
    });

    it('should have bound getOutput method on result', async () => {
      const { jobs, folderId } = getJobsService();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for getByKey tests.');
      }

      const allJobs = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (allJobs.items.length === 0) {
        throw new Error('No jobs available to test getByKey bound methods.');
      }

      const jobKey = allJobs.items[0].key;
      const job = await jobs.getByKey(jobKey, folderId);

      expect(job.getOutput).toBeDefined();
      expect(typeof job.getOutput).toBe('function');
    });

    it('should have transformed camelCase fields and no PascalCase fields', async () => {
      const { jobs, folderId } = getJobsService();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for getByKey transform tests.');
      }

      const allJobs = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (allJobs.items.length === 0) {
        throw new Error('No jobs available to validate transform.');
      }

      const jobKey = allJobs.items[0].key;
      const job = await jobs.getByKey(jobKey, folderId);

      // Verify transformed camelCase fields exist
      expect(job.createdTime).toBeDefined();
      expect(job.processName).toBeDefined();
      expect(job.folderId).toBeDefined();

      // Verify original PascalCase API fields are absent
      expect((job as any).CreationTime).toBeUndefined();
      expect((job as any).ReleaseName).toBeUndefined();
      expect((job as any).OrganizationUnitId).toBeUndefined();
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
        throw new Error('No successful jobs found to test getOutput.');
      }

      const job = result.items[0];
      const output = await jobs.getOutput(job.key, folderId);

      // Output can be null (if the job had no output) or a parsed object
      if (output !== null) {
        expect(typeof output).toBe('object');
      }
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
        throw new Error('No jobs available to validate structure');
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
