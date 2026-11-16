import { describe, it, expect, afterEach } from 'vitest';
import { resource } from '@/resources';
import { resolveConnection, unpackFolderScopedHandle } from '@/utils/overrides/handles';
import { OVERRIDE_TEST_CONSTANTS } from '@tests/utils/constants/overrides';
import { RESOURCE_TEST_CONSTANTS } from '@tests/utils/constants/resources';
import { BUCKET_TEST_CONSTANTS } from '@tests/utils/constants/buckets';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';
import { IS_TEST_CONSTANTS } from '@tests/utils/constants/integration-service';

const OVERRIDE_KEY = Symbol.for(OVERRIDE_TEST_CONSTANTS.CHANNEL_KEY);
const { FOLDER_PATH } = RESOURCE_TEST_CONSTANTS;

function publishOverrides(table: Record<string, Record<string, string>>): void {
  (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY] = () => table;
}

describe('unpackFolderScopedHandle', () => {
  it('passes a plain name and its options through unchanged, with no override scope', () => {
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
      overrideScope: { folderPath: FOLDER_PATH },
    });
  });

  it('lets an explicit folder option win over the handle folder, and keeps the handle folder as the override scope', () => {
    const handle = resource.bucket({ name: RESOURCE_TEST_CONSTANTS.BUCKET_NAME, folderPath: FOLDER_PATH });

    expect(unpackFolderScopedHandle(handle, { folderId: TEST_CONSTANTS.FOLDER_ID })).toEqual({
      name: RESOURCE_TEST_CONSTANTS.BUCKET_NAME,
      options: { folderId: TEST_CONSTANTS.FOLDER_ID },
      overrideScope: { folderPath: FOLDER_PATH },
    });
  });

  it.each([[''], ['.']])('reads a folderPath of %j as no folder option, so the handle folder applies', (folderPath) => {
    const handle = resource.bucket({ name: RESOURCE_TEST_CONSTANTS.BUCKET_NAME, folderPath: FOLDER_PATH });

    expect(unpackFolderScopedHandle(handle, { folderPath }).options).toEqual({ folderPath: FOLDER_PATH });
  });

  it('adds no folder when the handle has none', () => {
    const handle = resource.queue({ name: RESOURCE_TEST_CONSTANTS.LOCAL_QUEUE_NAME });

    expect(unpackFolderScopedHandle(handle, {})).toEqual({
      name: RESOURCE_TEST_CONSTANTS.LOCAL_QUEUE_NAME,
      options: {},
      overrideScope: { folderPath: undefined },
    });
  });
});

describe('resolveConnection', () => {
  afterEach(() => {
    delete (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY];
  });

  it('returns the id as given when no override is published', () => {
    expect(resolveConnection(IS_TEST_CONSTANTS.CONNECTION_ID)).toEqual({ id: IS_TEST_CONSTANTS.CONNECTION_ID });
  });

  it('returns the connection and folder the override maps the id to', () => {
    publishOverrides({
      [`connection.${IS_TEST_CONSTANTS.CONNECTION_ID}`]: {
        ConnectionId: OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_ID,
        folderKey: OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_FOLDER_KEY,
      },
    });

    expect(resolveConnection(IS_TEST_CONSTANTS.CONNECTION_ID)).toEqual({
      id: OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_ID,
      folderKey: OVERRIDE_TEST_CONSTANTS.TARGET_CONNECTION_FOLDER_KEY,
    });
  });
});
