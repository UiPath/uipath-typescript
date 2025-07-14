import { ActionsService } from '../../services/actions/actions';

export interface UserLoginInfoDto {
  name?: string;
  surname?: string;
  userName?: string;
  emailAddress?: string;
  displayName?: string;
  id?: number;
}

export enum TaskType {
  FormTask = 'FormTask',
  ExternalTask = 'ExternalTask',
  DocumentValidationTask = 'DocumentValidationTask',
  DocumentClassificationTask = 'DocumentClassificationTask',
  DataLabelingTask = 'DataLabelingTask',
  AppTask = 'AppTask'
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

export enum TaskAssignmentCriteria {
  SingleUser = 'SingleUser',
  Workload = 'Workload',
  AllUsers = 'AllUsers',
  Hierarchy = 'Hierarchy'
}

export enum TaskSlaStartEndCriteria {
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

export interface TaskSlaDetailDto {
  expiryTime?: string;
  startCriteria?: TaskSlaStartEndCriteria;
  endCriteria?: TaskSlaStartEndCriteria;
  status?: TaskSlaStatus;
}

export interface TaskAssignmentDto {
  assignee?: UserLoginInfoDto;
  task?: TaskDto;
  id?: number;
}

export interface TaskCreateRequest {
  type?: TaskType;
  title: string;
  priority?: TaskPriority;
  data?: any;
}

export interface TaskDataDto {
  status?: TaskStatus;
  data?: any;
  action?: string;
  waitJobState?: JobState;
  organizationUnitFullyQualifiedName?: string;
  assignedToUser?: UserLoginInfoDto;
  taskSlaDetails?: TaskSlaDetailDto[];
  completedByUser?: UserLoginInfoDto;
  taskAssignmentCriteria?: TaskAssignmentCriteria;
  taskAssignees?: UserLoginInfoDto[];
  isCurrentUserInAllUserAssignedGroup?: boolean;
  processingTime?: number;
  title?: string;
  type?: TaskType;
  priority?: TaskPriority;
  assignedToUserId?: number;
  organizationUnitId?: number;
  externalTag?: string;
  creatorJobKey?: string;
  waitJobKey?: string;
  lastAssignedTime?: string;
  completionTime?: string;
  parentOperationId?: string;
  key?: string;
  isDeleted?: boolean;
  deleterUserId?: number;
  deletionTime?: string;
  lastModificationTime?: string;
  lastModifierUserId?: number;
  creationTime?: string;
  creatorUserId?: number;
  id?: number;
}

export interface TaskDto {
  status?: TaskStatus;
  assignedToUser?: UserLoginInfoDto;
  taskAssignmentCriteria?: TaskAssignmentCriteria;
  creatorUser?: UserLoginInfoDto;
  lastModifierUser?: UserLoginInfoDto;
  taskCatalogName?: string;
  isCompleted?: boolean;
  bulkFormLayoutId?: number;
  formLayoutId?: number;
  encrypted?: boolean;
  action?: string;
  taskSlaDetail?: TaskSlaDetailDto;
  taskAssignments?: TaskAssignmentDto[];
  taskAssigneeName?: string;
  title?: string;
  type?: TaskType;
  priority?: TaskPriority;
  assignedToUserId?: number;
  organizationUnitId?: number;
  externalTag?: string;
  creatorJobKey?: string;
  waitJobKey?: string;
  lastAssignedTime?: string;
  completionTime?: string;
  parentOperationId?: string;
  key?: string;
  isDeleted?: boolean;
  deleterUserId?: number;
  deletionTime?: string;
  lastModificationTime?: string;
  lastModifierUserId?: number;
  creationTime?: string;
  creatorUserId?: number;
  id?: number;
  // Additional fields from TaskDataDto
  data?: any;
  waitJobState?: JobState;
  organizationUnitFullyQualifiedName?: string;
  taskSlaDetails?: TaskSlaDetailDto[];
  completedByUser?: UserLoginInfoDto;
  taskAssignees?: UserLoginInfoDto[];
  isCurrentUserInAllUserAssignedGroup?: boolean;
  processingTime?: number;
}

export interface TaskAssignmentRequest {
  taskId: number;
  userId?: number;
  userNameOrEmail?: string;
  assignmentCriteria?: TaskAssignmentCriteria;
  assigneeNamesOrEmails?: string[];
  assigneeUserIds?: number[];
}

export interface TasksAssignRequest {
  taskAssignments: TaskAssignmentRequest[];
}

export interface TasksDeleteRequest {
  taskIds: number[];
}

export interface TaskOperationErrorResponse {
  taskId?: number;
  userId?: number;
  errorCode?: number;
  errorMessage?: string;
  userNameOrEmail?: string;
}

export interface ODataValueOfTaskOperationErrorResponse {
  value: TaskOperationErrorResponse[];
}

export interface ODataResponse<T> {
  value: T[];
}

export interface TaskCompletionRequest {
  taskId: number;
  data?: any;
  action?: string;
}

export class Task {
  constructor(
    private readonly taskData: TaskDto,
    private readonly service: ActionsService,
    private readonly organizationUnitId?: number
  ) {}

