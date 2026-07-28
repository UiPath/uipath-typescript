/**
 * Field mapping for Function responses (API field → SDK field).
 * Semantic renames only — case conversion is handled by `pascalToCamelCaseKeys()`.
 */
export const FunctionMap = {
  organizationUnitId: 'folderId',
  organizationUnitFullyQualifiedName: 'folderName',
  releaseKey: 'processKey',
  // The package fields are flattened out of the nested `Release` entity, so the
  // API names are navigation paths. Keeps `filter: "processName eq '...'"` working.
  'Release/Name': 'processName',
  'Release/Slug': 'processSlug',
} as const;
