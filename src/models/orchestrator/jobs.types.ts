import { JobState, RequestOptions } from '../common/types';
import { PaginationOptions } from '../../utils/pagination';
import {
  JobPriority,
  JobType,
  StopStrategy,
  RemoteControlAccess,
  PackageSourceType,
  Machine,
  RobotMetadata,
  JobError,
  FolderProperties,
} from './processes.types';

/**
 * Enum for job package type
 */
export enum JobPackageType {
  Undefined = 'Undefined',
  Process = 'Process',
  ProcessOrchestration = 'ProcessOrchestration',
  WebApp = 'WebApp',
  Agent = 'Agent',
  TestAutomationProcess = 'TestAutomationProcess',
  Api = 'Api',
  MCPServer = 'MCPServer',
  BusinessRules = 'BusinessRules',
  CaseManagement = 'CaseManagement',
  Flow = 'Flow',
  Function = 'Function',
}

/**
 * Enum for job runtime type
 */
export enum JobRuntimeType {
  NonProduction = 'NonProduction',
  Attended = 'Attended',
  Unattended = 'Unattended',
  Development = 'Development',
  Studio = 'Studio',
  RpaDeveloper = 'RpaDeveloper',
  StudioX = 'StudioX',
  CitizenDeveloper = 'CitizenDeveloper',
  Headless = 'Headless',
  StudioPro = 'StudioPro',
  RpaDeveloperPro = 'RpaDeveloperPro',
  TestAutomation = 'TestAutomation',
  AutomationCloud = 'AutomationCloud',
  Serverless = 'Serverless',
  AutomationKit = 'AutomationKit',
  ServerlessTestAutomation = 'ServerlessTestAutomation',
  AutomationCloudTestAutomation = 'AutomationCloudTestAutomation',
  AttendedStudioWeb = 'AttendedStudioWeb',
  Hosting = 'Hosting',
  AssistantWeb = 'AssistantWeb',
  ProcessOrchestration = 'ProcessOrchestration',
  AgentService = 'AgentService',
  AppTest = 'AppTest',
  PerformanceTest = 'PerformanceTest',
  BusinessRule = 'BusinessRule',
  CaseManagement = 'CaseManagement',
  Flow = 'Flow',
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
 * Interface for process metadata on a job
 */
export interface SimpleProcess {
  key?: string;
  processKey?: string;
  processVersion?: string;
  isLatestVersion?: boolean;
  name?: string;
  id?: number;
}

/**
 * Interface for job response from GET /odata/Jobs
 */
export interface JobGetResponse extends FolderProperties {
  /** The job ID */
  id: number;
  /** The unique job identifier */
  key: string;
  /** The state in which the job is */
  state: JobState;
  /** The date and time when the job was created */
  createdTime: string;
  /** The date and time when the job execution started, or null if the job hasn't started yet */
  startTime?: string | null;
  /** The date and time when the job execution ended, or null if the job hasn't ended yet */
  endTime?: string | null;
  /** The date and time when the job was last modified */
  lastModifiedTime?: string | null;
  /** The date and time when the job was resumed */
  resumeTime?: string | null;
  /** The name of the process associated with the job */
  processName?: string | null;
  /** Path to the entry point workflow (XAML) that will be executed by the robot */
  entryPointPath?: string | null;
  /** The name of the machine where the robot ran the job */
  hostMachineName?: string | null;
  /** Input parameters in JSON format passed to job execution */
  inputArguments?: string | null;
  /** Output parameters in JSON format resulted from job execution */
  outputArguments?: string | null;
  /** Environment variables of the job */
  environmentVariables?: string | null;
  /** Additional information about the current job */
  info?: string | null;
  /** The source name of the job */
  source?: string | null;
  /** Reference identifier for the job */
  reference?: string | null;
  /** Execution priority */
  jobPriority?: JobPriority | null;
  /** Value for more granular control over execution priority (1-100) */
  specificPriorityValue?: number | null;
  /** The type of the job - Attended if started via the robot, Unattended otherwise */
  type: JobType;
  /** The package type of the job */
  packageType: JobPackageType;
  /** The runtime type of the robot which can pick up the job */
  runtimeType?: JobRuntimeType | null;
  /** The source type of the job */
  sourceType: PackageSourceType;
  /** The type of the serverless job */
  serverlessJobType?: ServerlessJobType | null;
  /** The stop strategy for the job */
  stopStrategy?: StopStrategy | null;
  /** The remote control access level for the job */
  remoteControlAccess: RemoteControlAccess;
  /** The folder key (GUID) of the folder this job is part of */
  folderKey?: string | null;
  /** The unique identifier grouping multiple jobs, usually generated when started by a schedule */
  batchExecutionKey: string;
  /** The parent job key (GUID) */
  parentJobKey?: string | null;
  /** The ID of the schedule that started the job, or null if started by the user */
  startingScheduleId?: number | null;
  /** The starting trigger ID, can be ApiTriggerId or HttpTriggerId */
  startingTriggerId?: string | null;
  /** The process version ID */
  processVersionId?: number | null;
  /** Expected running time in seconds */
  maxExpectedRunningTimeSeconds?: number | null;
  /** Whether the job requires user interaction */
  requiresUserInteraction: boolean;
  /** If set, the job will resume on the same robot-machine pair on which it initially ran */
  resumeOnSameContext: boolean;
  /** Distinguishes between multiple job suspend/resume cycles */
  resumeVersion?: number | null;
  /** The persistence instance ID for a suspended job */
  persistenceId?: string | null;
  /** The sub-state in which the job is */
  subState?: string | null;
  /** The target runtime */
  targetRuntime?: string | null;
  /** The orchestrator identity used to make API calls */
  orchestratorUserIdentity?: string | null;
  /** The account under which the robot executor will run the job */
  localSystemAccount?: string | null;
  /** The trace ID */
  traceId?: string | null;
  /** The root span ID */
  rootSpanId?: string | null;
  /** The parent span ID */
  parentSpanId?: string | null;
  /** The error code */
  errorCode?: string | null;
  /** The machine associated with the job (requires $expand=Machine) */
  machine?: Machine;
  /** The robot associated with the job (requires $expand=Robot) */
  robot?: RobotMetadata;
  /** The process associated with the job (requires $expand=Release) */
  process?: SimpleProcess | null;
  /** Error details for the job */
  jobError?: JobError | null;
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
