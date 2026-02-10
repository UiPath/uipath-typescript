/**
 * Maps fields for Queue entities to ensure consistent naming
 */
export const QueueMap: { [key: string]: string } = {
  creationTime: 'createdTime',
  organizationUnitId: 'folderId',
  organizationUnitFullyQualifiedName: 'folderName'
};

export const QueueItemMap: { [key: string]: string } = {
  organizationUnitId: 'folderId',
  queueDefinitionId: 'queueDefinitionId',
  processingException: 'processingException',
  specificContent: 'specificContent',
  creationTime: 'creationTime'
};
