/**
 * Maps fields for Job entities to ensure consistent naming
 */
export const JobMap: { [key: string]: string } = {
  creationTime: 'createdTime',
  lastModificationTime: 'lastModifiedTime',
  organizationUnitId: 'folderId',
  organizationUnitFullyQualifiedName: 'folderName',
};
