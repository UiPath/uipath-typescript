/**
 * API Endpoint Constants
 * Re-exports from the endpoints folder for backward compatibility
 */

/**
 * Base path constants for different services
 */
export const ORCHESTRATOR_BASE = 'orchestrator_';
export const PIMS_BASE = 'pims_';
export const DATAFABRIC_BASE = 'datafabric_';
export const IDENTITY_BASE = 'identity_';

/**
 * Maestro Process Service Endpoints
 */
export const MAESTRO_ENDPOINTS = {
  PROCESSES: {
    GET_ALL: `${PIMS_BASE}/api/v1/processes/summary`,
    GET_SETTINGS: (processKey: string) => `${PIMS_BASE}/api/v1/processes/${processKey}/settings`,
  },
  INSTANCES: {
    GET_ALL: `${PIMS_BASE}/api/v1/instances`,
    GET_BY_ID: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}`,
    GET_EXECUTION_HISTORY: (instanceId: string) => `${PIMS_BASE}/api/v1/spans/${instanceId}`,
    GET_BPMN: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}/bpmn`,
    GET_VARIABLES: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}/variables`,
    CANCEL: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}/cancel`,
    PAUSE: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}/pause`,
    RESUME: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}/resume`,
  },
  INCIDENTS: {
    GET_ALL: `${PIMS_BASE}/api/v1/incidents/summary`,
    GET_BY_PROCESS: (processKey: string) => `${PIMS_BASE}/api/v1/incidents/process/${processKey}`,
    GET_BY_INSTANCE: (instanceId: string) => `${PIMS_BASE}/api/v1/instances/${instanceId}/incidents`,
  },
  CASES: {
    GET_CASE_JSON: (instanceId: string) => `${PIMS_BASE}/api/v1/cases/${instanceId}/case-json`,
    GET_ELEMENT_EXECUTIONS: (instanceId: string) => `${PIMS_BASE}/api/v1/element-executions/case-instances/${instanceId}`,
    REOPEN: (instanceId: string) => `${PIMS_BASE}/api/v1/cases/${instanceId}/reopen`,
  },
} as const;

/**
 * Task Service (Action Center) Endpoints
 */
export const TASK_ENDPOINTS = {
  CREATE_GENERIC_TASK: `${ORCHESTRATOR_BASE}/tasks/GenericTasks/CreateTask`,
  GET_TASK_USERS: (folderId: number) => `${ORCHESTRATOR_BASE}/odata/Tasks/UiPath.Server.Configuration.OData.GetTaskUsers(organizationUnitId=${folderId})`,
  GET_TASKS_ACROSS_FOLDERS: `${ORCHESTRATOR_BASE}/odata/Tasks/UiPath.Server.Configuration.OData.GetTasksAcrossFolders`,
  GET_TASKS_ACROSS_FOLDERS_ADMIN: `${ORCHESTRATOR_BASE}/odata/Tasks/UiPath.Server.Configuration.OData.GetTasksAcrossFoldersForAdmin`,
  GET_BY_ID: (id: number) => `${ORCHESTRATOR_BASE}/odata/Tasks(${id})`,
  ASSIGN_TASKS: `${ORCHESTRATOR_BASE}/odata/Tasks/UiPath.Server.Configuration.OData.AssignTasks`,
  REASSIGN_TASKS: `${ORCHESTRATOR_BASE}/odata/Tasks/UiPath.Server.Configuration.OData.ReassignTasks`,
  UNASSIGN_TASKS: `${ORCHESTRATOR_BASE}/odata/Tasks/UiPath.Server.Configuration.OData.UnassignTasks`,
  COMPLETE_FORM_TASK: `${ORCHESTRATOR_BASE}/forms/TaskForms/CompleteTask`,
  COMPLETE_APP_TASK: `${ORCHESTRATOR_BASE}/tasks/AppTasks/CompleteAppTask`,
  COMPLETE_GENERIC_TASK: `${ORCHESTRATOR_BASE}/tasks/GenericTasks/CompleteTask`,
  GET_TASK_FORM_BY_ID: `${ORCHESTRATOR_BASE}/forms/TaskForms/GetTaskFormById`,
} as const;

