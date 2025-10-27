/**
 * Asset service mock utilities - Asset-specific mocks only
 * Uses generic utilities from core.ts for base functionality
 */
import { AssetValueScope, AssetValueType, AssetGetResponse } from '../../../src/models/orchestrator/assets.types';
import { createMockBaseResponse, createMockCollection } from './core';
import { ASSET_TEST_CONSTANTS } from '../constants/assets';
import { TEST_CONSTANTS } from '../constants/common';

/**
 * Creates a mock asset with RAW API format (before transformation)
 * Uses PascalCase field names and raw API timestamp fields that need transformation
 * 
 * @param overrides - Optional overrides for specific fields
 * @returns Raw asset data as it comes from the API (before transformation)
 */
export const createMockRawAsset = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    Id: ASSET_TEST_CONSTANTS.ASSET_ID,
    Name: ASSET_TEST_CONSTANTS.ASSET_NAME,
    Key: ASSET_TEST_CONSTANTS.ASSET_KEY,
    Description: ASSET_TEST_CONSTANTS.ASSET_DESCRIPTION,
    ValueScope: AssetValueScope.Global,
    ValueType: AssetValueType.DBConnectionString,
    Value: ASSET_TEST_CONSTANTS.ASSET_VALUE,
    KeyValueList: [
      {
        Key: ASSET_TEST_CONSTANTS.KEY_VALUE_ITEM_1_KEY,
        Value: ASSET_TEST_CONSTANTS.KEY_VALUE_ITEM_1_VALUE
      },
      {
        Key: ASSET_TEST_CONSTANTS.KEY_VALUE_ITEM_2_KEY,
        Value: ASSET_TEST_CONSTANTS.KEY_VALUE_ITEM_2_VALUE
      }
    ],
    CredentialStoreId: null,
    HasDefaultValue: true,
    CanBeDeleted: true,
    FoldersCount: 1,
    // Using raw API field names that should be transformed
    CreationTime: ASSET_TEST_CONSTANTS.CREATED_TIME,
    CreatorUserId: TEST_CONSTANTS.USER_ID,
    LastModificationTime: ASSET_TEST_CONSTANTS.LAST_MODIFIED_TIME,
    LastModifierUserId: ASSET_TEST_CONSTANTS.LAST_MODIFIER_USER_ID,
  }, overrides);
};

/**
 * Creates a basic asset object with TRANSFORMED data (not raw API format)
 * 
 * @param overrides - Optional overrides for specific fields
 * @returns Asset with transformed field names (camelCase)
 */
export const createBasicAsset = (overrides: Partial<AssetGetResponse> = {}): AssetGetResponse => {
  return createMockBaseResponse({
    id: ASSET_TEST_CONSTANTS.ASSET_ID,
    name: ASSET_TEST_CONSTANTS.ASSET_NAME,
    key: ASSET_TEST_CONSTANTS.ASSET_KEY,
    description: ASSET_TEST_CONSTANTS.ASSET_DESCRIPTION,
    valueScope: AssetValueScope.Global,
    valueType: AssetValueType.DBConnectionString,
    value: ASSET_TEST_CONSTANTS.ASSET_VALUE,
    keyValueList: [
      {
        key: ASSET_TEST_CONSTANTS.KEY_VALUE_ITEM_1_KEY,
        value: ASSET_TEST_CONSTANTS.KEY_VALUE_ITEM_1_VALUE
      },
      {
        key: ASSET_TEST_CONSTANTS.KEY_VALUE_ITEM_2_KEY,
        value: ASSET_TEST_CONSTANTS.KEY_VALUE_ITEM_2_VALUE
      }
    ],
    credentialStoreId: null,
    hasDefaultValue: true,
    canBeDeleted: true,
    foldersCount: 1,
    // Using transformed field names (camelCase)
    createdTime: ASSET_TEST_CONSTANTS.CREATED_TIME,
    creatorUserId: TEST_CONSTANTS.USER_ID,
    lastModifiedTime: ASSET_TEST_CONSTANTS.LAST_MODIFIED_TIME,
    lastModifierUserId: ASSET_TEST_CONSTANTS.LAST_MODIFIER_USER_ID,
  }, overrides);
};


/**
 * Creates a mock transformed asset collection response as returned by PaginationHelpers.getAll
 * 
 * @param count - Number of assets to include (defaults to 1)
 * @param options - Additional options like totalCount, pagination details
 * @returns Mock transformed asset collection with items array
 */
export const createMockTransformedAssetCollection = (
  count: number = 1,
  options?: {
    totalCount?: number;
    hasNextPage?: boolean;
    nextCursor?: string;
    previousCursor?: string | null;
    currentPage?: number;
    totalPages?: number;
  }
): any => {
  const items = createMockCollection(count, (index) => createBasicAsset({
    id: ASSET_TEST_CONSTANTS.ASSET_ID + index,
    name: `${ASSET_TEST_CONSTANTS.ASSET_NAME}${index + 1}`,
    // Generate unique GUIDs for each asset
    key: `${index}-${ASSET_TEST_CONSTANTS.ASSET_KEY}`
  }));
  
  return createMockBaseResponse({
    items,
    totalCount: options?.totalCount || count,
    ...(options?.hasNextPage !== undefined && { hasNextPage: options.hasNextPage }),
    ...(options?.nextCursor && { nextCursor: options.nextCursor }),
    ...(options?.previousCursor !== undefined && { previousCursor: options.previousCursor }),
    ...(options?.currentPage !== undefined && { currentPage: options.currentPage }),
    ...(options?.totalPages !== undefined && { totalPages: options.totalPages })
  });
};