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
} as const;