  // Expose task data properties
  get id(): number | undefined {
    return this.taskData.id;
  }

  get title(): string | undefined {
    return this.taskData.title;
  }

  get status(): TaskStatus | undefined {
    return this.taskData.status;
  }

  get type(): TaskType | undefined {
    return this.taskData.type;
  }

  get priority(): TaskPriority | undefined {
    return this.taskData.priority;
  }

  get assignedToUser(): UserLoginInfoDto | undefined {
    return this.taskData.assignedToUser;
  }

  get data(): any {
    return this.taskData.data;
  }

  // Task methods
  /**
   * Assigns this task to a user or users
   * 
   * @param options - Assignment options
   * @returns Promise resolving to operation error responses
   * 
   * @example
   * ```typescript
   * // Assign to a user by ID
   * await task.assign({ userId: 123 });
   * 
   * // Assign to a user by email
   * await task.assign({ userNameOrEmail: 'user@example.com' });
   * ```
   */
  async assign(options: {
    userId?: number;
    userNameOrEmail?: string;
    assignmentCriteria?: TaskAssignmentCriteria;
    assigneeNamesOrEmails?: string[];
    assigneeUserIds?: number[];
  }): Promise<TaskOperationErrorResponse[]> {
    if (!this.id) throw new Error('Task ID is undefined');
    
    return this.service.assign({
      taskId: this.id,
      ...options
    }, this.taskData.organizationUnitId || this.organizationUnitId);
  }
  
  /**
   * Reassigns this task to a new user
   * 
   * @param options - Assignment options
   * @returns Promise resolving to operation error responses
   * 
   * @example
   * ```typescript
   * // Reassign to a user by ID
   * await task.reassign({ userId: 456 });
   * 
   * // Reassign to a user by email
   * await task.reassign({ userNameOrEmail: 'user@example.com' });
   * ```
   */
  async reassign(options: {
    userId?: number;
    userNameOrEmail?: string;
    assignmentCriteria?: TaskAssignmentCriteria;
    assigneeNamesOrEmails?: string[];
    assigneeUserIds?: number[];
  }): Promise<TaskOperationErrorResponse[]> {
    if (!this.id) throw new Error('Task ID is undefined');
    
    return this.service.reassign({
      taskId: this.id,
      ...options
    }, this.taskData.organizationUnitId || this.organizationUnitId);
  }

  /**
   * Unassigns this task (removes current assignee)
   * 
   * @returns Promise resolving to operation error responses
   * 
   * @example
   * ```typescript
   * // Unassign the task
   * await task.unassign();
   * ```
   */
  async unassign(): Promise<TaskOperationErrorResponse[]> {
    if (!this.id) throw new Error('Task ID is undefined');
    
    return this.service.unassign(this.id, this.taskData.organizationUnitId || this.organizationUnitId);
  }

  /**
   * Completes this task with optional data and action
   * 
   * @param options - Completion options
   * @returns Promise resolving to void
   * 
   * @example
   * ```typescript
   * // Complete a task with type
   * await task.complete({ type: TaskType.ExternalTask });
   * 
   * // Complete with data and action
   * await task.complete({
   *   type: TaskType.AppTask,
   *   data: { result: true },
   *   action: 'approve'
   * });
   * ```
   */
  async complete(options: {
    type: TaskType;
    data?: any;
    action?: string;
  }): Promise<void> {
    if (!this.id) throw new Error('Task ID is undefined');
    const orgUnitId = this.taskData.organizationUnitId || this.organizationUnitId;
    if (!orgUnitId) throw new Error('Organization unit ID is required');
    
    return this.service.complete(
      options.type,
      {
        taskId: this.id,
        data: options.data,
        action: options.action
      },
      orgUnitId
    );
  }

  // Convert TaskDto to Task
  static fromDto(dto: TaskDto, service: ActionsService, organizationUnitId?: number): Task {
    return new Task(dto, service, organizationUnitId);
  }

  // Get the raw data
  toJSON(): TaskDto {
    return this.taskData;
  }
} 