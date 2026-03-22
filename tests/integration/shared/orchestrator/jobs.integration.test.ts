import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Orchestrator Jobs - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('getAll', () => {
    it('should retrieve all jobs in a folder', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!config.folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID not configured');
      }

      const result = await jobs.getAll({
        folderId: Number(config.folderId),
        pageSize: 100,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve jobs with pagination options', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!config.folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID not configured');
      }

      const result = await jobs.getAll({
        folderId: Number(config.folderId),
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

      if (!config.folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID not configured');
      }

      const result = await jobs.getAll({
        folderId: Number(config.folderId),
        pageSize: 5,
        filter: "State eq 'Running'",
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('Job structure validation', () => {
    it('should have expected fields in job objects', async () => {
      const { jobs } = getServices();
      const config = getTestConfig();

      if (!config.folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID not configured');
      }

      const result = await jobs.getAll({
        folderId: Number(config.folderId),
        pageSize: 1,
      });

      if (result.items.length === 0) {
        throw new Error('No jobs available to validate structure. Run a process in the tenant first.');
      }

      const job = result.items[0];

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.key).toBeDefined();
      expect(job.state).toBeDefined();
      expect(job.releaseName).toBeDefined();
      expect(typeof job.id).toBe('number');
      expect(typeof job.key).toBe('string');
      expect(typeof job.state).toBe('string');

      // Verify field renames
      expect(job.createdTime).toBeDefined();
      expect(job.lastModifiedTime).toBeDefined();
      expect(job.folderId).toBeDefined();
      expect(job.folderName).toBeDefined();

      // Verify PascalCase fields are transformed
      expect((job as any).CreationTime).toBeUndefined();
      expect((job as any).LastModificationTime).toBeUndefined();
      expect((job as any).OrganizationUnitId).toBeUndefined();
      expect((job as any).OrganizationUnitFullyQualifiedName).toBeUndefined();
    });
  });
});
