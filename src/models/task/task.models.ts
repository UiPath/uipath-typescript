import type { 
  TaskCreateResponse,
  TaskGetResponse, 
  TaskType,
  TaskStatus, 
  TaskPriority, 
  TaskAssignmentResult, 
  TaskAssignmentRequest,
  TaskCompletionRequest,
  TaskCompleteOptions,
  TaskAssignOptions,
  TaskGetAllOptions,
  TaskGetByIdOptions,
  TaskCreateRequest
} from './task.types';

export interface TaskServiceModel {
  getAll(options?: TaskGetAllOptions): Promise<Task<TaskGetResponse>[]>;

  getById(id: number, options?: TaskGetByIdOptions, folderId?: number): Promise<Task<TaskGetResponse>>;

  create(request: TaskCreateRequest, folderId: number): Promise<Task<TaskCreateResponse>>;

  assign(request: TaskAssignmentRequest, folderId?: number): Promise<TaskAssignmentResult[]>;
  
  reassign(request: TaskAssignmentRequest, folderId?: number): Promise<TaskAssignmentResult[]>;
  
  unassign(taskId: number, folderId?: number): Promise<TaskAssignmentResult[]>;
  
  complete(
    taskType: TaskType,
    request: TaskCompletionRequest,
    folderId: number
  ): Promise<void>;
}

type TaskResponseData = TaskGetResponse | TaskCreateResponse;
export class Task<T extends TaskResponseData > {
  constructor(
    private readonly _data: T,
    private readonly service: TaskServiceModel,
  ) {}
  get id(): number {
    return this._data.id;
  }

  get key(): string {
    return this._data.key;
  }

  get title(): string {
    return this._data.title;
  }

  get status(): TaskStatus {
    return this._data.status;
  }

  get priority(): TaskPriority  {
    return this._data.priority;
  }

  get type(): TaskType {
    return this._data.type;
  }

  get assignedToUserId(): number | null { 
    return this._data.assignedToUserId;
  }

  get creatorUserId(): number {
    return this._data.creatorUserId;
  }

  get folderId(): number {
    return this._data.organizationUnitId;
  }

  get createdTime(): string {
    return this._data.creationTime;
  }

  get completedTime(): string | null {   
    return this._data.completionTime;
  }

  // Access to raw task data
  get data(): T {
    return this._data;
  }

  // Task methods
  /**
   * Assigns this task to a user or users
   * 
   * @param options - Assignment options (requires at least one of: userId, userNameOrEmail)
   * @returns Promise resolving to task assignment results
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
  async assign(options: TaskAssignOptions): Promise<TaskAssignmentResult[]> {
    if (!this.id) throw new Error('Task ID is undefined');
    
    return this.service.assign({
      taskId: this.id,
      ...options
    }, this.folderId);
  }
  
  /**
   * Reassigns this task to a new user
   * 
   * @param options - Assignment options (requires at least one of: userId, userNameOrEmail)
   * @returns Promise resolving to task assignment results
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
  async reassign(options: TaskAssignOptions): Promise<TaskAssignmentResult[]> {
    if (!this.id) throw new Error('Task ID is undefined');
    
    return this.service.reassign({
      taskId: this.id,
      ...options
    }, this.folderId);
  }

  /**
   * Unassigns this task (removes current assignee)
   * 
   * @returns Promise resolving to task assignment results
   * 
   * @example
   * ```typescript
   * // Unassign the task
   * await task.unassign();
   * ```
   */
  async unassign(): Promise<TaskAssignmentResult[]> {
    if (!this.id) throw new Error('Task ID is undefined');
    
    return this.service.unassign(this.id, this.folderId);
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
  async complete(options: TaskCompleteOptions): Promise<void> {
    if (!this.id) throw new Error('Task ID is undefined');
    const folderId = this.folderId;
    if (!folderId) throw new Error('Folder ID is required');
    
    return this.service.complete(
      options.type,
      {
        taskId: this.id,
        data: options.data,
        action: options.action
      },
      folderId
    );
  }
} 