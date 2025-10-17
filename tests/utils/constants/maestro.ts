/**
 * Maestro service test constants
 * Maestro-specific constants only
 */

export const MAESTRO_TEST_CONSTANTS = {
  // Maestro-specific identifiers
  PROCESS_KEY: 'TestProcess',
  PACKAGE_ID: 'TestPackage',
  PACKAGE_KEY: 'package-1',
  FOLDER_KEY: 'test-folder-key',
  INSTANCE_ID: 'instance-123',
  RUN_ID: 'run-1',
  PACKAGE_VERSION: '1.0.0',
  MANUAL_SOURCE: 'Manual',
  ATTRIBUTES: '{"key": "value"}',
  
  // Maestro-specific test data
  INSTANCE_DISPLAY_NAME: 'Test Instance',
  STARTED_BY_USER: 'user1',
  CREATOR_USER_KEY: 'user1',
  
  SPAN_ID: 'span-1',
  TRACE_ID: 'trace-1',
  ACTIVITY_NAME: 'Activity1',
  

  PARENT_ELEMENT_ID: 'parent-1',

  ERROR_CODE: 'TestError',

  CANCEL_COMMENT: 'Cancelling instance',

  START_TIME: '2023-01-01T10:00:00Z',
  END_TIME: '2023-01-01T10:05:00Z',

  PROCESS_KEY_2: 'process-2',
  PACKAGE_ID_2: 'package-2',
  CUSTOM_PROCESS_KEY: 'custom-process',
  CUSTOM_PACKAGE_ID: 'custom-package',
  OTHER_PROPERTY: 'value',

  // Variable types
  VARIABLE_TYPE: 'string',

  // BPMN element constants
  START_EVENT_ID: 'start1',
  START_EVENT_NAME: 'Start',
  VARIABLE_ID: 'var1',
  VARIABLE_NAME: 'Input Variable',
  VARIABLE_VALUE: 'test value',

  // Case-specific constants
  CASE_PROCESS_KEY: 'CaseManagement.TestCase',
  CASE_PACKAGE_ID: 'CaseManagement.TestCase',
  CASE_NAME: 'Test Case',
  CASE_INSTANCE_ID: 'case-instance-123',
  CASE_TYPE: 'Test Case Type',
  CASE_TITLE: 'Test Case Title',
  CASE_SUMMARY: 'Test case summary',
  CASE_STAGE_ID: 'stage-1',
  CASE_STAGE_NAME: 'Test Stage',
  CASE_TASK_ID: 'task-1',
  CASE_TASK_NAME: 'Test Task',
  CASE_ELEMENT_ID: 'element-1',
  
  // Task-related constants
  TASK_TYPE_RPA: 'rpa',
  TASK_STATUS_COMPLETED: 'Completed',
  TASK_STATUS_PENDING: 'Pending',
  TASK_STATUS_PAUSED: 'Paused',
  TASK_TITLE_1: 'Task 1',
  TASK_TITLE_2: 'Task 2',
  
  // SLA constants
  SLA_LENGTH_24_HOURS: 24,
  SLA_DURATION_HOURS: 'h',
  SLA_DURATION_DAYS: 'd',
  SLA_COUNT_14_DAYS: 14,
  
  // Binding constants
  BINDING_ID: 'binding-1',
  BINDING_DEFAULT_RESOLVED: 'Resolved Task Name',
  
  // Node type constants
  NODE_TYPE_STAGE: 'Stage',
  
  // SLA Escalation constants
  SLA_TRIGGER_TYPE_BREACHED: 'sla-breached',
  SLA_ACTION_TYPE_NOTIFICATION: 'notification',
  SLA_RECIPIENT_SCOPE_USER: 'User',
  SLA_RECIPIENT_TARGET: '6917d827-6035-4e81-9d29-3ac9372c8a24',
  
  // Case App constants
  CASE_APP_SECTION_ID_1: 'section-1',
  CASE_APP_SECTION_ID_2: 'section-2',
  CASE_APP_OVERVIEW_TITLE: 'Overview 1',
  CASE_APP_OVERVIEW_DETAILS: 'Details 1',
  CASE_APP_OVERVIEW_TITLE_2: 'Overview 2',
  CASE_APP_OVERVIEW_DETAILS_2: 'Details 2',
  
  // Test operation constants
  TEST_COMMENT: 'Test comment',
  
  // Package name constants for testing name extraction
  PACKAGE_NAME_WITH_PREFIX: 'CaseManagement.Test-Case-Process',
  PACKAGE_NAME_WITHOUT_PREFIX: 'RegularPackageName',
  
  // Expected extracted names
  EXTRACTED_NAME_WITH_PREFIX: 'Test Case Process',
  EXTRACTED_NAME_WITHOUT_PREFIX: 'RegularPackageName',
  EXTRACTED_NAME_DEFAULT: 'TestCase',
  
  // Execution History constants
  ELEMENT_RUN_ID: 'run-1',
  EXTERNAL_LINK: 'https://test.uipath.com/task/123',
  CASE_JSON_RESPONSE: {
    root: {
      name: 'Test Case Type',
      description: 'Test Case Description',
      caseAppEnabled: true,
      caseAppConfig: {
        caseAppUrl: 'https://test.com',
        caseAppId: 'test-app-id'
      },
      data: {
        uipath: {
          bindings: [
            { id: 'binding-1', name: 'Binding 1', default: 'Default Value 1' },
            { id: 'binding-2', name: 'Binding 2', default: 'Default Value 2' }
          ]
        }
      },
      nodes: [
        {
          id: 'stage-1',
          type: 'stage',
          data: {
            label: 'Test Stage',
            sla: {
              length: 24,
              duration: 'h',
              escalationRule: []
            },
            tasks: [
              [
                {
                  id: 'task-1',
                  elementId: 'element-1',
                  displayName: 'Test Task',
                  type: 'external-agent',
                  data: { name: '=bindings.binding-1' }
                }
              ]
            ]
          }
        }
      ]
    }
  }
} as const;