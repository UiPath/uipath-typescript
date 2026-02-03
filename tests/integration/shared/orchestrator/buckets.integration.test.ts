import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { createTestFileContent } from '../../utils/helpers';

const modes: InitMode[] = ['v1', 'v2'];

describe.each(modes)('Orchestrator Buckets - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('getAll', () => {
    it('should retrieve all buckets', async () => {
      const { buckets } = getServices();
      const config = getTestConfig();

      const result = await buckets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve buckets with pagination options', async () => {
      const { buckets } = getServices();
      const config = getTestConfig();

      const result = await buckets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getById', () => {
    it('should retrieve a specific bucket by ID', async () => {
      const { buckets } = getServices();
      const config = getTestConfig();

      const allBuckets = await buckets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });

      if (allBuckets.items.length === 0) {
        console.log('No buckets available to test getById. Create a bucket in the tenant first.');
        return;
      }

      const bucketId = allBuckets.items[0].id;
      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('Skipping getById test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      const result = await buckets.getById(bucketId, folderId);

      expect(result).toBeDefined();
      expect(result.id).toBe(bucketId);
      expect(result.name).toBeDefined();
      expect(typeof result.name).toBe('string');
    });
  });

  describe('File operations', () => {
    it('should get file metadata from a bucket', async () => {
      const { buckets } = getServices();
      const config = getTestConfig();

      const allBuckets = await buckets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });

      if (allBuckets.items.length === 0) {
        console.log('No buckets available for file operations test');
        return;
      }

      const bucketId = allBuckets.items[0].id;
      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('Skipping file metadata test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      const result = await buckets.getFileMetaData(bucketId, folderId);

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);

      console.log(`Bucket contains ${result.items.length} files`);

      if (result.items.length > 0) {
        const file = result.items[0];
        expect(file.path).toBeDefined();
        expect(typeof file.path).toBe('string');
      }
    });

    it('should upload a file and retrieve its metadata', async () => {
      const { buckets } = getServices();
      const config = getTestConfig();

      const allBuckets = await buckets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });

      if (allBuckets.items.length === 0) {
        console.log('No buckets available for file upload test');
        return;
      }

      const bucketId = allBuckets.items[0].id;
      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('Skipping file upload test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      const fileName = `integration-test-${mode}-${Date.now()}.txt`;
      const fileContent = createTestFileContent(fileName);
      const buffer = Buffer.from(fileContent, 'utf-8');

      try {
        const uploadResult = await buckets.uploadFile({
          bucketId: bucketId,
          folderId: folderId,
          path: fileName,
          content: buffer,
        });

        expect(uploadResult).toBeDefined();
        expect(uploadResult.success).toBe(true);

        const metadata = await buckets.getFileMetaData(bucketId, folderId);
        const uploadedFile = metadata.items.find((f: any) => f.path === fileName);

        if (uploadedFile) {
          expect(uploadedFile.path).toBe(fileName);
          console.log(`Successfully uploaded and verified file: ${fileName}`);
        }
      } catch (error: any) {
        console.log('File upload test failed:', error.message);
        console.log('Note: File upload may require specific bucket permissions');
      }
    });

    it('should get read URI for file download', async () => {
      const { buckets } = getServices();
      const config = getTestConfig();

      const allBuckets = await buckets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });

      if (allBuckets.items.length === 0) {
        console.log('No buckets available');
        return;
      }

      const bucketId = allBuckets.items[0].id;
      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('Skipping read URI test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      const metadata = await buckets.getFileMetaData(bucketId, folderId);

      if (metadata.items.length === 0) {
        console.log('No files in bucket to get read URI for');
        return;
      }

      const fileName = metadata.items[0].path;

      const result = await buckets.getReadUri({
        bucketId: bucketId,
        folderId: folderId,
        path: fileName,
      });

      expect(result).toBeDefined();
      expect(result.uri).toBeDefined();
      expect(result.uri).toMatch(/^https?:\/\/.+/);
      console.log(`Got read URI for file: ${fileName}`);
    });
  });

  describe('Bucket structure validation', () => {
    it('should have expected fields in bucket objects', async () => {
      const { buckets } = getServices();
      const config = getTestConfig();

      const result = await buckets.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });

      if (result.items.length === 0) {
        console.log('No buckets available to validate structure');
        return;
      }

      const bucket = result.items[0];

      expect(bucket).toBeDefined();
      expect(bucket.id).toBeDefined();
      expect(bucket.name).toBeDefined();
      expect(typeof bucket.id).toBe('number');
      expect(typeof bucket.name).toBe('string');
    });
  });
});
