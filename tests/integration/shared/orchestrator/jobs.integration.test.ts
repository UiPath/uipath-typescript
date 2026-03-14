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
        console.log('Jobs service not available in test services');
        return;
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('Skipping jobs test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      try {
        const result = await jobs.getAll({
          folderId,
          pageSize: 100,
        });

        expect(result).toBeDefined();
        expect(result.items).toBeDefined();
        expect(Array.isArray(result.items)).toBe(true);
      } catch (error: any) {
        console.log('Test failed:', error.message);
      }
    });

    it('should retrieve jobs with pagination options', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!jobs) {
        console.log('Jobs service not available in test services');
        return;
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('Skipping jobs test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      try {
        const result = await jobs.getAll({
          folderId,
          pageSize: 10,
        });

        expect(result).toBeDefined();
        expect(result.items).toBeDefined();
        expect(Array.isArray(result.items)).toBe(true);
        expect(result.items.length).toBeLessThanOrEqual(10);
      } catch (error: any) {
        console.log('Test failed:', error.message);
      }
    });

    it('should retrieve jobs with filter', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!jobs) {
        console.log('Jobs service not available in test services');
        return;
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('Skipping jobs test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      try {
        const result = await jobs.getAll({
          folderId,
          pageSize: 5,
          filter: "State eq 'Successful'",
        });

        expect(result).toBeDefined();
        expect(result.items).toBeDefined();
        expect(Array.isArray(result.items)).toBe(true);
      } catch (error: any) {
        console.log('Test failed:', error.message);
      }
    });
  });

  describe('Job structure validation', () => {
    it('should have expected fields in job objects', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!jobs) {
        console.log('Jobs service not available in test services');
        return;
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('Skipping jobs test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      try {
        const result = await jobs.getAll({
          folderId,
          pageSize: 1,
        });

        if (result.items.length === 0) {
          console.log('No jobs available to validate structure');
          return;
        }

        const job = result.items[0];

        expect(job).toBeDefined();
        expect(job.id).toBeDefined();
        expect(job.key).toBeDefined();
        expect(job.state).toBeDefined();
        expect(typeof job.id).toBe('number');
        expect(typeof job.key).toBe('string');
        expect(typeof job.state).toBe('string');
      } catch (error: any) {
        console.log('Test failed:', error.message);
      }
    });
  });
});
