/**
 * Maps API field names (countOf*) to SDK field names (*Count) for InstanceStats,
 * aligning naming with ElementStats and other count-suffixed conventions.
 */
export const InstanceStatsMap: { [key: string]: string } = {
  countOfAllInstances: 'totalCount',
  countOfRunning: 'runningCount',
  countOfTransitioning: 'transitioningCount',
  countOfPaused: 'pausedCount',
  countOfFaulted: 'faultedCount',
  countOfCompleted: 'completedCount',
  countOfCancelled: 'cancelledCount',
  countOfDeleted: 'deletedCount'
};
