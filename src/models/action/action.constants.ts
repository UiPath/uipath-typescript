import { ActionStatus } from './action.types';

/**
 * Maps numeric ActionStatus values (from API) to ActionStatus enum values.
 * Extend this file with additional field mappings as needed.
 */
export const ActionStatusMap: { [key: number]: ActionStatus } = {
  0: ActionStatus.Unassigned,
  1: ActionStatus.Pending,
  2: ActionStatus.Completed,
};

// Field mapping for time-related fields to ensure consistent naming
export const ActionTimeMap: { [key: string]: string } = {
  completionTime: 'completedTime',
  deletionTime: 'deletedTime',
  lastModificationTime: 'lastModifiedTime',
  creationTime: 'createdTime',
}; 