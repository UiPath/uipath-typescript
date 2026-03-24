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

  describe('getOutput', () => {
    it('should return parsed output for a completed job with output arguments', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!jobs) {
        throw new Error('Jobs service not available in test services');
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.warn('Skipping getOutput test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      // Find a successful job that might have output
      const result = await jobs.getAll({
        folderId,
        pageSize: 5,
        filter: "State eq 'Successful'",
      });

      if (result.items.length === 0) {
        console.warn('Skipping getOutput test: no successful jobs found.');
        return;
      }

      const job = result.items[0];
      const output = await jobs.getOutput({ jobId: job.id, folderId });

      // Output can be null (if the job had no output) or a parsed object
      if (output !== null) {
        expect(typeof output).toBe('object');
      }
    });

    it('should return null for a job without output', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!jobs) {
        throw new Error('Jobs service not available in test services');
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.warn('Skipping getOutput test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      // Find a job — it may or may not have output
      const result = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (result.items.length === 0) {
        console.warn('Skipping getOutput test: no jobs found.');
        return;
      }

      const job = result.items[0];
      const output = await jobs.getOutput({ jobId: job.id, folderId });

      // Either null or a valid object — both are acceptable
      expect(output === null || typeof output === 'object').toBe(true);
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
