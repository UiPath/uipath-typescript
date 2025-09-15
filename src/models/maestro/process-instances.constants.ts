/**
 * Maps fields for Process Instance entities to ensure consistent naming
 */
export const ProcessInstanceMap: { [key: string]: string } = {
  startedTimeUtc: 'startedTime',
  completedTimeUtc: 'completedTime',
  expiryTimeUtc: 'expiredTime',
  createdAt: 'createdTime',
  updatedAt: 'updatedTime'
};

/**
 * Maps fields for Process Instance Execution History to ensure consistent naming
 */
export const ProcessInstanceExecutionHistoryMap: { [key: string]: string } = {
  startTime: 'startedTime'
};
