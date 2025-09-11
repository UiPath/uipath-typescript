import { CollectionResponse } from "../common/common-types";
import { TaskAssignmentOptions, TaskAssignmentResponse } from "./task.types";

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
