/**
 * Action Center Endpoints
 *
 * Tasks, task catalogs and task notes are served by the Orchestrator API.
 */

import { ORCHESTRATOR_BASE } from '../base';

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
  GET_GENERIC_TASK_BY_KEY: `${ORCHESTRATOR_BASE}/tasks/GenericTasks/GetTaskDataByKey`,
  GET_APP_TASK_BY_ID: `${ORCHESTRATOR_BASE}/tasks/AppTasks/GetAppTaskById`,
  SAVE_TASK_TAGS: `${ORCHESTRATOR_BASE}/tasks/GenericTasks/SaveTaskTags`,
  SAVE_TASK_DATA: `${ORCHESTRATOR_BASE}/tasks/GenericTasks/SaveTaskData`,
  SAVE_FORM_TASK_DATA: `${ORCHESTRATOR_BASE}/forms/TaskForms/SaveTaskData`,
  SAVE_APP_TASK_DATA: `${ORCHESTRATOR_BASE}/tasks/AppTasks/SaveAppTasksData`,
  EDIT_TASK_METADATA: `${ORCHESTRATOR_BASE}/odata/Tasks/UiPath.Server.Configuration.OData.EditTaskMetadata`,
} as const;

/**
 * Task Catalog (Action Center) Endpoints
 */
export const TASK_CATALOG_ENDPOINTS = {
  GET_ALL: `${ORCHESTRATOR_BASE}/odata/TaskCatalogs`,
  GET_BY_ID: (id: number) => `${ORCHESTRATOR_BASE}/odata/TaskCatalogs(${id})`,
  CREATE: `${ORCHESTRATOR_BASE}/odata/TaskCatalogs/UiPath.Server.Configuration.OData.CreateTaskCatalog`,
  UPDATE: (id: number) => `${ORCHESTRATOR_BASE}/odata/TaskCatalogs(${id})/UiPath.Server.Configuration.OData.UpdateTaskCatalog`,
} as const;

/**
 * Task Note (Action Center) Endpoints
 */
export const TASK_NOTE_ENDPOINTS = {
  GET_BY_TASK_ID: (taskId: number) => `${ORCHESTRATOR_BASE}/odata/TaskNotes/UiPath.Server.Configuration.OData.GetByTaskId(taskId=${taskId})`,
  CREATE: `${ORCHESTRATOR_BASE}/odata/TaskNotes/UiPath.Server.Configuration.OData.CreateTaskNote`,
} as const;
