/**
 * Test constants for Functions service tests
 */
export const FUNCTION_TEST_CONSTANTS = {
  ID: 'e758581f-2f78-4d86-a8e9-f4bc3aad52ec',
  NAME: 'hello',
  SLUG: 'hello',
  METHOD: 'Post',
  DESCRIPTION: 'Returns a greeting message.',
  ENTRY_POINT_PATH: 'content/functions/hello.ts',
  INPUT_ARGUMENTS: '{"name":"World"}',
  PROCESS_KEY: 'd1519612-2961-488e-af7a-7379cc1c3544',
  PROCESS_NAME: 'my-functions',
  PROCESS_SLUG: 'my-functions',
  FOLDER_KEY: '4dbf78cb-576c-4847-9959-788ab5e6dd9d',
  FOLDER_NAME: 'Shared/Solution',
  INVOKE_INPUT: { name: 'Alice' },
  INVOKE_OUTPUT: { message: 'Hello, Alice!' },
  JOB_KEY: '7f3f4bd6-6f2e-4c5a-9d38-6f3f0a1b2c3d',
  STATUS_URL: 'https://alpha.uipath.com/org/tenant/orchestrator_/t/status/status-token?sig=abc',
  ERROR_FUNCTION_NOT_FOUND: 'Function not found',
} as const;
