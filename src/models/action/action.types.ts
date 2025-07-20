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

export enum ActionSourceName {
  Agent = 'Agent',
  Workflow = 'Workflow',
  Maestro = 'Maestro',
  Default = 'Default'
}

export interface ActionSource {
  sourceName: ActionSourceName;
  sourceId: string;
  taskSourceMetadata: Record<string, unknown>;
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

/**
 * Base interface containing common fields shared across all action response types
 */
export interface ActionBaseResponse {
  status: ActionStatus;
  title: string;
  type: ActionType;
  priority: ActionPriority;
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

export interface ActionCreateRequest {
  title: string;
  priority?: ActionPriority;
}

export interface ActionCreateResponse extends ActionBaseResponse {
  waitJobState: JobState | null;
  organizationUnitFullyQualifiedName: string | null;
  assignedToUser: UserLoginInfo | null;
  taskSlaDetails: ActionSlaDetail[] | null;
  completedByUser: UserLoginInfo | null;
  taskAssignees: UserLoginInfo[] | null;
  isCurrentUserInAllUserAssignedGroup: boolean | null;
  processingTime: number | null;
}

export interface ActionGetResponse extends ActionBaseResponse {
  isCompleted: boolean;
  encrypted: boolean;
  bulkFormLayoutId: number | null;
  formLayoutId: number | null;
  taskSlaDetail: ActionSlaDetail | null;
  taskAssigneeName: string | null;
  lastModifierUserId: number | null;
  assignedToUser?: UserLoginInfo;
  creatorUser?: UserLoginInfo;
  lastModifierUser?: UserLoginInfo;
  taskAssignments?: ActionAssignment[];
}

export interface ActionGetFormResponse extends ActionBaseResponse {
  formLayout: Record<string, unknown>;
  formLayoutId: number | null;
  bulkFormLayoutId: number | null;
  actionLabel: string | null;
  organizationUnitFullyQualifiedName: string;
  assignedToUser: UserLoginInfo | null;
  taskSlaDetails: ActionSlaDetail[] | null;
  completedByUser: UserLoginInfo | null;
  taskAssignmentCriteria?: string;
  taskAssignees: UserLoginInfo[] | null;
  isCurrentUserInAllUserAssignedGroup: boolean | null;
  taskSource: ActionSource | null;
  processingTime: number | null;
  lastModifierUserId: number | null;
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

/**
 * Options for getting a form task by ID
 */
export interface ActionGetFormOptions extends QueryParams {
  expandOnFormLayout?: boolean;
}