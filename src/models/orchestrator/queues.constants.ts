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
 * Keys are camelCase — the map runs after `pascalToCamelCaseKeys()`.
 */
export const QueueItemMap: { [key: string]: string } = {
  queueDefinitionId: 'queueId',
  creationTime: 'createdTime',
  organizationUnitId: 'folderId',
  organizationUnitFullyQualifiedName: 'folderName',
  startProcessing: 'processingStartTime',
  endProcessing: 'processingEndTime',
  processingException: 'processingError'
};

/**
 * Maps fields nested inside a queue item's processing error.
 */
export const QueueProcessingErrorMap: { [key: string]: string } = {
  creationTime: 'createdTime'
};
