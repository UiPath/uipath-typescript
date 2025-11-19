/**
 * Configuration for UiPath MCP Server
 */
export interface UiPathMCPConfig {
  /** UiPath Cloud base URL (e.g., https://cloud.uipath.com) */
  baseUrl: string;
  /** Organization name */
  orgName: string;
  /** Tenant name */
  tenantName: string;
  /** Authentication secret (PAT or Bearer token) */
  secret: string;
}

/**
 * Tool call arguments for process start
 */
export interface StartProcessArgs {
  processKey: string; // Can also use processName
  folderId: number;
  inputArguments?: Record<string, any>; // Will be JSON stringified
  strategy?: string; // Strategy enum
  robotIds?: number[];
}

/**
 * Tool call arguments for process instance control
 */
export interface ControlProcessInstanceArgs {
  action: 'pause' | 'resume' | 'cancel';
  instanceId: string;
  folderKey: string;
  reason?: string; // Maps to 'comment' in SDK options
}

/**
 * Tool call arguments for task creation
 * Note: Currently only External tasks are supported by the SDK
 */
export interface CreateTaskArgs {
  title: string;
  folderId: number;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
}

/**
 * Tool call arguments for task updates
 */
export interface UpdateTaskArgs {
  action: 'assign' | 'reassign' | 'unassign' | 'complete';
  taskId: number;
  folderId?: number; // Required ONLY for complete action
  userId?: number; // Required for assign/reassign
  taskType?: 'ExternalTask' | 'FormTask' | 'AppTask'; // Required for complete action
  completionData?: Record<string, any>; // Used for complete action (defaults to {} for Form/App tasks if not provided)
  actionTitle?: string; // Used for complete action (required for Form/App tasks, maps to 'action' in SDK)
}

/**
 * Tool call arguments for entity queries
 */
export interface QueryEntityArgs {
  entityId: string;
  operation?: 'list' | 'get' | 'records';
  filter?: string;
  select?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  pageSize?: number;
}

/**
 * Tool call arguments for entity modifications
 */
export interface ModifyEntityArgs {
  action: 'insert' | 'update' | 'delete';
  entityId: string;
  data?: any[];
  recordIds?: string[];
}

/**
 * Tool call arguments for file upload
 */
export interface UploadFileArgs {
  bucketId: number; // Should be number, not string
  folderId: number;
  filePath: string;
  fileName: string;
  fileContent?: string;
}

/**
 * Tool call arguments for file URL retrieval
 */
export interface GetFileUrlArgs {
  bucketId: number; // Should be number, not string
  folderId: number;
  filePath: string;
  expiryTime?: number; // Maps to expiryInMinutes in SDK
}

/**
 * Tool call arguments for asset retrieval
 */
export interface GetAssetValueArgs {
  assetId: number;
  folderId: number;
}

/**
 * Tool call arguments for queue item operations
 */
export interface QueueItemArgs {
  action: 'add' | 'get' | 'update';
  queueId?: number;
  queueName?: string;
  folderId: number;
  itemId?: number;
  specificContent?: Record<string, any>;
  reference?: string;
  priority?: 'Low' | 'Normal' | 'High';
  deferDate?: string;
  dueDate?: string;
}

/**
 * Tool call arguments for getting task by ID
 */
export interface GetTaskByIdArgs {
  taskId: number;
  folderId?: number; // Optional but REQUIRED for form tasks
}

/**
 * Tool call arguments for getting process by ID
 */
export interface GetProcessByIdArgs {
  processId: number;
  folderId: number; // Required
}

/**
 * Tool call arguments for getting Maestro process
 */
export interface GetMaestroProcessArgs {
  processKey: string;
}

/**
 * Tool call arguments for getting Maestro instance
 */
export interface GetMaestroInstanceArgs {
  instanceId: string;
  folderKey: string;
}

/**
 * Tool call arguments for getting Maestro instance variables
 */
export interface GetMaestroInstanceVariablesArgs {
  instanceId: string;
  folderKey: string;
}

/**
 * Tool call arguments for getting Maestro instance history
 */
export interface GetMaestroInstanceHistoryArgs {
  instanceId: string;
}

/**
 * Tool call arguments for getting Maestro instance incidents
 */
export interface GetMaestroInstanceIncidentsArgs {
  instanceId: string;
  folderKey: string;
}

/**
 * Tool call arguments for getting Maestro instance BPMN
 */
export interface GetMaestroInstanceBpmnArgs {
  instanceId: string;
  folderKey: string;
}

/**
 * Tool call arguments for getting entity by ID
 */
export interface GetEntityByIdArgs {
  entityId: string;
}

/**
 * Tool call arguments for getting entity records
 */
export interface GetEntityRecordsArgs {
  entityId: string;
  filter?: string;
  select?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  pageSize?: number;
}

/**
 * Tool call arguments for getting queue by ID
 */
export interface GetQueueByIdArgs {
  queueId: number;
  folderId: number;
}

/**
 * Tool call arguments for getting bucket by ID
 */
export interface GetBucketByIdArgs {
  bucketId: number;
  folderId: number;
}

/**
 * Tool call arguments for getting bucket files
 */
export interface GetBucketFilesArgs {
  bucketId: number;
  folderId: number;
  pageSize?: number;
}

/**
 * Tool call arguments for getting case instance
 */
export interface GetCaseInstanceArgs {
  instanceId: string;
  folderKey: string;
}

/**
 * Tool call arguments for listing assets
 */
export interface GetAssetsArgs {
  folderId?: number;
  pageSize?: number;
  filter?: string;
}

/**
 * Tool call arguments for listing processes
 */
export interface GetProcessesArgs {
  folderId?: number;
  pageSize?: number;
  filter?: string;
}

/**
 * Tool call arguments for listing queues
 */
export interface GetQueuesArgs {
  folderId?: number;
  pageSize?: number;
  filter?: string;
}

/**
 * Tool call arguments for listing buckets
 */
export interface GetBucketsArgs {
  folderId?: number;
  pageSize?: number;
  filter?: string;
}

/**
 * Tool call arguments for listing Maestro instances
 */
export interface GetMaestroInstancesArgs {
  pageSize?: number;
  filter?: string;
}

/**
 * Tool call arguments for getting task users
 */
export interface GetTaskUsersArgs {
  folderId: number;
}

/**
 * Tool call arguments for getting Maestro process incidents
 */
export interface GetMaestroProcessIncidentsArgs {
  processKey: string;
  folderKey: string;
}

/**
 * Tool call arguments for listing case instances
 */
export interface GetCaseInstancesArgs {
  pageSize?: number;
  filter?: string;
}

/**
 * Tool call arguments for case instance control
 */
export interface ControlCaseInstanceArgs {
  action: 'close' | 'pause' | 'resume';
  instanceId: string;
  folderKey: string;
}

/**
 * Tool call arguments for getting case instance history
 */
export interface GetCaseInstanceHistoryArgs {
  instanceId: string;
  folderKey: string;
}

/**
 * Tool call arguments for getting case stages
 */
export interface GetCaseStagesArgs {
  caseInstanceId: string;
  folderKey: string;
}

/**
 * Tool call arguments for getting case action tasks
 */
export interface GetCaseActionTasksArgs {
  caseInstanceId: string;
  folderId: number;
}

/**
 * Standard tool response format
 */
export interface ToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}
