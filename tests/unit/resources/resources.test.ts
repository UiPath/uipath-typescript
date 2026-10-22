import { describe, it, expect, afterEach } from 'vitest';
import {
  resource,
  isAssetResource,
  isBucketResource,
  isQueueResource,
  isProcessResource,
  isEntityResource,
  unpackFolderScopedHandle,
} from '../../../src/resources';
import { ValidationError } from '../../../src/core/errors';
import { OVERRIDE_TEST_CONSTANTS } from '../../utils/constants/overrides';
import { RESOURCE_TEST_CONSTANTS } from '../../utils/constants/resources';
import { BUCKET_TEST_CONSTANTS } from '../../utils/constants/buckets';
import { TEST_CONSTANTS } from '../../utils/constants/common';

const OVERRIDE_KEY = Symbol.for(OVERRIDE_TEST_CONSTANTS.CHANNEL_KEY);
const { FOLDER_PATH } = RESOURCE_TEST_CONSTANTS;

function publishOverrides(table: Record<string, Record<string, string>>): void {
  (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY] = () => table;
}

describe('resource factories', () => {
  afterEach(() => {
    delete (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY];
  });

  describe.each([
    [
      'asset',
      () => resource.asset({ name: RESOURCE_TEST_CONSTANTS.ASSET_NAME, folderPath: FOLDER_PATH, type: RESOURCE_TEST_CONSTANTS.ASSET_TYPE }),
      RESOURCE_TEST_CONSTANTS.ASSET_TYPE,
    ],
    [
      'bucket',
      () => resource.bucket({ name: RESOURCE_TEST_CONSTANTS.BUCKET_NAME, folderPath: FOLDER_PATH, type: RESOURCE_TEST_CONSTANTS.BUCKET_TYPE }),
      RESOURCE_TEST_CONSTANTS.BUCKET_TYPE,
    ],
    [
      'queue',
      () => resource.queue({ name: RESOURCE_TEST_CONSTANTS.QUEUE_NAME, folderPath: FOLDER_PATH }),
      undefined,
    ],
    [
      'process',
      () => resource.process({ name: RESOURCE_TEST_CONSTANTS.PROCESS_NAME, folderPath: FOLDER_PATH, type: RESOURCE_TEST_CONSTANTS.PROCESS_TYPE }),
      RESOURCE_TEST_CONSTANTS.PROCESS_TYPE,
    ],
  ] as const)('resource.%s', (kind, make, expectedType) => {
    it('returns a frozen folder-scoped handle carrying the declaration', () => {
      const handle = make();

      expect(handle.kind).toBe(kind);
      expect(handle.folderPath).toBe(FOLDER_PATH);
      expect((handle as { type?: string }).type).toBe(expectedType);
      expect(Object.isFrozen(handle)).toBe(true);
    });

    it('resolves value to the declared coordinates when no override is published', () => {
      const handle = make();

      expect(handle.value).toEqual({ name: handle.name, folderPath: FOLDER_PATH });
    });

    it('resolves value through the folder-scoped override key', () => {
      const handle = make();
      publishOverrides({
        [`${kind}.${handle.name}.${FOLDER_PATH}`]: {
          name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME,
          folderPath: OVERRIDE_TEST_CONSTANTS.TARGET_FOLDER_PATH,
        },
      });

      expect(handle.value).toEqual({
        name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME,
        folderPath: OVERRIDE_TEST_CONSTANTS.TARGET_FOLDER_PATH,
      });
    });
  });

  it('omits folderPath and type when the declaration leaves them out', () => {
    const handle = resource.queue({ name: RESOURCE_TEST_CONSTANTS.LOCAL_QUEUE_NAME });

    expect(Object.keys(handle)).toEqual(['kind', 'name', 'value']);
    expect(handle.value).toEqual({ name: RESOURCE_TEST_CONSTANTS.LOCAL_QUEUE_NAME });
  });

  it('rejects an empty name for every kind', () => {
    expect(() => resource.asset({ name: '' })).toThrow(ValidationError);
    expect(() => resource.bucket({ name: '' })).toThrow(ValidationError);
    expect(() => resource.queue({ name: '' })).toThrow(ValidationError);
    expect(() => resource.process({ name: '' })).toThrow(ValidationError);
    expect(() => resource.entity({ name: '' })).toThrow(ValidationError);
  });

  describe('resource.entity', () => {
    it('has no folder and resolves through the unscoped entity key', () => {
      const handle = resource.entity({ name: RESOURCE_TEST_CONSTANTS.ENTITY_NAME });

      expect(Object.keys(handle)).toEqual(['kind', 'name', 'value']);
      expect(handle.value).toEqual({ name: RESOURCE_TEST_CONSTANTS.ENTITY_NAME });

      publishOverrides({
        [`entity.${RESOURCE_TEST_CONSTANTS.ENTITY_NAME}`]: { name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME },
      });
      expect(handle.value).toEqual({ name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME });
    });
  });

  it('re-reads the override table on every value access', () => {
    const handle = resource.asset({ name: RESOURCE_TEST_CONSTANTS.ASSET_NAME, folderPath: FOLDER_PATH });
    expect(handle.value.name).toBe(RESOURCE_TEST_CONSTANTS.ASSET_NAME);

    publishOverrides({
      [`asset.${RESOURCE_TEST_CONSTANTS.ASSET_NAME}.${FOLDER_PATH}`]: { name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME },
    });
    expect(handle.value).toEqual({ name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME, folderPath: FOLDER_PATH });
  });
});

