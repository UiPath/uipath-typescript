/** Maximum number of job keys to resolve in a single OData filter query (matches Python SDK) */
export const JOB_KEY_RESOLUTION_CHUNK_SIZE = 50;

/**
 * Maps fields for Job entities to ensure consistent naming
 * Semantic renames only — case conversion handled by pascalToCamelCaseKeys()
 */
export const JobMap: { [key: string]: string } = {
  creationTime: 'createdTime',
  lastModificationTime: 'lastModifiedTime',
  organizationUnitId: 'folderId',
  organizationUnitFullyQualifiedName: 'folderName',
  releaseName: 'processName',
  releaseVersionId: 'processVersionId',
  processType: 'packageType',
  release: 'process',
};
