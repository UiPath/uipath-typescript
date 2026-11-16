import { TaskStatus } from './tasks.types';

/**
 * Maps numeric TaskStatus values (from API) to TaskStatus enum values.
 * Extend this file with additional field mappings as needed.
 */
export const TaskStatusMap: { [key: number]: TaskStatus } = {
  0: TaskStatus.Unassigned,
  1: TaskStatus.Pending,
  2: TaskStatus.Completed,
};

// Field mapping for time-related fields to ensure consistent naming
export const TaskMap: { [key: string]: string } = {
  completionTime: 'completedTime',
  deletionTime: 'deletedTime',
  lastModificationTime: 'lastModifiedTime',
  creationTime: 'createdTime',
  organizationUnitId: 'folderId'
};

// Field mapping for task schema responses
export const TaskSchemaMap: { [key: string]: string } = {
  creationTime: 'createdTime',
  organizationUnitId: 'folderId',
  organizationUnitKey: 'folderKey'
};

/**
 * Default expand parameters
 */
export const DEFAULT_TASK_EXPAND = 'AssignedToUser,CreatorUser,LastModifierUser'; 