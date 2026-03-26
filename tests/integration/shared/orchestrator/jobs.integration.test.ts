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

  describe('getById', () => {
    it('should retrieve a job by ID', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!jobs) {
        throw new Error('Jobs service not available in test services');
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      // First get a job ID from getAll
      const allJobs = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (allJobs.items.length === 0) {
        throw new Error('No jobs available to test getById');
      }

      const jobId = allJobs.items[0].id;
      const result = await jobs.getById(jobId);

      expect(result).toBeDefined();
      expect(result.id).toBe(jobId);
      expect(typeof result.key).toBe('string');
      expect(typeof result.state).toBe('string');
      expect(result.createdTime).toBeDefined();
    });

    it('should retrieve a job by ID with expand option', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!jobs) {
        throw new Error('Jobs service not available in test services');
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      // First get a job ID from getAll
      const allJobs = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (allJobs.items.length === 0) {
        throw new Error('No jobs available to test getById with expand');
      }

      const jobId = allJobs.items[0].id;
      const result = await jobs.getById(jobId, { expand: 'Release' });

      expect(result).toBeDefined();
      expect(result.id).toBe(jobId);
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
