/**
 * Job service mock utilities - Job-specific mocks only
 * Uses generic utilities from core.ts for base functionality
 */
import { JobState } from '../../../src/models/common/types';
import { JobPriority, JobType, PackageSourceType, RemoteControlAccess } from '../../../src/models/orchestrator/processes.types';
import { JobGetResponse, JobPackageType } from '../../../src/models/orchestrator/jobs.types';
import { createMockBaseResponse, createMockCollection } from './core';
import { JOB_TEST_CONSTANTS } from '../constants/jobs';
import { TEST_CONSTANTS } from '../constants/common';

/**
 * Creates a mock job with RAW API format (before transformation)
 * Uses PascalCase field names that need transformation
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Raw job data as it comes from the API (before transformation)
 */
export const createMockRawJob = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    Id: JOB_TEST_CONSTANTS.JOB_ID,
    Key: JOB_TEST_CONSTANTS.JOB_KEY,
    State: JobState.Successful,
    ReleaseName: JOB_TEST_CONSTANTS.PROCESS_NAME,
    HostMachineName: JOB_TEST_CONSTANTS.HOST_MACHINE_NAME,
    EntryPointPath: JOB_TEST_CONSTANTS.ENTRY_POINT_PATH,
    JobPriority: JobPriority.Normal,
    Type: JobType.Unattended,
    Source: 'Manual',
    Info: null,
    InputArguments: null,
    OutputArguments: null,
    // Using raw API field names that should be transformed
    CreationTime: JOB_TEST_CONSTANTS.CREATED_TIME,
    StartTime: JOB_TEST_CONSTANTS.START_TIME,
    EndTime: JOB_TEST_CONSTANTS.END_TIME,
    LastModificationTime: JOB_TEST_CONSTANTS.LAST_MODIFIED_TIME,
    OrganizationUnitId: TEST_CONSTANTS.FOLDER_ID,
    OrganizationUnitFullyQualifiedName: TEST_CONSTANTS.FOLDER_NAME,
    Machine: { Id: 1, Name: 'ROBOT-01' },
    Robot: { Id: 1, Name: 'Robot1', Username: String.raw`domain\robot1` },
    JobError: null,
  }, overrides);
};

/**
 * Creates a basic job object with TRANSFORMED data (not raw API format)
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Job with transformed field names (camelCase)
 */
export const createBasicJob = (overrides: Partial<JobGetResponse> = {}): JobGetResponse => {
  return createMockBaseResponse({
    id: JOB_TEST_CONSTANTS.JOB_ID,
    key: JOB_TEST_CONSTANTS.JOB_KEY,
    state: JobState.Successful,
    processName: JOB_TEST_CONSTANTS.PROCESS_NAME,
    hostMachineName: JOB_TEST_CONSTANTS.HOST_MACHINE_NAME,
    entryPointPath: JOB_TEST_CONSTANTS.ENTRY_POINT_PATH,
    jobPriority: JobPriority.Normal,
    type: JobType.Unattended,
    packageType: JobPackageType.Process,
    sourceType: PackageSourceType.Manual,
    remoteControlAccess: RemoteControlAccess.None,
    batchExecutionKey: '00000000-0000-0000-0000-000000000000',
    requiresUserInteraction: false,
    resumeOnSameContext: false,
    source: 'Manual',
    info: null,
    inputArguments: null,
    outputArguments: null,
    createdTime: JOB_TEST_CONSTANTS.CREATED_TIME,
    startTime: JOB_TEST_CONSTANTS.START_TIME,
    endTime: JOB_TEST_CONSTANTS.END_TIME,
    lastModifiedTime: JOB_TEST_CONSTANTS.LAST_MODIFIED_TIME,
    folderId: TEST_CONSTANTS.FOLDER_ID,
    folderName: TEST_CONSTANTS.FOLDER_NAME,
    machine: { id: 1, name: 'ROBOT-01' },
    robot: { id: 1, name: 'Robot1', username: String.raw`domain\robot1` },
    jobError: null,
  }, overrides);
};

/**
 * Creates a mock transformed job collection response as returned by PaginationHelpers.getAll
 *
 * @param count - Number of jobs to include (defaults to 1)
 * @param options - Additional options like totalCount, pagination details
 * @returns Mock transformed job collection with items array
 */
export const createMockTransformedJobCollection = (
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
  const items = createMockCollection(count, (index) => createBasicJob({
    id: JOB_TEST_CONSTANTS.JOB_ID + index,
    key: `${index}-${JOB_TEST_CONSTANTS.JOB_KEY}`,
  }));

  return createMockBaseResponse({
    items,
    totalCount: options?.totalCount || count,
    ...(options?.hasNextPage !== undefined && { hasNextPage: options.hasNextPage }),
    ...(options?.nextCursor && { nextCursor: options.nextCursor }),
    ...(options?.previousCursor !== undefined && { previousCursor: options.previousCursor }),
    ...(options?.currentPage !== undefined && { currentPage: options.currentPage }),
    ...(options?.totalPages !== undefined && { totalPages: options.totalPages }),
  });
};
