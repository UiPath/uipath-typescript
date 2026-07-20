/**
 * Field mapping for Function responses (API field → SDK field).
 * Semantic renames only — case conversion is handled by `pascalToCamelCaseKeys()`.
 */
export const FunctionMap = {
  organizationUnitId: 'folderId',
  organizationUnitFullyQualifiedName: 'folderName',
  releaseKey: 'processKey',
} as const;
