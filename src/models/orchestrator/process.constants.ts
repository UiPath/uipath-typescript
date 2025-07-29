/**
 * Maps time-related fields for Process entities to ensure consistent naming
 */
export const ProcessTimeMap: { [key: string]: string } = {
  lastModificationTime: 'lastModifiedTime',
  creationTime: 'createdTime'
}; 