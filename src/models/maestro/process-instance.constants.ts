/**
 * Maps fields for Process Instance entities to ensure consistent naming
 */
export const ProcessInstanceMap: { [key: string]: string } = {
  startedTimeUtc: 'startedTime',
  completedTimeUtc: 'completedTime'
};

/**
 * Maps fields for Instance Run entities to ensure consistent naming
 */
export const InstanceRunMap: { [key: string]: string } = {
  startedTimeUtc: 'startedTime',
  completedTimeUtc: 'completedTime'
};

/**
 * Maps fields for Process Instance Execution History entities to ensure consistent naming
 */
export const ProcessInstanceExecutionHistoryMap: { [key: string]: string } = {
  expiryTimeUtc: 'expiredTime'
};