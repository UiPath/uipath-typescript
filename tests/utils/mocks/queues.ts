/**
 * Queue service mock utilities - Queue-specific mocks only
 * Uses generic utilities from core.ts for base functionality
 */
import { QueueGetResponse, QueueItem } from '../../../src/models/orchestrator/queues.types';
import { createMockBaseResponse, createMockCollection } from './core';
import { QUEUE_TEST_CONSTANTS } from '../constants/queues';
import { TEST_CONSTANTS } from '../constants/common';

/**
 * Creates a mock queue with RAW API format (before transformation)
 * Uses PascalCase field names and raw API timestamp fields that need transformation
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Raw queue data as it comes from the API (before transformation)
 */
export const createMockRawQueue = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    Id: QUEUE_TEST_CONSTANTS.QUEUE_ID,
    Name: QUEUE_TEST_CONSTANTS.QUEUE_NAME,
    Key: QUEUE_TEST_CONSTANTS.QUEUE_KEY,
    Description: QUEUE_TEST_CONSTANTS.QUEUE_DESCRIPTION,
    MaxNumberOfRetries: QUEUE_TEST_CONSTANTS.MAX_NUMBER_OF_RETRIES,
    AcceptAutomaticallyRetry: QUEUE_TEST_CONSTANTS.ACCEPT_AUTOMATICALLY_RETRY,
    RetryAbandonedItems: QUEUE_TEST_CONSTANTS.RETRY_ABANDONED_ITEMS,
    EnforceUniqueReference: QUEUE_TEST_CONSTANTS.ENFORCE_UNIQUE_REFERENCE,
    Encrypted: QUEUE_TEST_CONSTANTS.ENCRYPTED,
    SpecificDataJsonSchema: QUEUE_TEST_CONSTANTS.SPECIFIC_DATA_JSON_SCHEMA,
    OutputDataJsonSchema: QUEUE_TEST_CONSTANTS.OUTPUT_DATA_JSON_SCHEMA,
    AnalyticsDataJsonSchema: QUEUE_TEST_CONSTANTS.ANALYTICS_DATA_JSON_SCHEMA,
    ProcessScheduleId: QUEUE_TEST_CONSTANTS.PROCESS_SCHEDULE_ID,
    SlaInMinutes: QUEUE_TEST_CONSTANTS.SLA_IN_MINUTES,
    RiskSlaInMinutes: QUEUE_TEST_CONSTANTS.RISK_SLA_IN_MINUTES,
    ReleaseId: QUEUE_TEST_CONSTANTS.RELEASE_ID,
    IsProcessInCurrentFolder: QUEUE_TEST_CONSTANTS.IS_PROCESS_IN_CURRENT_FOLDER,
    FoldersCount: QUEUE_TEST_CONSTANTS.FOLDERS_COUNT,
    // Using raw API field names that should be transformed
    CreationTime: QUEUE_TEST_CONSTANTS.CREATED_TIME,
    OrganizationUnitId: TEST_CONSTANTS.FOLDER_ID,
    OrganizationUnitFullyQualifiedName: TEST_CONSTANTS.FOLDER_NAME,
  }, overrides);
};

/**
 * Creates a mock queue item with RAW API format (before transformation)
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Raw queue item data as returned by the API
 */
export const createMockRawQueueItem = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    Id: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID,
    Key: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_KEY,
    Status: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_STATUS,
    Priority: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_PRIORITY,
    QueueDefinitionId: QUEUE_TEST_CONSTANTS.QUEUE_DEFINITION_ID,
    ProcessingException: null,
    SpecificContent: QUEUE_TEST_CONSTANTS.SPECIFIC_CONTENT,
    Output: null,
    Progress: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_PROGRESS,
    Reference: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_REFERENCE,
    CreationTime: QUEUE_TEST_CONSTANTS.CREATED_TIME,
    OrganizationUnitId: TEST_CONSTANTS.FOLDER_ID
  }, overrides);
};

/**
 * Creates a queue item object with transformed field names (camelCase)
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Queue item data with SDK field names
 */
