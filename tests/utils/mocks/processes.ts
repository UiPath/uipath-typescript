/**
 * Orchestrator service mock utilities - Orchestrator-specific mocks only
 * Uses generic utilities from core.ts for base functionality
 */

import { createMockBaseResponse, createMockCollection } from './core';
import { PROCESS_TEST_CONSTANTS } from '../constants/processes';
import { TEST_CONSTANTS } from '../constants';

// Orchestrator-Specific Mock Factories

/**
 * Creates a mock process response for orchestrator processes using real API response structure (PascalCase)
 * @param overrides - Optional overrides for the mock data
 * @returns Mock ProcessGetResponse object with PascalCase fields (as returned by API)
 */
export const createMockRawOrchestratorProcess = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    // Real API response structure (PascalCase fields)
    TargetRuntime: null,
    IsConversational: null,
    ProcessVersion: PROCESS_TEST_CONSTANTS.PACKAGE_VERSION,
    ProjectKey: PROCESS_TEST_CONSTANTS.PROJECT_KEY,
    Key: PROCESS_TEST_CONSTANTS.PROCESS_KEY,
    ProcessKey: PROCESS_TEST_CONSTANTS.PROCESS_KEY,
    Description: PROCESS_TEST_CONSTANTS.DESCRIPTION,
    Name: PROCESS_TEST_CONSTANTS.PROCESS_NAME,
    FolderKey: TEST_CONSTANTS.FOLDER_ID,
    OrganizationUnitId: TEST_CONSTANTS.FOLDER_ID,
    OrganizationUnitFullyQualifiedName: TEST_CONSTANTS.FOLDER_NAME,
    LastModificationTime: PROCESS_TEST_CONSTANTS.TIME,
    LastModifierUserId: TEST_CONSTANTS.USER_ID,
    CreationTime: PROCESS_TEST_CONSTANTS.TIME,
    CreatorUserId: TEST_CONSTANTS.USER_ID,
    Id: PROCESS_TEST_CONSTANTS.PROCESS_ID,
    Arguments: PROCESS_TEST_CONSTANTS.ARGUMENTS,
    Robot: PROCESS_TEST_CONSTANTS.ROBOT,
  }, overrides);
};

/**
 * Creates a mock process start response (job)
 * @param overrides - Optional overrides for the mock data
 * @returns Mock ProcessStartResponse object
 */
export const createMockProcessStartResponse = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    Key: PROCESS_TEST_CONSTANTS.JOB_KEY,
    StartTime: PROCESS_TEST_CONSTANTS.TIME,
    EndTime: null,
    State: 'Running',
    Source: 'Manual',
    SourceType: 'Manual',
    BatchExecutionKey: PROCESS_TEST_CONSTANTS.BATCH_EXECUTION_KEY,
    Info: 'Process started successfully',
    CreationTime: PROCESS_TEST_CONSTANTS.TIME,
    ReleaseName: PROCESS_TEST_CONSTANTS.PROCESS_NAME,
    Reference: PROCESS_TEST_CONSTANTS.REFERENCE,
    AutopilotForRobots: PROCESS_TEST_CONSTANTS.ROBOT,
    ResumeOnSameContext: false,
    StartingTriggerId: null,
    LastModificationTime: PROCESS_TEST_CONSTANTS.TIME,
    Id: PROCESS_TEST_CONSTANTS.JOB_ID,
    OrganizationUnitId: TEST_CONSTANTS.FOLDER_ID,
    OrganizationUnitFullyQualifiedName: TEST_CONSTANTS.FOLDER_NAME,
  }, overrides);
};

/**
 * Creates a mock API response for process start (jobs)
 * @param jobs - Array of job objects
 * @returns Mock API response with OData structure
 */
export const createMockProcessStartApiResponse = (jobs: any[] = []) => ({
  '@odata.context': 'https://test.uipath.com/odata/$metadata#Jobs',
  value: jobs
});

/**
 * Creates a mock process with transformed fields (camelCase) for use in PaginationHelpers.getAll mocks
 * @param overrides - Optional overrides for the mock data
 * @returns Mock ProcessGetResponse object with camelCase fields (transformed by PaginationHelpers)
 */
export const createMockOrchestratorProcessTransformed = (overrides: Partial<any> = {}) => {
  return {
    // Transformed fields (camelCase) and transformed data 
    targetRuntime: null,
    isConversational: null,
    packageVersion: PROCESS_TEST_CONSTANTS.PACKAGE_VERSION,
    projectKey: PROCESS_TEST_CONSTANTS.PROJECT_KEY,
    key: PROCESS_TEST_CONSTANTS.PROCESS_KEY,
    processKey: PROCESS_TEST_CONSTANTS.PROCESS_KEY,
    description: PROCESS_TEST_CONSTANTS.DESCRIPTION,
    name: PROCESS_TEST_CONSTANTS.PROCESS_NAME,
    folderId: TEST_CONSTANTS.FOLDER_ID,
    folderName: TEST_CONSTANTS.FOLDER_NAME,
    lastModifiedTime: PROCESS_TEST_CONSTANTS.TIME,
    lastModifierUserId: TEST_CONSTANTS.USER_ID,
    createdTime: PROCESS_TEST_CONSTANTS.TIME,
    creatorUserId: TEST_CONSTANTS.USER_ID,
    id: PROCESS_TEST_CONSTANTS.PROCESS_ID,
    arguments: PROCESS_TEST_CONSTANTS.ARGUMENTS,
    robot: PROCESS_TEST_CONSTANTS.ROBOT,
    ...overrides
  };
};

/**
 * Creates multiple mock processes with transformed fields
 * @param count - Number of processes to create
 * @param overrides - Optional overrides for each process
 * @returns Array of mock processes with transformed fields
 */
export const createMockOrchestratorProcesses = (count: number, overrides: Partial<any> = {}) => {
  return createMockCollection(count, (i) => createMockOrchestratorProcessTransformed({
    id: i + 1,
    key: `test-process-key-${i + 1}`,
    name: `TestProcess${i + 1}`,
    ...overrides
  }));
};

