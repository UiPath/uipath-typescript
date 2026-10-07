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
  /** Trigger name Orchestrator stores for functions deployed since July 2026: `<process name>_<name>`. */
  PREFIXED_NAME: 'my-functions_hello',
  /** The path the trigger is routed by: `<process slug>/<slug>`. */
  ROUTE: 'my-functions/hello',
  /** The trigger's ExternalReference as Orchestrator writes it: `<Method> <route> <FOLDER_KEY>`. */
  EXTERNAL_REFERENCE: 'Post my-functions/hello 4DBF78CB-576C-4847-9959-788AB5E6DD9D',
  /** ExternalReference on a tenant where processes have no slug: the route is the function slug alone. */
  EXTERNAL_REFERENCE_NO_PROCESS_SLUG: 'Post hello 4DBF78CB-576C-4847-9959-788AB5E6DD9D',
  /** A malformed ExternalReference whose route contains a space. */
  EXTERNAL_REFERENCE_SPACED_ROUTE: 'Post my-functions/hello world 4DBF78CB-576C-4847-9959-788AB5E6DD9D',
  /** ExternalReference of a function whose path has a parameter segment. */
  EXTERNAL_REFERENCE_PARAM: 'Get my-functions/invoices/:id 4DBF78CB-576C-4847-9959-788AB5E6DD9D',
  /** A second process in the folder that also declares a `hello` function. */
  OTHER_PROCESS_NAME: 'clean-fn',
  OTHER_PREFIXED_NAME: 'clean-fn_hello',
  /** A different function whose stored name still ends in `_hello`. */
  LOOKALIKE_NAME: 'my-functions_budget_hello',
  /** A name with a quote, and its escaped form inside an OData string literal. */
  QUOTED_NAME: "o'brien",
  QUOTED_NAME_ESCAPED: "o''brien",
  /** Route patterns the SDK cannot fill in: a parameter segment and a wildcard. */
  PARAM_SLUG: 'invoices/:id',
  WILDCARD_SLUG: 'files/*',
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
