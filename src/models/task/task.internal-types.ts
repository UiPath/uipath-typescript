import { CollectionResponse } from "../common/common-types";
import { TaskAssignmentRequest, TaskAssignmentResponse } from "./task.types";

export interface TasksAssignRequest {
    taskAssignments: TaskAssignmentRequest[];
}

export type TaskAssignmentResponseCollection = CollectionResponse<TaskAssignmentResponse>;

/**
 * Options for getting a form task by ID
 */
export interface TaskGetFormOptions {
    expandOnFormLayout?: boolean;
  }
