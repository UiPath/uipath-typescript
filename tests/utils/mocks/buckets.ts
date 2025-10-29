/**
 * Mock utilities for Bucket service tests
 * Provides factory functions for creating mock API responses and test data
 */

import { createMockBaseResponse, createMockCollection } from './core';
import { BUCKET_TEST_CONSTANTS } from '../constants/buckets';
import type { 
  BucketGetResponse, 
  BlobItem, 
} from '../../../src/models/orchestrator/buckets.types';
import { BucketOptions } from '../../../src/models/orchestrator/buckets.types';

/**
 * Creates a mock bucket response (API response format - PascalCase)
 */
export const createMockBucketApiResponse = (overrides: any = {}): any => 
  createMockBaseResponse({
    Id: BUCKET_TEST_CONSTANTS.BUCKET_ID,
    Name: BUCKET_TEST_CONSTANTS.BUCKET_NAME,
    Description: BUCKET_TEST_CONSTANTS.BUCKET_DESCRIPTION,
    Identifier: BUCKET_TEST_CONSTANTS.BUCKET_IDENTIFIER,
    StorageProvider: BUCKET_TEST_CONSTANTS.STORAGE_PROVIDER,
    StorageParameters: BUCKET_TEST_CONSTANTS.STORAGE_PARAMETERS,
    StorageContainer: BUCKET_TEST_CONSTANTS.STORAGE_CONTAINER,
    Options: BucketOptions.None,
    CredentialStoreId: BUCKET_TEST_CONSTANTS.CREDENTIAL_STORE_ID,
    ExternalName: BUCKET_TEST_CONSTANTS.EXTERNAL_NAME,
    Password: BUCKET_TEST_CONSTANTS.PASSWORD,
    FoldersCount: BUCKET_TEST_CONSTANTS.FOLDERS_COUNT
  }, overrides);

/**
 * Creates a mock bucket response (transformed format - camelCase)
 */
export const createMockBucketResponse = (overrides: Partial<BucketGetResponse> = {}): BucketGetResponse => 
  createMockBaseResponse({
    id: BUCKET_TEST_CONSTANTS.BUCKET_ID,
    name: BUCKET_TEST_CONSTANTS.BUCKET_NAME,
    description: BUCKET_TEST_CONSTANTS.BUCKET_DESCRIPTION,
    identifier: BUCKET_TEST_CONSTANTS.BUCKET_IDENTIFIER,
    storageProvider: BUCKET_TEST_CONSTANTS.STORAGE_PROVIDER,
    storageParameters: BUCKET_TEST_CONSTANTS.STORAGE_PARAMETERS,
    storageContainer: BUCKET_TEST_CONSTANTS.STORAGE_CONTAINER,
    options: BucketOptions.None,
    credentialStoreId: BUCKET_TEST_CONSTANTS.CREDENTIAL_STORE_ID,
    externalName: BUCKET_TEST_CONSTANTS.EXTERNAL_NAME,
    password: BUCKET_TEST_CONSTANTS.PASSWORD,
    foldersCount: BUCKET_TEST_CONSTANTS.FOLDERS_COUNT
  }, overrides);

/**
 * Creates multiple mock buckets (transformed format)
 */
export const createMockBuckets = (count: number = 3): BucketGetResponse[] => 
  createMockCollection(count, (i) => createMockBucketResponse({
    id: BUCKET_TEST_CONSTANTS.BUCKET_ID + i,
    name: `${BUCKET_TEST_CONSTANTS.BUCKET_NAME} ${i + 1}`,
    identifier: `${BUCKET_TEST_CONSTANTS.BUCKET_IDENTIFIER}-${i + 1}`
  }));

/**
 * Creates a mock blob item (transformed format)
 */
export const createMockBlobItem = (overrides: Partial<BlobItem> = {}): BlobItem =>
  createMockBaseResponse({
    path: BUCKET_TEST_CONSTANTS.FILE_PATH,
    contentType: BUCKET_TEST_CONSTANTS.CONTENT_TYPE,
    size: BUCKET_TEST_CONSTANTS.FILE_SIZE,
    lastModified: BUCKET_TEST_CONSTANTS.LAST_MODIFIED
  }, overrides);

/**
 * Creates multiple mock blob items (transformed format)
 */
export const createMockFileMetadata = (count: number = 3): BlobItem[] =>
  createMockCollection(count, (i) => createMockBlobItem({
    path: `${BUCKET_TEST_CONSTANTS.FILE_PATH}${i + 1}`,
    contentType: i % 2 === 0 ? BUCKET_TEST_CONSTANTS.CONTENT_TYPE : BUCKET_TEST_CONSTANTS.CONTENT_TYPE_2,
    size: BUCKET_TEST_CONSTANTS.FILE_SIZE * (i + 1)
  }));

/**
 * Creates a mock URI response (API response format)
 */
export const createMockReadUriApiResponse = (overrides: any = {}): any =>
  createMockBaseResponse({
    Uri: BUCKET_TEST_CONSTANTS.READ_URI,
    Verb: BUCKET_TEST_CONSTANTS.HTTP_METHOD,
    RequiresAuth: true,
    Headers: {
      Keys: Object.keys(BUCKET_TEST_CONSTANTS.BLOB_HEADERS),
      Values: Object.values(BUCKET_TEST_CONSTANTS.BLOB_HEADERS)
    }
  }, overrides);

/**
 * Creates a mock upload URI response (API response format)
 */
export const createMockWriteUriApiResponse = (overrides: any = {}): any =>
  createMockBaseResponse({
    Uri: BUCKET_TEST_CONSTANTS.UPLOAD_URI,
    Verb: BUCKET_TEST_CONSTANTS.UPLOAD_HTTP_METHOD,
    RequiresAuth: true,
    Headers: {
      Keys: Object.keys(BUCKET_TEST_CONSTANTS.BLOB_HEADERS),
      Values: Object.values(BUCKET_TEST_CONSTANTS.BLOB_HEADERS)
    }
  }, overrides);
