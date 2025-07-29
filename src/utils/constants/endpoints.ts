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
    CANCEL: (instanceId: string) => `pims_/api/v1/instances/${instanceId}/cancel`,
    PAUSE: (instanceId: string) => `pims_/api/v1/instances/${instanceId}/pause`,
    RESUME: (instanceId: string) => `pims_/api/v1/instances/${instanceId}/resume`,
  },
} as const;

/**
 * Task Service (Action Center) Endpoints
 */
export const TASK_ENDPOINTS = {
  CREATE_GENERIC_TASK: '/tasks/GenericTasks/CreateTask',
  GET_TASK_USERS: (folderId: number) => `/odata/Tasks/UiPath.Server.Configuration.OData.GetTaskUsers(organizationUnitId=${folderId})`,
  GET_TASKS_ACROSS_FOLDERS: '/odata/Tasks/UiPath.Server.Configuration.OData.GetTasksAcrossFolders',
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
  BASE_PATH: 'datafabric_/api/EntityService',
  ENTITY: {
    READ: (entityName: string) => `datafabric_/api/EntityService/${entityName}/read`,
    QUERY_EXPANSION: (entityName: string) => `datafabric_/api/EntityService/${entityName}/query_expansion`,
    BY_ID: {
      READ: (entityId: string) => `datafabric_/api/EntityService/entity/${entityId}/read`,
      QUERY_EXPANSION: (entityId: string) => `datafabric_/api/EntityService/entity/${entityId}/query_expansion`,
    },
  },
  CHOICE_SET: {
    GET_ALL: '/api/Entity/choiceset',
    GET_BY_ID: (id: string) => `/api/Entity/choiceset/${id}`,
  },
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
} as const;
