/**
 * Orchestrator Service Endpoints
 */

import { ORCHESTRATOR_BASE } from './base';

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
