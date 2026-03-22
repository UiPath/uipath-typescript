/**
 * Job service mock utilities - Job-specific mocks only
 * Uses generic utilities from core.ts for base functionality
 */
import { JobGetResponse } from '../../../src/models/orchestrator/jobs.types';
import { createMockBaseResponse, createMockCollection } from './core';
import { JOB_TEST_CONSTANTS } from '../constants/jobs';
import { TEST_CONSTANTS } from '../constants/common';

/**
 * Creates a mock job with RAW API format (before transformation)
 * Uses PascalCase field names and raw API timestamp fields that need transformation
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Raw job data as it comes from the API (before transformation)
 */
export const createMockRawJob = (overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> => {
  return createMockBaseResponse({
    Id: JOB_TEST_CONSTANTS.JOB_ID,
    Key: JOB_TEST_CONSTANTS.JOB_KEY,
    StartTime: JOB_TEST_CONSTANTS.START_TIME,
    EndTime: JOB_TEST_CONSTANTS.END_TIME,
    State: JOB_TEST_CONSTANTS.STATE,
    SubState: null,
    JobPriority: JOB_TEST_CONSTANTS.JOB_PRIORITY,
    SpecificPriorityValue: JOB_TEST_CONSTANTS.SPECIFIC_PRIORITY_VALUE,
    ResourceOverwrites: null,
    Source: JOB_TEST_CONSTANTS.SOURCE,
    SourceType: JOB_TEST_CONSTANTS.SOURCE_TYPE,
    BatchExecutionKey: JOB_TEST_CONSTANTS.BATCH_EXECUTION_KEY,
    Info: JOB_TEST_CONSTANTS.INFO,
    CreationTime: JOB_TEST_CONSTANTS.CREATED_TIME,
    StartingScheduleId: null,
    ReleaseName: JOB_TEST_CONSTANTS.RELEASE_NAME,
    Type: JOB_TEST_CONSTANTS.TYPE,
    InputArguments: null,
    InputFile: null,
    EnvironmentVariables: '',
    OutputArguments: null,
    OutputFile: null,
    HostMachineName: JOB_TEST_CONSTANTS.HOST_MACHINE_NAME,
    HasMediaRecorded: false,
    HasVideoRecorded: false,
    PersistenceId: null,
    ResumeVersion: null,
    StopStrategy: null,
    RuntimeType: JOB_TEST_CONSTANTS.RUNTIME_TYPE,
    RequiresUserInteraction: false,
    ReleaseVersionId: JOB_TEST_CONSTANTS.RELEASE_VERSION_ID,
    EntryPointPath: JOB_TEST_CONSTANTS.ENTRY_POINT_PATH,
    OrganizationUnitId: TEST_CONSTANTS.FOLDER_ID,
    OrganizationUnitFullyQualifiedName: TEST_CONSTANTS.FOLDER_NAME,
    FolderKey: null,
    Reference: JOB_TEST_CONSTANTS.REFERENCE,
    ProcessType: JOB_TEST_CONSTANTS.PROCESS_TYPE,
    TargetRuntime: null,
    ResumeOnSameContext: false,
    LocalSystemAccount: null,
    OrchestratorUserIdentity: null,
    RemoteControlAccess: JOB_TEST_CONSTANTS.REMOTE_CONTROL_ACCESS,
    StartingTriggerId: null,
    MaxExpectedRunningTimeSeconds: null,
    ServerlessJobType: null,
    ParentJobKey: null,
    ResumeTime: null,
    LastModificationTime: JOB_TEST_CONSTANTS.LAST_MODIFIED_TIME,
    ErrorCode: null,
    ProjectKey: JOB_TEST_CONSTANTS.PROJECT_KEY,
    CreatorUserKey: JOB_TEST_CONSTANTS.CREATOR_USER_KEY,
    EnableAutopilotHealing: false,
    JobError: null,
    AutopilotForRobots: null,
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
    startTime: JOB_TEST_CONSTANTS.START_TIME,
    endTime: JOB_TEST_CONSTANTS.END_TIME,
    state: JOB_TEST_CONSTANTS.STATE,
    subState: null,
    jobPriority: JOB_TEST_CONSTANTS.JOB_PRIORITY,
    specificPriorityValue: JOB_TEST_CONSTANTS.SPECIFIC_PRIORITY_VALUE,
    resourceOverwrites: null,
    source: JOB_TEST_CONSTANTS.SOURCE,
    sourceType: JOB_TEST_CONSTANTS.SOURCE_TYPE,
    batchExecutionKey: JOB_TEST_CONSTANTS.BATCH_EXECUTION_KEY,
    info: JOB_TEST_CONSTANTS.INFO,
    createdTime: JOB_TEST_CONSTANTS.CREATED_TIME,
    startingScheduleId: null,
    releaseName: JOB_TEST_CONSTANTS.RELEASE_NAME,
    type: JOB_TEST_CONSTANTS.TYPE,
    inputArguments: null,
    inputFile: null,
    environmentVariables: '',
    outputArguments: null,
    outputFile: null,
    hostMachineName: JOB_TEST_CONSTANTS.HOST_MACHINE_NAME,
    hasMediaRecorded: false,
    hasVideoRecorded: false,
    persistenceId: null,
    resumeVersion: null,
    stopStrategy: null,
    runtimeType: JOB_TEST_CONSTANTS.RUNTIME_TYPE,
    requiresUserInteraction: false,
    releaseVersionId: JOB_TEST_CONSTANTS.RELEASE_VERSION_ID,
    entryPointPath: JOB_TEST_CONSTANTS.ENTRY_POINT_PATH,
    folderId: TEST_CONSTANTS.FOLDER_ID,
    folderName: TEST_CONSTANTS.FOLDER_NAME,
    folderKey: null,
    reference: JOB_TEST_CONSTANTS.REFERENCE,
    processType: JOB_TEST_CONSTANTS.PROCESS_TYPE,
    targetRuntime: null,
    resumeOnSameContext: false,
    localSystemAccount: null,
    orchestratorUserIdentity: null,
    remoteControlAccess: JOB_TEST_CONSTANTS.REMOTE_CONTROL_ACCESS,
    startingTriggerId: null,
    maxExpectedRunningTimeSeconds: null,
    serverlessJobType: null,
    parentJobKey: null,
    resumeTime: null,
    lastModifiedTime: JOB_TEST_CONSTANTS.LAST_MODIFIED_TIME,
    errorCode: null,
    projectKey: JOB_TEST_CONSTANTS.PROJECT_KEY,
    creatorUserKey: JOB_TEST_CONSTANTS.CREATOR_USER_KEY,
    enableAutopilotHealing: false,
    jobError: null,
    autopilotForRobots: null,
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
    releaseName: `${JOB_TEST_CONSTANTS.RELEASE_NAME}${index + 1}`,
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
