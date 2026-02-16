/**
 * Jobs service mock utilities
 * Uses generic utilities from core.ts for base functionality
 */

import { createMockBaseResponse, createMockCollection } from './core';
import { JOB_TEST_CONSTANTS } from '../constants/jobs';
import { TEST_CONSTANTS } from '../constants';

/**
 * Creates a mock raw job response (PascalCase fields, as returned by the API)
 * @param overrides - Optional overrides for the mock data
 * @returns Mock raw job response object
 */
export const createMockRawJob = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    Key: JOB_TEST_CONSTANTS.JOB_KEY,
    StartTime: JOB_TEST_CONSTANTS.START_TIME,
    EndTime: null,
    State: 'Running',
    Source: 'Manual',
    SourceType: 'Manual',
    BatchExecutionKey: JOB_TEST_CONSTANTS.BATCH_EXECUTION_KEY,
    Info: null,
    CreationTime: JOB_TEST_CONSTANTS.TIME,
    StartingScheduleId: null,
    ReleaseName: JOB_TEST_CONSTANTS.PROCESS_NAME,
    Type: 'Unattended',
    InputFile: null,
    OutputArguments: null,
    OutputFile: null,
    HostMachineName: JOB_TEST_CONSTANTS.HOST_MACHINE_NAME,
    PersistenceId: null,
    ResumeVersion: null,
    StopStrategy: null,
    RuntimeType: JOB_TEST_CONSTANTS.RUNTIME_TYPE,
    ReleaseVersionId: JOB_TEST_CONSTANTS.PROCESS_VERSION_ID,
    Reference: JOB_TEST_CONSTANTS.REFERENCE,
    ProcessType: 'Process',
    ResumeOnSameContext: false,
    LocalSystemAccount: JOB_TEST_CONSTANTS.LOCAL_SYSTEM_ACCOUNT,
    OrchestratorUserIdentity: null,
    StartingTriggerId: null,
    MaxExpectedRunningTimeSeconds: null,
    ParentJobKey: null,
    ResumeTime: null,
    LastModificationTime: JOB_TEST_CONSTANTS.TIME,
    JobError: null,
    ErrorCode: null,
    OrganizationUnitId: TEST_CONSTANTS.FOLDER_ID,
    OrganizationUnitFullyQualifiedName: TEST_CONSTANTS.FOLDER_NAME,
    Id: JOB_TEST_CONSTANTS.JOB_ID,
  }, overrides);
};

/**
 * Creates a mock transformed job response (camelCase fields with field renames applied)
 * For use in PaginationHelpers.getAll mocks
 * @param overrides - Optional overrides for the mock data
 * @returns Mock job response object with camelCase fields
 */
export const createMockJobTransformed = (overrides: Partial<any> = {}) => {
  return {
    key: JOB_TEST_CONSTANTS.JOB_KEY,
    startTime: JOB_TEST_CONSTANTS.START_TIME,
    endTime: null,
    state: 'Running',
    source: 'Manual',
    sourceType: 'Manual',
    batchExecutionKey: JOB_TEST_CONSTANTS.BATCH_EXECUTION_KEY,
    info: null,
    createdTime: JOB_TEST_CONSTANTS.TIME,
    startingScheduleId: null,
    processName: JOB_TEST_CONSTANTS.PROCESS_NAME,
    type: 'Unattended',
    inputFile: null,
    outputArguments: null,
    outputFile: null,
    hostMachineName: JOB_TEST_CONSTANTS.HOST_MACHINE_NAME,
    persistenceId: null,
    resumeVersion: null,
    stopStrategy: null,
    runtimeType: JOB_TEST_CONSTANTS.RUNTIME_TYPE,
    processVersionId: JOB_TEST_CONSTANTS.PROCESS_VERSION_ID,
    reference: JOB_TEST_CONSTANTS.REFERENCE,
    packageType: 'Process',
    resumeOnSameContext: false,
    localSystemAccount: JOB_TEST_CONSTANTS.LOCAL_SYSTEM_ACCOUNT,
    orchestratorUserIdentity: null,
    startingTriggerId: null,
    maxExpectedRunningTimeSeconds: null,
    parentJobKey: null,
    resumeTime: null,
    lastModifiedTime: JOB_TEST_CONSTANTS.TIME,
    jobError: null,
    errorCode: null,
    folderId: TEST_CONSTANTS.FOLDER_ID,
    folderName: TEST_CONSTANTS.FOLDER_NAME,
    id: JOB_TEST_CONSTANTS.JOB_ID,
    ...overrides
  };
};

/**
 * Creates multiple mock transformed jobs
 * @param count - Number of jobs to create
 * @param overrides - Optional overrides for each job
 * @returns Array of mock jobs with transformed fields
 */
export const createMockJobs = (count: number, overrides: Partial<any> = {}) => {
  return createMockCollection(count, (i) => createMockJobTransformed({
    id: JOB_TEST_CONSTANTS.JOB_ID + i,
    key: `test-job-key-${i + 1}`,
    ...overrides
  }));
};
