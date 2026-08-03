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
  GET_GENERIC_TASK_BY_ID: `${ORCHESTRATOR_BASE}/tasks/GenericTasks/GetTaskDataById`,
  GET_APP_TASK_BY_ID: `${ORCHESTRATOR_BASE}/tasks/AppTasks/GetAppTaskById`,
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
  DELETE_FILE: (id: number) => `${ORCHESTRATOR_BASE}/odata/Buckets(${id})/UiPath.Server.Configuration.OData.DeleteFile`,
  GET_FILES: (id: number) => `${ORCHESTRATOR_BASE}/odata/Buckets(${id})/UiPath.Server.Configuration.OData.GetFiles`,
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
 * Orchestrator Job Service Endpoints
 */
export const JOB_ENDPOINTS = {
  GET_ALL: `${ORCHESTRATOR_BASE}/odata/Jobs`,
  GET_BY_KEY: (identifier: string) => `${ORCHESTRATOR_BASE}/odata/Jobs/UiPath.Server.Configuration.OData.GetByKey(identifier=${identifier})`,
  STOP: `${ORCHESTRATOR_BASE}/odata/Jobs/UiPath.Server.Configuration.OData.StopJobs`,
  RESUME: `${ORCHESTRATOR_BASE}/odata/Jobs/UiPath.Server.Configuration.OData.ResumeJob`,
  RESTART: `${ORCHESTRATOR_BASE}/odata/Jobs/UiPath.Server.Configuration.OData.RestartJob`,
} as const;

/**
 * Orchestrator Asset Service Endpoints
 */
export const ASSET_ENDPOINTS = {
  GET_BY_FOLDER: `${ORCHESTRATOR_BASE}/odata/Assets/UiPath.Server.Configuration.OData.GetFiltered`,
  GET_ALL: `${ORCHESTRATOR_BASE}/odata/Assets/UiPath.Server.Configuration.OData.GetAssetsAcrossFolders`,
  GET_BY_ID: (id: number) => `${ORCHESTRATOR_BASE}/odata/Assets(${id})`,
} as const;

/**
 * Orchestrator Attachment Service Endpoints
 */
export const ORCHESTRATOR_ATTACHMENT_ENDPOINTS = {
  GET_BY_ID: (id: string) => `${ORCHESTRATOR_BASE}/odata/Attachments(${id})`,
} as const;

/**
 * Orchestrator DU Module Endpoints (validation flows)
 */
export const ORCHESTRATOR_DU_MODULE_ENDPOINTS = {
  SUBMIT_EXCEPTION_REPORT: `${ORCHESTRATOR_BASE}/doc-understanding/DocumentModule/SubmitExceptionReport`,
  PROCESS_EXTRACTED_DATA: `${ORCHESTRATOR_BASE}/doc-understanding/DocumentModule/ProcessExtractedData`,
} as const;

/**
 * Orchestrator Folder Endpoints
 */
export const FOLDER_ENDPOINTS = {
  GET_BY_ID: (folderId: number) => `${ORCHESTRATOR_BASE}/odata/Folders(${folderId})`,
} as const;

/**
 * Coded Functions Endpoints
 */
export const FUNCTION_ENDPOINTS = {
  /** Folder-scoped list of function HTTP endpoints. */
  GET_ALL: `${ORCHESTRATOR_BASE}/odata/HttpTriggers`,
  /** Invokes a function through its HTTP endpoint; the response body is the function output. */
  INVOKE: (folderKey: string, processSlug: string, functionSlug: string) =>
    `${ORCHESTRATOR_BASE}/t/${folderKey}/${processSlug}/${functionSlug}`,
} as const;
