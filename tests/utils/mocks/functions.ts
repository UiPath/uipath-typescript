import { RawFunctionGetResponse, FunctionHttpMethod } from '../../../src/models/orchestrator/functions.types';
import { FUNCTION_TEST_CONSTANTS } from '../constants/functions';
import { TEST_CONSTANTS } from '../constants/common';
import { createMockBaseResponse, createMockCollection } from './core';

/**
 * Creates a raw HttpTriggers row as the API returns it (PascalCase wire format,
 * including job-runner fields the SDK drops).
 */
export const createMockRawFunctionTrigger = (overrides: Partial<any> = {}): any => {
  return {
    Type: 'Http',
    OrganizationUnitId: TEST_CONSTANTS.FOLDER_ID,
    OrganizationUnitFullyQualifiedName: FUNCTION_TEST_CONSTANTS.FOLDER_NAME,
    Enabled: true,
    ReleaseKey: FUNCTION_TEST_CONSTANTS.PROCESS_KEY,
    Name: FUNCTION_TEST_CONSTANTS.NAME,
    Description: FUNCTION_TEST_CONSTANTS.DESCRIPTION,
    JobPriority: 45,
    RunAsMe: false,
    RunAsCaller: true,
    InputArguments: FUNCTION_TEST_CONSTANTS.INPUT_ARGUMENTS,
    EntryPointPath: FUNCTION_TEST_CONSTANTS.ENTRY_POINT_PATH,
    Id: FUNCTION_TEST_CONSTANTS.ID,
    CallingMode: 'LongPolling',
    Method: FUNCTION_TEST_CONSTANTS.METHOD,
    Slug: FUNCTION_TEST_CONSTANTS.SLUG,
    CallbackMode: 'Disabled',
    Release: {
      Id: 972287,
      Name: FUNCTION_TEST_CONSTANTS.PROCESS_NAME,
      Slug: FUNCTION_TEST_CONSTANTS.PROCESS_SLUG,
    },
    MachineRobots: [],
    Tags: [],
    ...overrides,
  };
};

/**
 * Creates a transformed function (SDK shape, without bound methods).
 */
export const createBasicFunction = (
  overrides: Partial<RawFunctionGetResponse> = {}
): RawFunctionGetResponse => {
  return {
    id: FUNCTION_TEST_CONSTANTS.ID,
    name: FUNCTION_TEST_CONSTANTS.NAME,
    slug: FUNCTION_TEST_CONSTANTS.SLUG,
    method: FunctionHttpMethod.Post,
    description: FUNCTION_TEST_CONSTANTS.DESCRIPTION,
    enabled: true,
    inputArguments: FUNCTION_TEST_CONSTANTS.INPUT_ARGUMENTS,
    entryPointPath: FUNCTION_TEST_CONSTANTS.ENTRY_POINT_PATH,
    processKey: FUNCTION_TEST_CONSTANTS.PROCESS_KEY,
    processName: FUNCTION_TEST_CONSTANTS.PROCESS_NAME,
    processSlug: FUNCTION_TEST_CONSTANTS.PROCESS_SLUG,
    folderId: TEST_CONSTANTS.FOLDER_ID,
    folderName: FUNCTION_TEST_CONSTANTS.FOLDER_NAME,
    ...overrides,
  };
};

/**
 * Creates a mock transformed function collection response.
 */
export const createMockTransformedFunctionCollection = (
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
  const items = createMockCollection(count, (index) => createBasicFunction({
    name: `${FUNCTION_TEST_CONSTANTS.NAME}-${index}`,
    slug: `${FUNCTION_TEST_CONSTANTS.SLUG}-${index}`,
  }));

  return createMockBaseResponse({
    items,
    totalCount: options?.totalCount || count,
    ...(options?.hasNextPage !== undefined && { hasNextPage: options.hasNextPage }),
    ...(options?.nextCursor && { nextCursor: options.nextCursor }),
    ...(options?.previousCursor !== undefined && { previousCursor: options.previousCursor }),
    ...(options?.currentPage && { currentPage: options.currentPage }),
    ...(options?.totalPages && { totalPages: options.totalPages }),
  });
};
