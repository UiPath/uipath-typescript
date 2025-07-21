import { CollectionResponse } from "../common/commonTypes";
import type { QueryParams } from '../common/requestSpec';

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

export enum JobState {
  Pending = 'Pending',
  Running = 'Running',
  Stopping = 'Stopping',
  Terminating = 'Terminating',
  Faulted = 'Faulted',
  Successful = 'Successful',
  Stopped = 'Stopped',
  Suspended = 'Suspended',
  Resumed = 'Resumed'
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

export interface TaskSlaDetail {
  expiryTime?: string;
  startCriteria?: TaskSlaCriteria;
  endCriteria?: TaskSlaCriteria;
  status?: TaskSlaStatus;
}

export interface TaskAssignment {
  assignee?: UserLoginInfo;
  task?: TaskGetResponse;
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
  organizationUnitId: number;
  key: string;
  isDeleted: boolean;
  creationTime: string;
  creatorUserId: number;
  id: number;
  action: string | null;
  assignedToUserId: number | null;
  externalTag: string | null;
  lastAssignedTime: string | null;
  completionTime: string | null;
  parentOperationId: string | null;
  deleterUserId: number | null;
  deletionTime: string | null;
  lastModificationTime: string | null;
}

export interface TaskCreateRequest {
  title: string;
  priority?: TaskPriority;
}

export interface TaskCreateResponse extends TaskBaseResponse {
  waitJobState: JobState | null;
  assignedToUser: UserLoginInfo | null;
  taskSlaDetails: TaskSlaDetail[] | null;
  completedByUser: UserLoginInfo | null;
  taskAssignees: UserLoginInfo[] | null;
  processingTime: number | null;
}

export interface TaskGetResponse extends TaskBaseResponse {
  isCompleted: boolean;
  encrypted: boolean;
  bulkFormLayoutId: number | null;
  formLayoutId: number | null;
  taskSlaDetail: TaskSlaDetail | null;
  taskAssigneeName: string | null;
  lastModifierUserId: number | null;
  assignedToUser?: UserLoginInfo;
  creatorUser?: UserLoginInfo;
  lastModifierUser?: UserLoginInfo;
  taskAssignments?: TaskAssignment[];

  //additional fields for form tasks
  formLayout?: Record<string, unknown>;
  actionLabel?: string | null;
  taskSlaDetails?: TaskSlaDetail[] | null;
  completedByUser?: UserLoginInfo | null;
  taskAssignmentCriteria?: string;
  taskAssignees?: UserLoginInfo[] | null;
  taskSource?: TaskSource | null;
  processingTime?: number | null;
}

export interface TaskAssignmentRequest {
  taskId: number;
  userId?: number;
  userNameOrEmail?: string;
}

export interface TasksAssignRequest {
  taskAssignments: TaskAssignmentRequest[];
}

export interface TasksUnassignRequest {
  taskIds: number[];
}

export interface TaskAssignmentResult {
  taskId?: number;
  userId?: number;
  errorCode?: number;
  errorMessage?: string;
  userNameOrEmail?: string;
}

export type TaskAssignmentResultCollection = CollectionResponse<TaskAssignmentResult>;
 
export interface TaskCompletionRequest {
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
 * Common query options
 */
export interface QueryOptions extends QueryParams {
  expand?: string;
  filter?: string;
  select?: string;
  orderby?: string;
  count?: boolean;
}

/**
 * Query options for getting all tasks
 */
export type TaskGetAllOptions = QueryOptions;

/**
 * Query options for getting a task by ID 
 */
export interface TaskGetByIdOptions extends QueryParams {
  expand?: string;
  select?: string;
}

/**
 * Options for getting a form task by ID
 */
export interface TaskGetFormOptions extends QueryParams {
  expandOnFormLayout?: boolean;
}

/**
 * Query options for getting task users
 */
export type TaskGetUsersOptions = QueryOptions;

/**
 * Collection response for user login info
 */
export type UserLoginInfoCollection = CollectionResponse<UserLoginInfo>;