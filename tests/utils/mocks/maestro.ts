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

// Case-specific Mock Factories

/**
 * Creates a mock Case object
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Case object
 */
export const createMockCase = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
    packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
    name: MAESTRO_TEST_CONSTANTS.CASE_NAME,
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
 * Creates a mock Case Instance object
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Case Instance object
 */
export const createMockCaseInstance = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    instanceId: MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
    packageKey: MAESTRO_TEST_CONSTANTS.PACKAGE_KEY,
    packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
    packageVersion: MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION,
    latestRunId: MAESTRO_TEST_CONSTANTS.RUN_ID,
    latestRunStatus: TEST_CONSTANTS.RUNNING,
    processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
    folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
    userId: TEST_CONSTANTS.USER_ID,
    instanceDisplayName: MAESTRO_TEST_CONSTANTS.INSTANCE_DISPLAY_NAME,
    startedByUser: MAESTRO_TEST_CONSTANTS.STARTED_BY_USER,
    source: MAESTRO_TEST_CONSTANTS.MANUAL_SOURCE,
    creatorUserKey: MAESTRO_TEST_CONSTANTS.CREATOR_USER_KEY,
    startedTime: new Date().toISOString(),
    completedTime: null,
    instanceRuns: [],
    caseType: MAESTRO_TEST_CONSTANTS.CASE_TYPE,
    caseTitle: MAESTRO_TEST_CONSTANTS.CASE_TITLE,
    caseAppConfig: {
      caseSummary: MAESTRO_TEST_CONSTANTS.CASE_SUMMARY,
      overview: [
        { title: MAESTRO_TEST_CONSTANTS.CASE_APP_OVERVIEW_TITLE, details: MAESTRO_TEST_CONSTANTS.CASE_APP_OVERVIEW_DETAILS }
      ]
    }
  }, overrides);
};

/**
 * Creates a clean mock Case Instance object without case-related properties
 * Used for testing enhancement scenarios where we need a base instance
 * @param overrides - Optional overrides for specific fields
 * @returns Clean mock Case Instance object without caseType, caseTitle, caseAppConfig
 */
export const createMockRawCaseInstance = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    instanceId: MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
    packageKey: MAESTRO_TEST_CONSTANTS.PACKAGE_KEY,
    packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
    packageVersion: MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION,
    latestRunId: MAESTRO_TEST_CONSTANTS.RUN_ID,
    latestRunStatus: TEST_CONSTANTS.RUNNING,
    processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
    folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
    userId: TEST_CONSTANTS.USER_ID,
    instanceDisplayName: MAESTRO_TEST_CONSTANTS.INSTANCE_DISPLAY_NAME,
    startedByUser: MAESTRO_TEST_CONSTANTS.STARTED_BY_USER,
    source: MAESTRO_TEST_CONSTANTS.MANUAL_SOURCE,
    creatorUserKey: MAESTRO_TEST_CONSTANTS.CREATOR_USER_KEY,
    startedTimeUtc: MAESTRO_TEST_CONSTANTS.START_TIME,
    completedTimeUtc: null,
    instanceRuns: []
  }, overrides);
};

/**
 * Creates a mock Cases API response
 * @param cases - Array of cases (optional)
 * @returns Mock API response for cases
 */
export const createMockCasesGetAllApiResponse = (cases: any[] = []) => {
  return createMockBaseResponse({
    processes: cases.length > 0 ? cases : [createMockCase()]
  });
};

/**
 * Creates a mock Case JSON response with flexible configuration
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Case JSON response object
 */
export const createMockCaseJsonResponse = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse(MAESTRO_TEST_CONSTANTS.CASE_JSON_RESPONSE, overrides);
};

/**
 * Creates a mock Case JSON response with caseAppConfig containing sections (for testing overview transformation)
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Case JSON response with sections that transform to overview
 */
