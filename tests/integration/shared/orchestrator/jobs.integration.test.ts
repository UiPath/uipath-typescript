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