/**
 * Data Fabric Service Endpoints
 */
export const DATA_FABRIC_ENDPOINTS = {
  ENTITY: {
    GET_ALL: `${DATAFABRIC_BASE}/api/Entity`,
    GET_ENTITY_RECORDS: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/read`,
    GET_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/Entity/${entityId}`,
    GET_RECORD_BY_ID: (entityId: string, recordId: string) =>
      `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/read/${recordId}`,
    INSERT_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/insert`,
    BATCH_INSERT_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/insert-batch`,
    UPDATE_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/update-batch`,
    DELETE_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/delete-batch`,
    DOWNLOAD_ATTACHMENT: (entityName: string, recordId: string, fieldName: string) =>
      `${DATAFABRIC_BASE}/api/Attachment/${entityName}/${recordId}/${fieldName}`,
  },
  CHOICESETS: {
    GET_ALL: `${DATAFABRIC_BASE}/api/Entity/choiceset`,
    GET_BY_ID: (choiceSetId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${choiceSetId}/query_expansion`,
  },
} as const;

/**
 * Orchestrator Bucket Endpoints
 */
export const BUCKET_ENDPOINTS = {
  GET_BY_FOLDER: `${ORCHESTRATOR_BASE}/odata/Buckets`,
  GET_ALL: `${ORCHESTRATOR_BASE}/odata/Buckets/UiPath.Server.Configuration.OData.GetBucketsAcrossFolders`,
  GET_BY_ID: (id: number) => `${ORCHESTRATOR_BASE}/odata/Buckets(${id})`,
  GET_FILE_META_DATA: (id: number) => `${ORCHESTRATOR_BASE}/api/Buckets/${id}/ListFiles`,
  GET_READ_URI: (id: number) => `${ORCHESTRATOR_BASE}/odata/Buckets(${id})/UiPath.Server.Configuration.OData.GetReadUri`,
  GET_WRITE_URI: (id: number) => `${ORCHESTRATOR_BASE}/odata/Buckets(${id})/UiPath.Server.Configuration.OData.GetWriteUri`,
} as const;

/**
 * Identity/Authentication Endpoints
 */
export const IDENTITY_ENDPOINTS = {
  BASE_PATH: `${IDENTITY_BASE}/connect`,
  TOKEN: `${IDENTITY_BASE}/connect/token`,
  AUTHORIZE: `${IDENTITY_BASE}/connect/authorize`,
} as const;

/**
 * Orchestrator Process Service Endpoints
 */
export const PROCESS_ENDPOINTS = {
  GET_ALL: `${ORCHESTRATOR_BASE}/odata/Releases`,
  START_PROCESS: `${ORCHESTRATOR_BASE}/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs`,
  GET_BY_ID: (id: number) => `${ORCHESTRATOR_BASE}/odata/Releases(${id})`,
} as const;

/**
 * Orchestrator Queue Service Endpoints
 */
export const QUEUE_ENDPOINTS = {
  GET_BY_FOLDER: `${ORCHESTRATOR_BASE}/odata/QueueDefinitions`,
  GET_ALL: `${ORCHESTRATOR_BASE}/odata/QueueDefinitions/UiPath.Server.Configuration.OData.GetQueuesAcrossFolders`,
  GET_BY_ID: (id: number) => `${ORCHESTRATOR_BASE}/odata/QueueDefinitions(${id})`,
} as const;

/**
 * Orchestrator Asset Service Endpoints
 */
export const ASSET_ENDPOINTS = {
  GET_BY_FOLDER: `${ORCHESTRATOR_BASE}/odata/Assets/UiPath.Server.Configuration.OData.GetFiltered`,
  GET_ALL: `${ORCHESTRATOR_BASE}/odata/Assets/UiPath.Server.Configuration.OData.GetAssetsAcrossFolders`,
  GET_BY_ID: (id: number) => `${ORCHESTRATOR_BASE}/odata/Assets(${id})`,
} as const;