export const createMockCaseJsonWithSections = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    root: {
      name: MAESTRO_TEST_CONSTANTS.CASE_TYPE,
      description: MAESTRO_TEST_CONSTANTS.CASE_SUMMARY,
      caseAppConfig: {
        sections: [
          { 
            id: MAESTRO_TEST_CONSTANTS.CASE_APP_SECTION_ID_1, 
            title: MAESTRO_TEST_CONSTANTS.CASE_APP_OVERVIEW_TITLE, 
            details: MAESTRO_TEST_CONSTANTS.CASE_APP_OVERVIEW_DETAILS 
          },
          { 
            id: MAESTRO_TEST_CONSTANTS.CASE_APP_SECTION_ID_2, 
            title: MAESTRO_TEST_CONSTANTS.CASE_APP_OVERVIEW_TITLE_2, 
            details: MAESTRO_TEST_CONSTANTS.CASE_APP_OVERVIEW_DETAILS_2 
          }
        ]
      }
    }
  }, overrides);
};

/**
 * Creates a mock root object for Case JSON
 * @param overrides - Optional overrides for specific fields
 * @returns Mock root object with bindings
 */
export const createMockCaseJsonRoot = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    data: {
      uipath: {
        bindings: [{
          id: MAESTRO_TEST_CONSTANTS.BINDING_ID,
          default: MAESTRO_TEST_CONSTANTS.BINDING_DEFAULT_RESOLVED
        }]
      }
    }
  }, overrides);
};

/**
 * Creates a mock task object for Case JSON nodes
 * @param overrides - Optional overrides for specific fields
 * @returns Mock task object
 */
export const createMockCaseTask = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    id: MAESTRO_TEST_CONSTANTS.CASE_TASK_ID,
    displayName: MAESTRO_TEST_CONSTANTS.CASE_TASK_NAME,
    type: MAESTRO_TEST_CONSTANTS.TASK_TYPE_RPA,
    elementId: MAESTRO_TEST_CONSTANTS.CASE_ELEMENT_ID
  }, overrides);
};

/**
 * Creates a mock SLA object for Case JSON nodes
 * @param overrides - Optional overrides for specific fields
 * @returns Mock SLA object with escalation rules
 */
export const createMockCaseSla = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    count: MAESTRO_TEST_CONSTANTS.SLA_COUNT_14_DAYS,
    unit: MAESTRO_TEST_CONSTANTS.SLA_DURATION_DAYS,
    escalationRule: [{
      triggerInfo: { type: MAESTRO_TEST_CONSTANTS.SLA_TRIGGER_TYPE_BREACHED },
      action: {
        type: MAESTRO_TEST_CONSTANTS.SLA_ACTION_TYPE_NOTIFICATION,
        recipients: [{
          scope: MAESTRO_TEST_CONSTANTS.SLA_RECIPIENT_SCOPE_USER,
          target: MAESTRO_TEST_CONSTANTS.SLA_RECIPIENT_TARGET,
          value: TEST_CONSTANTS.USER_EMAIL
        }]
      }
    }]
  }, overrides);
};

/**
 * Creates a mock stage node for Case JSON
 * @param overrides - Optional overrides for specific fields
 * @returns Mock stage node with tasks and SLA
 */
export const createMockCaseStageNode = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    id: MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID,
    type: MAESTRO_TEST_CONSTANTS.NODE_TYPE_STAGE,
    data: {
      label: MAESTRO_TEST_CONSTANTS.CASE_STAGE_NAME,
      sla: createMockCaseSla(),
      tasks: [[createMockCaseTask()]]
    }
  }, overrides);
};

/**
 * Creates a mock Case JSON response with stages and tasks
 * @param scenario - Optional scenario to return different mock data
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Case JSON response with stages configuration
 */
export const createMockCaseJsonWithStages = (scenario?: 'empty' | 'no-tasks' | 'no-sla' | 'binding-task', overrides: Partial<any> = {}) => {
  switch (scenario) {
    case 'empty':
      return createMockBaseResponse({ nodes: [] }, overrides);
    
    case 'no-tasks':
      return createMockBaseResponse({
        nodes: [createMockCaseStageNode({
          data: { label: MAESTRO_TEST_CONSTANTS.CASE_STAGE_NAME }
        })]
      }, overrides);
    
    case 'no-sla':
      return createMockBaseResponse({
        nodes: [createMockCaseStageNode({
          data: {
            label: MAESTRO_TEST_CONSTANTS.CASE_STAGE_NAME,
            tasks: [[createMockCaseTask()]]
          }
        })]
      }, overrides);
    
    case 'binding-task':
      return createMockBaseResponse({
        nodes: [createMockCaseStageNode({
          data: {
            label: MAESTRO_TEST_CONSTANTS.CASE_STAGE_NAME,
            tasks: [[createMockCaseTask({
              displayName: undefined,
              data: { name: `=bindings.${MAESTRO_TEST_CONSTANTS.BINDING_ID}` }
            })]]
          }
        })],
        root: createMockCaseJsonRoot()
      }, overrides);
    
    default:
      // Default case with all features (SLA, tasks, bindings)
      return createMockBaseResponse({
        nodes: [createMockCaseStageNode()]
      }, overrides);
  }
};


