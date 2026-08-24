/**
 * Test constants for Functions service tests
 */
export const FUNCTION_TEST_CONSTANTS = {
  ID: 'e758581f-2f78-4d86-a8e9-f4bc3aad52ec',
  NAME: 'hello',
  /** A second function in the same package — used for name-listing assertions. */
  OTHER_NAME: 'echo-headers',
  SLUG: 'hello',
  METHOD: 'Post',
  DESCRIPTION: 'Returns a greeting message.',
  ENTRY_POINT_PATH: 'content/functions/hello.ts',
  INPUT_ARGUMENTS: '{"name":"World"}',
  PROCESS_KEY: 'd1519612-2961-488e-af7a-7379cc1c3544',
  PROCESS_NAME: 'my-functions',
  PROCESS_SLUG: 'my-functions',
  FOLDER_KEY: '4dbf78cb-576c-4847-9959-788ab5e6dd9d',
  INVOKE_INPUT: { name: 'Alice' },
  INVOKE_OUTPUT: { message: 'Hello, Alice!' },
  JOB_KEY: '7f3f4bd6-6f2e-4c5a-9d38-6f3f0a1b2c3d',
} as const;

/**
 * Test constants for the license acquisition that precedes an invocation.
 * Values mirror a live `POST /api/StudioWeb/AcquireLicense` response.
 */
export const FUNCTION_LICENSE_TEST_CONSTANTS = {
  ROBOT_TYPE: 'StudioX',
  ROBOT_TYPES: ['Attended', 'StudioX'],
  /** ISO 8601 session start, distinctive so the `started` → `startedTime` rename is verifiable. */
  STARTED: '2026-08-11T13:24:05.2768387Z',
  /** Base license tier of a licensed user, from the token's `ubl` claim. */
  LICENSE_TIER: 'BASICNU',
  /** Licensed units, from the token's `lu` claim. */
  LICENSED_UNITS: ['APPS', 'ATTR', 'STDW', 'STDX'],
  /** Orchestrator issues license tokens valid for two hours. */
  TTL_SECONDS: 7200,
  ERROR_LICENSE_UNAVAILABLE: 'No license available for this user',
} as const;
