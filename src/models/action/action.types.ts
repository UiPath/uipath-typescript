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

export enum ActionType {
  Form = 'FormTask',
  External = 'ExternalTask',
  App = 'AppTask'
}

export enum ActionPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export enum ActionStatus {
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

export enum ActionSlaCriteria {
  TaskCreated = 'TaskCreated',
  TaskAssigned = 'TaskAssigned',
  TaskCompleted = 'TaskCompleted'
}

export enum ActionSlaStatus {
  OverdueLater = 'OverdueLater',
  OverdueSoon = 'OverdueSoon',
  Overdue = 'Overdue',
  CompletedInTime = 'CompletedInTime'
}

export interface ActionSlaDetail {
  expiryTime?: string;
  startCriteria?: ActionSlaCriteria;
  endCriteria?: ActionSlaCriteria;
  status?: ActionSlaStatus;
}

export interface ActionAssignment {
  assignee?: UserLoginInfo;
  task?: ActionGetResponse;
  id?: number;
}

export interface ActionCreateRequest {
  title: string;
  priority?: ActionPriority;
}

export interface ActionCreateResponse {
  status: ActionStatus;
  action: string | null;
  waitJobState: JobState | null;
  organizationUnitFullyQualifiedName: string | null;
  assignedToUser: UserLoginInfo | null;
  taskSlaDetails: ActionSlaDetail[] | null;
  completedByUser: UserLoginInfo | null;
  taskAssignees: UserLoginInfo[] | null;
  isCurrentUserInAllUserAssignedGroup: boolean | null;
  processingTime: number | null;
  title: string;
  type: ActionType;
  priority: ActionPriority;
  assignedToUserId: number | null;
  organizationUnitId: number;
  externalTag: string | null;
  lastAssignedTime: string | null;
  completionTime: string | null;
  parentOperationId: string | null;
  key: string;
  isDeleted: boolean;
  deleterUserId: number | null;
  deletionTime: string | null;
  lastModificationTime: string | null;
  creationTime: string;
  creatorUserId: number;
  id: number;
}

export interface ActionGetResponse {
  status: ActionStatus;
  isCompleted: boolean;
  encrypted: boolean;
  title: string;
  type: ActionType;
  priority: ActionPriority;
  organizationUnitId: number;
  key: string;
  isDeleted: boolean;
  creationTime: string;
  creatorUserId: number;
  id: number;
  bulkFormLayoutId: number | null;
  formLayoutId: number | null;
  action: string | null;
  taskSlaDetail: ActionSlaDetail | null;
  taskAssigneeName: string | null;
  assignedToUserId: number | null;
  externalTag: string | null;
  lastAssignedTime: string | null;
  completionTime: string | null;
  parentOperationId: string | null;
  deleterUserId: number | null;
  deletionTime: string | null;
  lastModificationTime: string | null;
  lastModifierUserId: number | null;
  assignedToUser?: UserLoginInfo;
  creatorUser?: UserLoginInfo;
  lastModifierUser?: UserLoginInfo;
  taskAssignments?: ActionAssignment[];
}

export interface ActionAssignmentRequest {
  taskId: number;
  userId?: number;
  userNameOrEmail?: string;
}

export interface ActionsAssignRequest {
  taskAssignments: ActionAssignmentRequest[];
}

export interface ActionsUnassignRequest {
  taskIds: number[];
}

export interface ActionAssignmentResult {
  taskId?: number;
  userId?: number;
  errorCode?: number;
  errorMessage?: string;
  userNameOrEmail?: string;
}

export type ActionAssignmentResultCollection = CollectionResponse<ActionAssignmentResult>;
 
export interface ActionCompletionRequest {
  taskId: number;
  data?: any;
  action?: string;
}

/**
 * Options for action assignment operations in the Action class
 * At least one identification parameter is required
 */
export type ActionAssignOptions = 
  | { userId: number; userNameOrEmail?: string}
  | { userId?: number; userNameOrEmail: string};

/**
 * Options for completing an action
 */
export type ActionCompleteOptions =
  | { type: ActionType.External; data?: any; action?: string }
  | { type: Exclude<ActionType, ActionType.External>; data: any; action: string }; 

/**
 * Query options for getting all actions
 */
export interface ActionGetAllOptions extends QueryParams {
  event?: 'ForwardedEver';
  expand?: string;
  filter?: string;
  select?: string;
  orderby?: string;
  count?: boolean;
}

/**
 * Query options for getting an action by ID 
 */
export interface ActionGetByIdOptions extends QueryParams {
  expand?: string;
  select?: string;
} 