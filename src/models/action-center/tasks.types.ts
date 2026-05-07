import { BaseOptions, RequestOptions } from "../common/types";
import { PaginationOptions } from '../../utils/pagination';
import { JobState } from "../common/types";

export enum TaskUserType {
  /** A user of this type is supposed to be used by a human. */
  User = 'User',
  /** A user of this type is automatically created when adding a robot, is associated with Robot role and it is used by a robot when communicating with Orchestrator. */
  Robot = 'Robot',
  /** A user of type Directory User */
  DirectoryUser = 'DirectoryUser',
  /** A user of type Directory Group */
  DirectoryGroup = 'DirectoryGroup',
  /** A user of type Directory Robot Account */
  DirectoryRobot = 'DirectoryRobot',
  /** A user of type Directory External Application */
  DirectoryExternalApplication = 'DirectoryExternalApplication',
}

export interface UserLoginInfo {
  name: string;
  surname: string;
  userName: string;
  emailAddress: string;
  displayName: string;
  id: number;
  type: TaskUserType;
}

/**
 * Types of tasks available in Action Center.
 * Each type determines the task's behavior, UI rendering, and completion requirements.
 */
export enum TaskType {
  /** A form-based task that renders a UiPath form layout for user input */
  Form = 'FormTask',
  /** An externally managed task handled outside of Action Center */
  External = 'ExternalTask',
  /** A task powered by a UiPath App */
  App = 'AppTask',
  /** A document validation task for reviewing and correcting extracted document data */
  DocumentValidation = 'DocumentValidationTask',
  /** A document classification task for categorizing documents */
  DocumentClassification = 'DocumentClassificationTask',
  /** A data labeling task for annotating training data */
  DataLabeling = 'DataLabelingTask'
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
  createdTime: string;
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
  createdTime: string;
  id: number;
  action: string | null;
  externalTag: string | null;
  lastAssignedTime: string | null;
  completedTime: string | null;
  parentOperationId: string | null;
  deleterUserId: number | null;
  deletedTime: string | null;
  lastModifiedTime: string | null;
}

export interface TaskCreateOptions {
  title: string;
  data?: Record<string, unknown>;
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

/**
 * Options for task assignment operations when called from a task instance
 * Requires either userId or userNameOrEmail, but not both
 */
export type TaskAssignOptions =
  | { userId: number; userNameOrEmail?: never }
  | { userId?: never; userNameOrEmail: string };

/**
 * Options for task assignment operations when called from the service
 * Extends TaskAssignOptions with the required taskId field
 */
export type TaskAssignmentOptions = {
  taskId: number;
} & TaskAssignOptions;

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

/**
 * Options for completing a task
 */
export type TaskCompleteOptions =
  | { type: TaskType.External; data?: any; action?: string }
  | { type: TaskType.DocumentValidation; data?: any; action?: string }
  | { type: TaskType.DocumentClassification; data?: any; action?: string }
  | { type: TaskType.DataLabeling; data?: any; action?: string }
  | { type: TaskType.Form; data: any; action: string }
  | { type: TaskType.App; data: any; action: string }

/**
 * Options for completing a task when called from the service
 * Extends TaskCompleteOptions with the required taskId field
 */
export type TaskCompletionOptions = TaskCompleteOptions & { taskId: number }; 

/**
 * Options for getting tasks across folders
 */
export type TaskGetAllOptions = RequestOptions & PaginationOptions & {
  /**
   * Optional folder ID to filter tasks by folder
   */
  folderId?: number;
  /**
   * Optional flag to fetch tasks using admin permissions
   * When true, fetches tasks across folders
   * where the user has at least Task.View, Task.Edit and TaskAssignment.Create permissions
   * When false or omitted, fetches tasks across folders
   * where the user has at least Task.View and Task.Edit permissions
   */
  asTaskAdmin?: boolean;
}

/**
 * Query options for getting a task by ID
 */
export interface TaskGetByIdOptions extends BaseOptions {
  /**
   * Optional task type. When not provided, method will automatically identify the 
   * task type and resolve accordingly, but it will be slower.
   * When provided, it will skip the step to identify the task type, so it will be faster.
   */
  taskType?: TaskType;
}

/**
 * Options for getting users with task permissions
 */
export type TaskGetUsersOptions = RequestOptions & PaginationOptions;
