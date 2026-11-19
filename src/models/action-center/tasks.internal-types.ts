import { BaseOptions, CollectionResponse, FolderScopedOptions } from "../common/types";
import { TaskAppSchema, TaskAssignmentOptions, TaskAssignmentResponse, TaskGetSchemaResponse, TaskType } from "./tasks.types";
import { TASK_ENDPOINTS } from "../../utils/constants/endpoints";

export const TASK_TYPE_ENDPOINTS: Record<TaskType, string> = {
  [TaskType.Form]: TASK_ENDPOINTS.GET_TASK_FORM_BY_ID,
  [TaskType.App]: TASK_ENDPOINTS.GET_APP_TASK_BY_ID,
  [TaskType.DocumentValidation]: TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID,
  [TaskType.DocumentClassification]: TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID,
  [TaskType.External]: TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID,
  [TaskType.DataLabeling]: TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID,
  [TaskType.QuickForm]: TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID,
};

export enum ActionCenterEventNames {
  TOKENREFRESHED = 'AC.tokenRefreshed',
  REFRESHTOKEN = 'AC.refreshToken',
}

export type TokenWithExpiry = {
  accessToken: string,
  expiresAt: Date,
}

export type ActionCenterTokenData = {
  token: TokenWithExpiry,
  /** Sent for a debug task only: the job that created it, which the processes the app starts become debug sub-jobs of. */
  debugJobKey?: string,
}

export type ActionCenterEventResponsePayload = {
  eventType: ActionCenterEventNames,
  content: ActionCenterTokenData,
}

export interface TasksAssignOptions {
    taskAssignments: TaskAssignmentOptions[];
}

export type TaskAssignmentResponseCollection = CollectionResponse<TaskAssignmentResponse>;

/**
 * Options for getting a form task by ID
 */
export interface TaskGetFormOptions extends BaseOptions {
  expandOnFormLayout?: boolean;
}

/**
 * The part of an App task read by key that getSchema uses
 */
export interface RawAppTaskSchemaFields {
  taskSchema?: TaskAppSchema | null;
}

/**
 * What getSchema needs to know about a task. Only `id` is required; the type
 * and keys are looked up by id when they are missing.
 */
export interface TaskSchemaSource {
  id: number;
  type?: TaskType;
  key?: string;
  taskSchemaKey?: string | null;
}

/**
 * Calls a task object makes for exactly the task it describes. The task object
 * already holds its type and keys, so these skip the lookup by id.
 */
export interface TaskBoundOperations {
  /**
   * Gets the schema of the given task.
   *
   * @param task - The task's id, with the type and keys the task object holds
   * @param options - Folder scope (folderId, folderKey, or folderPath)
   * @returns Promise resolving to a {@link TaskGetSchemaResponse}, or null when the task has no schema
   */
  getSchema(task: TaskSchemaSource, options?: FolderScopedOptions): Promise<TaskGetSchemaResponse | null>;
}
