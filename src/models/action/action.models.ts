import type { 
  ActionCreateResponse,
  ActionGetResponse, 
  ActionType as ActionTypeEnum, 
  ActionStatus, 
  ActionPriority, 
  ActionAssignmentResult, 
  ActionAssignmentRequest,
  ActionCompletionRequest,
  ActionCompleteOptions,
  ActionAssignOptions
} from './action.types';

export interface ActionServiceModel {
  assign(request: ActionAssignmentRequest, folderId?: number): Promise<ActionAssignmentResult[]>;
  
  reassign(request: ActionAssignmentRequest, folderId?: number): Promise<ActionAssignmentResult[]>;
  
  unassign(taskId: number, folderId?: number): Promise<ActionAssignmentResult[]>;
  
  complete(
    taskType: ActionTypeEnum,
    request: ActionCompletionRequest,
    folderId: number
  ): Promise<void>;
}

type ActionResponseData = ActionGetResponse | ActionCreateResponse;
export class Action<T extends ActionResponseData > {
  constructor(
    private readonly _data: T,
    private readonly service: ActionServiceModel,
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

  get status(): ActionStatus {
    return this._data.status;
  }

  get priority(): ActionPriority  {
    return this._data.priority;
  }

  get type(): ActionTypeEnum {
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

  // Action methods
  /**
   * Assigns this action to a user or users
   * 
   * @param options - Assignment options (requires at least one of: userId, userNameOrEmail)
   * @returns Promise resolving to action assignment results
   * 
   * @example
   * ```typescript
   * // Assign to a user by ID
   * await action.assign({ userId: 123 });
   * 
   * // Assign to a user by email
   * await action.assign({ userNameOrEmail: 'user@example.com' });
   * ```
   */
  async assign(options: ActionAssignOptions): Promise<ActionAssignmentResult[]> {
    if (!this.id) throw new Error('Task ID is undefined');
    
    return this.service.assign({
      taskId: this.id,
      ...options
    }, this.folderId);
  }
  
  /**
   * Reassigns this action to a new user
   * 
   * @param options - Assignment options (requires at least one of: userId, userNameOrEmail)
   * @returns Promise resolving to action assignment results
   * 
   * @example
   * ```typescript
   * // Reassign to a user by ID
   * await action.reassign({ userId: 456 });
   * 
   * // Reassign to a user by email
   * await action.reassign({ userNameOrEmail: 'user@example.com' });
   * ```
   */
  async reassign(options: ActionAssignOptions): Promise<ActionAssignmentResult[]> {
    if (!this.id) throw new Error('Task ID is undefined');
    
    return this.service.reassign({
      taskId: this.id,
      ...options
    }, this.folderId);
  }

  /**
   * Unassigns this action (removes current assignee)
   * 
   * @returns Promise resolving to action assignment results
   * 
   * @example
   * ```typescript
   * // Unassign the action
   * await action.unassign();
   * ```
   */
  async unassign(): Promise<ActionAssignmentResult[]> {
    if (!this.id) throw new Error('Task ID is undefined');
    
    return this.service.unassign(this.id, this.folderId);
  }

  /**
   * Completes this action with optional data and action
   * 
   * @param options - Completion options
   * @returns Promise resolving to void
   * 
   * @example
   * ```typescript
   * // Complete a action with type
   * await action.complete({ type: ActionTypeEnum.ExternalTask });
   * 
   * // Complete with data and action
   * await action.complete({
   *   type: ActionTypeEnum.AppTask,
   *   data: { result: true },
   *   action: 'approve'
   * });
   * ```
   */
  async complete(options: ActionCompleteOptions): Promise<void> {
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