/**
 * Creates a mock Case Instance Execution History response
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Case Instance Execution History response object
 */
/**
 * Creates a mock Case Instance Execution History response with raw API fields (before transformation)
 * The service will transform startedTimeUtc/completedTimeUtc to startedTime/completedTime
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Case Instance Execution History response object with raw API fields
 */
export const createMockCaseInstanceExecutionHistory = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    instanceId: MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
    elementExecutions: [
      {
        elementId: MAESTRO_TEST_CONSTANTS.CASE_TASK_ID,
        elementName: MAESTRO_TEST_CONSTANTS.CASE_TASK_NAME,
        status: MAESTRO_TEST_CONSTANTS.TASK_STATUS_COMPLETED,
        startedTimeUtc: MAESTRO_TEST_CONSTANTS.START_TIME, // Raw API field
        completedTimeUtc: MAESTRO_TEST_CONSTANTS.END_TIME, // Raw API field
        parentElementId: MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID,
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
        externalLink: MAESTRO_TEST_CONSTANTS.EXTERNAL_LINK,
        elementRuns: [
          {
            elementRunId: MAESTRO_TEST_CONSTANTS.ELEMENT_RUN_ID,
            status: MAESTRO_TEST_CONSTANTS.TASK_STATUS_COMPLETED,
            startedTimeUtc: MAESTRO_TEST_CONSTANTS.START_TIME, // Raw API field
            completedTimeUtc: MAESTRO_TEST_CONSTANTS.END_TIME, // Raw API field
            parentElementRunId: null
          }
        ]
      }
    ]
  }, overrides);
};

/**
 * Creates a mock Case Stage response
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Case Stage response object
 */
export const createMockCaseStage = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    id: MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID,
    name: MAESTRO_TEST_CONSTANTS.CASE_STAGE_NAME,
    status: TEST_CONSTANTS.RUNNING,
    sla: {
      length: MAESTRO_TEST_CONSTANTS.SLA_LENGTH_24_HOURS,
      duration: MAESTRO_TEST_CONSTANTS.SLA_DURATION_HOURS,
      escalationRule: []
    },
    tasks: [
      [
        {
          id: MAESTRO_TEST_CONSTANTS.CASE_TASK_ID,
          name: MAESTRO_TEST_CONSTANTS.CASE_TASK_NAME,
          completedTime: MAESTRO_TEST_CONSTANTS.END_TIME,
          startedTime: MAESTRO_TEST_CONSTANTS.START_TIME,
          status: MAESTRO_TEST_CONSTANTS.TASK_STATUS_COMPLETED,
          type: MAESTRO_TEST_CONSTANTS.TASK_TYPE_RPA
        }
      ]
    ]
  }, overrides);
};

/**
 * Creates a mock Action Task object (for Human-in-the-Loop tasks)
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Action Task object with id, title, and status
 */
export const createMockActionTask = (overrides: Partial<any> = {}) => {
  return createMockBaseResponse({
    id: 1,
    title: MAESTRO_TEST_CONSTANTS.TASK_TITLE_1,
    status: MAESTRO_TEST_CONSTANTS.TASK_STATUS_PENDING
  }, overrides);
};

/**
 * Creates a mock Action Tasks paginated response
 * @param tasks - Array of tasks (optional)
 * @returns Mock paginated response with items and totalCount
 */
export const createMockActionTasksResponse = (tasks: any[] = []) => {
  const defaultTasks = [
    createMockActionTask(),
    createMockActionTask({ id: 2, title: MAESTRO_TEST_CONSTANTS.TASK_TITLE_2, status: MAESTRO_TEST_CONSTANTS.TASK_STATUS_COMPLETED })
  ];
  
  const taskItems = tasks.length > 0 ? tasks : defaultTasks;
  
  return createMockBaseResponse({
    items: taskItems,
    totalCount: taskItems.length
  });
};
