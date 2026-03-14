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
 * Enum for job process type
 */
export enum JobProcessType {
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
 * Interface for release metadata on a job
 */
export interface SimpleRelease {
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
  id: number;
  key: string;
  state: JobState;
  createdTime: string;
  startTime?: string | null;
  endTime?: string | null;
  lastModifiedTime?: string | null;
  resumeTime?: string | null;
  releaseName?: string;
  entryPointPath?: string;
  hostMachineName?: string | null;
  inputArguments?: string | null;
  outputArguments?: string | null;
  environmentVariables?: string | null;
  info?: string | null;
  source?: string;
  reference?: string;
  jobPriority?: JobPriority;
  specificPriorityValue?: number;
  type?: JobType;
  processType?: JobProcessType;
  runtimeType?: JobRuntimeType;
  sourceType?: PackageSourceType;
  serverlessJobType?: ServerlessJobType;
  stopStrategy?: StopStrategy | null;
  remoteControlAccess?: RemoteControlAccess;
  folderKey?: string;
  batchExecutionKey?: string | null;
  parentJobKey?: string | null;
  startingScheduleId?: number | null;
  startingTriggerId?: string | null;
  releaseVersionId?: number | null;
  maxExpectedRunningTimeSeconds?: number | null;
  requiresUserInteraction?: boolean;
  resumeOnSameContext?: boolean;
  resumeVersion?: number | null;
  persistenceId?: string | null;
  subState?: string | null;
  targetRuntime?: string | null;
  orchestratorUserIdentity?: string | null;
  localSystemAccount?: string | null;
  traceId?: string | null;
  rootSpanId?: string | null;
  parentSpanId?: string | null;
  errorCode?: string | null;
  machine?: Machine;
  robot?: RobotMetadata;
  release?: SimpleRelease;
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
