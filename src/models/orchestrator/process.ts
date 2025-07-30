import { JobState, RequestOptions } from '../common/common-types';

/**
 * Enum for process types
 */
export enum ProcessType {
  Undefined = 'Undefined',
  Process = 'Process',
  ProcessOrchestration = 'ProcessOrchestration',
  WebApp = 'WebApp',
  Agent = 'Agent',
  TestAutomationProcess = 'TestAutomationProcess',
  Api = 'Api',
  MCPServer = 'MCPServer',
  BusinessRules = 'BusinessRules'
}

/**
 * Enum for job priority
 */
export enum JobPriority {
  Low = 'Low',
  Normal = 'Normal',
  High = 'High'
}

/**
 * Enum for target framework
 */
export enum TargetFramework {
  Legacy = 'Legacy',
  Windows = 'Windows',
  Portable = 'Portable'
}

/**
 * Enum for robot size
 */
export enum RobotSize {
  Small = 'Small',
  Standard = 'Standard',
  Medium = 'Medium',
  Large = 'Large'
}

/**
 * Enum for remote control access
 */
export enum RemoteControlAccess {
  None = 'None',
  ReadOnly = 'ReadOnly',
  Full = 'Full'
}

/**
 * Enum for process start strategy
 */
export enum StartStrategy {
  All = 'All',
  Specific = 'Specific',
  RobotCount = 'RobotCount',
  JobsCount = 'JobsCount',
  ModernJobsCount = 'ModernJobsCount'
}

/**
 * Enum for process source type
 */
export enum ProcessSourceType {
  Manual = 'Manual',
  Schedule = 'Schedule',
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
 * Enum for stop strategy
 */
export enum StopStrategy {
  SoftStop = 'SoftStop',
  Kill = 'Kill'
}


/**
 * Interface for Job Attachment
 */
export interface JobAttachment {
  attachmentId: string;
  jobKey?: string;
  category?: string;
  attachmentName?: string;
}

/**
 * Interface for common process properties shared across multiple interfaces
 */
export interface ProcessProperties {
  jobPriority?: JobPriority;
  specificPriorityValue?: number;
  inputArguments?: string;
  environmentVariables?: string;
  entryPointPath?: string;
  remoteControlAccess?: RemoteControlAccess;
  requiresUserInteraction?: boolean;
}

/**
 * Interface for common folder properties
 */
export interface FolderProperties {
  folderId?: number;
  folderFullyQualifiedName?: string;
}

/**
 * Base interface for process start request
 */
interface BaseProcessStartRequest extends ProcessProperties {
  strategy?: StartStrategy;
  robotIds?: number[];
  machineSessionIds?: number[];
  noOfRobots?: number;
  jobsCount?: number;
  source?: ProcessSourceType;
  runtimeType?: string;
  inputFile?: string;
  reference?: string;
  attachments?: JobAttachment[];
  targetFramework?: TargetFramework;
  resumeOnSameContext?: boolean;
  batchExecutionKey?: string;
  stopProcessExpression?: string;
  stopStrategy?: StopStrategy;
  killProcessExpression?: string;
  alertPendingExpression?: string;
  alertRunningExpression?: string;
  runAsMe?: boolean;
  parentOperationId?: string;
}

/**
 * Interface for start process request with releaseKey
 */
interface ProcessStartRequestWithKey extends BaseProcessStartRequest {
  releaseKey: string;
  releaseName?: string;
}

/**
 * Interface for start process request with releaseName
 */
interface ProcessStartRequestWithName extends BaseProcessStartRequest {
  releaseKey?: string;
  releaseName: string;
}

/**
 * Interface for start process request
 * Either releaseKey or releaseName must be provided
 */
export type ProcessStartRequest = ProcessStartRequestWithKey | ProcessStartRequestWithName;

/**
 * Interface for robot metadata
 */
export interface RobotMetadata {
  id: number;
  name?: string;
  username?: string;
}

/**
 * Interface for process metadata
 */
export interface ProcessMetadata {
  id: number;
  name?: string;
  processKey?: string;
  processVersion?: string;
}

/**
 * Interface for machine
 */
export interface Machine {
  id: number;
  name?: string;
}

/**
 * Interface for job error
 */
export interface JobError {
  code?: string;
  title?: string;
  detail?: string;
  category?: string;
  status?: number;
  timestamp?: string;
}

/**
 * Enum for job type
 */
export enum JobType {
  Unattended = 'Unattended',
  Attended = 'Attended',
  ServerlessGeneric = 'ServerlessGeneric'
}

/**
 * Interface for argument metadata
 */
export interface ArgumentMetadata {
  input?: string;
  output?: string;
}

/**
 * Interface for job response
 */
export interface ProcessStartResponse extends ProcessProperties, FolderProperties {
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
  releaseName: string;
  type: JobType;
  inputFile: string | null;
  outputArguments: string | null;
  outputFile: string | null;
  hostMachineName: string | null;
  persistenceId: string | null;
  resumeVersion: number | null;
  stopStrategy: StopStrategy | null;
  runtimeType: string;
  releaseVersionId: number | null;
  reference?: string;
  processType: ProcessType;
  machine?: Machine;
  resumeOnSameContext: boolean;
  localSystemAccount?: string;
  orchestratorUserIdentity: string | null;
  startingTriggerId: string | null;
  maxExpectedRunningTimeSeconds: number | null;
  parentJobKey: string | null;
  resumeTime: string | null;
  lastModifiedTime: string | null;  
  jobError: JobError | null;
  errorCode: string | null;
  robot?: RobotMetadata;
  release?: ProcessMetadata;
  id: number;
}

/**
 * Interface for process response
 */
export interface ProcessGetResponse extends ProcessProperties, FolderProperties {
  key: string;
  processKey: string;
  processVersion: string;
  isLatestVersion: boolean;
  isProcessDeleted: boolean;
  description?: string;
  name: string;
  entryPointId: number;
  processType: ProcessType;
  supportsMultipleEntryPoints: boolean;
  isConversational: boolean | null;
  minRequiredRobotVersion: string | null;
  isCompiled: boolean;
  arguments: ArgumentMetadata;
  autoUpdate: boolean;
  hiddenForAttendedUser: boolean;
  feedId: string;
  folderKey: string;
  targetFramework: TargetFramework;
  robotSize: RobotSize | null;
  lastModifiedTime: string | null;  
  lastModifierUserId: number | null;
  createdTime: string;              
  creatorUserId: number;
  id: number;
}

/**
 * Interface for process get all options
 */
export type ProcessGetAllOptions = RequestOptions;

/**
 * Process service model interface
 */
export interface ProcessServiceModel {
  getAll(options?: ProcessGetAllOptions, folderId?: number): Promise<ProcessGetResponse[]>;
  startProcess(request: ProcessStartRequest, folderId: number, options?: RequestOptions): Promise<ProcessStartResponse[]>;
}