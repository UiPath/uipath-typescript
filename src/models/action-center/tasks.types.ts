import { BaseOptions, RequestOptions } from "../common/types";
import { PaginationOptions } from '../../utils/pagination';
import { JobState } from "../common/types";

export interface UserLoginInfo {
  name: string;
  surname: string;
  userName: string;
  emailAddress: string;
  displayName: string;
  id: number;
}

export enum TaskType {
  Form = 'FormTask',
  External = 'ExternalTask',
  App = 'AppTask'
}

export enum TaskPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export enum TaskStatus {
  Unassigned = 'Unassigned',
  Pending = 'Pending',
  Completed = 'Completed'
}

export enum TaskSlaCriteria {
  TaskCreated = 'TaskCreated',
  TaskAssigned = 'TaskAssigned',
  TaskCompleted = 'TaskCompleted'
}

export enum TaskSlaStatus {
  OverdueLater = 'OverdueLater',
  OverdueSoon = 'OverdueSoon',
  Overdue = 'Overdue',
  CompletedInTime = 'CompletedInTime'
}

export enum TaskSourceName {
  Agent = 'Agent',
  Workflow = 'Workflow',
  Maestro = 'Maestro',
  Default = 'Default'
}

export interface TaskSource {
  sourceName: TaskSourceName;
  sourceId: string;
  taskSourceMetadata: Record<string, unknown>;
}

/**
 * Task activity types
 */
export enum TaskActivityType {
  Created = 'Created',
  Assigned = 'Assigned',
  Reassigned = 'Reassigned',
  Unassigned = 'Unassigned',
  Saved = 'Saved',
  Forwarded = 'Forwarded',
  Completed = 'Completed',
  Commented = 'Commented',
  Deleted = 'Deleted',
  BulkSaved = 'BulkSaved',
  BulkCompleted = 'BulkCompleted',
  FirstOpened = 'FirstOpened'
}

/**
 * Tag information for tasks
 */
export interface Tag {
  name: string;
  displayName: string;
  displayValue: string;
}

/**
 * Task activity information
 */
export interface TaskActivity {
  task?: RawTaskGetResponse;
  organizationUnitId: number;
  taskId: number;
  taskKey: string;
  activityType: TaskActivityType;
  creatorUserId: number;
  targetUserId: number | null;
  creationTime: string;
}

export interface TaskSlaDetail {
  expiryTime?: string;
  startCriteria?: TaskSlaCriteria;
  endCriteria?: TaskSlaCriteria;
  status?: TaskSlaStatus;
}

export interface TaskAssignment {
  assignee?: UserLoginInfo;
  task?: RawTaskGetResponse;
  id?: number;
}

/**
 * Base interface containing common fields shared across all task response types
 */
export interface TaskBaseResponse {
  status: TaskStatus;
  title: string;
  type: TaskType;
  priority: TaskPriority;
  folderId: number;
  key: string;
  isDeleted: boolean;
  creationTime: string;
  id: number;
  action: string | null;
  externalTag: string | null;
  lastAssignedTime: string | null;
  completionTime: string | null;
  parentOperationId: string | null;
  deleterUserId: number | null;
  deletionTime: string | null;
  lastModificationTime: string | null;
}

export interface TaskCreateOptions {
  title: string;
  priority?: TaskPriority;
}

export interface RawTaskCreateResponse extends TaskBaseResponse {
  waitJobState: JobState | null;
  assignedToUser: UserLoginInfo | null;
  taskSlaDetails: TaskSlaDetail[] | null;
  completedByUser: UserLoginInfo | null;
  taskAssignees: UserLoginInfo[] | null;
  processingTime: number | null;
  data: Record<string, unknown> | null;
}

export interface RawTaskGetResponse extends TaskBaseResponse {
  isCompleted: boolean;
  encrypted: boolean;
  bulkFormLayoutId: number | null;
  formLayoutId: number | null;
  taskSlaDetail: TaskSlaDetail | null;
  taskAssigneeName: string | null;
  lastModifierUserId: number | null;
  assignedToUser: UserLoginInfo | null;
  creatorUser?: UserLoginInfo;
  lastModifierUser?: UserLoginInfo;
  taskAssignments?: TaskAssignment[];
  activities?: TaskActivity[];
  tags?: Tag[];

  //additional fields for form tasks
  formLayout?: Record<string, unknown>;
  actionLabel?: string | null;
  taskSlaDetails?: TaskSlaDetail[] | null;
  completedByUser?: UserLoginInfo | null;
  taskAssignmentCriteria?: string;
  taskAssignees?: UserLoginInfo[] | null;
  taskSource?: TaskSource | null;
  processingTime?: number | null;
  data?: Record<string, unknown> | null;
}

export interface TaskAssignmentOptions {
  taskId: number;
  userId: number;
  userNameOrEmail?: string;
}
export interface TasksUnassignOptions {
  taskIds: number[];
}

export interface TaskAssignmentResponse {
  taskId?: number;
  userId?: number;
  errorCode?: number;
  errorMessage?: string;
  userNameOrEmail?: string;
} 
export interface TaskCompletionOptions {
  taskId: number;
  data?: any;
  action?: string;
}

/**
 * Options for task assignment operations in the Task class
 * At least one identification parameter is required
 */
export type TaskAssignOptions = 
  | { userId: number; userNameOrEmail?: string}
  | { userId?: number; userNameOrEmail: string};

/**
 * Options for completing a task
 */
export type TaskCompleteOptions =
  | { type: TaskType.External; data?: any; action?: string }
  | { type: Exclude<TaskType, TaskType.External>; data: any; action: string }; 

/**
 * Options for getting tasks across folders
 */
export type TaskGetAllOptions = RequestOptions & PaginationOptions & {
  /**
   * Optional folder ID to filter tasks by folder
   */
  folderId?: number;
}

/**
 * Query options for getting a task by ID 
 */
export type TaskGetByIdOptions = BaseOptions

/**
 * Options for getting users with task permissions
 */
export type TaskGetUsersOptions = RequestOptions & PaginationOptions;
