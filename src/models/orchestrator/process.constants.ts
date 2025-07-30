/**
 * Maps fields for Process entities to ensure consistent naming
 */
export const ProcessMap: { [key: string]: string } = {
  lastModificationTime: 'lastModifiedTime',
  creationTime: 'createdTime',
  organizationUnitId: 'folderId',
  organizationUnitFullyQualifiedName: 'folderName'
}; 