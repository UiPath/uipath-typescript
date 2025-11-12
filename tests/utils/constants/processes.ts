/**
 * Test constants for Orchestrator services
 */

export const PROCESS_TEST_CONSTANTS = {
  // Process identifiers
  PROCESS_ID: 462118,
  PROCESS_KEY: '123e4567-e89b-12d3-a456-426614174000',
  PROCESS_NAME: 'process-name',
  PACKAGE_KEY: '123e4567-e89b-12d3-a456-426614174000',
  PACKAGE_VERSION: '1.0.5',
  PROJECT_KEY: 'b13e8e8d-3623-4714-8dcf-9cc59901614a',
  
  // Job identifiers
  JOB_KEY: '123e4567-e89b-12d3-a456-426614174000',
  JOB_ID: 1,
  
  EXPAND_ARGUMENTS: 'Arguments',
  EXPAND_ROBOT: 'Robot',
  
  // Process properties
  DESCRIPTION: 'description',
  
  // Job properties
  BATCH_EXECUTION_KEY: 'test-batch-key',
  REFERENCE: 'test-reference',
  TIME: '2025-02-19T18:13:25.27Z',
  
  // Arguments and Environment
  ARGUMENTS: { "test": "input" },
  ROBOT: { "id": 1, "name": "TestRobot", "username": "test-robot" },
  
  // Process start request
  PROCESS_START_REQUEST: {
    processKey: '123e4567-e89b-12d3-a456-426614174000',
    jobPriority: 'Normal',
    inputArguments: '{"test": "input"}'
  },
  
  // Process start request with name
  PROCESS_START_REQUEST_WITH_NAME: {
    processName: 'process-name',
    jobPriority: 'High',
    inputArguments: '{"test": "input"}'
  },
} as const;
