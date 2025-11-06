/**
 * API Endpoint Constants
 * Centralized location for all API endpoints used throughout the SDK
 */

/**
 * Maestro Process Service Endpoints
 */
export const MAESTRO_ENDPOINTS = {
  BASE_PATH: 'pims_/api/v1',
  PROCESSES: {
    GET_ALL: 'pims_/api/v1/processes/summary',
    GET_SETTINGS: (processKey: string) => `pims_/api/v1/processes/${processKey}/settings`,
  },
  INSTANCES: {
    GET_ALL: 'pims_/api/v1/instances',
    GET_BY_ID: (instanceId: string) => `pims_/api/v1/instances/${instanceId}`,
    GET_EXECUTION_HISTORY: (instanceId: string) => `pims_/api/v1/spans/${instanceId}`,
    GET_BPMN: (instanceId: string) => `pims_/api/v1/instances/${instanceId}/bpmn`,
    GET_VARIABLES: (instanceId: string) => `pims_/api/v1/instances/${instanceId}/variables`,
    CANCEL: (instanceId: string) => `pims_/api/v1/instances/${instanceId}/cancel`,
    PAUSE: (instanceId: string) => `pims_/api/v1/instances/${instanceId}/pause`,
    RESUME: (instanceId: string) => `pims_/api/v1/instances/${instanceId}/resume`,
  },
  INCIDENTS: {
    GET_ALL: 'pims_/api/v1/incidents/summary',
    GET_BY_PROCESS: (processKey: string) => `pims_/api/v1/incidents/process/${processKey}`,
    GET_BY_INSTANCE: (instanceId: string) => `pims_/api/v1/instances/${instanceId}/incidents`,
  },
  CASES: {
    GET_CASE_JSON: (instanceId: string) => `pims_/api/v1/cases/${instanceId}/case-json`,
    GET_ELEMENT_EXECUTIONS: (instanceId: string) => `pims_/api/v1alpha1/element-executions/case-instances/${instanceId}`,
  },
} as const;

/**
 * Task Service (Action Center) Endpoints
 */
export const TASK_ENDPOINTS = {
  CREATE_GENERIC_TASK: '/tasks/GenericTasks/CreateTask',
  GET_TASK_USERS: (folderId: number) => `/odata/Tasks/UiPath.Server.Configuration.OData.GetTaskUsers(organizationUnitId=${folderId})`,
  GET_TASKS_ACROSS_FOLDERS: '/odata/Tasks/UiPath.Server.Configuration.OData.GetTasksAcrossFoldersForAdmin',
  GET_BY_ID: (id: number) => `/odata/Tasks(${id})`,
  ASSIGN_TASKS: '/odata/Tasks/UiPath.Server.Configuration.OData.AssignTasks',
  REASSIGN_TASKS: '/odata/Tasks/UiPath.Server.Configuration.OData.ReassignTasks',
  UNASSIGN_TASKS: '/odata/Tasks/UiPath.Server.Configuration.OData.UnassignTasks',
  COMPLETE_FORM_TASK: '/forms/TaskForms/CompleteTask',
  COMPLETE_APP_TASK: '/tasks/AppTasks/CompleteAppTask',
  COMPLETE_GENERIC_TASK: '/tasks/GenericTasks/CompleteTask',
  GET_TASK_FORM_BY_ID: '/forms/TaskForms/GetTaskFormById',
} as const;

/**
 * Data Fabric Service Endpoints
 */
export const DATA_FABRIC_ENDPOINTS = {
  ENTITY: {
    GET_ALL: 'datafabric_/api/Entity',
    GET_ENTITY_RECORDS: (entityId: string) => `datafabric_/api/EntityService/entity/${entityId}/read`,
    GET_BY_ID: (entityId: string) => `datafabric_/api/Entity/${entityId}`,
    INSERT_BY_ID: (entityId: string) => `datafabric_/api/EntityService/entity/${entityId}/insert-batch`,
    UPDATE_BY_ID: (entityId: string) => `datafabric_/api/EntityService/entity/${entityId}/update-batch`,
    DELETE_BY_ID: (entityId: string) => `datafabric_/api/EntityService/entity/${entityId}/delete-batch`,
  },
} as const;

/**
 * Orchestrator Bucket Endpoints
 */
export const BUCKET_ENDPOINTS = {
  GET_BY_FOLDER: '/odata/Buckets',
  GET_ALL: '/odata/Buckets/UiPath.Server.Configuration.OData.GetBucketsAcrossFolders',
  GET_BY_ID: (id: number) => `/odata/Buckets(${id})`,
  GET_FILE_META_DATA: (id: number) => `/api/Buckets/${id}/ListFiles`,
  GET_READ_URI: (id: number) => `/odata/Buckets(${id})/UiPath.Server.Configuration.OData.GetReadUri`,
  GET_WRITE_URI: (id: number) => `/odata/Buckets(${id})/UiPath.Server.Configuration.OData.GetWriteUri`,
} as const;

/**
 * Identity/Authentication Endpoints
 */
export const IDENTITY_ENDPOINTS = {
  BASE_PATH: 'identity_/connect',
  TOKEN: 'identity_/connect/token',
  AUTHORIZE: 'identity_/connect/authorize',
} as const;

/**
 * Orchestrator Process Service Endpoints
 */
export const PROCESS_ENDPOINTS = {
  GET_ALL: '/odata/Releases',
  START_PROCESS: '/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs',
  GET_BY_ID: (id: number) => `/odata/Releases(${id})`,
} as const;

/**
 * Orchestrator Queue Service Endpoints
 */
export const QUEUE_ENDPOINTS = {
  GET_BY_FOLDER: '/odata/QueueDefinitions',
  GET_ALL: '/odata/QueueDefinitions/UiPath.Server.Configuration.OData.GetQueuesAcrossFolders',
  GET_BY_ID: (id: number) => `/odata/QueueDefinitions(${id})`,
} as const;

/**
 * Orchestrator Asset Service Endpoints
 */
export const ASSET_ENDPOINTS = {
  GET_BY_FOLDER: '/odata/Assets/UiPath.Server.Configuration.OData.GetFiltered',
  GET_ALL: '/odata/Assets/UiPath.Server.Configuration.OData.GetAssetsAcrossFolders',
  GET_BY_ID: (id: number) => `/odata/Assets(${id})`,
} as const;

/**
 * Orchestrator Folder Service Endpoints
 */
export const FOLDER_ENDPOINTS = {
  GET_MACHINES_FOR_FOLDER: (folderId: number) => `orchestrator_/odata/Folders/UiPath.Server.Configuration.OData.GetMachinesForFolder(key=${folderId})`,
  UPDATE_MACHINES_TO_FOLDER_ASSOCIATIONS: 'orchestrator_/odata/Folders/UiPath.Server.Configuration.OData.UpdateMachinesToFolderAssociations',
} as const;


