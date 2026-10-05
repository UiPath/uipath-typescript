// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AssetService } from '../../../src/services/orchestrator/assets';
import { ApiClient } from '../../../src/core/http/api-client';
import { createMockRawAsset } from '../../utils/mocks/assets';
import { createServiceTestDependencies, createMockApiClient } from '../../utils/setup';
import { ASSET_TEST_CONSTANTS } from '../../utils/constants/assets';
import { OVERRIDE_TEST_CONSTANTS } from '../../utils/constants/overrides';
import { TEST_CONSTANTS } from '../../utils/constants/common';
import { FOLDER_ID, FOLDER_KEY, FOLDER_PATH_ENCODED } from '../../../src/utils/constants/headers';
import { NotFoundError } from '../../../src/core/errors';
import type { AssetGetByNameOptions } from '../../../src/models/orchestrator/assets.types';
import type { ResourceOverrides } from '../../../src/utils/overrides/overrides.types';

// ===== MOCKING =====
vi.mock('../../../src/core/http/api-client');

const CHANNEL = Symbol.for(OVERRIDE_TEST_CONSTANTS.CHANNEL_KEY);

/** Publishes a table the way a host runtime does — an accessor on the global channel. */
function installOverrides(table: ResourceOverrides): void {
  (globalThis as Record<symbol, unknown>)[CHANNEL] = () => table;
}

/**
 * Design-time key for the asset every test in this file looks up. `asset` is the type prefix the
 * publisher spells (Orchestrator's `ResourceTypeRaw`), not the SDK's `'Asset'` label, and the name
 * half carries the author's exact casing — the match is case-sensitive on both.
 */
const UNSCOPED_KEY = `asset.${ASSET_TEST_CONSTANTS.ASSET_NAME}`;
const SCOPED_KEY = `${UNSCOPED_KEY}.${ASSET_TEST_CONSTANTS.FOLDER_PATH}`;

// ===== TEST SUITE =====
describe('FolderScopedService getByName override resolution', () => {
  let assetService: AssetService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as unknown as ApiClient; });
    mockApiClient.get.mockResolvedValue({ value: [createMockRawAsset()] });

    assetService = new AssetService(instance);
  });

  afterEach(() => {
    delete (globalThis as Record<symbol, unknown>)[CHANNEL];
    vi.clearAllMocks();
  });

  /** The name the SDK actually asked the API for. */
  function requestedName(): string {
    const [, requestSpec] = mockApiClient.get.mock.calls[0];
    return requestSpec.params['$filter'];
  }

  function requestedHeaders(): Record<string, string> {
    const [, requestSpec] = mockApiClient.get.mock.calls[0];
    return requestSpec.headers;
  }

  it('redirects a name-addressed lookup to the target name and folder', async () => {
    installOverrides({
      [UNSCOPED_KEY]: {
        name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME,
        folderPath: OVERRIDE_TEST_CONSTANTS.TARGET_FOLDER_PATH,
      },
    });

    await assetService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME);

    expect(requestedName()).toBe(`Name eq '${OVERRIDE_TEST_CONSTANTS.TARGET_NAME}'`);
    expect(requestedHeaders()[FOLDER_PATH_ENCODED]).toBe(
      OVERRIDE_TEST_CONSTANTS.TARGET_FOLDER_PATH_ENCODED,
    );
  });

  it('matches the folder-scoped entry when the call names a folder', async () => {
    installOverrides({
      [UNSCOPED_KEY]: { name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME },
      [SCOPED_KEY]: { name: OVERRIDE_TEST_CONSTANTS.SCOPED_TARGET_NAME },
    });

    await assetService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME, {
      folderPath: ASSET_TEST_CONSTANTS.FOLDER_PATH,
    });

    expect(requestedName()).toBe(`Name eq '${OVERRIDE_TEST_CONSTANTS.SCOPED_TARGET_NAME}'`);
  });

  it('falls back to the unscoped entry when the caller names a folder but only the unscoped shape is published — solution-inline bindings', async () => {
    installOverrides({ [UNSCOPED_KEY]: { name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME } });

    await assetService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME, {
      folderPath: ASSET_TEST_CONSTANTS.FOLDER_PATH,
    });

    expect(requestedName()).toBe(`Name eq '${OVERRIDE_TEST_CONSTANTS.TARGET_NAME}'`);
    // No folderPath on the override entry → caller's folderPath rides through unchanged.
    expect(requestedHeaders()[FOLDER_PATH_ENCODED]).toBe(
      ASSET_TEST_CONSTANTS.FOLDER_PATH_ENCODED,
    );
  });

  it('redirects a folderId-addressed lookup too — the override holds whatever names the folder', async () => {
    installOverrides({
      [UNSCOPED_KEY]: {
        name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME,
        folderPath: OVERRIDE_TEST_CONSTANTS.TARGET_FOLDER_PATH,
      },
    });

    await assetService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME, {
      folderId: TEST_CONSTANTS.FOLDER_ID,
    });

    expect(requestedName()).toBe(`Name eq '${OVERRIDE_TEST_CONSTANTS.TARGET_NAME}'`);
    // Both headers ship; the server applies folderPath > folderKey > folderId.
    expect(requestedHeaders()[FOLDER_ID]).toBe(TEST_CONSTANTS.FOLDER_ID.toString());
    expect(requestedHeaders()[FOLDER_PATH_ENCODED]).toBe(
      OVERRIDE_TEST_CONSTANTS.TARGET_FOLDER_PATH_ENCODED,
    );
  });

  it('redirects a folderKey-addressed lookup too', async () => {
    installOverrides({
      [UNSCOPED_KEY]: {
        name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME,
        folderPath: OVERRIDE_TEST_CONSTANTS.TARGET_FOLDER_PATH,
      },
    });

    await assetService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME, {
      folderKey: ASSET_TEST_CONSTANTS.FOLDER_KEY,
    });

    expect(requestedName()).toBe(`Name eq '${OVERRIDE_TEST_CONSTANTS.TARGET_NAME}'`);
    expect(requestedHeaders()[FOLDER_KEY]).toBe(ASSET_TEST_CONSTANTS.FOLDER_KEY);
    expect(requestedHeaders()[FOLDER_PATH_ENCODED]).toBe(
      OVERRIDE_TEST_CONSTANTS.TARGET_FOLDER_PATH_ENCODED,
    );
  });

  it('keeps the caller folder when the override names none', async () => {
    installOverrides({ [UNSCOPED_KEY]: { name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME } });

    await assetService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME, {
      folderKey: ASSET_TEST_CONSTANTS.FOLDER_KEY,
    });

    expect(requestedName()).toBe(`Name eq '${OVERRIDE_TEST_CONSTANTS.TARGET_NAME}'`);
    expect(requestedHeaders()[FOLDER_KEY]).toBe(ASSET_TEST_CONSTANTS.FOLDER_KEY);
    expect(requestedHeaders()[FOLDER_PATH_ENCODED]).toBeUndefined();
  });

  it('falls back to the execution context folder when the call names none', async () => {
    installOverrides({ [UNSCOPED_KEY]: { name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME } });

    const { instance } = createServiceTestDependencies({
      folderKey: ASSET_TEST_CONSTANTS.FOLDER_KEY,
    });
    await new AssetService(instance).getByName(ASSET_TEST_CONSTANTS.ASSET_NAME);

    expect(requestedName()).toBe(`Name eq '${OVERRIDE_TEST_CONSTANTS.TARGET_NAME}'`);
    expect(requestedHeaders()[FOLDER_KEY]).toBe(ASSET_TEST_CONSTANTS.FOLDER_KEY);
  });

  it('asks for the design-time name when no host published a table', async () => {
    await assetService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME, {
      folderPath: ASSET_TEST_CONSTANTS.FOLDER_PATH,
    });

    expect(requestedName()).toBe(`Name eq '${ASSET_TEST_CONSTANTS.ASSET_NAME}'`);
    expect(requestedHeaders()[FOLDER_PATH_ENCODED]).toBe(
      ASSET_TEST_CONSTANTS.FOLDER_PATH_ENCODED,
    );
  });

  it('ignores an entry keyed by the SDK label rather than the publisher type prefix', async () => {
    installOverrides({
      [`Asset.${ASSET_TEST_CONSTANTS.ASSET_NAME}`]: { name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME },
    });

    await assetService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME, {
      folderPath: ASSET_TEST_CONSTANTS.FOLDER_PATH,
    });

    expect(requestedName()).toBe(`Name eq '${ASSET_TEST_CONSTANTS.ASSET_NAME}'`);
  });
});

