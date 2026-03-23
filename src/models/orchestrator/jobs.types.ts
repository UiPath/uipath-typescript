import { JobState, RequestOptions } from '../common/types';
import { PaginationOptions } from '../../utils/pagination';
import {
  JobPriority,
  JobType,
  PackageType,
  StopStrategy,
  RemoteControlAccess,
  RuntimeType,
  PackageSourceType,
  Machine,
  RobotMetadata,
  JobError,
  FolderProperties,
} from './processes.types';

/**
 * Enum for job sub-state
 */
export enum JobSubState {
  WithFaults = 'WITH_FAULTS',
  Manually = 'MANUALLY',
}

/**
 * Enum for serverless job type
 */
export enum ServerlessJobType {
  RobotJob = 'RobotJob',
  WebApp = 'WebApp',
  LoadTest = 'LoadTest',
  StudioWebDesigner = 'StudioWebDesigner',
  PublishStudioProject = 'PublishStudioProject',
  JsApi = 'JsApi',
  PythonCodedAgent = 'PythonCodedAgent',
  MCPServer = 'MCPServer',
  PythonCodedSystemAgent = 'PythonCodedSystemAgent',
  PythonAgent = 'PythonAgent',
}

/**
 * Interface for process metadata associated with a job.
 * Represents a lightweight summary of the process (release) linked to a job.
 * Available when using `expand=Release` in the query.
 */
export interface ProcessMetadata {
  /** The unique key of the release */
  key?: string;
  /** The process key identifying the package */
  processKey?: string;
  /** The version of the process package */
  processVersion?: string;
  /** Whether this is the latest version of the process */
  isLatestVersion?: boolean;
  /** The display name of the process */
  name?: string;
  /** The numeric ID of the release */
  id?: number;
}

/**
 * Interface for job response from GET /odata/Jobs
 */
export interface JobGetResponse extends FolderProperties {
  /** The unique numeric identifier of the job */
  id: number;
  /** The unique job identifier (GUID) */
  key: string;
  /** The current execution state of the job */
  state: JobState;
  /** The date and time when the job was created */
  createdTime: string;
  /** The date and time when the job execution started, or null if the job hasn't started yet */
  startTime: string | null;
  /** The date and time when the job execution ended, or null if the job hasn't ended yet */
  endTime: string | null;
  /** The date and time when the job was last modified */
  lastModifiedTime: string | null;
  /** The date and time when the job was resumed after suspension */
  resumeTime: string | null;
  /** The name of the process (release) associated with the job */
  processName: string | null;
  /** Path to the entry point workflow (XAML) that will be executed by the robot */
  entryPointPath: string | null;
  /** The name of the machine where the robot ran the job */
  hostMachineName: string | null;
  /** Input parameters as a JSON string passed to job execution */
  inputArguments: string | null;
  /** Output parameters as a JSON string resulted from job execution */
  outputArguments: string | null;
  /** Environment variables as a JSON string passed to the job execution */
  environmentVariables: string | null;
  /** Additional information about the current job */
  info: string | null;
  /** The source name of the job, describing how the job was triggered */
  source: string | null;
  /** Reference identifier for the job, used for external correlation */
  reference: string | null;
  /** The execution priority of the job */
  jobPriority: JobPriority | null;
  /** Value for more granular control over execution priority (1-100) */
  specificPriorityValue: number | null;
  /** The type of the job - Attended if started via the robot, Unattended otherwise */
  type: JobType;
  /** The package type of the process associated with the job */
  packageType: PackageType;
  /** The runtime type of the robot which can pick up the job */
  runtimeType: RuntimeType | null;
  /** The source type indicating how the job was triggered */
  sourceType: PackageSourceType;
  /** The type of the serverless job, or null for non-serverless jobs */
  serverlessJobType: ServerlessJobType | null;
  /** The stop strategy for the job */
  stopStrategy: StopStrategy | null;
  /** The remote control access level for the job */
  remoteControlAccess: RemoteControlAccess;
  /** The folder key (GUID) of the folder this job is part of */
  folderKey: string | null;
  /** The unique identifier grouping multiple jobs, usually generated when started by a schedule */
  batchExecutionKey: string;
  /** The parent job key (GUID), set when the job was started by another job */
  parentJobKey: string | null;
  /** The ID of the schedule that started the job, or null if started by the user */
  startingScheduleId: number | null;
  /** The starting trigger ID, can be ApiTriggerId or HttpTriggerId */
  startingTriggerId: string | null;
  /** The process version ID */
  processVersionId: number | null;
  /** Expected maximum running time in seconds before the job is flagged */
  maxExpectedRunningTimeSeconds: number | null;
  /** Whether the job requires user interaction */
  requiresUserInteraction: boolean;
  /** If set, the job will resume on the same robot-machine pair on which it initially ran */
  resumeOnSameContext: boolean;
  /** Distinguishes between multiple job suspend/resume cycles */
  resumeVersion: number | null;
  /** The sub-state in which the job is, providing more granular status information */
  subState: JobSubState | null;
  /** The target runtime for the job */
  targetRuntime: string | null;
  /** The trace ID for distributed tracing */
  traceId: string | null;
  /** The parent span ID for distributed tracing */
  parentSpanId: string | null;
  /** The error code associated with a failed job */
  errorCode: string | null;
  /** The machine associated with the job (available when using expand=Machine) */
  machine?: Machine;
  /** The robot associated with the job (available when using expand=Robot) */
  robot?: RobotMetadata;
  /** The process metadata associated with the job (available when using expand=Release) */
  process?: ProcessMetadata | null;
  /** Error details for the job, or null if the job has no errors */
  jobError: JobError | null;
}

/**
 * Options for getting all jobs
 */
export type JobGetAllOptions = RequestOptions & PaginationOptions & {
  /**
   * Optional folder ID to filter jobs by folder
   */
  folderId?: number;
}
