import { CollectionResponse } from "../common/types";
import { TaskAssignmentOptions, TaskAssignmentResponse, TaskType } from "./tasks.types";
import { TASK_ENDPOINTS } from "../../utils/constants/endpoints";

export const SUPPORTED_TASK_TYPES = new Set<TaskType>(Object.values(TaskType));

export const TASK_TYPE_ENDPOINTS: Record<TaskType, string> = {
  [TaskType.Form]: TASK_ENDPOINTS.GET_TASK_FORM_BY_ID,
  [TaskType.App]: TASK_ENDPOINTS.GET_APP_TASK_BY_ID,
  [TaskType.DocumentValidation]: TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID,
  [TaskType.DocumentClassification]: TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID,
  [TaskType.External]: TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID,
  [TaskType.DataLabeling]: TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID,
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
export interface TaskGetFormOptions {
    expandOnFormLayout?: boolean;
  }