describe('FolderScopedService getByName not-found folder hint', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as unknown as ApiClient; });
    mockApiClient.get.mockResolvedValue({ value: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /** An asset service whose SDK falls back to `TEST_CONSTANTS.FOLDER_KEY` when a call names no folder. */
  function serviceWithDefaultFolder(): AssetService {
    const { instance } = createServiceTestDependencies({ folderKey: TEST_CONSTANTS.FOLDER_KEY });
    return new AssetService(instance);
  }

  it('names the default folder when the lookup fell back to it', async () => {
    const lookup = serviceWithDefaultFolder().getByName(ASSET_TEST_CONSTANTS.MISSING_ASSET_NAME);

    await expect(lookup).rejects.toBeInstanceOf(NotFoundError);
    await expect(lookup).rejects.toThrow(`in folder (key: ${TEST_CONSTANTS.FOLDER_KEY})`);
  });

  const namedFolders: Array<[string, AssetGetByNameOptions, string]> = [
    ['folderId', { folderId: TEST_CONSTANTS.FOLDER_ID }, `in folder (id: ${TEST_CONSTANTS.FOLDER_ID})`],
    ['folderKey', { folderKey: ASSET_TEST_CONSTANTS.FOLDER_KEY }, `in folder (key: ${ASSET_TEST_CONSTANTS.FOLDER_KEY})`],
    ['folderPath', { folderPath: ASSET_TEST_CONSTANTS.FOLDER_PATH }, `in folder '${ASSET_TEST_CONSTANTS.FOLDER_PATH}'`],
  ];

  it.each(namedFolders)('names the %s the call passed, not the default folder', async (_label, options, hint) => {
    const lookup = serviceWithDefaultFolder().getByName(ASSET_TEST_CONSTANTS.MISSING_ASSET_NAME, options);

    await expect(lookup).rejects.toBeInstanceOf(NotFoundError);
    await expect(lookup).rejects.toThrow(hint);
    await expect(lookup).rejects.not.toThrow(TEST_CONSTANTS.FOLDER_KEY);
  });
});
