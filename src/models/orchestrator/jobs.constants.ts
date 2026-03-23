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
