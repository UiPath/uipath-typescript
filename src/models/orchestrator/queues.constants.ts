/**
 * Maps fields for Queue entities to ensure consistent naming
 */
export const QueueMap: { [key: string]: string } = {
  creationTime: 'createdTime',
  organizationUnitId: 'folderId',
  organizationUnitFullyQualifiedName: 'folderName'
};

/**
 * Queue item naming normalization.
 *
 * Orchestrator returns both object fields (`SpecificContent`, `Output`) and
 * JSON-string fields (`SpecificData`, `OutputData`). The SDK exposes the object
 * forms as `specificData` / `outputData` for UI-aligned terminology, and keeps
 * the raw JSON strings under explicit `specificDataJson` / `outputDataJson`
 * names for callers who need the original wire representation.
 */
export const QueueItemMap: { [key: string]: string } = {
  organizationUnitId: 'folderId',
  organizationUnitFullyQualifiedName: 'folderName',
  queueDefinitionId: 'queueId',
  creationTime: 'createdTime',
  specificData: 'specificDataJson',
  outputData: 'outputDataJson',
  specificContent: 'specificData',
  output: 'outputData'
};
