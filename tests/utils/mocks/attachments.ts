/**
 * Attachment service mock utilities - Attachment-specific mocks only
 * Uses generic utilities from core.ts for base functionality
 */
import { AttachmentResponse } from '../../../src/models/orchestrator/attachments.types';
import { createMockBaseResponse } from './core';
import { ATTACHMENT_TEST_CONSTANTS } from '../constants/attachments';

/**
 * Creates a mock attachment with RAW API format (before transformation)
 * Uses PascalCase field names that need transformation
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Raw attachment data as it comes from the API (before transformation)
 */
export const createMockRawAttachment = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    Id: ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID,
    Name: ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
    JobKey: ATTACHMENT_TEST_CONSTANTS.JOB_KEY,
    AttachmentCategory: ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_CATEGORY,
    // Using raw API field names that should be transformed
    CreationTime: ATTACHMENT_TEST_CONSTANTS.CREATED_TIME,
    LastModificationTime: ATTACHMENT_TEST_CONSTANTS.LAST_MODIFIED_TIME,
    CreatorUserId: ATTACHMENT_TEST_CONSTANTS.CREATOR_USER_ID,
    LastModifierUserId: ATTACHMENT_TEST_CONSTANTS.LAST_MODIFIER_USER_ID,
    BlobFileAccess: {
      Uri: ATTACHMENT_TEST_CONSTANTS.BLOB_URI,
      Verb: ATTACHMENT_TEST_CONSTANTS.BLOB_HTTP_METHOD,
      RequiresAuth: false,
    },
  }, overrides);
};

/**
 * Creates a basic attachment object with TRANSFORMED data (not raw API format)
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Attachment with transformed field names (camelCase)
 */
export const createBasicAttachment = (overrides: Partial<AttachmentResponse> = {}): AttachmentResponse => {
  return createMockBaseResponse({
    id: ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID,
    name: ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
    jobKey: ATTACHMENT_TEST_CONSTANTS.JOB_KEY,
    attachmentCategory: ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_CATEGORY,
    // Using transformed field names (camelCase)
    createdTime: ATTACHMENT_TEST_CONSTANTS.CREATED_TIME,
    lastModifiedTime: ATTACHMENT_TEST_CONSTANTS.LAST_MODIFIED_TIME,
    creatorUserId: ATTACHMENT_TEST_CONSTANTS.CREATOR_USER_ID,
    lastModifierUserId: ATTACHMENT_TEST_CONSTANTS.LAST_MODIFIER_USER_ID,
    blobFileAccess: {
      uri: ATTACHMENT_TEST_CONSTANTS.BLOB_URI,
      httpMethod: ATTACHMENT_TEST_CONSTANTS.BLOB_HTTP_METHOD,
      requiresAuth: false,
      headers: {}
    },
  }, overrides);
};
