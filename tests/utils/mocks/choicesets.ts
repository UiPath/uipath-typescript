/**
 * ChoiceSets service mock utilities - ChoiceSet-specific mocks only
 * Uses generic utilities from core.ts for base functionality
 */

import { createMockBaseResponse, createMockCollection } from './core';
import { CHOICESET_TEST_CONSTANTS } from '../constants/choicesets';

/**
 * Creates a mock ChoiceSet response with RAW API format (before transformation)
 * Uses raw field names: createTime, updateTime (not createdTime, updatedTime)
 * @param overrides - Optional overrides for specific fields
 * @returns Mock ChoiceSet response object as it comes from the API (before transformation)
 */
export const createMockChoiceSetResponse = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    name: CHOICESET_TEST_CONSTANTS.CHOICESET_NAME,
    displayName: CHOICESET_TEST_CONSTANTS.CHOICESET_DISPLAY_NAME,
    entityTypeId: 1,
    entityType: 'ChoiceSet',
    description: CHOICESET_TEST_CONSTANTS.CHOICESET_DESCRIPTION,
    folderId: CHOICESET_TEST_CONSTANTS.FOLDER_ID,
    recordCount: CHOICESET_TEST_CONSTANTS.RECORD_COUNT,
    storageSizeInMB: 0.210937,
    usedStorageSizeInMB: 0.046875,
    isRbacEnabled: false,
    invalidIdentifiers: [],
    isModelReserved: false,
    id: CHOICESET_TEST_CONSTANTS.CHOICESET_ID,
    createdBy: CHOICESET_TEST_CONSTANTS.USER_ID,
    // RAW API field names: createTime/updateTime (will be transformed to createdTime/updatedTime)
    createTime: CHOICESET_TEST_CONSTANTS.CREATED_TIME,
    updateTime: CHOICESET_TEST_CONSTANTS.UPDATED_TIME,
    updatedBy: CHOICESET_TEST_CONSTANTS.USER_ID,
  }, overrides);
};

/**
 * Creates multiple mock ChoiceSet responses
 * @param count - Number of choice sets to create
 * @returns Array of mock ChoiceSet responses
 */
export const createMockChoiceSets = (count: number): any[] => {
  return createMockCollection(count, (i) => 
    createMockChoiceSetResponse({
      id: `${CHOICESET_TEST_CONSTANTS.CHOICESET_ID.slice(0, -1)}${i}`,
      name: `${CHOICESET_TEST_CONSTANTS.CHOICESET_NAME}${i > 0 ? i : ''}`,
      displayName: `${CHOICESET_TEST_CONSTANTS.CHOICESET_DISPLAY_NAME}${i > 0 ? ` ${i}` : ''}`,
    })
  );
};

