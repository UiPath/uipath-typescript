export interface CaseSummaryRaw {
  processKey: string;
  packageId: string;
  folderKey: string;
  folderName: string;
  releaseName: string;
  packageVersions: string[];
  versionCount: number;
  pendingCount: number;
  runningCount: number;
  completedCount: number;
  pausedCount: number;
  cancelledCount: number;
  faultedCount: number;
  retryingCount: number;
  resumingCount: number;
  pausingCount: number;
  cancelingCount: number;
}

export interface CaseSummary {
  processKey: string;
  name: string;
  running: number;
  completed: number;
  faulted: number;
  total: number;
  versions: number;
  location: string;
}

export interface CaseInstanceRaw {
  instanceId: string;
  externalId: string;
  packageVersion: string;
  latestRunStatus: string;
  instanceDisplayName: string;
  startedTimeUtc: string;
  completedTimeUtc: string | null;
  processKey: string;
  folderKey: string;
}

export interface CaseInstance {
  instanceId: string;
  id: string;
  version: string;
  startedAt: string;
  status: string;
  folderKey: string;
}

export interface TaskDetailsResponse {
  taskId: string;
  folderId: number;
  externalLink: string | null;
  task: Record<string, unknown> | null;
  currentUserEmail: string | null;
}
