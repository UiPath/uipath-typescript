/**
 * Maps fields for Queue entities to ensure consistent naming
 */
export const QueueMap: { [key: string]: string } = {
  creationTime: 'createdTime',
  organizationUnitId: 'folderId',
  organizationUnitFullyQualifiedName: 'folderName'
};

/**
 * Maps fields for Queue item entities to ensure consistent naming.
 *
 * Keys are camelCase because the map is applied after
 * `pascalToCamelCaseKeys()`. The user-payload fields (`SpecificContent`,
 * `Output`) are handled separately by the service — they are excluded from
 * case conversion entirely (their keys are user-defined) and reattached as
 * `specificData` / `outputData`. The JSON-string wire fields are renamed to
 * explicit `*Json` names so both representations stay available.
 */
export const QueueItemMap: { [key: string]: string } = {
  queueDefinitionId: 'queueId',
  creationTime: 'createdTime',
  organizationUnitId: 'folderId',
  organizationUnitFullyQualifiedName: 'folderName',
  specificData: 'specificDataJson',
  outputData: 'outputDataJson'
};