export const createBasicQueueItem = (overrides: Partial<QueueItem> = {}): QueueItem => {
  return createMockBaseResponse({
    id: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID,
    key: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_KEY,
    status: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_STATUS,
    priority: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_PRIORITY,
    queueDefinitionId: QUEUE_TEST_CONSTANTS.QUEUE_DEFINITION_ID,
    processingException: null,
    specificContent: QUEUE_TEST_CONSTANTS.SPECIFIC_CONTENT,
    output: null,
    progress: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_PROGRESS,
    reference: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_REFERENCE,
    creationTime: QUEUE_TEST_CONSTANTS.CREATED_TIME,
    folderId: TEST_CONSTANTS.FOLDER_ID
  }, overrides);
};

/**
 * Creates a basic queue object with TRANSFORMED data (not raw API format)
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Queue with transformed field names (camelCase)
 */
export const createBasicQueue = (overrides: Partial<QueueGetResponse> = {}): QueueGetResponse => {
  return createMockBaseResponse({
    id: QUEUE_TEST_CONSTANTS.QUEUE_ID,
    name: QUEUE_TEST_CONSTANTS.QUEUE_NAME,
    key: QUEUE_TEST_CONSTANTS.QUEUE_KEY,
    description: QUEUE_TEST_CONSTANTS.QUEUE_DESCRIPTION,
    maxNumberOfRetries: QUEUE_TEST_CONSTANTS.MAX_NUMBER_OF_RETRIES,
    acceptAutomaticallyRetry: QUEUE_TEST_CONSTANTS.ACCEPT_AUTOMATICALLY_RETRY,
    retryAbandonedItems: QUEUE_TEST_CONSTANTS.RETRY_ABANDONED_ITEMS,
    enforceUniqueReference: QUEUE_TEST_CONSTANTS.ENFORCE_UNIQUE_REFERENCE,
    encrypted: QUEUE_TEST_CONSTANTS.ENCRYPTED,
    specificDataJsonSchema: QUEUE_TEST_CONSTANTS.SPECIFIC_DATA_JSON_SCHEMA,
    outputDataJsonSchema: QUEUE_TEST_CONSTANTS.OUTPUT_DATA_JSON_SCHEMA,
    analyticsDataJsonSchema: QUEUE_TEST_CONSTANTS.ANALYTICS_DATA_JSON_SCHEMA,
    processScheduleId: QUEUE_TEST_CONSTANTS.PROCESS_SCHEDULE_ID,
    slaInMinutes: QUEUE_TEST_CONSTANTS.SLA_IN_MINUTES,
    riskSlaInMinutes: QUEUE_TEST_CONSTANTS.RISK_SLA_IN_MINUTES,
    releaseId: QUEUE_TEST_CONSTANTS.RELEASE_ID,
    isProcessInCurrentFolder: QUEUE_TEST_CONSTANTS.IS_PROCESS_IN_CURRENT_FOLDER,
    foldersCount: QUEUE_TEST_CONSTANTS.FOLDERS_COUNT,
    // Using transformed field names (camelCase)
    createdTime: QUEUE_TEST_CONSTANTS.CREATED_TIME,
    folderId: TEST_CONSTANTS.FOLDER_ID,
    folderName: TEST_CONSTANTS.FOLDER_NAME,
  }, overrides);
};


/**
 * Creates a mock transformed queue collection response as returned by PaginationHelpers.getAll
 *
 * @param count - Number of queues to include (defaults to 1)
 * @param options - Additional options like totalCount, pagination details
 * @returns Mock transformed queue collection with items array
 */
export const createMockTransformedQueueCollection = (
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
  const items = createMockCollection(count, (index) => createBasicQueue({
    id: QUEUE_TEST_CONSTANTS.QUEUE_ID + index,
    name: `${QUEUE_TEST_CONSTANTS.QUEUE_NAME}${index + 1}`,
    // Generate unique GUIDs for each queue
    key: `${index}-${QUEUE_TEST_CONSTANTS.QUEUE_KEY}`
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
