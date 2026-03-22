import { RequestOptions } from '../common/types';
import { PaginationOptions } from '../../utils/pagination';

/**
 * Enum for Job Source
 */
export enum JobSource {
  Manual = 'Manual',
  Schedule = 'Schedule',
  Queue = 'Queue',
  Agent = 'Agent'
}

/**
 * Enum for Job Runtime Type
 */
export enum JobRuntimeType {
  Unattended = 'Unattended',
  Attended = 'Attended',
  Studio = 'Studio',
  StudioX = 'StudioX',
  Development = 'Development',
  StudioPro = 'StudioPro',
  TestAutomation = 'TestAutomation',
  Trigger = 'Trigger',
  Headless = 'Headless',
  StudioDesktop = 'StudioDesktop',
  ProcessOrchestration = 'ProcessOrchestration',
  AutomationOps = 'AutomationOps',
  Serverless = 'Serverless'
}

/**
 * Interface for job response
 */
export interface JobGetResponse {
  /** Unique job identifier */
  id: number;
  /** Unique job key (GUID) */
  key: string;
  /** Job start time */
  startTime: string | null;
  /** Job end time */
  endTime: string | null;
  /** Current job state */
  state: string;
  /** Job sub-state */
  subState: string | null;
  /** Job priority level */
  jobPriority: string;
  /** Specific numeric priority value */
  specificPriorityValue: number;
  /** Resource override configuration */
  resourceOverwrites: string | null;
  /** Source that triggered the job */
  source: string;
  /** Source type classification */
  sourceType: string;
  /** Batch execution key for grouped jobs */
  batchExecutionKey: string;
  /** Informational message about the job */
  info: string | null;
  /** Job creation time */
  createdTime: string;
  /** ID of the schedule that started this job */
  startingScheduleId: number | null;
  /** Name of the release/process */
  releaseName: string;
  /** Job execution type */
  type: string;
  /** Input arguments passed to the job */
  inputArguments: string | null;
  /** Input file for the job */
  inputFile: string | null;
  /** Environment variables */
  environmentVariables: string;
  /** Output arguments from the job */
  outputArguments: string | null;
  /** Output file from the job */
  outputFile: string | null;
  /** Host machine name where job runs */
  hostMachineName: string;
  /** Whether the job has media recorded */
  hasMediaRecorded: boolean;
  /** Whether the job has video recorded */
  hasVideoRecorded: boolean;
  /** Persistence ID for long-running workflows */
  persistenceId: string | null;
  /** Resume version for suspended jobs */
  resumeVersion: number | null;
  /** Stop strategy used */
  stopStrategy: string | null;
  /** Runtime type of the job */
  runtimeType: string;
  /** Whether the job requires user interaction */
  requiresUserInteraction: boolean;
  /** ID of the release version */
  releaseVersionId: number;
  /** Entry point path in the process */
  entryPointPath: string;
  /** Folder ID where the job belongs */
  folderId: number;
  /** Fully qualified folder name */
  folderName: string;
  /** Folder key */
  folderKey: string | null;
  /** Job reference string */
  reference: string;
  /** Process type */
  processType: string;
  /** Target runtime */
  targetRuntime: string | null;
  /** Whether to resume on same context */
  resumeOnSameContext: boolean;
  /** Local system account */
  localSystemAccount: string | null;
  /** Orchestrator user identity */
  orchestratorUserIdentity: string | null;
  /** Remote control access level */
  remoteControlAccess: string;
  /** ID of the trigger that started this job */
  startingTriggerId: number | null;
  /** Maximum expected running time in seconds */
  maxExpectedRunningTimeSeconds: number | null;
  /** Serverless job type */
  serverlessJobType: string | null;
  /** Parent job key for child jobs */
  parentJobKey: string | null;
  /** Resume time for suspended jobs */
  resumeTime: string | null;
  /** Last modification time */
  lastModifiedTime: string;
  /** Error code if job failed */
  errorCode: string | null;
  /** Project key */
  projectKey: string | null;
  /** Key of the user who created the job */
  creatorUserKey: string | null;
  /** Whether autopilot healing is enabled */
  enableAutopilotHealing: boolean;
  /** Job error details */
  jobError: string | null;
  /** Autopilot for robots configuration */
  autopilotForRobots: string | null;
}

/**
 * Options for getting all jobs
 */
export type JobGetAllOptions = RequestOptions & PaginationOptions & {
  /**
   * Required folder ID to scope the job query
   */
  folderId: number;
};
