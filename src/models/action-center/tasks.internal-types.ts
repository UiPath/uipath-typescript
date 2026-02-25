import { CollectionResponse } from "../common/types";
import { TaskAssignmentOptions, TaskAssignmentResponse } from "./tasks.types";

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
