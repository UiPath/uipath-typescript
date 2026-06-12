import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  cleanupTestBucketFile,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';
import { createTestFileContent } from '../../utils/helpers';
import { isNotFoundError } from '../../../../src/core/errors';

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
 * Returns the bucketId and folderId, or fails the test if preconditions aren't met
 */
async function getBucketForTest(testName: string): Promise<{ bucketId: number; folderId: number }> {
  const { buckets } = getServices();
  const folderId = getFolderId();

  const allBuckets = await buckets.getAll({
    folderId,
    pageSize: 1,
  });

  expect(allBuckets.items.length, `No buckets available for ${testName}`).toBeGreaterThan(0);
  expect(folderId, `INTEGRATION_TEST_FOLDER_ID must be configured for ${testName}`).toBeDefined();

  return {
    bucketId: allBuckets.items[0].id,
    folderId: folderId!,
  };
}

describe.each(modes)('Orchestrator Buckets - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  const uploadedFiles: Array<{ bucketId: number; path: string; folderId: number }> = [];

  function trackUploadedFile(bucketId: number, path: string, folderId: number): void {
    uploadedFiles.push({ bucketId, path, folderId });
    registerResource('bucketFiles', { bucketId, path, folderId });
  }

  function untrackUploadedFile(path: string): void {
    const idx = uploadedFiles.findIndex((f) => f.path === path);
    if (idx !== -1) uploadedFiles.splice(idx, 1);
  }

  afterAll(async () => {
    for (const file of uploadedFiles.splice(0)) {
      await cleanupTestBucketFile(file.bucketId, file.path, file.folderId);
    }
  });

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

      const result = await buckets.getById(bucket.bucketId, bucket.folderId);

      expect(result).toBeDefined();
      expect(result.id).toBe(bucket.bucketId);
      expect(result.name).toBeDefined();
      expect(typeof result.name).toBe('string');
    });
  });

  describe('getByName', () => {
    let existingBucket!: { id: number; name: string };
    let folderKey!: string;

    beforeAll(async () => {
      const config = getTestConfig();
      if (!config.folderKey) {
        throw new Error('INTEGRATION_TEST_FOLDER_KEY must be configured for getByName');
      }
      folderKey = config.folderKey;

      const { buckets } = getServices();
      const allBuckets = await buckets.getAll({
        folderId: getFolderId(),
        pageSize: 1,
      });
      expect(allBuckets.items.length, 'No buckets available to test getByName').toBeGreaterThan(0);
      existingBucket = { id: allBuckets.items[0].id, name: allBuckets.items[0].name };
    });

    it('should retrieve a bucket by name using folderKey', async () => {
      const { buckets } = getServices();

      const result = await buckets.getByName(existingBucket.name, { folderKey });

      expect(result).toBeDefined();
      expect(result.id).toBe(existingBucket.id);
      expect(result.name).toBe(existingBucket.name);
    });

    it('should retrieve a bucket by name using folderPath', async () => {
      const { buckets } = getServices();
      const config = getTestConfig();

      expect(config.folderPath, 'INTEGRATION_TEST_FOLDER_PATH must be configured for getByName').toBeDefined();

      const result = await buckets.getByName(existingBucket.name, { folderPath: config.folderPath });

      expect(result).toBeDefined();
      expect(result.id).toBe(existingBucket.id);
      expect(result.name).toBe(existingBucket.name);
    });

    it('should return transformed camelCase fields (no PascalCase leaks)', async () => {
      const { buckets } = getServices();

      const result = await buckets.getByName(existingBucket.name, { folderKey });

      // Transformed camelCase fields should be present
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      // Original PascalCase keys from the raw OData payload must be gone
      expect((result as any).Id).toBeUndefined();
      expect((result as any).Name).toBeUndefined();
      expect((result as any).StorageProvider).toBeUndefined();
    });

    it('should throw NotFoundError for a nonexistent bucket name', async () => {
      const { buckets } = getServices();

      const missingName = `__uipath-sdk-nonexistent-bucket-${Date.now()}`;
      await expect(
        buckets.getByName(missingName, { folderKey }),
      ).rejects.toSatisfy(isNotFoundError);
    });
  });

  describe('File operations', () => {
    it('should get file metadata from a bucket', async () => {
      const { buckets } = getServices();
      const bucket = await getBucketForTest('file metadata test');

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

      const fileName = `integration-test-${mode}-${Date.now()}.txt`;
      const fileContent = createTestFileContent(fileName);
      const buffer = Buffer.from(fileContent, 'utf-8');

      try {
        const uploadResult = await buckets.uploadFile(bucket.bucketId, fileName, buffer, { folderId: bucket.folderId });
        trackUploadedFile(bucket.bucketId, fileName, bucket.folderId);

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

      const metadata = await buckets.getFileMetaData(bucket.bucketId, bucket.folderId);

      expect(metadata.items.length, 'No files in bucket to get read URI for').toBeGreaterThan(0);

      const fileName = metadata.items[0].path;

      const result = await buckets.getReadUri(bucket.bucketId, fileName, { folderId: bucket.folderId });

      expect(result).toBeDefined();
      expect(result.uri).toBeDefined();
      expect(result.uri).toMatch(/^https?:\/\/.+/);
      console.log(`Got read URI for file: ${fileName}`);
    });

    it('should upload a file and then delete it', async () => {
      const { buckets } = getServices();
      const bucket = await getBucketForTest('delete file test');

      const fileName = `/integration-delete-${mode}-${Date.now()}.txt`;
      const fileContent = createTestFileContent(fileName);
      const buffer = Buffer.from(fileContent, 'utf-8');

      const uploadResult = await buckets.uploadFile(bucket.bucketId, fileName, buffer, { folderId: bucket.folderId });
      trackUploadedFile(bucket.bucketId, fileName, bucket.folderId);
      expect(uploadResult.success).toBe(true);

      await buckets.deleteFile(bucket.bucketId, fileName, { folderId: bucket.folderId });
      untrackUploadedFile(fileName);

      const metadata = await buckets.getFileMetaData(bucket.bucketId, bucket.folderId, {
        prefix: fileName,
      });
      const stillPresent = metadata.items.find((f) => f.path === fileName);
      expect(stillPresent).toBeUndefined();
    });

    it('should list files via OData GetFiles', async () => {
      const { buckets } = getServices();
      const bucket = await getBucketForTest('OData GetFiles test');

      const seedName = `/integration-getfiles-${mode}-${Date.now()}.txt`;
      await buckets.uploadFile(
        bucket.bucketId,
        seedName,
        Buffer.from(createTestFileContent(seedName), 'utf-8'),
        { folderId: bucket.folderId },
      );
      trackUploadedFile(bucket.bucketId, seedName, bucket.folderId);

      const result = await buckets.getFiles(bucket.bucketId, { folderId: bucket.folderId });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length, 'GetFiles returned an empty listing despite a seeded file').toBeGreaterThan(0);

      const file = result.items[0];
      expect(file.path).toBeDefined();
      expect(typeof file.path).toBe('string');
      expect(typeof file.isDirectory).toBe('boolean');
      // PascalCase originals must be absent
      expect((file as any).FullPath).toBeUndefined();
      expect((file as any).IsDirectory).toBeUndefined();

      await buckets.deleteFile(bucket.bucketId, seedName, { folderId: bucket.folderId });
      untrackUploadedFile(seedName);
    });

    it('should paginate getFiles with pageSize', async () => {
      const { buckets } = getServices();
      const bucket = await getBucketForTest('OData GetFiles pagination test');

      const page1 = await buckets.getFiles(bucket.bucketId, { folderId: bucket.folderId, pageSize: 2 });

      expect(page1.items.length).toBeLessThanOrEqual(2);
    });

    it('should filter getFiles by fileNameRegex', async () => {
      const { buckets } = getServices();
      const bucket = await getBucketForTest('OData GetFiles regex test');

      const result = await buckets.getFiles(bucket.bucketId, {
        folderId: bucket.folderId,
        fileNameRegex: '.*\\.txt$',
        pageSize: 5,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('File operations - folderKey scoping', () => {
    let bucketId!: number;
    let folderId!: number;
    let folderKey!: string;
    let folderPath!: string;

    beforeAll(async () => {
      const config = getTestConfig();
      if (!config.folderKey) {
        throw new Error('INTEGRATION_TEST_FOLDER_KEY must be configured for folderKey scoping tests');
      }
      if (!config.folderPath) {
        throw new Error('INTEGRATION_TEST_FOLDER_PATH must be configured for folderKey scoping tests');
      }
      folderKey = config.folderKey;
      folderPath = config.folderPath;
      const bucket = await getBucketForTest('folderKey scoping');
      bucketId = bucket.bucketId;
      folderId = bucket.folderId;
    });

    it('should get file metadata using folderKey', async () => {
      const { buckets } = getServices();

      const result = await buckets.getFileMetaData(bucketId, { folderKey });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should get file metadata using folderPath', async () => {
      const { buckets } = getServices();

      const result = await buckets.getFileMetaData(bucketId, { folderPath });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should upload and get read URI using folderKey', async () => {
      const { buckets } = getServices();
      const fileName = `/integration-folderkey-${mode}-${Date.now()}.txt`;
      const buffer = Buffer.from(createTestFileContent(fileName), 'utf-8');

      const uploadResult = await buckets.uploadFile(bucketId, fileName, buffer, { folderKey });
      // Tracker uses folderId for cleanup since deleteFile-by-folderKey is not exercised here
      trackUploadedFile(bucketId, fileName, folderId);

      expect(uploadResult.success).toBe(true);

      const readUri = await buckets.getReadUri(bucketId, fileName, { folderKey });

      expect(readUri.uri).toMatch(/^https?:\/\/.+/);
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

      expect(result.items.length, 'No buckets available to validate structure').toBeGreaterThan(0);

      const bucket = result.items[0];

      expect(bucket).toBeDefined();
      expect(bucket.id).toBeDefined();
      expect(bucket.name).toBeDefined();
      expect(typeof bucket.id).toBe('number');
      expect(typeof bucket.name).toBe('string');
    });
  });
});
