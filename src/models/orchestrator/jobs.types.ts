import { JobState, RequestOptions, BaseOptions } from '../common/types';
import { PaginationOptions } from '../../utils/pagination';
import {
  JobPriority,
  JobType,
  PackageType,
  PackageSourceType,
  StopStrategy,
  RemoteControlAccess,
  ProcessProperties,
  FolderProperties,
  Machine,
  RobotMetadata,
  JobError,
} from './processes.types';

/**
 * Enum for job source type (how the job was triggered)
 */
export enum JobSourceType {
  Manual = 'Manual',
  Schedule = 'Schedule',
  Agent = 'Agent',
  Queue = 'Queue',
  StudioWeb = 'StudioWeb',
  IntegrationTrigger = 'IntegrationTrigger',
  StudioDesktop = 'StudioDesktop',
  AutomationOpsPipelines = 'AutomationOpsPipelines',
  Apps = 'Apps',
  SAP = 'SAP',
  HttpTrigger = 'HttpTrigger',
  HttpTriggerWithCallback = 'HttpTriggerWithCallback',
  RobotAPI = 'RobotAPI',
  Assistant = 'Assistant',
  CommandLine = 'CommandLine',
  RobotNetAPI = 'RobotNetAPI',
  Autopilot = 'Autopilot',
  TestManager = 'TestManager',
  AgentService = 'AgentService',
  ProcessOrchestration = 'ProcessOrchestration',
  PluginEcosystem = 'PluginEcosystem',
  PerformanceTesting = 'PerformanceTesting',
  AgentHub = 'AgentHub',
  ApiWorkflow = 'ApiWorkflow'
}

/**
 * Enum for job runtime type
 */
export enum JobRuntimeType {
  NonProduction = 'NonProduction',
  Attended = 'Attended',
  Unattended = 'Unattended',
  Development = 'Development',
  AutomationCloud = 'AutomationCloud',
  Headless = 'Headless',
  SAPAutomation = 'SAPAutomation',
  TestAutomation = 'TestAutomation',
  ServerlessGeneric = 'ServerlessGeneric',
  StudioDesktop = 'StudioDesktop',
  StudioWeb = 'StudioWeb',
  StudioPro = 'StudioPro'
}

/**
 * Raw interface for job response from the API (after camelCase conversion and field mapping)
 */
export interface RawJobGetResponse extends ProcessProperties, FolderProperties {
  key: string;
  startTime: string | null;
  endTime: string | null;
  state: JobState;
  source: string;
  sourceType: string;
  batchExecutionKey: string;
  info: string | null;
  createdTime: string;
  startingScheduleId: number | null;
  processName: string;
  type: JobType;
  inputFile: string | null;
  outputArguments: string | null;
  outputFile: string | null;
  hostMachineName: string | null;
  persistenceId: string | null;
  resumeVersion: number | null;
  stopStrategy: StopStrategy | null;
  runtimeType: string;
  processVersionId: number | null;
  reference: string;
  packageType: PackageType;
  machine?: Machine;
  resumeOnSameContext: boolean;
  localSystemAccount: string;
  orchestratorUserIdentity: string | null;
  startingTriggerId: string | null;
  maxExpectedRunningTimeSeconds: number | null;
  parentJobKey: string | null;
  resumeTime: string | null;
  lastModifiedTime: string | null;
  jobError: JobError | null;
  errorCode: string | null;
  robot?: RobotMetadata;
  id: number;
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

/**
 * Options for getting a single job by ID
 */
export type JobGetByIdOptions = BaseOptions & {
  /**
   * Optional folder ID for folder context
   */
  folderId?: number;
}

/**
 * Options for stopping a single job
 */
export interface JobStopOptions {
  /**
   * The stop strategy to use
   */
  strategy: StopStrategy;
}

/**
 * Options for stopping multiple jobs
 */
export interface JobStopJobsOptions {
  /**
   * Array of job IDs to stop
   */
  jobIds: number[];
  /**
   * The stop strategy to use
   */
  strategy: StopStrategy;
}

/**
 * Options for resuming a job
 */
export interface JobResumeOptions {
  /**
   * The job key to resume
   */
  jobKey: string;
  /**
   * Optional input arguments as a JSON string
   */
  inputArguments?: string;
}
