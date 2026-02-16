/**
 * Maps fields for Job entities to ensure consistent naming
 * Applied after pascalToCamelCaseKeys() — these are semantic renames only
 */
export const JobMap: { [key: string]: string } = {
  creationTime: 'createdTime',
  lastModificationTime: 'lastModifiedTime',
  organizationUnitId: 'folderId',
  organizationUnitFullyQualifiedName: 'folderName',
  releaseName: 'processName',
  releaseVersionId: 'processVersionId',
  processType: 'packageType',
};
