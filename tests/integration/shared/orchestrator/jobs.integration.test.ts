import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Orchestrator Jobs - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('getAll', () => {
    it('should retrieve all jobs', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!jobs) {
        throw new Error('Jobs service not available in test services');
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('INTEGRATION_TEST_FOLDER_ID not configured, running without folder filter.');
      }

      const result = await jobs.getAll({
        folderId,
        pageSize: 100,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve jobs with pagination options', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!jobs) {
        throw new Error('Jobs service not available in test services');
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('INTEGRATION_TEST_FOLDER_ID not configured, running without folder filter.');
      }

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
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!jobs) {
        throw new Error('Jobs service not available in test services');
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('INTEGRATION_TEST_FOLDER_ID not configured, running without folder filter.');
      }

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

  describe('stop', () => {
    it('should stop a running job with soft stop strategy', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!jobs) {
        throw new Error('Jobs service not available in test services');
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.warn('INTEGRATION_TEST_FOLDER_ID not configured, skipping stop test.');
        return;
      }

      // Find a running job to stop
      const runningJobs = await jobs.getAll({
        folderId,
        filter: "State eq 'Running'",
        pageSize: 1,
      });

      if (runningJobs.items.length === 0) {
        console.warn('No running jobs available to test stop. Skipping.');
        return;
      }

      const jobKey = runningJobs.items[0].key;

      const result = await jobs.stop([jobKey], folderId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.jobIds).toBeDefined();
      expect(Array.isArray(result.data.jobIds)).toBe(true);
      expect(result.data.jobIds.length).toBe(1);
      expect(typeof result.data.jobIds[0]).toBe('number');
    });

    it('should return empty result when called with empty array', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!jobs) {
        throw new Error('Jobs service not available in test services');
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.warn('INTEGRATION_TEST_FOLDER_ID not configured, skipping stop test.');
        return;
      }

      const result = await jobs.stop([], folderId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data.jobIds).toEqual([]);
    });
  });

  describe('Job structure validation', () => {
    it('should have expected fields in job objects', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!jobs) {
        throw new Error('Jobs service not available in test services');
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('INTEGRATION_TEST_FOLDER_ID not configured, running without folder filter.');
      }

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
