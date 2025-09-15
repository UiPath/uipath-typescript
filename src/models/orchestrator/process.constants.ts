/**
 * Maps fields for Process entities to ensure consistent naming
 */
export const ProcessMap: { [key: string]: string } = {
  lastModificationTime: 'lastModifiedTime',
  creationTime: 'createdTime',
  organizationUnitId: 'folderId',
  organizationUnitFullyQualifiedName: 'folderName',
  releaseKey: 'processKey',
  releaseName: 'processName',
  releaseVersionId: 'processVersionId',
  processType: 'packageType',
  processKey: 'packageKey',
  processVersion: 'packageVersion',
  isProcessDeleted: 'isPackageDeleted',
}; 