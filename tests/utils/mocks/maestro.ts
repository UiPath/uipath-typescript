/**
 * Maestro service mock utilities - Maestro-specific mocks only
 * Uses generic utilities from core.ts for base functionality
 */

import { TEST_CONSTANTS } from '../constants/common';
import { MAESTRO_TEST_CONSTANTS } from '../constants/maestro';
import { createMockBaseResponse } from './core';

// Maestro-Specific Mock Factories

/**
 * Creates a mock Process object
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Process object
 */
export const createMockProcess = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    processKey: MAESTRO_TEST_CONSTANTS.PROCESS_KEY,
    packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_ID,
    name: MAESTRO_TEST_CONSTANTS.PACKAGE_ID,
    folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
    folderName: TEST_CONSTANTS.FOLDER_NAME,
    packageVersions: [MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION],
    versionCount: 1,
    pendingCount: 0,
    runningCount: 1,
    completedCount: 0,
    pausedCount: 0,
    cancelledCount: 0,
    faultedCount: 0,
    retryingCount: 0,
    resumingCount: 0,
    pausingCount: 0,
    cancelingCount: 0,
  }, overrides);
};

/**
 * Creates a mock Process Instance object
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Process Instance object
 */
export const createMockProcessInstance = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    instanceId: MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
    packageKey: MAESTRO_TEST_CONSTANTS.PACKAGE_KEY,
    packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_ID,
    packageVersion: MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION,
    latestRunId: MAESTRO_TEST_CONSTANTS.RUN_ID,
    latestRunStatus: TEST_CONSTANTS.RUNNING,
    processKey: MAESTRO_TEST_CONSTANTS.PROCESS_KEY,
    folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
    userId: TEST_CONSTANTS.USER_ID,
    instanceDisplayName: MAESTRO_TEST_CONSTANTS.INSTANCE_DISPLAY_NAME,
    startedByUser: MAESTRO_TEST_CONSTANTS.STARTED_BY_USER,
    source: MAESTRO_TEST_CONSTANTS.MANUAL_SOURCE,
    creatorUserKey: MAESTRO_TEST_CONSTANTS.CREATOR_USER_KEY,
    startedTime: new Date().toISOString(),
    completedTime: null,
    instanceRuns: [],
  }, overrides);
};


// API Response Mocks

/**
 * Creates a mock Processes API response
 * @param processes - Array of processes (optional)
 * @returns Mock API response for processes
 */
export const createMockProcessesApiResponse = (processes: any[] = []) => {
  return createMockBaseResponse({
    processes: processes.length > 0 ? processes : [createMockProcess()]
  });
};

/**
 * Creates a mock Process Instance Execution History entry
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Execution History object
 */
export const createMockExecutionHistory = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    id: MAESTRO_TEST_CONSTANTS.SPAN_ID,
    traceId: MAESTRO_TEST_CONSTANTS.TRACE_ID,
    parentId: null,
    name: MAESTRO_TEST_CONSTANTS.ACTIVITY_NAME,
    startedTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    attributes: MAESTRO_TEST_CONSTANTS.ATTRIBUTES,
    createdTime: new Date().toISOString(),
    updatedTime: new Date().toISOString(),
    expiredTime: null
  }, overrides);
};

/**
 * Creates a mock Process Instance Variables response
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Variables response object
 */
export const createMockProcessVariables = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    elements: [],
    globals: {
      [MAESTRO_TEST_CONSTANTS.VARIABLE_ID]: MAESTRO_TEST_CONSTANTS.VARIABLE_VALUE
    },
    instanceId: MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
    parentElementId: null
  }, overrides);
};

/**
 * Creates a mock BPMN XML with variables
 * @param overrides - Optional overrides for specific fields
 * @returns Mock BPMN XML string
 */
/**
 * Creates a mock API operation response (for cancel/pause/resume operations)
 * @param overrides - Optional overrides for specific fields
 * @returns Mock operation response object
 */
/**
 * Creates a mock Maestro operation response
 * @param overrides - Optional overrides for specific fields
 * @param wrapInOperationResponse - If true, wraps the response in OperationResponse format (for method responses)
 * @returns Mock operation response object
 * 
 * @example
 * ```typescript
 * // For API response (in service tests)
 * const mockApiResponse = createMockMaestroApiOperationResponse();
 * 
 * // For method response (in model tests)
 * const mockMethodResponse = createMockMaestroApiOperationResponse({}, true);
 * ```
 */
export const createMockMaestroApiOperationResponse = (overrides: Partial<any> = {}) => {
  const apiResponse = createMockBaseResponse({
    instanceId: MAESTRO_TEST_CONSTANTS.INSTANCE_ID,
    status: TEST_CONSTANTS.RUNNING
  }, overrides);

  return apiResponse;
};

export const createMockBpmnWithVariables = (overrides: Partial<any> = {}) => {
  const defaults = {
    processId: MAESTRO_TEST_CONSTANTS.PROCESS_KEY,
    processName: MAESTRO_TEST_CONSTANTS.INSTANCE_DISPLAY_NAME,
    elementId: MAESTRO_TEST_CONSTANTS.PARENT_ELEMENT_ID,
    elementName: MAESTRO_TEST_CONSTANTS.ACTIVITY_NAME,
    variableId: MAESTRO_TEST_CONSTANTS.SPAN_ID,
    variableName: `${MAESTRO_TEST_CONSTANTS.ACTIVITY_NAME} Variable`,
    variableType: MAESTRO_TEST_CONSTANTS.VARIABLE_TYPE
  };

  const config = { ...defaults, ...overrides };

  return `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions>
          <bpmn:process id="${config.processId}" name="${config.processName}">
            <bpmn:startEvent id="${config.elementId}" name="${config.elementName}">
              <uipath:inputOutput id="${config.variableId}" name="${config.variableName}" type="${config.variableType}" elementId="${config.elementId}"/>
            </bpmn:startEvent>
          </bpmn:process>
        </bpmn:definitions>`;
};
