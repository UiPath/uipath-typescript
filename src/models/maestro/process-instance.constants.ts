/**
 * Maps fields for Process Instance entities to ensure consistent naming
 */
export const ProcessInstanceMap: { [key: string]: string } = {
  startedTimeUtc: 'startedTime',
  completedTimeUtc: 'completedTime',
  expiryTimeUtc: 'expiredTime'
};