describe('kind guards', () => {
  it('each guard accepts only its own kind', () => {
    const asset = resource.asset({ name: RESOURCE_TEST_CONSTANTS.ASSET_NAME });
    const bucket = resource.bucket({ name: RESOURCE_TEST_CONSTANTS.BUCKET_NAME });
    const queue = resource.queue({ name: RESOURCE_TEST_CONSTANTS.QUEUE_NAME });
    const process = resource.process({ name: RESOURCE_TEST_CONSTANTS.PROCESS_NAME });
    const entity = resource.entity({ name: RESOURCE_TEST_CONSTANTS.ENTITY_NAME });

    expect(isAssetResource(asset)).toBe(true);
    expect(isAssetResource(bucket)).toBe(false);
    expect(isBucketResource(bucket)).toBe(true);
    expect(isQueueResource(queue)).toBe(true);
    expect(isProcessResource(process)).toBe(true);
    expect(isEntityResource(entity)).toBe(true);
    expect(isEntityResource({ name: RESOURCE_TEST_CONSTANTS.ENTITY_NAME })).toBe(false);
    expect(isAssetResource(RESOURCE_TEST_CONSTANTS.ASSET_NAME)).toBe(false);
    expect(isAssetResource(null)).toBe(false);
  });
});

describe('unpackFolderScopedHandle', () => {
  it('passes a plain name and its options through unchanged', () => {
    const options = { folderId: TEST_CONSTANTS.FOLDER_ID };

    expect(unpackFolderScopedHandle(RESOURCE_TEST_CONSTANTS.PLAIN_NAME, options)).toEqual({
      name: RESOURCE_TEST_CONSTANTS.PLAIN_NAME,
      options,
    });
  });

  it('takes the folder from the handle when the caller passed none', () => {
    const handle = resource.bucket({ name: RESOURCE_TEST_CONSTANTS.BUCKET_NAME, folderPath: FOLDER_PATH });

    expect(unpackFolderScopedHandle(handle, { expand: BUCKET_TEST_CONSTANTS.EXPAND_FOLDERS })).toEqual({
      name: RESOURCE_TEST_CONSTANTS.BUCKET_NAME,
      options: { expand: BUCKET_TEST_CONSTANTS.EXPAND_FOLDERS, folderPath: FOLDER_PATH },
    });
  });

  it('lets an explicit folder option win over the handle folder', () => {
    const handle = resource.bucket({ name: RESOURCE_TEST_CONSTANTS.BUCKET_NAME, folderPath: FOLDER_PATH });

    expect(unpackFolderScopedHandle(handle, { folderId: TEST_CONSTANTS.FOLDER_ID })).toEqual({
      name: RESOURCE_TEST_CONSTANTS.BUCKET_NAME,
      options: { folderId: TEST_CONSTANTS.FOLDER_ID },
    });
  });

  it('adds no folder when the handle has none', () => {
    const handle = resource.queue({ name: RESOURCE_TEST_CONSTANTS.LOCAL_QUEUE_NAME });

    expect(unpackFolderScopedHandle(handle, {})).toEqual({ name: RESOURCE_TEST_CONSTANTS.LOCAL_QUEUE_NAME, options: {} });
  });
});
