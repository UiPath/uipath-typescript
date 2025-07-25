import { CollectionResponse } from '../common/commonTypes';

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
 * Interface for entry point data variation
 */
export interface EntryPointDataVariation {
  content?: string;
  contentType?: 'Json';
  id?: number;
}

/**
 * Interface for entry point
 */
export interface EntryPoint {
  uniqueId?: string;
  path?: string;
  inputArguments?: string;
  outputArguments?: string;
  dataVariation?: EntryPointDataVariation;
  id?: number;
}

/**
 * Interface for tag
 */
export interface Tag {
  name?: string;
  id?: number;
}

/**
 * Interface for process settings
 */
export interface OrchestratorProcessSettings {
  // Define based on actual API response
}

/**
 * Interface for MachineRobot
 */
export interface MachineRobot {
  machineId?: number;
  machineName?: string;
  robotId?: number;
  robotUserName?: string;
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
 * Interface for Autopilot settings
 */
export interface AutopilotSettings {
  enabled?: boolean;
  healingEnabled?: boolean;
}

/**
 * Interface for video recording settings
 */
export interface VideoRecordingSettings {
  // Define based on actual API response
}

/**
 * Interface for start process request
 */
export interface processStartRequest {
  releaseKey?: string;
  releaseName?: string;
  strategy?: StartStrategy;
  robotIds?: number[];
  machineSessionIds?: number[];
  noOfRobots?: number;
  jobsCount?: number;
  source?: ProcessSourceType;
  jobPriority?: JobPriority;
  specificPriorityValue?: number;
  runtimeType?: string;
  inputArguments?: string;
  inputFile?: string;
  environmentVariables?: string;
  reference?: string;
  machineRobots?: MachineRobot[];
  attachments?: JobAttachment[];
  targetFramework?: TargetFramework;
  resumeOnSameContext?: boolean;
  batchExecutionKey?: string;
  requiresUserInteraction?: boolean;
  stopProcessExpression?: string;
  stopStrategy?: StopStrategy;
  killProcessExpression?: string;
  remoteControlAccess?: RemoteControlAccess;
  alertPendingExpression?: string;
  alertRunningExpression?: string;
  runAsMe?: boolean;
  parentOperationId?: string;
  // autopilotForRobots?: AutopilotSettings;
  profilingOptions?: string;
  fpsContext?: string;
  fpsProperties?: string;
  traceId?: string;
  parentSpanId?: string;
  rootSpanId?: string;
  entryPointPath?: string;
  // videoRecordingSettings?: VideoRecordingSettings;
}

/**
 * Interface for process query options
 */
export interface processStartOptions {
  expand?: string;
  filter?: string;
  select?: string;
  orderby?: string;
  count?: boolean;
}

/**
 * Interface for simple robot
 */
export interface SimpleRobot {
  id?: number;
  name?: string;
  username?: string;
}

/**
 * Interface for simple release
 */
export interface SimpleRelease {
  id?: number;
  name?: string;
  processKey?: string;
  processVersion?: string;
}

/**
 * Interface for machine
 */
export interface Machine {
  id?: number;
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
 * Enum for job state
 */
export enum OrchestratorJobState {
  Pending = 'Pending',
  Running = 'Running',
  Stopping = 'Stopping',
  Terminating = 'Terminating',
  Faulted = 'Faulted',
  Successful = 'Successful',
  Stopped = 'Stopped',
  Suspended = 'Suspended',
  Resumed = 'Resumed'
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
  // Define based on actual API response
}

/**
 * Interface for release version
 */
export interface ReleaseVersion {
  // Define based on actual API response
}

/**
 * Interface for job response
 */
export interface processStartResponse {
  key: string;
  startTime: string | null;
  endTime: string | null;
  state: OrchestratorJobState;
  // subState: string | null;
  jobPriority: JobPriority;
  specificPriorityValue: number;
  robot?: SimpleRobot;
  release?: SimpleRelease;
  // resourceOverwrites: string | null;
  source: string;
  sourceType: string;
  batchExecutionKey: string;
  info: string | null;
  creationTime: string;
  startingScheduleId: number | null;
  releaseName: string;
  type: JobType;
  inputArguments: string | null;
  inputFile: string | null;
  environmentVariables?: string;
  outputArguments: string | null;
  outputFile: string | null;
  hostMachineName: string | null;
  persistenceId: string | null;
  resumeVersion: number | null;
  stopStrategy: StopStrategy | null;
  runtimeType: string;
  requiresUserInteraction: boolean;
  releaseVersionId: number | null;
  entryPointPath: string;
  organizationUnitId: number;
  organizationUnitFullyQualifiedName: string | null;
  reference?: string;
  processType: ProcessType;
  machine?: Machine;
  profilingOptions: string | null;
  resumeOnSameContext: boolean;
  localSystemAccount?: string;
  orchestratorUserIdentity: string | null;
  remoteControlAccess: RemoteControlAccess;
  startingTriggerId: string | null;
  maxExpectedRunningTimeSeconds: number | null;
  parentJobKey: string | null;
  resumeTime: string | null;
  lastModificationTime: string | null;
  jobError: JobError | null;
  errorCode: string | null;
  // fpsProperties: string | null;
  traceId: string | null;
  parentSpanId: string | null;
  rootSpanId: string | null;
  // autopilotForRobots: AutopilotSettings | null;
  // fpsContext: string | null;
  id: number;
}

/**
 * Interface for process response
 */
export interface ProcessGetResponse {
  key: string;
  processKey: string;
  processVersion: string;
  isLatestVersion: boolean;
  isProcessDeleted: boolean;
  description?: string;
  name: string;
  entryPointId: number;
  entryPointPath: string | null;
  // entryPoint?: EntryPoint;
  inputArguments: string | null;
  environmentVariables?: string;
  processType: ProcessType;
  supportsMultipleEntryPoints: boolean;
  requiresUserInteraction: boolean;
  isConversational: boolean | null;
  minRequiredRobotVersion: string | null
  isCompiled: boolean;
  // automationHubIdeaUrl?: string;
  currentVersion?: ReleaseVersion;
  releaseVersions?: ReleaseVersion[];
  arguments: ArgumentMetadata;
  processSettings: OrchestratorProcessSettings | null;
  // videoRecordingSettings?: VideoRecordingSettings;
  autoUpdate: boolean;
  hiddenForAttendedUser: boolean;
  feedId: string;
  jobPriority: JobPriority;
  specificPriorityValue: number;
  folderKey: string;
  organizationUnitId: number;
  organizationUnitFullyQualifiedName: string;
  targetFramework: TargetFramework;
  robotSize: RobotSize | null;
  // tags?: Tag[];
  remoteControlAccess: RemoteControlAccess;
  lastModificationTime: string | null;
  lastModifierUserId: number | null;
  creationTime: string;
  creatorUserId: number;
  id: number;
}

/**
 * Interface for process get all options
 */
export interface ProcessGetAllOptions {
  expand?: string;
  filter?: string;
  select?: string;
  orderby?: string;
  count?: boolean;
}

/**
 * Process service model interface
 */
export interface ProcessServiceModel {
  getAll(options?: ProcessGetAllOptions, folderId?: number): Promise<ProcessGetResponse[]>;
  startProcess(request: processStartRequest, folderId: number, options?: processStartOptions): Promise<processStartResponse[]>;
}

/**
 * Process class to represent a UiPath process
 */
// export class Process implements ProcessResponse {
//   key?: string;
//   processKey?: string;
//   processVersion?: string;
//   isLatestVersion?: boolean;
//   isProcessDeleted?: boolean;
//   description?: string;
//   name!: string;
//   entryPointId?: number;
//   entryPointPath?: string;
//   entryPoint?: EntryPoint;
//   inputArguments?: string;
//   environmentVariables?: string;
//   processType?: ProcessType;
//   supportsMultipleEntryPoints?: boolean;
//   requiresUserInteraction?: boolean;
//   isConversational?: boolean;
//   minRequiredRobotVersion?: string;
//   isAttended?: boolean;
//   isCompiled?: boolean;
//   automationHubIdeaUrl?: string;
//   currentVersion?: ReleaseVersion;
//   releaseVersions?: ReleaseVersion[];
//   arguments?: ArgumentMetadata;
//   processSettings?: OrchestratorProcessSettings;
//   videoRecordingSettings?: VideoRecordingSettings;
//   autoUpdate?: boolean;
//   hiddenForAttendedUser?: boolean;
//   feedId?: string;
//   jobPriority?: JobPriority;
//   specificPriorityValue?: number;
//   folderKey?: string;
//   organizationUnitId?: number;
//   organizationUnitFullyQualifiedName?: string;
//   targetFramework?: TargetFramework;
//   robotSize?: RobotSize;
//   tags?: Tag[];
//   remoteControlAccess?: RemoteControlAccess;
//   lastModificationTime?: string;
//   lastModifierUserId?: number;
//   creationTime?: string;
//   creatorUserId?: number;
//   id?: number;
//   [key: string]: any;
  
//   constructor(data: ProcessResponse, private service: ProcessServiceModel) {
//     Object.assign(this, data);
//   }
  
// }
