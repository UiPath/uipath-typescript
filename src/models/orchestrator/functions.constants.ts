/**
 * OData query rewrite map for Functions (API field → SDK field), reversed by
 * `transformOptions()` so callers can use SDK field names in `filter`,
 * `orderby`, `select`, and `expand`.
 *
 * Responses are reshaped by `toFunctionResponse()` instead, which flattens the
 * nested `Release` entity and drops the job-runner fields a map cannot express.
 * Semantic renames only — case conversion is handled by `pascalToCamelCaseKeys()`.
 */
export const FunctionMap = {
  organizationUnitId: 'folderId',
  releaseKey: 'processKey',
  // The package fields are flattened out of the nested `Release` entity, so the
  // API names are navigation paths. Keeps `filter: "processName eq '...'"` working.
  'Release/Name': 'processName',
  'Release/Slug': 'processSlug',
} as const;
