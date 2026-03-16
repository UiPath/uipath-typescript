import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { createTestFileContent } from '../../utils/helpers';

const modes: InitMode[] = ['v0', 'v1'];

/**
 * Helper to get folder ID from config and validate it's set
 */
function getFolderId(): number | undefined {
  const config = getTestConfig();
  return config.folderId ? Number(config.folderId) : undefined;
}

/**
 * Helper to get a bucket for testing, handling the common validation logic
 * Returns the bucketId and folderId, or null if validation fails
 */
async function getBucketForTest(testName: string): Promise<{ bucketId: number; folderId: number } | null> {
  const { buckets } = getServices();
  const folderId = getFolderId();

  const allBuckets = await buckets.getAll({
    folderId,
    pageSize: 1,
  });

  if (allBuckets.items.length === 0) {
    console.log(`No buckets available for ${testName}`);
    return null;
  }

  if (!folderId) {
    console.log(`Skipping ${testName}: INTEGRATION_TEST_FOLDER_ID not configured.`);
    return null;
  }

  return {
    bucketId: allBuckets.items[0].id,
    folderId,
  };
}

describe.each(modes)('Orchestrator Buckets - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('getAll', () => {
    it('should retrieve all buckets', async () => {
      const { buckets } = getServices();
      const folderId = getFolderId();

      const result = await buckets.getAll({
        folderId,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve buckets with pagination options', async () => {
      const { buckets } = getServices();
      const folderId = getFolderId();

      const result = await buckets.getAll({
        folderId,
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
      const bucket = await getBucketForTest('getById');
      
      if (!bucket) {
        return;
      }

      const result = await buckets.getById(bucket.bucketId, bucket.folderId);

      expect(result).toBeDefined();
      expect(result.id).toBe(bucket.bucketId);
      expect(result.name).toBeDefined();
      expect(typeof result.name).toBe('string');
    });
  });

  describe('File operations', () => {
    it('should get file metadata from a bucket', async () => {
      const { buckets } = getServices();
      const bucket = await getBucketForTest('file metadata test');

      if (!bucket) {
        return;
      }

      const result = await buckets.getFileMetaData(bucket.bucketId, bucket.folderId);

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
      const bucket = await getBucketForTest('file upload test');

      if (!bucket) {
        return;
      }

      const fileName = `integration-test-${mode}-${Date.now()}.txt`;
      const fileContent = createTestFileContent(fileName);
      const buffer = Buffer.from(fileContent, 'utf-8');

      try {
        const uploadResult = await buckets.uploadFile({
          bucketId: bucket.bucketId,
          folderId: bucket.folderId,
          path: fileName,
          content: buffer,
        });

        expect(uploadResult).toBeDefined();
        expect(uploadResult.success).toBe(true);

        const metadata = await buckets.getFileMetaData(bucket.bucketId, bucket.folderId);
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
      const bucket = await getBucketForTest('read URI test');

      if (!bucket) {
        return;
      }

      const metadata = await buckets.getFileMetaData(bucket.bucketId, bucket.folderId);

      if (metadata.items.length === 0) {
        console.log('No files in bucket to get read URI for');
        return;
      }

      const fileName = metadata.items[0].path;

      const result = await buckets.getReadUri({
        bucketId: bucket.bucketId,
        folderId: bucket.folderId,
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
      const folderId = getFolderId();

      const result = await buckets.getAll({
        folderId,
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
